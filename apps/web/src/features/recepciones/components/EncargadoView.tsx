'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardCheck, Check, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SignaturePad } from '@/components/signature-pad';
import type { PendingDelivery, RecepcionItemForm } from './types';

export function EncargadoView(): JSX.Element {
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
      })),
    );
    setFirmaDigital(null);
    setNotas('');
    setFormOpen(true);
  };

  const updateItemQty = (index: number, value: number) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, cantidadRecibida: value } : item)),
    );
  };

  const updateItemNotas = (index: number, value: string) => {
    setFormItems((prev) => prev.map((item, i) => (i === index ? { ...item, notas: value } : item)));
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
          <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-800 mb-1.5">
              No hay entregas pendientes
            </p>
            <p className="text-sm text-slate-500 max-w-md">
              Cuando se generen entregas para tu sucursal apareceran aqui.
            </p>
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
                          {diff !== 0 && <AlertTriangle className="h-4 w-4 ml-2 flex-shrink-0" />}
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
