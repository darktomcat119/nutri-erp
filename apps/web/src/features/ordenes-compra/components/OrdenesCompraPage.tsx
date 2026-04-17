'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Check, Play, Eye, Plus, Loader2, FileDown, History } from 'lucide-react';
import { toast } from 'sonner';

interface OC {
  id: string; semana: string; folio: string; estado: string;
  totalEstimado: string | null; totalReal: string | null; createdAt: string;
  _count: { items: number };
}

interface OCDetail {
  id: string; folio: string; semana: string; estado: string;
  totalEstimado: string | null; totalReal: string | null;
  itemsBySupplier: Array<{
    proveedor: { id: string; nombre: string; ordenRuta: number };
    items: Array<{
      id: string; area: string; cantidadSolicitada: string; cantidadComprada: string | null;
      precioEstimado: string; precioReal: string | null; comprado: boolean;
      producto: { nombre: string; codigo: string } | null;
      insumo: { nombre: string; codigo: string } | null;
    }>;
  }>;
}

const estadoStyles: Record<string, string> = {
  GENERADA: 'bg-slate-100 text-slate-700',
  APROBADA: 'bg-blue-100 text-blue-700',
  EN_EJECUCION: 'bg-amber-100 text-amber-700',
  COMPLETADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-red-100 text-red-700',
};

export function OrdenesCompraPage(): JSX.Element {
  const [ocs, setOcs] = useState<OC[]>([]);
  const [semana, setSemana] = useState('');
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<OCDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cambios, setCambios] = useState<Array<{ id: string; tipoCambio: string; valorAnterior: string; valorNuevo: string; motivo?: string; usuario?: { nombre: string }; item?: { producto?: { nombre: string }; insumo?: { nombre: string } } }>>([]);

  const load = useCallback(async (): Promise<void> => {
    try {
      const r = await api.get('/ordenes-compra');
      setOcs(r.data.data);
    } catch { toast.error('Error al cargar ordenes'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generar = async (): Promise<void> => {
    if (!semana) { toast.error('Ingresa la semana (ej: 2026-W12)'); return; }
    setGenerating(true);
    try {
      await api.post('/ordenes-compra/generar', { semana });
      toast.success('Orden de compra generada exitosamente');
      setSemana('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al generar';
      toast.error(msg);
    } finally { setGenerating(false); }
  };

  const viewDetail = async (id: string): Promise<void> => {
    try {
      const r = await api.get(`/ordenes-compra/${id}/por-proveedor`);
      setDetail(r.data.data);
      setDetailOpen(true);

      const cambiosRes = await api.get(`/ordenes-compra/${id}/cambios`).catch(() => null);
      const cambiosData = cambiosRes?.data?.data;
      setCambios(Array.isArray(cambiosData) ? cambiosData : cambiosData?.data || []);
    } catch { toast.error('Error al cargar detalle'); }
  };

  const aprobar = async (id: string): Promise<void> => {
    try { await api.patch(`/ordenes-compra/${id}/aprobar`); toast.success('Orden aprobada'); load(); setDetailOpen(false); }
    catch { toast.error('Error al aprobar'); }
  };

  const iniciarEjecucion = async (id: string): Promise<void> => {
    try { await api.patch(`/ordenes-compra/${id}/iniciar-ejecucion`); toast.success('Ejecucion iniciada'); load(); setDetailOpen(false); }
    catch { toast.error('Error al iniciar'); }
  };

  return (
    <div className="space-y-6">
      {/* Generate OC */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Generar Orden de Compra</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-xs text-slate-500">Semana</label>
              <Input value={semana} onChange={(e) => setSemana(e.target.value)} placeholder="2026-W12" className="w-full sm:w-40" />
            </div>
            <Button onClick={generar} disabled={generating} className="w-full sm:w-auto min-h-[44px]">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Generar OC
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Se consolidaran todas las requisiciones aprobadas de la semana seleccionada.</p>
        </CardContent>
      </Card>

      {/* OC List */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead><TableHead>Semana</TableHead><TableHead>Items</TableHead>
              <TableHead>Total Estimado</TableHead><TableHead>Total Real</TableHead>
              <TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ocs.length ? ocs.map((oc) => (
              <TableRow key={oc.id}>
                <TableCell className="font-mono text-sm">{oc.folio}</TableCell>
                <TableCell>{oc.semana}</TableCell>
                <TableCell>{oc._count.items}</TableCell>
                <TableCell>{oc.totalEstimado ? `$${Number(oc.totalEstimado).toFixed(2)}` : '—'}</TableCell>
                <TableCell>{oc.totalReal ? `$${Number(oc.totalReal).toFixed(2)}` : '—'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[oc.estado] || ''}`}>
                    {oc.estado.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-500">{new Date(oc.createdAt).toLocaleDateString('es-MX')}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => viewDetail(oc.id)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="Descargar PDF" onClick={async () => { try { const r = await api.get(`/ordenes-compra/${oc.id}/pdf`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href = url; a.download = `${oc.folio}.pdf`; a.click(); window.URL.revokeObjectURL(url); } catch { toast.error('Error al generar PDF'); } }}><FileDown className="h-4 w-4 text-red-500" /></Button>
                    {oc.estado === 'GENERADA' && <Button variant="ghost" size="icon" onClick={() => aprobar(oc.id)} title="Aprobar"><Check className="h-4 w-4 text-blue-600" /></Button>}
                    {oc.estado === 'APROBADA' && <Button variant="ghost" size="icon" onClick={() => iniciarEjecucion(oc.id)} title="Iniciar ejecucion"><Play className="h-4 w-4 text-amber-600" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><div className="flex flex-col items-center gap-2 text-slate-400"><ShoppingCart className="h-8 w-8" /><p className="text-sm font-medium">No hay ordenes de compra</p><p className="text-xs">Genera una OC desde las requisiciones aprobadas</p></div></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5" />
              {detail?.folio} — {detail?.semana}
              {detail && <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[detail.estado] || ''}`}>{detail.estado.replace('_', ' ')}</span>}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <p>Total Estimado: <span className="font-bold">${Number(detail.totalEstimado || 0).toFixed(2)}</span></p>
                {detail.totalReal && <p>Total Real: <span className="font-bold text-emerald-600">${Number(detail.totalReal).toFixed(2)}</span></p>}
              </div>

              {detail.itemsBySupplier?.map((group) => (
                <Card key={group.proveedor.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{group.proveedor.ordenRuta}. {group.proveedor.nombre}</span>
                      <Badge variant="outline">{group.items.length} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead><TableHead>Producto/Insumo</TableHead>
                          <TableHead>Cant. Solicitada</TableHead><TableHead>Cant. Comprada</TableHead>
                          <TableHead>Precio Est.</TableHead><TableHead>Precio Real</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item) => (
                          <TableRow key={item.id} className={item.comprado && (Number(item.cantidadComprada) !== Number(item.cantidadSolicitada) || Number(item.precioReal) !== Number(item.precioEstimado)) ? 'bg-amber-50' : ''}>
                            <TableCell><Badge variant={item.area === 'MOS' ? 'default' : 'secondary'}>{item.area}</Badge></TableCell>
                            <TableCell>{item.producto?.nombre || item.insumo?.nombre || '—'}</TableCell>
                            <TableCell>{Number(item.cantidadSolicitada)}</TableCell>
                            <TableCell>{item.cantidadComprada ? Number(item.cantidadComprada) : '—'}</TableCell>
                            <TableCell>${Number(item.precioEstimado).toFixed(2)}</TableCell>
                            <TableCell>{item.precioReal ? `$${Number(item.precioReal).toFixed(2)}` : '—'}</TableCell>
                            <TableCell>{item.comprado ? <Badge className="bg-emerald-100 text-emerald-700">Comprado</Badge> : <Badge variant="outline">Pendiente</Badge>}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2 justify-end">
                {detail.estado === 'GENERADA' && <Button onClick={() => aprobar(detail.id)} className="bg-blue-600 hover:bg-blue-700">Aprobar Orden</Button>}
                {detail.estado === 'APROBADA' && <Button onClick={() => iniciarEjecucion(detail.id)} className="bg-amber-600 hover:bg-amber-700">Iniciar Ejecucion</Button>}
              </div>

              {/* Change Log */}
              {cambios.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historial de Cambios ({cambios.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {cambios.map((c) => (
                        <div key={c.id} className="flex items-start gap-3 text-xs border-b border-slate-50 pb-2">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                            c.tipoCambio === 'PRECIO' ? 'bg-amber-50 text-amber-600' :
                            c.tipoCambio === 'CANTIDAD' ? 'bg-blue-50 text-blue-600' :
                            'bg-violet-50 text-violet-600'
                          }`}>
                            {c.tipoCambio === 'PRECIO' ? '$' : c.tipoCambio === 'CANTIDAD' ? '#' : '\u2192'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-700">
                              {c.item?.producto?.nombre || c.item?.insumo?.nombre} — {c.tipoCambio}
                            </p>
                            <p className="text-slate-400">
                              {c.valorAnterior} → {c.valorNuevo}
                              {c.motivo && ` — "${c.motivo}"`}
                            </p>
                          </div>
                          <span className="text-slate-300 shrink-0">{c.usuario?.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
