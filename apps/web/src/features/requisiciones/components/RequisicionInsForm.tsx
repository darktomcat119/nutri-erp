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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Save, Send, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  costoUnitario: string;
  presentacion: string;
  categoria?: { nombre: string } | null;
  activo: boolean;
}

interface BudgetData {
  id: string;
  montoAprobado: string | null;
  montoCalculado: string;
  estado: string;
}

interface ExistingReq {
  id: string;
  semana: string;
  area: string;
  estado: string;
  notas: string | null;
  justificacionExceso: string | null;
  presupuestoInsId: string | null;
  items: Array<{
    insumoId: string | null;
    cantidadSolicitada: string;
    notas: string | null;
  }>;
}

interface ItemState {
  cantidad: number;
  notas: string;
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil(diff / oneWeek + start.getDay() / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RequisicionInsForm(): JSX.Element {
  const user = useAuthStore((s) => s.user);

  const [semana, setSemana] = useState(getCurrentWeek());
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, ItemState>>({});
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [estado, setEstado] = useState('BORRADOR');
  const [notas, setNotas] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Load all active insumos
  const loadInsumos = useCallback(async (): Promise<void> => {
    try {
      const r = await api.get('/insumos');
      const data: Insumo[] = r.data.data || r.data;
      setInsumos(data.filter((i) => i.activo !== false));
    } catch {
      toast.error('Error al cargar insumos');
    }
  }, []);

  // Load budget for current week and branch
  const loadBudget = useCallback(async (): Promise<void> => {
    if (!user?.sucursalId || !semana) return;
    setBudgetLoading(true);
    try {
      const r = await api.get(`/presupuesto-ins/branch/${semana}/${user.sucursalId}`);
      const data = r.data.data || r.data;
      if (data && data.estado === 'APROBADO') {
        setBudget(data);
      } else {
        setBudget(null);
      }
    } catch {
      setBudget(null);
    } finally {
      setBudgetLoading(false);
    }
  }, [semana, user?.sucursalId]);

  // Load existing requisition for this week
  const loadExisting = useCallback(async (): Promise<void> => {
    if (!user?.sucursalId) return;
    try {
      const r = await api.get('/requisiciones/mi-sucursal');
      const reqs: ExistingReq[] = r.data.data || r.data;
      const found = reqs.find((req) => req.semana === semana && req.area === 'INS');
      if (found) {
        const detail = await api.get(`/requisiciones/${found.id}`);
        const req: ExistingReq = detail.data.data || detail.data;
        setExistingId(req.id);
        setEstado(req.estado);
        setNotas(req.notas || '');
        setJustificacion(req.justificacionExceso || '');
        const map: Record<string, ItemState> = {};
        for (const item of req.items) {
          if (item.insumoId) {
            map[item.insumoId] = {
              cantidad: Number(item.cantidadSolicitada),
              notas: item.notas || '',
            };
          }
        }
        setItemsMap(map);
      } else {
        setExistingId(null);
        setEstado('BORRADOR');
        setItemsMap({});
        setNotas('');
        setJustificacion('');
      }
    } catch {
      // No existing requisition
    }
  }, [semana, user?.sucursalId]);

  useEffect(() => {
    loadInsumos();
  }, [loadInsumos]);
  useEffect(() => {
    loadBudget();
  }, [loadBudget]);
  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  // Calculate totals
  const spent = useMemo(() => {
    return insumos.reduce((sum, ins) => {
      const item = itemsMap[ins.id];
      if (item && item.cantidad > 0) {
        return sum + item.cantidad * Number(ins.costoUnitario);
      }
      return sum;
    }, 0);
  }, [insumos, itemsMap]);

  const budgetAmount = budget ? Number(budget.montoAprobado || budget.montoCalculado) : 0;
  const remaining = budgetAmount - spent;
  const overBudget = budget ? spent > budgetAmount : false;
  const pct = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

  // Filter insumos by search term
  const filteredInsumos = useMemo(() => {
    if (!searchTerm.trim()) return insumos;
    const term = searchTerm.toLowerCase();
    return insumos.filter(
      (i) =>
        i.nombre.toLowerCase().includes(term) ||
        i.codigo.toLowerCase().includes(term) ||
        (i.categoria?.nombre || '').toLowerCase().includes(term),
    );
  }, [insumos, searchTerm]);

  const updateCantidad = (insumoId: string, cantidad: number): void => {
    setItemsMap((prev) => ({
      ...prev,
      [insumoId]: { ...prev[insumoId], cantidad, notas: prev[insumoId]?.notas || '' },
    }));
  };

  const save = async (submit: boolean): Promise<void> => {
    const activeItems = Object.entries(itemsMap).filter(([, v]) => v.cantidad > 0);
    if (activeItems.length === 0) {
      toast.error('Agrega al menos un insumo con cantidad');
      return;
    }
    if (submit && overBudget && !justificacion.trim()) {
      toast.error('Debes incluir una justificacion');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        semana,
        area: 'INS' as const,
        presupuestoInsId: budget?.id || undefined,
        justificacionExceso: overBudget ? justificacion : undefined,
        notas: notas || undefined,
        items: activeItems.map(([insumoId, v]) => ({
          area: 'INS' as const,
          insumoId,
          cantidadSolicitada: v.cantidad,
        })),
      };

      if (existingId) {
        await api.patch(`/requisiciones/${existingId}`, {
          notas: payload.notas,
          justificacionExceso: payload.justificacionExceso,
          items: payload.items,
        });
        if (submit) await api.post(`/requisiciones/${existingId}/enviar`);
      } else {
        const r = await api.post('/requisiciones', payload);
        const newId = (r.data.data || r.data).id;
        setExistingId(newId);
        if (submit) await api.post(`/requisiciones/${newId}/enviar`);
      }

      toast.success(
        submit ? 'Requisicion enviada para aprobacion' : 'Requisicion guardada como borrador',
      );
      if (submit) setEstado('ENVIADA');
      await loadExisting();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(text || 'Error al guardar la requisicion');
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = estado !== 'BORRADOR' && estado !== 'RECHAZADA';

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">
                Requisicion INS — {user?.sucursal?.codigo || 'Mi Sucursal'}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">{user?.sucursal?.nombre}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Semana</Label>
                <Input
                  type="week"
                  value={semana}
                  onChange={(e) => setSemana(e.target.value)}
                  className="w-40 min-h-[44px]"
                  disabled={isReadOnly}
                />
              </div>
              <Badge
                className={
                  estado === 'BORRADOR'
                    ? 'bg-slate-100 text-slate-700'
                    : estado === 'ENVIADA'
                      ? 'bg-amber-100 text-amber-700'
                      : estado === 'APROBADA'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                }
              >
                {estado}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Budget Warning */}
      {!budgetLoading && !budget && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            No hay presupuesto aprobado para esta semana. Contacta al administrador.
          </p>
        </div>
      )}

      {/* Budget Tracker */}
      {budget && (
        <div className="sticky top-14 md:top-0 z-30 bg-white/90 backdrop-blur-sm border-b p-3 mb-4 rounded-lg border">
          <div className="flex items-center justify-between text-sm">
            <span>
              Presupuesto: <b>{formatCurrency(budgetAmount)}</b>
            </span>
            <span>
              Gastado:{' '}
              <b className={overBudget ? 'text-red-600' : 'text-slate-900'}>
                {formatCurrency(spent)}
              </b>
            </span>
            <span>
              Disponible:{' '}
              <b className={overBudget ? 'text-red-600' : 'text-emerald-600'}>
                {formatCurrency(remaining)}
              </b>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar insumo por nombre, codigo o categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 min-h-[44px]"
        />
      </div>

      {/* Insumos Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead className="w-28">Categoria</TableHead>
              <TableHead className="w-20">Unidad</TableHead>
              <TableHead className="w-28">Costo Unit.</TableHead>
              <TableHead className="w-28">Cantidad</TableHead>
              <TableHead className="w-28">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInsumos.length ? (
              filteredInsumos.map((ins) => {
                const item = itemsMap[ins.id];
                const cantidad = item?.cantidad || 0;
                const costo = Number(ins.costoUnitario);
                const subtotal = cantidad * costo;
                const isDisplay = ins.presentacion === 'Display';

                return (
                  <TableRow key={ins.id} className={cantidad > 0 ? 'bg-blue-50/50' : ''}>
                    <TableCell className="font-medium">{ins.nombre}</TableCell>
                    <TableCell>
                      {ins.categoria?.nombre ? (
                        <Badge variant="outline" className="text-xs">
                          {ins.categoria.nombre}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{ins.unidad}</TableCell>
                    <TableCell>{formatCurrency(costo)}</TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span>{cantidad}</span>
                      ) : (
                        <Input
                          type="number"
                          step={isDisplay ? '1' : '0.1'}
                          min="0"
                          value={cantidad || ''}
                          onChange={(e) => {
                            const val = isDisplay
                              ? Math.floor(Number(e.target.value))
                              : Number(e.target.value);
                            updateCantidad(ins.id, Math.max(0, val));
                          }}
                          placeholder="0"
                          className="w-24 h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell className={subtotal > 0 ? 'font-medium' : 'text-slate-400'}>
                      {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-16 text-center text-slate-500">
                  {searchTerm ? 'No se encontraron insumos' : 'Sin insumos disponibles'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Budget Exceeded Warning */}
      {overBudget && (
        <Card className="border-red-200 bg-red-50 mt-4">
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-red-800">
              El monto excede el presupuesto aprobado
            </p>
            <p className="text-xs text-red-600 mb-2">
              Debes incluir una justificacion para enviar la requisicion.
            </p>
            <Textarea
              placeholder="Justificacion del exceso de presupuesto..."
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              className="min-h-[80px]"
              disabled={isReadOnly}
            />
          </CardContent>
        </Card>
      )}

      {/* Notas */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs font-medium">Notas generales (opcional)</Label>
          <Textarea
            placeholder="Notas adicionales..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="min-h-[60px] mt-1.5"
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold">Total: {formatCurrency(spent)}</p>
              <p className="text-xs text-slate-500">
                {Object.values(itemsMap).filter((v) => v.cantidad > 0).length} insumos seleccionados
              </p>
            </div>
            {!isReadOnly && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => save(false)}
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <Save className="h-4 w-4 mr-2" /> Guardar Borrador
                </Button>
                <Button
                  onClick={() => save(true)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto min-h-[44px]"
                >
                  <Send className="h-4 w-4 mr-2" /> Enviar para Aprobacion
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
