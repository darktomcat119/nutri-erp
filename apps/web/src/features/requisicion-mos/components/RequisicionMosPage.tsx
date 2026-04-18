'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectEmpty } from '@/components/ui/select-empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Upload, Check, AlertTriangle, Loader2, Package, ShoppingCart, MessageSquarePlus, Zap } from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

interface RequisicionMos {
  id: string;
  semana: string;
  sucursal: { codigo: string; nombre: string };
  totalDisplays: number;
  totalDinero: string;
  estado: string;
  createdAt: string;
}

interface RequisicionMosItem {
  id: string;
  producto: { nombre: string; codigo: string };
  inventarioActual: number;
  maximo: number;
  compraNecesaria: number;
  displaysAComprar: number;
  dinero: string;
  sugerenciaCantidad?: number | null;
  sugerenciaComentario?: string | null;
}

interface RequisicionMosDetail {
  id: string;
  semana: string;
  estado: string;
  totalDisplays: number;
  totalDinero: string;
  sucursal: { codigo: string; nombre: string };
  items: RequisicionMosItem[];
}

interface GenerarResult {
  id: string;
  totalDisplays: number;
  totalDinero: number;
  productosNoVinculados: string[];
}

const estadoBadge: Record<string, string> = {
  GENERADA: 'bg-slate-100 text-slate-700',
  REVISADA: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
};

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil((diff / 604800000) + start.getDay() / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function fmtMoney(v: string | number): string {
  return `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RequisicionMosPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return isAdmin ? <AdminView canApprove={user.role === 'ADMIN'} /> : <EncargadoView sucursalId={user.sucursalId} />;
}

// ---------------------------------------------------------------------------
// ADMIN / SUPERVISOR view
// ---------------------------------------------------------------------------

function AdminView({ canApprove }: { canApprove: boolean }): JSX.Element {
  // Generate section
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [semanaGen, setSemanaGen] = useState(getCurrentWeek());
  const [file, setFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerarResult | null>(null);

  // List section
  const [requisiciones, setRequisiciones] = useState<RequisicionMos[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [semanaFilter, setSemanaFilter] = useState('');

  // Detail dialog
  const [detail, setDetail] = useState<RequisicionMosDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadSucursales = useCallback(async (): Promise<void> => {
    try {
      const r = await api.get('/sucursales');
      setSucursales(r.data.data || r.data);
    } catch {
      toast.error('Error al cargar sucursales');
    }
  }, []);

  const loadList = useCallback(async (): Promise<void> => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (semanaFilter) params.set('semana', semanaFilter);
      const r = await api.get(`/requisicion-mos?${params.toString()}`);
      setRequisiciones(r.data.data || r.data || []);
    } catch {
      toast.error('Error al cargar requisiciones');
    } finally {
      setLoadingList(false);
    }
  }, [semanaFilter]);

  useEffect(() => { loadSucursales(); }, [loadSucursales]);
  useEffect(() => { loadList(); }, [loadList]);

  const applyResult = (data: Record<string, unknown>): void => {
    const resumen = (data.resumen || data) as Record<string, unknown>;
    const req = (data.requisicion || {}) as Record<string, unknown>;
    setGenResult({
      id: String(req.id || data.id || ''),
      totalDisplays: Number(resumen.totalDisplays ?? data.totalDisplays ?? 0),
      totalDinero: Number(resumen.totalDinero ?? data.totalDinero ?? 0),
      productosNoVinculados: (resumen.noVinculados || data.productosNoVinculados || data.unmatchedNames || []) as string[],
    });
  };

  const handleGenerar = async (): Promise<void> => {
    if (!selectedSucursal) { toast.error('Selecciona una sucursal'); return; }
    if (!semanaGen) { toast.error('Selecciona la semana'); return; }
    if (!file) { toast.error('Selecciona el archivo de inventario'); return; }

    setGenerating(true);
    setGenResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sucursalId', selectedSucursal);
      formData.append('semana', semanaGen);

      const r = await api.post('/requisicion-mos/generar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyResult((r.data.data || r.data) as Record<string, unknown>);
      toast.success('Requisicion MOS generada desde Excel');
      loadList();
    } catch {
      toast.error('Error al generar la requisicion MOS');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerarLive = async (): Promise<void> => {
    if (!selectedSucursal) { toast.error('Selecciona una sucursal'); return; }
    if (!semanaGen) { toast.error('Selecciona la semana'); return; }

    setGenerating(true);
    setGenResult(null);
    const toastId = toast.loading('Consultando inventario de OrderEat...');
    try {
      const r = await api.post('/requisicion-mos/generar-live', { sucursalId: selectedSucursal, semana: semanaGen });
      applyResult((r.data.data || r.data) as Record<string, unknown>);
      toast.success('Requisicion MOS generada desde OrderEat', { id: toastId });
      loadList();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al consultar OrderEat';
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const viewDetail = async (id: string): Promise<void> => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const r = await api.get(`/requisicion-mos/${id}`);
      setDetail(r.data.data || r.data);
    } catch {
      toast.error('Error al cargar el detalle');
      setDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprove = async (id: string): Promise<void> => {
    try {
      await api.post(`/requisicion-mos/${id}/aprobar`);
      toast.success('Requisicion aprobada');
      setDetailOpen(false);
      loadList();
    } catch {
      toast.error('Error al aprobar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section A: Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Calcular Compra MOS desde Inventario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sucursal</Label>
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Seleccionar sucursal..." />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.length === 0 ? (
                    <SelectEmpty
                      icon={Package}
                      label="No hay sucursales activas"
                      hint="Crea una sucursal en Catalogos > Sucursales antes de generar requisiciones MOS."
                    />
                  ) : (
                    sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.codigo} - {s.nombre}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Semana</Label>
              <Input
                type="week"
                value={semanaGen}
                onChange={(e) => setSemanaGen(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reporte de Inventario (Excel)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="min-h-[44px] file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              onClick={handleGenerar}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto"
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Calcular desde Excel
            </Button>
            <Button
              onClick={handleGenerarLive}
              disabled={generating}
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Consulta el inventario actual de OrderEat sin necesidad de archivo"
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Calcular desde OrderEat (live)
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Excel: sube el archivo descargado del POS. Live: consulta el inventario directo de OrderEat (requiere token configurado en Integraciones).
          </p>

          {genResult && (
            <div className="rounded-lg border p-4 space-y-3 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md bg-white border p-3">
                  <p className="text-xs text-slate-500">Total Displays</p>
                  <p className="text-2xl font-bold text-blue-600">{genResult.totalDisplays}</p>
                </div>
                <div className="rounded-md bg-white border p-3">
                  <p className="text-xs text-slate-500">Total Dinero</p>
                  <p className="text-2xl font-bold text-emerald-600">{fmtMoney(genResult.totalDinero)}</p>
                </div>
              </div>
              {genResult.productosNoVinculados.length > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Productos no vinculados ({genResult.productosNoVinculados.length}):</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                      {genResult.productosNoVinculados.map((name, i) => (
                        <li key={i}>- {name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-600" />
              Requisiciones MOS
            </CardTitle>
            <Input
              placeholder="Filtrar semana (ej: 2026-W14)"
              value={semanaFilter}
              onChange={(e) => setSemanaFilter(e.target.value)}
              className="w-full sm:w-56 min-h-[44px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Total Displays</TableHead>
                  <TableHead>Total Dinero</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingList ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full max-w-[120px] bg-slate-100 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requisiciones.length ? requisiciones.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{p.semana}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.sucursal.codigo}</TableCell>
                    <TableCell>{p.totalDisplays}</TableCell>
                    <TableCell>{fmtMoney(p.totalDinero)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[p.estado] || 'bg-slate-100 text-slate-700'}`}>
                        {p.estado}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">
                      {new Date(p.createdAt).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => viewDetail(p.id)} className="min-h-[44px] min-w-[44px]">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canApprove && p.estado !== 'APROBADA' && (
                          <Button variant="ghost" size="icon" onClick={() => handleApprove(p.id)} className="min-h-[44px] min-w-[44px]">
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                      <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium">No hay requisiciones MOS</p>
                      <p className="text-xs mt-1">Genera una usando el formulario de arriba</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              Requisicion MOS {detail ? `— ${detail.sucursal.codigo} — ${detail.semana}` : ''}
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[detail.estado] || ''}`}>
                  {detail.estado}
                </span>
                <p className="text-sm text-slate-600">
                  Displays: <span className="font-semibold">{detail.totalDisplays}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Total: <span className="font-semibold">{fmtMoney(detail.totalDinero)}</span>
                </p>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-20">Inv.</TableHead>
                      <TableHead className="w-20">Maximo</TableHead>
                      <TableHead className="w-24">Compra</TableHead>
                      <TableHead className="w-20">Displays</TableHead>
                      <TableHead className="w-24">Dinero</TableHead>
                      <TableHead>Sugerencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.producto.nombre}</div>
                          <div className="text-xs text-slate-500">{item.producto.codigo}</div>
                        </TableCell>
                        <TableCell>{item.inventarioActual}</TableCell>
                        <TableCell>{item.maximo}</TableCell>
                        <TableCell>{item.compraNecesaria}</TableCell>
                        <TableCell>{item.displaysAComprar}</TableCell>
                        <TableCell>{fmtMoney(item.dinero)}</TableCell>
                        <TableCell>
                          {item.sugerenciaCantidad != null ? (
                            <div className="text-xs">
                              <Badge className="bg-amber-100 text-amber-700">{item.sugerenciaCantidad}</Badge>
                              {item.sugerenciaComentario && (
                                <div className="text-slate-500 mt-1">{item.sugerenciaComentario}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-right border-t pt-3">
                <p className="text-lg font-bold">
                  Total: {fmtMoney(detail.totalDinero)}
                </p>
              </div>

              {canApprove && detail.estado !== 'APROBADA' && (
                <div className="flex justify-end border-t pt-4">
                  <Button
                    onClick={() => handleApprove(detail.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
                  >
                    <Check className="h-4 w-4 mr-2" /> Aprobar
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ENCARGADO view
// ---------------------------------------------------------------------------

function EncargadoView({ sucursalId }: { sucursalId: string | null }): JSX.Element {
  const [semana, setSemana] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RequisicionMosDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Suggest dialog
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<RequisicionMosItem | null>(null);
  const [cantidadNueva, setCantidadNueva] = useState('');
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!sucursalId) { setLoading(false); setNotFound(true); return; }
    setLoading(true);
    setNotFound(false);
    try {
      const r = await api.get(`/requisicion-mos/branch/${semana}/${sucursalId}`);
      const data = r.data.data || r.data;
      if (!data || !data.id) {
        setDetail(null);
        setNotFound(true);
      } else {
        setDetail(data);
      }
    } catch {
      setDetail(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [semana, sucursalId]);

  useEffect(() => { load(); }, [load]);

  const openSuggest = (item: RequisicionMosItem): void => {
    setActiveItem(item);
    setCantidadNueva(String(item.sugerenciaCantidad ?? item.displaysAComprar));
    setComentario(item.sugerenciaComentario || '');
    setSuggestOpen(true);
  };

  const handleSuggest = async (): Promise<void> => {
    if (!detail || !activeItem) return;
    if (!comentario.trim()) { toast.error('El comentario es requerido'); return; }
    const cantidad = Number(cantidadNueva);
    if (Number.isNaN(cantidad) || cantidad < 0) { toast.error('Cantidad invalida'); return; }

    setSaving(true);
    try {
      await api.patch(`/requisicion-mos/${detail.id}/sugerir/${activeItem.id}`, {
        cantidad,
        comentario: comentario.trim(),
      });
      toast.success('Sugerencia enviada');
      setSuggestOpen(false);
      load();
    } catch {
      toast.error('Error al enviar la sugerencia');
    } finally {
      setSaving(false);
    }
  };

  if (!sucursalId) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-slate-500">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
          <p className="text-sm font-medium">Tu usuario no tiene una sucursal asignada</p>
          <p className="text-xs mt-1">Contacta al administrador para asignar tu sucursal</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Mi Requisicion MOS
            </CardTitle>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Semana</Label>
              <Input
                type="week"
                value={semana}
                onChange={(e) => setSemana(e.target.value)}
                className="w-full sm:w-56 min-h-[44px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : notFound || !detail ? (
            <div className="py-16 text-center text-slate-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium">El administrador aun no ha generado tu pedido MOS para esta semana</p>
              <p className="text-xs mt-1">Vuelve a revisar mas tarde o contacta al administrador</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[detail.estado] || ''}`}>
                  {detail.estado}
                </span>
                <p className="text-sm text-slate-600">
                  Displays: <span className="font-semibold">{detail.totalDisplays}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Total: <span className="font-semibold">{fmtMoney(detail.totalDinero)}</span>
                </p>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-20">Inv.</TableHead>
                      <TableHead className="w-20">Maximo</TableHead>
                      <TableHead className="w-20">Displays</TableHead>
                      <TableHead className="w-24">Dinero</TableHead>
                      <TableHead>Sugerencia</TableHead>
                      <TableHead className="w-20">Accion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.producto.nombre}</div>
                          <div className="text-xs text-slate-500">{item.producto.codigo}</div>
                        </TableCell>
                        <TableCell>{item.inventarioActual}</TableCell>
                        <TableCell>{item.maximo}</TableCell>
                        <TableCell>{item.displaysAComprar}</TableCell>
                        <TableCell>{fmtMoney(item.dinero)}</TableCell>
                        <TableCell>
                          {item.sugerenciaCantidad != null ? (
                            <div className="text-xs">
                              <Badge className="bg-amber-100 text-amber-700">{item.sugerenciaCantidad}</Badge>
                              {item.sugerenciaComentario && (
                                <div className="text-slate-500 mt-1">{item.sugerenciaComentario}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openSuggest(item)}
                            disabled={detail.estado === 'APROBADA'}
                            className="min-h-[44px] min-w-[44px]"
                            title="Sugerir Cambio"
                          >
                            <MessageSquarePlus className="h-4 w-4 text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-right border-t pt-3">
                <p className="text-lg font-bold">
                  Total: {fmtMoney(detail.totalDinero)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggest Dialog */}
      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Sugerir Cambio</DialogTitle>
          </DialogHeader>
          {activeItem && (
            <div className="space-y-4">
              <div className="rounded-md bg-slate-50 border p-3">
                <p className="font-medium text-sm">{activeItem.producto.nombre}</p>
                <p className="text-xs text-slate-500">{activeItem.producto.codigo}</p>
                <p className="text-xs text-slate-600 mt-2">
                  Cantidad calculada: <span className="font-semibold">{activeItem.displaysAComprar}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cantidad Nueva (displays)</Label>
                <Input
                  type="number"
                  min="0"
                  value={cantidadNueva}
                  onChange={(e) => setCantidadNueva(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Comentario (requerido)</Label>
                <Textarea
                  placeholder="Explica el motivo del cambio..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSuggestOpen(false)}
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSuggest}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquarePlus className="h-4 w-4 mr-2" />}
                  Enviar Sugerencia
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
