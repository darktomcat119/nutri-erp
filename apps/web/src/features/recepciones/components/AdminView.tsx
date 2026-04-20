'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { ClipboardCheck, Eye, Loader2, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { RecepcionListItem, RecepcionDetail, PushPreview } from './types';

export function AdminView(): JSX.Element {
  const [recepciones, setRecepciones] = useState<RecepcionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RecepcionDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pushPreview, setPushPreview] = useState<PushPreview | null>(null);
  const [pushing, setPushing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/recepciones');
      setRecepciones(r.data.data);
    } catch {
      toast.error('Error al cargar recepciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viewDetail = async (id: string) => {
    try {
      const r = await api.get(`/recepciones/${id}`);
      setDetail(r.data.data);
      setDetailOpen(true);
    } catch {
      toast.error('Error al cargar detalle de recepcion');
    }
  };

  const openPushPreview = async () => {
    if (!detail) return;
    try {
      const r = await api.get(`/recepciones/${detail.id}/push-preview`);
      setPushPreview(r.data.data as PushPreview);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al previsualizar';
      toast.error(msg);
    }
  };

  const confirmPush = async () => {
    if (!detail) return;
    setPushing(true);
    const toastId = toast.loading('Enviando a OrderEat...');
    try {
      const r = await api.post(`/recepciones/${detail.id}/push-to-ordereat`);
      const count = r.data.data?.enviados ?? r.data.data?.data?.enviados ?? 0;
      toast.success(`${count} movimientos enviados a OrderEat`, { id: toastId });
      setPushPreview(null);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al enviar';
      toast.error(msg, { id: toastId });
    } finally {
      setPushing(false);
    }
  };

  const estadoStyles: Record<string, string> = {
    PENDIENTE: 'bg-amber-100 text-amber-700',
    COMPLETADA: 'bg-emerald-100 text-emerald-700',
    CON_DIFERENCIAS: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Semana</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Recibido por</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={8} cols={7} />
            ) : recepciones.length ? (
              recepciones.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-mono text-sm">{rec.folio}</TableCell>
                  <TableCell>{rec.semana}</TableCell>
                  <TableCell>{rec.sucursal?.nombre || '—'}</TableCell>
                  <TableCell>{rec.recibidoPor?.nombre || '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        estadoStyles[rec.estado] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.estado?.replace(/_/g, ' ') || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(rec.createdAt).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewDetail(rec.id)}
                      className="min-h-[44px]"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState icon={ClipboardCheck} title="No hay recepciones" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Recepcion — {detail?.folio}
              </DialogTitle>
              {detail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openPushPreview}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  title="Enviar cantidades recibidas a OrderEat"
                >
                  <CloudUpload className="h-3.5 w-3.5 mr-1" /> Enviar a OrderEat
                </Button>
              )}
            </div>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center text-sm text-slate-600">
                <span>
                  Semana: <strong>{detail.semana}</strong>
                </span>
                <span className="hidden sm:inline">&middot;</span>
                <span>
                  Sucursal: <strong>{detail.sucursal?.nombre}</strong>
                </span>
                <span className="hidden sm:inline">&middot;</span>
                <span>
                  Recibido por: <strong>{detail.recibidoPor?.nombre || '—'}</strong>
                </span>
                <span className="hidden sm:inline">&middot;</span>
                <span>{new Date(detail.createdAt).toLocaleDateString('es-MX')}</span>
              </div>

              {detail.notas && (
                <div className="text-sm bg-slate-50 rounded-md p-3 border">
                  <span className="font-medium">Notas: </span>
                  {detail.notas}
                </div>
              )}

              {/* Items table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Esperado</TableHead>
                      <TableHead>Recibido</TableHead>
                      <TableHead>Diferencia</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items?.map((item) => {
                      const esperada = Number(item.cantidadEsperada) || 0;
                      const recibida = Number(item.cantidadRecibida) || 0;
                      const diff = recibida - esperada;
                      const nombre = item.producto?.nombre || item.insumo?.nombre || '—';
                      return (
                        <TableRow key={item.id} className={diff !== 0 ? 'bg-amber-50' : ''}>
                          <TableCell className="font-medium">{nombre}</TableCell>
                          <TableCell>
                            <Badge variant={item.area === 'MOS' ? 'default' : 'secondary'}>
                              {item.area}
                            </Badge>
                          </TableCell>
                          <TableCell>{esperada}</TableCell>
                          <TableCell>{recibida}</TableCell>
                          <TableCell>
                            <span
                              className={`font-semibold ${
                                diff === 0
                                  ? 'text-slate-600'
                                  : diff > 0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {diff > 0 ? '+' : ''}
                              {diff}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {item.notas || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Signature preview */}
              {detail.firmaDigital && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Firma digital</Label>
                  <div className="border rounded-lg p-2 bg-white inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.firmaDigital} alt="Firma digital" className="max-h-[120px]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Push-to-OrderEat preview dialog */}
      <Dialog
        open={!!pushPreview}
        onOpenChange={(o) => {
          if (!o) setPushPreview(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5 text-emerald-600" />
              Enviar a OrderEat — {pushPreview?.sucursalCodigo}
            </DialogTitle>
          </DialogHeader>
          {pushPreview && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Se enviaran <strong>{pushPreview.eligible.length}</strong> movimientos de ingreso
                como <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">IN</code> a
                OrderEat. Solo items MOS con ordereatId y cantidad positiva son elegibles.
              </p>
              {pushPreview.eligible.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Displays</TableHead>
                        <TableHead>Piezas a enviar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pushPreview.eligible.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.productoNombre}</TableCell>
                          <TableCell>
                            {e.cantidadRecibidaDisplays} × {e.pzXDisplay} pz
                          </TableCell>
                          <TableCell className="font-mono">{e.amountPieces}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {pushPreview.skipped.length > 0 && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer font-medium">
                    {pushPreview.skipped.length} items omitidos
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4">
                    {pushPreview.skipped.map((s, i) => (
                      <li key={i}>
                        • {s.item}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setPushPreview(null)} disabled={pushing}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmPush}
                  disabled={pushing || pushPreview.eligible.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {pushing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4 mr-2" />
                  )}
                  Enviar {pushPreview.eligible.length} movimientos
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
