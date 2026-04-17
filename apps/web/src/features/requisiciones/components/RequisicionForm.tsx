'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Save, Send, AlertTriangle, DollarSign, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  presentacion?: string | null;
  categoria?: string | null;
  marca?: string | null;
  costoUnitario: string;
  activo?: boolean;
}

interface ExistingReq {
  id: string;
  semana: string;
  area?: string;
  estado: string;
  items: Array<{
    area: string;
    insumoId: string | null;
    cantidadSolicitada: string;
  }>;
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil(diff / oneWeek + start.getDay() / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function isDisplayPresentacion(p?: string | null): boolean {
  if (!p) return false;
  return /display/i.test(p);
}

export function RequisicionForm(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [items, setItems] = useState<Record<string, number>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [presupuesto, setPresupuesto] = useState<number>(0);
  const [hasApprovedBudget, setHasApprovedBudget] = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [semana, setSemana] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [estado, setEstado] = useState('BORRADOR');
  const [existingId, setExistingId] = useState<string | null>(null);

  const loadInsumos = useCallback(async (): Promise<void> => {
    setLoadingCatalog(true);
    try {
      const r = await api.get('/insumos');
      const list: Insumo[] = (r.data.data || r.data || []).filter(
        (i: Insumo) => i.activo !== false,
      );
      setInsumos(list);
    } catch {
      toast.error('Error al cargar insumos');
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const loadPresupuesto = useCallback(async (): Promise<void> => {
    if (!user?.sucursalId) return;
    try {
      const r = await api.get(`/presupuesto-ins/branch/${semana}/${user.sucursalId}`);
      const data = r.data.data || r.data;
      if (data && (data.estado === 'APROBADO' || data.aprobado)) {
        setPresupuesto(Number(data.montoAprobado ?? data.monto ?? 0));
        setHasApprovedBudget(true);
      } else if (data && data.montoAprobado) {
        setPresupuesto(Number(data.montoAprobado));
        setHasApprovedBudget(true);
      } else {
        setPresupuesto(0);
        setHasApprovedBudget(false);
      }
    } catch {
      setPresupuesto(0);
      setHasApprovedBudget(false);
    }
  }, [semana, user?.sucursalId]);

  const loadExisting = useCallback(async (): Promise<void> => {
    if (!user?.sucursalId) return;
    try {
      const r = await api.get('/requisiciones/mi-sucursal');
      const reqs: ExistingReq[] = r.data.data || r.data || [];
      const found = reqs.find(
        (req) => req.semana === semana && (req.area === 'INS' || !req.area),
      );
      if (found) {
        const detail = await api.get(`/requisiciones/${found.id}`);
        const req: ExistingReq = detail.data.data || detail.data;
        setExistingId(req.id);
        setEstado(req.estado);
        const map: Record<string, number> = {};
        req.items
          .filter((it) => it.area === 'INS' && it.insumoId)
          .forEach((it) => {
            map[it.insumoId as string] = Number(it.cantidadSolicitada);
          });
        setItems(map);
        setJustificacion('');
      } else {
        setExistingId(null);
        setEstado('BORRADOR');
        setItems({});
        setJustificacion('');
      }
    } catch {
      /* no existing */
    }
  }, [semana, user?.sucursalId]);

  useEffect(() => {
    loadInsumos();
  }, [loadInsumos]);
  useEffect(() => {
    loadPresupuesto();
  }, [loadPresupuesto]);
  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const total = useMemo(
    () =>
      insumos.reduce((sum, ins) => {
        const qty = items[ins.id] || 0;
        return sum + qty * Number(ins.costoUnitario);
      }, 0),
    [insumos, items],
  );

  const exceeds = total > presupuesto;
  const disponible = presupuesto - total;
  const pct = presupuesto > 0 ? (total / presupuesto) * 100 : 0;

  const barColor =
    pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor =
    pct > 100 ? 'text-red-700' : pct >= 80 ? 'text-amber-700' : 'text-emerald-700';

  const filteredInsumos = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return insumos;
    return insumos.filter((i) => {
      return (
        i.nombre.toLowerCase().includes(q) ||
        (i.categoria || '').toLowerCase().includes(q) ||
        (i.marca || '').toLowerCase().includes(q) ||
        i.codigo.toLowerCase().includes(q)
      );
    });
  }, [insumos, searchFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Insumo[]> = {};
    filteredInsumos.forEach((i) => {
      const cat = i.categoria || 'Sin Categoria';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(i);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredInsumos]);

  const updateQty = (insumoId: string, value: number): void => {
    setItems((prev) => {
      const next = { ...prev };
      if (!value || value <= 0) delete next[insumoId];
      else next[insumoId] = value;
      return next;
    });
  };

  const isReadOnly = estado !== 'BORRADOR' && estado !== 'RECHAZADA';

  const submit = async (sendForApproval: boolean): Promise<void> => {
    if (exceeds && sendForApproval && !justificacion.trim()) {
      toast.error('Debes ingresar una justificacion para exceder el presupuesto');
      return;
    }

    const itemsArray = Object.entries(items)
      .filter(([, qty]) => qty > 0)
      .map(([insumoId, cantidadSolicitada]) => ({
        area: 'INS' as const,
        insumoId,
        cantidadSolicitada,
      }));

    if (itemsArray.length === 0) {
      toast.error('Agrega al menos un insumo');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        semana,
        area: 'INS' as const,
        items: itemsArray,
        justificacionExceso: exceeds ? justificacion : undefined,
      };

      let currentId = existingId;

      if (currentId) {
        await api.patch(`/requisiciones/${currentId}`, {
          items: itemsArray,
          justificacionExceso: exceeds ? justificacion : undefined,
        });
      } else {
        const r = await api.post('/requisiciones', payload);
        currentId = r.data.data?.id || r.data.id;
        setExistingId(currentId);
      }

      if (sendForApproval && currentId) {
        await api.post(`/requisiciones/${currentId}/enviar`);
        setEstado('ENVIADA');
      }

      toast.success(sendForApproval ? 'Requisicion enviada' : 'Borrador guardado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const estadoBadgeClass =
    estado === 'BORRADOR'
      ? 'bg-slate-100 text-slate-700'
      : estado === 'ENVIADA'
        ? 'bg-amber-100 text-amber-700'
        : estado === 'APROBADA'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-6 pb-32">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Mi Requisicion de Insumos</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {user?.sucursal?.nombre || user?.sucursal?.codigo || 'Mi Sucursal'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Semana</Label>
                <Input
                  value={semana}
                  onChange={(e) => setSemana(e.target.value)}
                  className="w-32"
                  disabled={isReadOnly}
                />
              </div>
              <Badge className={estadoBadgeClass}>{estado}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Budget Banner (sticky) */}
      <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0">
        {hasApprovedBudget ? (
          <Card className="shadow-md border-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-slate-600">
                    Presupuesto:{' '}
                    <strong className="text-slate-900">
                      ${presupuesto.toFixed(2)}
                    </strong>
                  </span>
                  <span className="text-slate-600">
                    Gastado:{' '}
                    <strong className={textColor}>${total.toFixed(2)}</strong>
                  </span>
                  <span className="text-slate-600">
                    Disponible:{' '}
                    <strong className={disponible < 0 ? 'text-red-700' : 'text-slate-900'}>
                      ${disponible.toFixed(2)}
                    </strong>
                  </span>
                </div>
                <span className={`text-sm font-bold ${textColor}`}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              {exceeds && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  Has excedido el presupuesto aprobado
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md border-2 border-amber-300 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  El administrador aun no ha aprobado tu presupuesto para esta semana
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insumos List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Insumos Disponibles
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, categoria o marca..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingCatalog ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-14 bg-slate-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : filteredInsumos.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">
                {insumos.length === 0
                  ? 'No hay insumos disponibles'
                  : 'Sin resultados para tu busqueda'}
              </p>
            </div>
          ) : (
            grouped.map(([cat, list]) => (
              <div key={cat} className="space-y-2">
                <div className="sticky top-28 bg-slate-50 -mx-6 px-6 py-2 border-y border-slate-200 z-10">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    {cat}{' '}
                    <span className="text-slate-400 font-normal">({list.length})</span>
                  </h3>
                </div>
                <div className="divide-y">
                  {list.map((ins) => {
                    const isDisplay = isDisplayPresentacion(ins.presentacion);
                    const qty = items[ins.id] || 0;
                    const costo = Number(ins.costoUnitario);
                    const subtotal = qty * costo;
                    return (
                      <div
                        key={ins.id}
                        className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">
                              {ins.nombre}
                            </p>
                            {ins.categoria && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5"
                              >
                                {ins.categoria}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ins.unidad}
                            {ins.presentacion ? ` / ${ins.presentacion}` : ''}
                            {ins.marca ? ` - ${ins.marca}` : ''}
                          </p>
                        </div>
                        <div className="text-xs text-slate-600 sm:w-24 sm:text-right">
                          <span className="sm:hidden">Costo: </span>$
                          {costo.toFixed(2)}
                        </div>
                        <div className="sm:w-28">
                          <Input
                            type="number"
                            min="0"
                            step={isDisplay ? '1' : '0.1'}
                            value={qty || ''}
                            placeholder="0"
                            disabled={isReadOnly}
                            onChange={(e) =>
                              updateQty(ins.id, Number(e.target.value))
                            }
                            className="h-9"
                          />
                        </div>
                        <div
                          className={`text-sm font-semibold sm:w-24 sm:text-right ${
                            subtotal > 0 ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Total + Actions Card */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Total Requisicion
              </p>
              <p className={`text-3xl font-bold ${exceeds ? 'text-red-700' : 'text-slate-900'}`}>
                ${total.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {Object.keys(items).length} insumo(s) seleccionado(s)
              </p>
            </div>
            {hasApprovedBudget && (
              <div className="text-right text-sm">
                <p className="text-slate-500">Disponible</p>
                <p
                  className={`text-lg font-semibold ${disponible < 0 ? 'text-red-700' : 'text-emerald-700'}`}
                >
                  ${disponible.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {exceeds && !isReadOnly && (
            <div className="rounded-md border-2 border-red-300 bg-red-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-semibold">
                  Excedes el presupuesto en ${Math.abs(disponible).toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-red-800">
                  Justificacion (requerida para enviar) *
                </Label>
                <Textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Explica por que necesitas exceder el presupuesto aprobado..."
                  rows={3}
                  className="bg-white"
                />
              </div>
            </div>
          )}

          {!isReadOnly && (
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => submit(false)}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Borrador
              </Button>
              <Button
                onClick={() => submit(true)}
                disabled={
                  loading || (exceeds && !justificacion.trim())
                }
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto min-h-[44px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar para Aprobacion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
