'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Plus, Loader2, Truck, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

interface OrdenEntrega {
  id: string;
  fecha: string;
  createdAt: string;
  sucursal: { id: string; codigo: string; nombre: string };
  ordenCompra: { id: string; folio: string; semana: string };
  _count: { items: number };
}

interface OrdenEntregaDetail {
  id: string;
  fecha: string;
  sucursal: { id: string; codigo: string; nombre: string };
  ordenCompra: { id: string; folio: string; semana: string };
  items: Array<{
    id: string;
    area: string;
    cantidadAsignada: string;
    producto: { nombre: string; codigo: string } | null;
    insumo: { nombre: string; codigo: string } | null;
  }>;
}

interface OCCompletada {
  id: string;
  folio: string;
  semana: string;
}

export function EntregasPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isAdminOrSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const [entregas, setEntregas] = useState<OrdenEntrega[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [filterSucursalId, setFilterSucursalId] = useState('');

  const [ocsCompletadas, setOcsCompletadas] = useState<OCCompletada[]>([]);
  const [selectedOcId, setSelectedOcId] = useState('');
  const [generating, setGenerating] = useState(false);

  const [detail, setDetail] = useState<OrdenEntregaDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadEntregas = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (filterSucursalId) params.set('sucursalId', filterSucursalId);
      const r = await api.get(`/ordenes-entrega?${params.toString()}`);
      setEntregas(r.data.data);
    } catch {
      toast.error('Error al cargar entregas');
    }
  }, [filterSucursalId]);

  const loadSucursales = useCallback(async (): Promise<void> => {
    try {
      const r = await api.get('/sucursales');
      setSucursales(r.data.data);
    } catch {
      /* silent */
    }
  }, []);

  const loadOcsCompletadas = useCallback(async (): Promise<void> => {
    try {
      const r = await api.get('/ordenes-compra?estado=COMPLETADA');
      setOcsCompletadas(r.data.data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadEntregas();
  }, [loadEntregas]);

  useEffect(() => {
    if (isAdminOrSupervisor) {
      loadSucursales();
      loadOcsCompletadas();
    }
  }, [isAdminOrSupervisor, loadSucursales, loadOcsCompletadas]);

  const generarEntregas = async (): Promise<void> => {
    if (!selectedOcId) {
      toast.error('Selecciona una Orden de Compra completada');
      return;
    }
    setGenerating(true);
    try {
      await api.post(`/ordenes-entrega/generar/${selectedOcId}`);
      toast.success('Entregas generadas exitosamente');
      setSelectedOcId('');
      loadEntregas();
      loadOcsCompletadas();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al generar entregas';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const viewDetail = async (id: string): Promise<void> => {
    try {
      const r = await api.get(`/ordenes-entrega/${id}`);
      setDetail(r.data.data);
      setDetailOpen(true);
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  const mosItems = detail?.items.filter((i) => i.area === 'MOS') || [];
  const insItems = detail?.items.filter((i) => i.area === 'INS') || [];

  return (
    <div className="space-y-6">
      {/* Generate Deliveries - ADMIN/SUPERVISOR only */}
      {isAdminOrSupervisor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Generar Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1 w-full sm:w-auto">
                <label className="text-xs text-slate-500">Orden de Compra Completada</label>
                <Select value={selectedOcId} onValueChange={setSelectedOcId}>
                  <SelectTrigger className="w-full sm:w-72 min-h-[44px]">
                    <SelectValue placeholder="Seleccionar OC completada" />
                  </SelectTrigger>
                  <SelectContent>
                    {ocsCompletadas.map((oc) => (
                      <SelectItem key={oc.id} value={oc.id}>
                        {oc.folio} — {oc.semana}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={generarEntregas}
                disabled={generating}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Generar Entregas
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Se generaran ordenes de entrega por sucursal a partir de la OC completada seleccionada.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filter by branch - ADMIN/SUPERVISOR only */}
      {isAdminOrSupervisor && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm text-slate-600 font-medium">Filtrar por sucursal:</label>
          <Select value={filterSucursalId} onValueChange={(v) => setFilterSucursalId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Entregas Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead>Semana</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entregas.length ? (
              entregas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <span className="font-medium">{e.sucursal.codigo}</span>
                    <span className="text-slate-500 ml-1 text-sm hidden sm:inline">
                      {e.sucursal.nombre}
                    </span>
                  </TableCell>
                  <TableCell>{e.ordenCompra.semana}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{e._count.items}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(e.fecha || e.createdAt).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewDetail(e.id)}
                      className="min-h-[44px] min-w-[44px]"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-[44px] min-w-[44px]"
                      title="Descargar PDF"
                      onClick={async () => { try { const r = await api.get(`/ordenes-entrega/${e.id}/pdf`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href = url; a.download = `entrega_${e.sucursal?.codigo}.pdf`; a.click(); window.URL.revokeObjectURL(url); } catch { toast.error('Error al generar PDF'); } }}
                    >
                      <FileDown className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400"><Truck className="h-8 w-8" /><p className="text-sm font-medium">No hay ordenes de entrega</p><p className="text-xs">Genera entregas desde una OC completada</p></div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Entrega — {detail?.sucursal.codigo} {detail?.sucursal.nombre}
              </span>
              <Badge variant="outline" className="w-fit">
                {detail?.ordenCompra.semana}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Fecha: {new Date(detail.fecha).toLocaleDateString('es-MX')} | OC: {detail.ordenCompra.folio}
              </p>

              {/* MOS items */}
              {mosItems.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Badge>MOS</Badge> Mostrador
                      </span>
                      <Badge variant="outline">{mosItems.length} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad Asignada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mosItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.producto?.nombre || '—'}</TableCell>
                            <TableCell className="font-medium">
                              {Number(item.cantidadAsignada)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* INS items */}
              {insItems.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary">INS</Badge> Insumos
                      </span>
                      <Badge variant="outline">{insItems.length} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Insumo</TableHead>
                          <TableHead>Cantidad Asignada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.insumo?.nombre || '—'}</TableCell>
                            <TableCell className="font-medium">
                              {Number(item.cantidadAsignada)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {detail.items.length === 0 && (
                <p className="text-center text-slate-400 py-4">No hay items en esta entrega</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
