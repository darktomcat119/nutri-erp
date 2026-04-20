'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectEmpty } from '@/components/ui/select-empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Eye,
  Upload,
  Check,
  AlertTriangle,
  Loader2,
  Package,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { Sucursal, RequisicionMos, RequisicionMosDetail, GenerarResult } from './types';
import { estadoBadge, getCurrentWeek, fmtMoney } from './types';

export function AdminView({ canApprove }: { canApprove: boolean }): JSX.Element {
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

  // Approve confirm
  const [approveId, setApproveId] = useState<string | null>(null);

  // Regenerate confirm (when a requisicion already exists for same semana/sucursal)
  const [regenPending, setRegenPending] = useState<null | { mode: 'excel' | 'live' }>(null);

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

  useEffect(() => {
    loadSucursales();
  }, [loadSucursales]);
  useEffect(() => {
    loadList();
  }, [loadList]);

  const applyResult = (data: Record<string, unknown>): void => {
    const resumen = (data.resumen || data) as Record<string, unknown>;
    const req = (data.requisicion || {}) as Record<string, unknown>;
    setGenResult({
      id: String(req.id || data.id || ''),
      totalDisplays: Number(resumen.totalDisplays ?? data.totalDisplays ?? 0),
      totalDinero: Number(resumen.totalDinero ?? data.totalDinero ?? 0),
      productosNoVinculados: (resumen.noVinculados ||
        data.productosNoVinculados ||
        data.unmatchedNames ||
        []) as string[],
    });
  };

  const existingForSelection = (): RequisicionMos | undefined => {
    if (!selectedSucursal || !semanaGen) return undefined;
    const sucCodigo = sucursales.find((s) => s.id === selectedSucursal)?.codigo;
    if (!sucCodigo) return undefined;
    return requisiciones.find((r) => r.semana === semanaGen && r.sucursal.codigo === sucCodigo);
  };

  const regenDescription = (): string => {
    const sucCodigo = sucursales.find((s) => s.id === selectedSucursal)?.codigo || '—';
    return `Ya existe una requisicion para ${sucCodigo}/${semanaGen}. Los items actuales seran reemplazados. ¿Continuar?`;
  };

  const doGenerarExcel = async (): Promise<void> => {
    setGenerating(true);
    setGenResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
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

  const doGenerarLive = async (): Promise<void> => {
    setGenerating(true);
    setGenResult(null);
    const toastId = toast.loading('Consultando inventario de OrderEat...');
    try {
      const r = await api.post('/requisicion-mos/generar-live', {
        sucursalId: selectedSucursal,
        semana: semanaGen,
      });
      applyResult((r.data.data || r.data) as Record<string, unknown>);
      toast.success('Requisicion MOS generada desde OrderEat', { id: toastId });
      loadList();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al consultar OrderEat';
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerar = async (): Promise<void> => {
    if (!selectedSucursal) {
      toast.error('Selecciona una sucursal');
      return;
    }
    if (!semanaGen) {
      toast.error('Selecciona la semana');
      return;
    }
    if (!file) {
      toast.error('Selecciona el archivo de inventario');
      return;
    }
    if (existingForSelection()) {
      setRegenPending({ mode: 'excel' });
      return;
    }
    await doGenerarExcel();
  };

  const handleGenerarLive = async (): Promise<void> => {
    if (!selectedSucursal) {
      toast.error('Selecciona una sucursal');
      return;
    }
    if (!semanaGen) {
      toast.error('Selecciona la semana');
      return;
    }
    if (existingForSelection()) {
      setRegenPending({ mode: 'live' });
      return;
    }
    await doGenerarLive();
  };

  const confirmRegen = async (): Promise<void> => {
    const mode = regenPending?.mode;
    setRegenPending(null);
    if (mode === 'excel') await doGenerarExcel();
    else if (mode === 'live') await doGenerarLive();
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

  const doApprove = async (): Promise<void> => {
    if (!approveId) return;
    try {
      await api.post(`/requisicion-mos/${approveId}/aprobar`);
      toast.success('Requisicion aprobada');
      setDetailOpen(false);
      loadList();
    } catch {
      toast.error('Error al aprobar');
    } finally {
      setApproveId(null);
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
                      <SelectItem key={s.id} value={s.id}>
                        {s.codigo} - {s.nombre}
                      </SelectItem>
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
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Calcular desde Excel
            </Button>
            <Button
              onClick={handleGenerarLive}
              disabled={generating}
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Consulta el inventario actual de OrderEat sin necesidad de archivo"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Calcular desde OrderEat (live)
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Excel: sube el archivo descargado del POS. Live: consulta el inventario directo de
            OrderEat (requiere token configurado en Integraciones).
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
                  <p className="text-2xl font-bold text-emerald-600">
                    {fmtMoney(genResult.totalDinero)}
                  </p>
                </div>
              </div>
              {genResult.productosNoVinculados.length > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Productos no vinculados ({genResult.productosNoVinculados.length}):
                    </p>
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
                ) : requisiciones.length ? (
                  requisiciones.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{p.semana}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.sucursal.codigo}</TableCell>
                      <TableCell>{p.totalDisplays}</TableCell>
                      <TableCell>{fmtMoney(p.totalDinero)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[p.estado] || 'bg-slate-100 text-slate-700'}`}
                        >
                          {p.estado}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-600">
                        {new Date(p.createdAt).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewDetail(p.id)}
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canApprove && p.estado !== 'APROBADA' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setApproveId(p.id)}
                              className="min-h-[44px] min-w-[44px]"
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
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
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[detail.estado] || ''}`}
                >
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
                              <Badge className="bg-amber-100 text-amber-700">
                                {item.sugerenciaCantidad}
                              </Badge>
                              {item.sugerenciaComentario && (
                                <div className="text-slate-500 mt-1">
                                  {item.sugerenciaComentario}
                                </div>
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
                <p className="text-lg font-bold">Total: {fmtMoney(detail.totalDinero)}</p>
              </div>

              {canApprove && detail.estado !== 'APROBADA' && (
                <div className="flex justify-end border-t pt-4">
                  <Button
                    onClick={() => setApproveId(detail.id)}
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

      <ConfirmDialog
        open={!!approveId}
        onOpenChange={(open) => {
          if (!open) setApproveId(null);
        }}
        onConfirm={doApprove}
        variant="success"
        title="Aprobar requisicion MOS"
        description="Una vez aprobada no se puede modificar el estado. ¿Continuar?"
        confirmLabel="Aprobar"
      />

      <ConfirmDialog
        open={!!regenPending}
        onOpenChange={(open) => {
          if (!open) setRegenPending(null);
        }}
        onConfirm={confirmRegen}
        variant="warning"
        title="Regenerar requisicion"
        description={regenDescription()}
        confirmLabel="Regenerar"
      />
    </div>
  );
}
