'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Check, X, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Presupuesto } from './types';
import { formatMoney, formatDate, estadoVariant } from './types';

interface PresupuestosListProps {
  presupuestos: Presupuesto[];
  loadingList: boolean;
  isAdmin: boolean;
  onChanged: () => void;
}

export function PresupuestosList({
  presupuestos,
  loadingList,
  isAdmin,
  onChanged,
}: PresupuestosListProps): JSX.Element {
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
      onChanged();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al aprobar';
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
      onChanged();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al rechazar';
      toast.error(msg);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
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
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <div className="text-base font-semibold text-slate-800 mb-1.5">Sin presupuestos</div>
              <p className="text-sm text-slate-500 max-w-md">
                Aun no se han generado presupuestos. Usa el formulario anterior para crear el
                primero.
              </p>
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
                    {detailData.sucursal
                      ? `${detailData.sucursal.codigo} - ${detailData.sucursal.nombre}`
                      : '-'}
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
                          <TableCell
                            colSpan={5}
                            className="text-center text-sm text-muted-foreground"
                          >
                            Sin detalles
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detailData.detalles ?? []).map((d, idx) => (
                          <TableRow key={d.id ?? idx}>
                            <TableCell>{d.productoVendido}</TableCell>
                            <TableCell className="text-right">{d.cantidad}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(d.costoPlatillo)}
                            </TableCell>
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
                className="min-h-[44px] w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {approving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
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
                {rejecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
