'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardCheck, Check, Package, AlertTriangle, Eye, Loader2, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { SignaturePad } from '@/components/signature-pad';

/* ── Types ── */
interface PendingItem {
  id: string;
  nombre: string;
  area: string;
  cantidadAsignada: number;
}

interface PendingDelivery {
  id: string;
  folio: string;
  semana: string;
  sucursal: { nombre: string; codigo: string };
  items: PendingItem[];
  createdAt: string;
}

interface RecepcionItemForm {
  ordenEntregaItemId: string;
  nombre: string;
  area: string;
  cantidadAsignada: number;
  cantidadRecibida: number;
  notas: string;
}

interface RecepcionListItem {
  id: string;
  folio: string;
  semana: string;
  sucursal: { nombre: string; codigo: string };
  estado: string;
  firmaDigital: string | null;
  notas: string | null;
  createdAt: string;
  recibidoPor: { nombre: string } | null;
  _count?: { items: number };
}

interface RecepcionDetailItem {
  id: string;
  area: string;
  cantidadEsperada: number | string;
  cantidadRecibida: number | string;
  diferencia: number | string;
  notas: string | null;
  producto?: { nombre: string; codigo: string } | null;
  insumo?: { nombre: string; codigo: string } | null;
}

interface RecepcionDetail {
  id: string;
  folio: string;
  semana: string;
  sucursal: { nombre: string; codigo: string };
  estado: string;
  firmaDigital: string | null;
  notas: string | null;
  createdAt: string;
  recibidoPor: { nombre: string } | null;
  items: RecepcionDetailItem[];
}

/* ── Encargado view ── */
function EncargadoView() {
  const [pendientes, setPendientes] = useState<PendingDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<PendingDelivery | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formItems, setFormItems] = useState<RecepcionItemForm[]>([]);
  const [firmaDigital, setFirmaDigital] = useState<string | null>(null);
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPendientes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/recepciones/pendientes');
      // API returns OrdenEntrega with nested producto/insumo. Normalize to flat shape.
      const raw = (r.data.data || []) as Array<{
        id: string;
        createdAt: string;
        sucursal: { nombre: string; codigo: string };
        ordenCompra?: { folio?: string; semana?: string };
        items: Array<{
          id: string;
          area: string;
          cantidadAsignada: number | string;
          producto?: { nombre: string } | null;
          insumo?: { nombre: string } | null;
        }>;
      }>;
      const normalized: PendingDelivery[] = raw.map((d) => ({
        id: d.id,
        folio: d.ordenCompra?.folio || '—',
        semana: d.ordenCompra?.semana || '—',
        sucursal: d.sucursal,
        createdAt: d.createdAt,
        items: (d.items || []).map((it) => ({
          id: it.id,
          area: it.area,
          nombre: it.producto?.nombre || it.insumo?.nombre || '—',
          cantidadAsignada: Number(it.cantidadAsignada) || 0,
        })),
      }));
      setPendientes(normalized);
    } catch {
      toast.error('Error al cargar entregas pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendientes();
  }, [loadPendientes]);

  const openForm = (delivery: PendingDelivery) => {
    setSelectedDelivery(delivery);
    setFormItems(
      delivery.items.map((item) => ({
        ordenEntregaItemId: item.id,
        nombre: item.nombre,
        area: item.area,
        cantidadAsignada: item.cantidadAsignada,
        cantidadRecibida: item.cantidadAsignada,
        notas: '',
      }))
    );
    setFirmaDigital(null);
    setNotas('');
    setFormOpen(true);
  };

  const updateItemQty = (index: number, value: number) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, cantidadRecibida: value } : item))
    );
  };

  const updateItemNotas = (index: number, value: string) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, notas: value } : item))
    );
  };

  const confirmar = async () => {
    if (!selectedDelivery) return;
    if (!firmaDigital) {
      toast.error('La firma digital es requerida');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/recepciones', {
        ordenEntregaId: selectedDelivery.id,
        firmaDigital,
        notas: notas || undefined,
        items: formItems.map((item) => ({
          ordenEntregaItemId: item.ordenEntregaItemId,
          cantidadRecibida: item.cantidadRecibida,
          notas: item.notas || undefined,
        })),
      });
      toast.success('Recepcion confirmada exitosamente');
      setFormOpen(false);
      setSelectedDelivery(null);
      loadPendientes();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al confirmar recepcion';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : pendientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No hay entregas pendientes de recepcion</p>
            <p className="text-xs text-slate-400 mt-1">Cuando se generen entregas para tu sucursal aparecen aqui</p>
          </CardContent>
        </Card>
      ) : (
        pendientes.map((delivery) => (
          <Card
            key={delivery.id}
            className="cursor-pointer hover:border-slate-400 transition-colors"
            onClick={() => openForm(delivery)}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-slate-600" />
                  {delivery.folio}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{delivery.semana}</Badge>
                  <Badge variant="secondary">{delivery.sucursal.nombre}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-slate-500">
                {delivery.items.length} items &middot;{' '}
                {new Date(delivery.createdAt).toLocaleDateString('es-MX')}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {/* Reception form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Recepcion — {selectedDelivery?.folio}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Items */}
            <div className="space-y-3">
              {formItems.map((item, index) => {
                const diff = item.cantidadRecibida - item.cantidadAsignada;
                return (
                  <div key={item.ordenEntregaItemId} className="rounded-lg border p-4 bg-white">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.nombre}</span>
                        <Badge variant={item.area === 'MOS' ? 'default' : 'secondary'}>
                          {item.area}
                        </Badge>
                      </div>
                      <span className="text-sm text-slate-500">
                        Esperado: <span className="font-semibold">{item.cantidadAsignada}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Cantidad recibida</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          className="min-h-[44px]"
                          value={item.cantidadRecibida}
                          onChange={(e) => updateItemQty(index, Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Diferencia</Label>
                        <div
                          className={`flex items-center min-h-[44px] px-3 rounded-md border text-sm font-semibold ${
                            diff === 0
                              ? 'bg-slate-50 text-slate-600'
                              : diff > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff}
                          {diff !== 0 && (
                            <AlertTriangle className="h-4 w-4 ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Notas (opcional)</Label>
                        <Input
                          className="min-h-[44px]"
                          placeholder="Observaciones..."
                          value={item.notas}
                          onChange={(e) => updateItemNotas(index, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* General notes */}
            <div className="space-y-1">
              <Label className="text-sm">Notas generales (opcional)</Label>
              <Textarea
                placeholder="Observaciones generales de la recepcion..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            {/* Signature */}
            <div className="space-y-1">
              <Label className="text-sm">Firma digital *</Label>
              <SignaturePad onSignatureChange={setFirmaDigital} />
              {!firmaDigital && (
                <p className="text-xs text-slate-400">Dibuje su firma en el recuadro</p>
              )}
              {firmaDigital && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Firma capturada
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={confirmar}
              disabled={submitting || !firmaDigital}
              className="w-full sm:w-auto min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              Confirmar Recepcion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Admin/Supervisor view ── */
interface PushPreview {
  recepcionId: string;
  sucursalCodigo: string;
  eligible: Array<{ productoNombre: string; cantidadRecibidaDisplays: number; pzXDisplay: number; amountPieces: number }>;
  skipped: Array<{ item: string; reason: string }>;
}

function AdminView() {
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
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al previsualizar';
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
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al enviar';
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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
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
              {recepciones.length ? (
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
                      <Button variant="ghost" size="icon" onClick={() => viewDetail(rec.id)} className="min-h-[44px]">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    No hay recepciones registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
                <span>Semana: <strong>{detail.semana}</strong></span>
                <span className="hidden sm:inline">&middot;</span>
                <span>Sucursal: <strong>{detail.sucursal?.nombre}</strong></span>
                <span className="hidden sm:inline">&middot;</span>
                <span>Recibido por: <strong>{detail.recibidoPor?.nombre || '—'}</strong></span>
                <span className="hidden sm:inline">&middot;</span>
                <span>{new Date(detail.createdAt).toLocaleDateString('es-MX')}</span>
              </div>

              {detail.notas && (
                <div className="text-sm bg-slate-50 rounded-md p-3 border">
                  <span className="font-medium">Notas: </span>{detail.notas}
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
                        <TableRow
                          key={item.id}
                          className={diff !== 0 ? 'bg-amber-50' : ''}
                        >
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
                    <img
                      src={detail.firmaDigital}
                      alt="Firma digital"
                      className="max-h-[120px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Push-to-OrderEat preview dialog */}
      <Dialog open={!!pushPreview} onOpenChange={(o) => { if (!o) setPushPreview(null); }}>
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
                Se enviaran <strong>{pushPreview.eligible.length}</strong> movimientos de ingreso como <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">IN</code> a OrderEat. Solo items MOS con ordereatId y cantidad positiva son elegibles.
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
                          <TableCell>{e.cantidadRecibidaDisplays} × {e.pzXDisplay} pz</TableCell>
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
                      <li key={i}>• {s.item}: {s.reason}</li>
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
                  {pushing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudUpload className="h-4 w-4 mr-2" />}
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

/* ── Main page component ── */
export function RecepcionesPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isEncargado = user?.role === 'ENCARGADO';

  return (
    <div className="space-y-6">
      {isEncargado ? <EncargadoView /> : <AdminView />}
    </div>
  );
}
