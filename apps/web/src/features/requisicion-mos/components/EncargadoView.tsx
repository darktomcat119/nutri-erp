'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Loader2,
  Package,
  ShoppingCart,
  MessageSquarePlus,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RequisicionMosItem, RequisicionMosDetail } from './types';
import { estadoBadge, getCurrentWeek, fmtMoney } from './types';

export function EncargadoView({ sucursalId }: { sucursalId: string | null }): JSX.Element {
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
  const [markingReviewed, setMarkingReviewed] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!sucursalId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
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

  useEffect(() => {
    load();
  }, [load]);

  const openSuggest = (item: RequisicionMosItem): void => {
    setActiveItem(item);
    setCantidadNueva(String(item.cantidadFinal ?? item.displaysAComprar));
    setComentario(item.sugerenciaEncargado || '');
    setSuggestOpen(true);
  };

  const handleSuggest = async (): Promise<void> => {
    if (!detail || !activeItem) return;
    if (!comentario.trim()) {
      toast.error('El comentario es requerido');
      return;
    }
    const cantidad = Number(cantidadNueva);
    if (Number.isNaN(cantidad) || cantidad < 0) {
      toast.error('Cantidad invalida');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/requisicion-mos/${detail.id}/sugerir/${activeItem.id}`, {
        sugerencia: comentario.trim(),
        cantidadFinal: Math.floor(cantidad),
      });
      toast.success('Sugerencia enviada');
      setSuggestOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(text || 'Error al enviar la sugerencia');
    } finally {
      setSaving(false);
    }
  };

  const markAsReviewed = async (): Promise<void> => {
    if (!detail) return;
    setMarkingReviewed(true);
    try {
      await api.patch(`/requisicion-mos/${detail.id}/revisar`);
      toast.success('Requisicion marcada como revisada');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(text || 'Error al marcar como revisada');
    } finally {
      setMarkingReviewed(false);
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
              <p className="text-sm font-medium">
                El administrador aun no ha generado tu pedido MOS para esta semana
              </p>
              <p className="text-xs mt-1">Vuelve a revisar mas tarde o contacta al administrador</p>
            </div>
          ) : (
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
                          {item.cantidadFinal != null || item.sugerenciaEncargado ? (
                            <div className="text-xs">
                              {item.cantidadFinal != null && (
                                <Badge className="bg-amber-100 text-amber-700">
                                  {item.cantidadFinal}
                                </Badge>
                              )}
                              {item.sugerenciaEncargado && (
                                <div className="text-slate-500 mt-1">
                                  {item.sugerenciaEncargado}
                                </div>
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

              <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-lg font-bold">Total: {fmtMoney(detail.totalDinero)}</p>
                {detail.estado === 'GENERADA' && (
                  <Button
                    onClick={markAsReviewed}
                    disabled={markingReviewed}
                    className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px] w-full sm:w-auto"
                  >
                    {markingReviewed ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Marcar como Revisada
                  </Button>
                )}
                {detail.estado === 'REVISADA' && (
                  <Badge className="bg-emerald-100 text-emerald-700 self-start sm:self-auto">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Revisada
                  </Badge>
                )}
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
                  Cantidad calculada:{' '}
                  <span className="font-semibold">{activeItem.displaysAComprar}</span>
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
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                  )}
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
