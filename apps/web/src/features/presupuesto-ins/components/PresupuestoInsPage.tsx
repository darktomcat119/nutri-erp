'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectEmpty } from '@/components/ui/select-empty';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Upload, Eye, Check, X, Loader2, AlertTriangle, FileText, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

interface PresupuestoDetalle {
  id?: string;
  productoVendido: string;
  cantidad: number;
  costoPlatillo: number;
  subtotal: number;
  vinculado: boolean;
}

interface Presupuesto {
  id: string;
  semana: string;
  sucursalId: string;
  sucursal?: { codigo: string; nombre: string };
  montoCalculado: number;
  montoAprobado?: number | null;
  estado: 'BORRADOR' | 'APROBADO' | 'RECHAZADO';
  generadoPor?: { nombre: string } | null;
  createdAt: string;
  notas?: string | null;
  detalles?: PresupuestoDetalle[];
}

interface GenerarResultado {
  id?: string;
  montoCalculado: number;
  productosVinculados: number;
  productosNoEncontrados: number;
  detalles?: PresupuestoDetalle[];
}

function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

function estadoVariant(estado: Presupuesto['estado']): string {
  switch (estado) {
    case 'APROBADO':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
    case 'RECHAZADO':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    default:
      return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
  }
}

export function PresupuestoInsPage(): JSX.Element {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);

  // Generate form
  const [sucursalId, setSucursalId] = useState<string>('');
  const [semana, setSemana] = useState<string>('');
  const [fechaEjecucion, setFechaEjecucion] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [resultado, setResultado] = useState<GenerarResultado | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailData, setDetailData] = useState<Presupuesto | null>(null);

  // Approve dialog
  const [approveOpen, setApproveOpen] = useState<boolean>(false);
  const [approveTarget, setApproveTarget] = useState<Presupuesto | null>(null);
  const [montoAprobado, setMontoAprobado] = useState<string>('');
  const [approving, setApproving] = useState<boolean>(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<Presupuesto | null>(null);
  const [rejectNotas, setRejectNotas] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);

  const loadSucursales = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/sucursales');
      const data: Sucursal[] = res.data?.data ?? res.data ?? [];
      setSucursales(data);
    } catch {
      toast.error('Error al cargar sucursales');
    }
  }, []);

  const loadPresupuestos = useCallback(async (): Promise<void> => {
    setLoadingList(true);
    try {
      const res = await api.get('/presupuesto-ins');
      const data: Presupuesto[] = res.data?.data ?? res.data ?? [];
      setPresupuestos(data);
    } catch {
      toast.error('Error al cargar presupuestos');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadSucursales();
    void loadPresupuestos();
  }, [loadSucursales, loadPresupuestos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const resetForm = (): void => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerar = async (): Promise<void> => {
    if (!sucursalId) {
      toast.error('Selecciona una sucursal');
      return;
    }
    if (!semana) {
      toast.error('Selecciona una semana');
      return;
    }
    if (!fechaEjecucion) {
      toast.error('Selecciona la fecha de ejecucion');
      return;
    }
    if (!file) {
      toast.error('Selecciona el archivo Excel de ventas');
      return;
    }

    setGenerating(true);
    setResultado(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sucursalId', sucursalId);
      formData.append('semana', semana);
      formData.append('fechaEjecucion', fechaEjecucion);
      const res = await api.post('/presupuesto-ins/generar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data: GenerarResultado = res.data?.data ?? res.data;
      setResultado(data);
      toast.success('Presupuesto calculado desde Excel');
      resetForm();
      void loadPresupuestos();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al generar presupuesto';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerarLive = async (): Promise<void> => {
    if (!sucursalId) { toast.error('Selecciona una sucursal'); return; }
    if (!semana) { toast.error('Selecciona una semana'); return; }
    if (!fechaEjecucion) { toast.error('Selecciona la fecha de ejecucion'); return; }

    setGenerating(true);
    setResultado(null);
    const toastId = toast.loading('Consultando ventas de OrderEat...');
    try {
      const res = await api.post('/presupuesto-ins/generar-live', {
        sucursalId,
        semana,
        fechaEjecucion,
      });
      const data: GenerarResultado = res.data?.data ?? res.data;
      setResultado(data);
      toast.success('Presupuesto calculado desde OrderEat', { id: toastId });
      resetForm();
      void loadPresupuestos();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al consultar OrderEat';
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = async (p: Presupuesto): Promise<void> => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await api.get(`/presupuesto-ins/${p.id}`);
      const data: Presupuesto = res.data?.data ?? res.data;
      setDetailData(data);
    } catch {
      toast.error('Error al cargar detalle');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openApprove = (p: Presupuesto): void => {
    setApproveTarget(p);
    setMontoAprobado(String(p.montoCalculado ?? ''));
    setApproveOpen(true);
  };

  const handleApprove = async (): Promise<void> => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const body: Record<string, unknown> = {};
      if (montoAprobado.trim() !== '') {
        const n = Number(montoAprobado);
        if (!Number.isFinite(n) || n < 0) {
          toast.error('Monto aprobado invalido');
          setApproving(false);
          return;
        }
        body.montoAprobado = n;
      }
      await api.post(`/presupuesto-ins/${approveTarget.id}/aprobar`, body);
      toast.success('Presupuesto aprobado');
      setApproveOpen(false);
      setApproveTarget(null);
      void loadPresupuestos();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al aprobar';
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const openReject = (p: Presupuesto): void => {
    setRejectTarget(p);
    setRejectNotas('');
    setRejectOpen(true);
  };

  const handleReject = async (): Promise<void> => {
    if (!rejectTarget) return;
    if (!rejectNotas.trim()) {
      toast.error('Las notas son requeridas para rechazar');
      return;
    }
    setRejecting(true);
    try {
      await api.post(`/presupuesto-ins/${rejectTarget.id}/rechazar`, { notas: rejectNotas.trim() });
      toast.success('Presupuesto rechazado');
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectNotas('');
      void loadPresupuestos();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al rechazar';
      toast.error(msg);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section A: Generate Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Generar Presupuesto desde Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sucursal">Sucursal</Label>
              <Select value={sucursalId} onValueChange={setSucursalId}>
                <SelectTrigger id="sucursal" className="min-h-[44px] w-full">
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.length === 0 ? (
                    <SelectEmpty
                      icon={DollarSign}
                      label="No hay sucursales activas"
                      hint="Crea una sucursal antes de generar presupuestos INS."
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
            <div className="space-y-2">
              <Label htmlFor="semana">Semana</Label>
              <Input
                id="semana"
                type="week"
                value={semana}
                onChange={(e) => setSemana(e.target.value)}
                className="min-h-[44px] w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaEjecucion">Fecha de Ejecucion</Label>
              <Input
                id="fechaEjecucion"
                type="date"
                value={fechaEjecucion}
                onChange={(e) => setFechaEjecucion(e.target.value)}
                className="min-h-[44px] w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Reporte Ventas (.xlsx)</Label>
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="min-h-[44px] w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={() => void handleGenerar()}
              disabled={generating}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Calcular desde Excel
                </>
              )}
            </Button>
            <Button
              onClick={() => void handleGenerarLive()}
              disabled={generating}
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Consulta las ventas de los ultimos 7 dias en OrderEat"
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Calcular desde OrderEat (live)
            </Button>
            {file ? <span className="text-sm text-muted-foreground">{file.name}</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Live: usa los ultimos 7 dias hasta la fecha de ejecucion. Requiere token de OrderEat configurado.
          </p>

          {resultado ? (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="space-y-2 pt-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Monto Calculado</div>
                    <div className="text-2xl font-bold">{formatMoney(resultado.montoCalculado)}</div>
                  </div>
                  <div className="flex flex-col gap-1 sm:items-end">
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {resultado.productosVinculados} productos vinculados
                    </Badge>
                    {resultado.productosNoEncontrados > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {resultado.productosNoEncontrados} no encontrados
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {resultado.productosNoEncontrados > 0 ? (
                  <p className="text-sm text-amber-700">
                    Algunos productos del reporte no se pudieron vincular a platillos. Revisa el mapeo en el modulo de platillos.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>

      {/* Section B: Budget List */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuestos Generados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : presupuestos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div>
                <div className="font-semibold">Sin presupuestos</div>
                <p className="text-sm text-muted-foreground">
                  Aun no se han generado presupuestos. Usa el formulario anterior para crear el primero.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Monto Calculado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Generado por</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presupuestos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.semana}</TableCell>
                      <TableCell>
                        {p.sucursal ? `${p.sucursal.codigo} - ${p.sucursal.nombre}` : '-'}
                      </TableCell>
                      <TableCell>{formatMoney(p.montoCalculado)}</TableCell>
                      <TableCell>
                        <Badge className={estadoVariant(p.estado)}>{p.estado}</Badge>
                      </TableCell>
                      <TableCell>{p.generadoPor?.nombre ?? '-'}</TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => void openDetail(p)}
                            className="min-h-[44px] min-w-[44px]"
                            aria-label="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && p.estado === 'BORRADOR' ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openApprove(p)}
                                className="min-h-[44px] min-w-[44px] text-emerald-700 hover:text-emerald-800"
                                aria-label="Aprobar"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openReject(p)}
                                className="min-h-[44px] min-w-[44px] text-red-700 hover:text-red-800"
                                aria-label="Rechazar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Presupuesto</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : detailData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Semana</div>
                  <div className="font-semibold">{detailData.semana}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sucursal</div>
                  <div className="font-semibold">
                    {detailData.sucursal ? `${detailData.sucursal.codigo} - ${detailData.sucursal.nombre}` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Monto Calculado</div>
                  <div className="font-semibold">{formatMoney(detailData.montoCalculado)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Monto Aprobado</div>
                  <div className="font-semibold">
                    {detailData.montoAprobado != null ? formatMoney(detailData.montoAprobado) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estado</div>
                  <Badge className={estadoVariant(detailData.estado)}>{detailData.estado}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Generado por</div>
                  <div className="font-semibold">{detailData.generadoPor?.nombre ?? '-'}</div>
                </div>
              </div>

              {detailData.notas ? (
                <div>
                  <div className="text-xs text-muted-foreground">Notas</div>
                  <p className="text-sm">{detailData.notas}</p>
                </div>
              ) : null}

              <div>
                <div className="mb-2 font-semibold">Desglose</div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto Vendido</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Platillo</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead>Vinculado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailData.detalles ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                            Sin detalles
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detailData.detalles ?? []).map((d, idx) => (
                          <TableRow key={d.id ?? idx}>
                            <TableCell>{d.productoVendido}</TableCell>
                            <TableCell className="text-right">{d.cantidad}</TableCell>
                            <TableCell className="text-right">{formatMoney(d.costoPlatillo)}</TableCell>
                            <TableCell className="text-right">{formatMoney(d.subtotal)}</TableCell>
                            <TableCell>
                              {d.vinculado ? (
                                <Badge className="bg-emerald-100 text-emerald-800">Si</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800">No</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprobar Presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Semana: <span className="font-semibold text-foreground">{approveTarget?.semana}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="montoAprobado">Monto Aprobado (opcional)</Label>
              <Input
                id="montoAprobado"
                type="number"
                step="0.01"
                min="0"
                value={montoAprobado}
                onChange={(e) => setMontoAprobado(e.target.value)}
                className="min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground">
                Por defecto: {formatMoney(approveTarget?.montoCalculado ?? 0)}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setApproveOpen(false)}
                disabled={approving}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => void handleApprove()}
                disabled={approving}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Aprobar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar Presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Semana: <span className="font-semibold text-foreground">{rejectTarget?.semana}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas (requerido)</Label>
              <Textarea
                id="notas"
                value={rejectNotas}
                onChange={(e) => setRejectNotas(e.target.value)}
                rows={4}
                placeholder="Motivo del rechazo..."
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setRejectOpen(false)}
                disabled={rejecting}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleReject()}
                disabled={rejecting}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {rejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
