'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ChevronDown, ChevronUp, Loader2, CheckCircle2, Route } from 'lucide-react';
import { toast } from 'sonner';

interface RutaItem {
  id: string;
  area: string;
  cantidadSolicitada: string;
  cantidadComprada: string | null;
  precioEstimado: string;
  precioReal: string | null;
  comprado: boolean;
  producto: { nombre: string; codigo: string } | null;
  insumo: { nombre: string; codigo: string; unidad: string } | null;
}

interface RutaSupplier {
  proveedor: { id: string; nombre: string; ordenRuta: number; categoria: string | null };
  items: RutaItem[];
  totalEstimado: number;
  completado: boolean;
}

interface RutaData {
  ordenCompra: { id: string; folio: string; semana: string; estado: string };
  ruta: RutaSupplier[];
}

interface OC {
  id: string;
  folio: string;
  semana: string;
  estado: string;
}

export function RutaChofer(): JSX.Element {
  const [ocs, setOcs] = useState<OC[]>([]);
  const [selectedOc, setSelectedOc] = useState('');
  const [ruta, setRuta] = useState<RutaData | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemValues, setItemValues] = useState<Record<string, { qty: number; price: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const loadOcs = useCallback(async (): Promise<void> => {
    try {
      const r = await api.get('/ordenes-compra?estado=EN_EJECUCION');
      const list: OC[] = r.data.data;
      // Also load APROBADA
      const r2 = await api.get('/ordenes-compra?estado=APROBADA');
      setOcs([...list, ...r2.data.data]);
      if (list.length > 0 && !selectedOc) setSelectedOc(list[0].id);
    } catch {
      toast.error('Error al cargar ordenes');
    }
  }, [selectedOc]);

  const loadRuta = useCallback(async (): Promise<void> => {
    if (!selectedOc) return;
    try {
      const r = await api.get(`/ejecucion/${selectedOc}/ruta`);
      const data: RutaData = r.data.data;
      setRuta(data);
      // Init values
      const vals: Record<string, { qty: number; price: number }> = {};
      for (const sup of data.ruta) {
        for (const item of sup.items) {
          vals[item.id] = {
            qty: item.cantidadComprada
              ? Number(item.cantidadComprada)
              : Number(item.cantidadSolicitada),
            price: item.precioReal ? Number(item.precioReal) : Number(item.precioEstimado),
          };
        }
      }
      setItemValues(vals);
    } catch {
      toast.error('Error al cargar ruta');
    }
  }, [selectedOc]);

  useEffect(() => {
    loadOcs();
  }, [loadOcs]);
  useEffect(() => {
    loadRuta();
  }, [loadRuta]);

  const comprarItem = async (itemId: string): Promise<void> => {
    const vals = itemValues[itemId];
    if (!vals) return;
    setSaving(itemId);
    try {
      await api.patch(`/ejecucion/${itemId}/comprar`, {
        cantidadComprada: vals.qty,
        precioReal: vals.price,
      });
      toast.success('Item registrado');
      loadRuta();
    } catch {
      toast.error('Error al registrar');
    } finally {
      setSaving(null);
    }
  };

  const completar = async (): Promise<void> => {
    if (!ruta) return;
    try {
      await api.post(`/ejecucion/${ruta.ordenCompra.id}/completar`);
      toast.success('Ejecucion completada!');
      loadRuta();
      loadOcs();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error';
      toast.error(msg);
    }
  };

  const allDone = ruta?.ruta.every((s) => s.completado) ?? false;

  return (
    <div className="space-y-4">
      {/* OC Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="hidden sm:block">
              <Route className="h-6 w-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <Select value={selectedOc} onValueChange={setSelectedOc}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Seleccionar orden de compra" />
                </SelectTrigger>
                <SelectContent>
                  {ocs.map((oc) => (
                    <SelectItem key={oc.id} value={oc.id}>
                      {oc.folio} — {oc.semana} ({oc.estado.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {allDone && (
              <Button
                onClick={completar}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 h-12 w-full sm:w-auto"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" /> Completar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supplier Cards */}
      {ruta?.ruta.map((sup) => (
        <Card
          key={sup.proveedor.id}
          className={sup.completado ? 'border-emerald-200 bg-emerald-50/50' : ''}
        >
          <CardHeader
            className="cursor-pointer py-4"
            onClick={() => setExpanded(expanded === sup.proveedor.id ? null : sup.proveedor.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-lg">
                  {sup.proveedor.ordenRuta}
                </span>
                <div>
                  <CardTitle className="text-lg">{sup.proveedor.nombre}</CardTitle>
                  <p className="text-sm text-slate-500">
                    {sup.items.length} items — ${sup.totalEstimado.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {sup.completado ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1">
                    Completado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {sup.items.filter((i) => i.comprado).length}/{sup.items.length}
                  </Badge>
                )}
                {expanded === sup.proveedor.id ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardHeader>

          {expanded === sup.proveedor.id && (
            <CardContent className="pt-0 space-y-3">
              {sup.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 ${item.comprado ? 'bg-emerald-50 border-emerald-200' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-base">
                        {item.producto?.nombre || item.insumo?.nombre}
                      </p>
                      <p className="text-sm text-slate-500">
                        <Badge
                          variant={item.area === 'MOS' ? 'default' : 'secondary'}
                          className="mr-2"
                        >
                          {item.area}
                        </Badge>
                        Solicitado: {Number(item.cantidadSolicitada)} — Est: $
                        {Number(item.precioEstimado).toFixed(2)}
                      </p>
                    </div>
                    {item.comprado && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                  </div>

                  {!item.comprado && (
                    <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Cantidad real</label>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-12 text-lg"
                          value={itemValues[item.id]?.qty ?? ''}
                          onChange={(e) =>
                            setItemValues({
                              ...itemValues,
                              [item.id]: { ...itemValues[item.id], qty: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Precio real</label>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-12 text-lg"
                          value={itemValues[item.id]?.price ?? ''}
                          onChange={(e) =>
                            setItemValues({
                              ...itemValues,
                              [item.id]: { ...itemValues[item.id], price: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <Button
                        onClick={() => comprarItem(item.id)}
                        disabled={saving === item.id}
                        className="h-12 px-6 bg-slate-900 col-span-2 sm:col-span-1 min-h-[44px]"
                      >
                        {saving === item.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-5 w-5 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Registrar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}

      {!ruta && (
        <p className="text-center text-slate-400 py-12">
          Selecciona una orden de compra para ver la ruta
        </p>
      )}
    </div>
  );
}
