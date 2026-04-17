'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Plus,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ── Types ── */

interface Sucursal {
  id: string;
  nombre: string;
  codigo: string;
}

interface BudgetVsActual {
  presupuesto: {
    semana: string;
    sucursalId: string;
    sucursal?: Sucursal;
    presupuestoMos: string | number;
    presupuestoIns: string | number;
  };
  gastoReal: { mos: number; ins: number };
  diferencia: { mos: number; ins: number };
  porcentaje: { mos: number; ins: number };
}

interface GastoProveedor {
  proveedor: string;
  total: number;
}

interface Diferencia {
  id: string;
  sucursal: string;
  producto: string;
  area: string;
  cantidadEsperada: number;
  cantidadRecibida: number;
  diferencia: number;
}

/* ── Helpers ── */

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getProgressColor(pct: number): string {
  if (pct > 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getProgressTextColor(pct: number): string {
  if (pct > 100) return 'text-red-600';
  if (pct >= 80) return 'text-amber-600';
  return 'text-emerald-600';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

/* ── Budget Progress Bar ── */

function BudgetBar({
  label,
  budget,
  actual,
}: {
  label: string;
  budget: number;
  actual: number;
}) {
  const pct = budget > 0 ? (actual / budget) * 100 : 0;
  const barWidth = Math.min(pct, 100);
  const color = getProgressColor(pct);
  const textColor = getProgressTextColor(pct);

  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={`font-semibold ${textColor}`}>
          {formatCurrency(actual)} / {formatCurrency(budget)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function FinancieroPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [semana, setSemana] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [presupuestos, setPresupuestos] = useState<{ sucursal: Sucursal; data: BudgetVsActual }[]>([]);
  const [gastosProveedor, setGastosProveedor] = useState<GastoProveedor[]>([]);
  const [diferencias, setDiferencias] = useState<Diferencia[]>([]);

  // Week closing state
  const [weekClosed, setWeekClosed] = useState(false);
  const [closingWeek, setClosingWeek] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeNotas, setCloseNotas] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSucursalId, setDialogSucursalId] = useState('');
  const [dialogMos, setDialogMos] = useState('');
  const [dialogIns, setDialogIns] = useState('');
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  // Load sucursales once
  useEffect(() => {
    api
      .get('/sucursales')
      .then((r) => setSucursales(r.data.data))
      .catch(() => toast.error('Error al cargar sucursales'));
  }, []);

  // Load all financial data for the selected week
  const loadData = useCallback(async () => {
    if (!semana) return;
    setLoading(true);
    try {
      // Load presupuestos for each sucursal
      const presupuestoPromises = sucursales.map((s) =>
        api
          .get(`/presupuestos/${semana}/${s.id}`)
          .then((r) => r.data.data)
          .catch(() => null)
      );

      const [presResults, gastosRes, difRes, cerradaRes] = await Promise.all([
        Promise.all(presupuestoPromises),
        api.get(`/reportes/gastos-proveedor/${semana}`).catch(() => null),
        api.get(`/reportes/diferencias/${semana}`).catch(() => null),
        api.get(`/presupuestos/semana-cerrada/${semana}`).catch(() => null),
      ]);

      const cerradaData = cerradaRes?.data?.data;
      const isCerrada = cerradaData?.data?.cerrada || cerradaData?.cerrada || false;
      setWeekClosed(isCerrada);

      const mapped = presResults
        .map((r, i) => r ? { sucursal: sucursales[i], data: r as BudgetVsActual } : null)
        .filter(Boolean) as { sucursal: Sucursal; data: BudgetVsActual }[];
      setPresupuestos(mapped);
      setGastosProveedor(gastosRes?.data?.data || []);
      setDiferencias(difRes?.data?.data || []);
    } catch {
      toast.error('Error al cargar datos financieros');
    } finally {
      setLoading(false);
    }
  }, [semana, sucursales]);

  const handleLoad = () => {
    if (!semana) {
      toast.error('Seleccione una semana');
      return;
    }
    loadData();
  };

  // Submit new budget
  const handleSubmitBudget = async () => {
    if (!dialogSucursalId) {
      toast.error('Seleccione una sucursal');
      return;
    }
    if (!dialogMos || !dialogIns) {
      toast.error('Ingrese ambos presupuestos');
      return;
    }
    setDialogSubmitting(true);
    try {
      await api.post('/presupuestos', {
        semana,
        sucursalId: dialogSucursalId,
        presupuestoMos: Number(dialogMos),
        presupuestoIns: Number(dialogIns),
      });
      toast.success('Presupuesto guardado exitosamente');
      setDialogOpen(false);
      setDialogSucursalId('');
      setDialogMos('');
      setDialogIns('');
      loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Error al guardar presupuesto';
      toast.error(msg);
    } finally {
      setDialogSubmitting(false);
    }
  };

  const handleCloseWeek = async () => {
    setClosingWeek(true);
    try {
      await api.post('/presupuestos/cerrar-semana', { semana, notas: closeNotas });
      toast.success('Semana cerrada');
      setWeekClosed(true);
      setCloseDialogOpen(false);
      setCloseNotas('');
    } catch {
      toast.error('Error al cerrar semana');
    } finally {
      setClosingWeek(false);
    }
  };

  const handleReopenWeek = async () => {
    try {
      await api.delete(`/presupuestos/reabrir-semana/${semana}`);
      toast.success('Semana reabierta');
      setWeekClosed(false);
    } catch {
      toast.error('Error al reabrir');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: Week Selector + Budget Management ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1 w-full sm:w-48">
              <Label htmlFor="semana" className="text-sm text-slate-600">
                Semana
              </Label>
              <Input
                id="semana"
                type="week"
                value={semana}
                onChange={(e) => setSemana(e.target.value)}
                className="w-full sm:w-48 min-h-[44px]"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end w-full sm:w-auto">
              <Button
                onClick={handleLoad}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Cargar
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Presupuesto
                </Button>
              )}
              {isAdmin && !weekClosed && (
                <Button
                  variant="outline"
                  onClick={() => setCloseDialogOpen(true)}
                  className="w-full sm:w-auto min-h-[44px] text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Semana
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week closed banner */}
      {weekClosed && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Semana Cerrada</p>
              <p className="text-xs text-amber-600">Esta semana ha sido cerrada. No se permiten modificaciones.</p>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleReopenWeek} className="text-amber-700 border-amber-300">
                Reabrir
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Section 2: Budget vs Actual Cards ── */}
          {presupuestos.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Presupuesto vs Gasto Real
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {presupuestos.map((entry) => {
                  const budgetMos = Number(entry.data.presupuesto.presupuestoMos) || 0;
                  const budgetIns = Number(entry.data.presupuesto.presupuestoIns) || 0;
                  const actualMos = entry.data.gastoReal.mos || 0;
                  const actualIns = entry.data.gastoReal.ins || 0;
                  const totalBudget = budgetMos + budgetIns;
                  const totalActual = actualMos + actualIns;
                  const totalPct =
                    totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

                  return (
                    <Card key={entry.sucursal.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {entry.sucursal.nombre}
                          {totalPct > 100 ? (
                            <Badge variant="destructive" className="ml-auto">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Excedido
                            </Badge>
                          ) : totalPct >= 80 ? (
                            <Badge
                              variant="secondary"
                              className="ml-auto bg-amber-100 text-amber-700"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Atencion
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="ml-auto bg-emerald-100 text-emerald-700"
                            >
                              <TrendingDown className="h-3 w-3 mr-1" />
                              En rango
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <BudgetBar
                          label="MOS"
                          budget={budgetMos}
                          actual={actualMos}
                        />
                        <BudgetBar
                          label="INS"
                          budget={budgetIns}
                          actual={actualIns}
                        />
                        <div className="border-t pt-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                            <span className="font-semibold text-slate-800">
                              Total
                            </span>
                            <span
                              className={`font-bold ${getProgressTextColor(totalPct)}`}
                            >
                              {formatCurrency(totalActual)} /{' '}
                              {formatCurrency(totalBudget)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section 3: Supplier Spending Chart ── */}
          {gastosProveedor.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Gastos por Proveedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={gastosProveedor}
                      margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="proveedor"
                        angle={-45}
                        textAnchor="end"
                        tick={{ fontSize: 12 }}
                        height={80}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          `$${(v / 1000).toFixed(0)}k`
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                          'Gasto',
                        ]}
                      />
                      <Bar
                        dataKey="total"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Section 4: Differences Table ── */}
          {diferencias.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Diferencias en Recepciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Producto / Insumo</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Esperada</TableHead>
                        <TableHead className="text-right">Recibida</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diferencias.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">
                            {d.sucursal}
                          </TableCell>
                          <TableCell>{d.producto}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                d.area === 'MOS' ? 'default' : 'secondary'
                              }
                            >
                              {d.area}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {d.cantidadEsperada}
                          </TableCell>
                          <TableCell className="text-right">
                            {d.cantidadRecibida}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-semibold ${
                                d.diferencia > 0
                                  ? 'text-emerald-600'
                                  : d.diferencia < 0
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              {d.diferencia > 0 ? '+' : ''}
                              {d.diferencia}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {presupuestos.length === 0 &&
            gastosProveedor.length === 0 &&
            diferencias.length === 0 &&
            !loading && (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>
                    No hay datos financieros para la semana seleccionada.
                  </p>
                  <p className="text-sm mt-1">
                    Seleccione una semana y presione &quot;Cargar&quot;.
                  </p>
                </CardContent>
              </Card>
            )}
        </>
      )}

      {/* ── New Budget Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nuevo Presupuesto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Semana</Label>
              <Input
                type="week"
                value={semana}
                disabled
                className="min-h-[44px] bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Sucursal</Label>
              <Select
                value={dialogSucursalId}
                onValueChange={setDialogSucursalId}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Presupuesto MOS</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={dialogMos}
                onChange={(e) => setDialogMos(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Presupuesto INS</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={dialogIns}
                onChange={(e) => setDialogIns(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <Button
              onClick={handleSubmitBudget}
              disabled={dialogSubmitting}
              className="w-full sm:w-auto min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
            >
              {dialogSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Guardar Presupuesto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Close Week Dialog ── */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar Semana</AlertDialogTitle>
            <AlertDialogDescription>
              Cerrar la semana {semana}? Esto impedira futuras modificaciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Notas (opcional)"
              value={closeNotas}
              onChange={(e) => setCloseNotas(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingWeek}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseWeek} disabled={closingWeek} className="bg-amber-600 hover:bg-amber-700">
              {closingWeek && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cerrar Semana
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
