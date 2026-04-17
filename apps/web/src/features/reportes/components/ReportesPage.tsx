'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart3, FileText, ShoppingCart, Truck, DollarSign, Loader2, TrendingUp, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

/* ---------- Types ---------- */

interface ResumenSemanal {
  totalRequisiciones: number;
  totalOrdenesCompra: number;
  totalEntregas: number;
  gastoTotal: number;
}

interface GastoProveedor {
  proveedor: string;
  total: number;
  area: string;
}

interface Diferencia {
  sucursal: string;
  item: string;
  area: string;
  esperada: number;
  recibida: number;
  diferencia: number;
}

/* ---------- Helpers ---------- */

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime() + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000;
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek + start.getDay() / 7));
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

const PIE_COLORS = { MOS: '#3b82f6', INS: '#10b981' };

/* ---------- Component ---------- */

export function ReportesPage(): JSX.Element {
  const [semana, setSemana] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(false);

  const [resumen, setResumen] = useState<ResumenSemanal | null>(null);
  const [gastos, setGastos] = useState<GastoProveedor[]>([]);
  const [diferencias, setDiferencias] = useState<Diferencia[]>([]);

  const load = async (): Promise<void> => {
    if (!semana) {
      toast.error('Selecciona una semana');
      return;
    }
    setLoading(true);
    try {
      const [resumenRes, gastosRes, difRes] = await Promise.all([
        api.get(`/reportes/resumen-semanal/${semana}`),
        api.get(`/reportes/gastos-proveedor/${semana}`),
        api.get(`/reportes/diferencias/${semana}`),
      ]);
      setResumen(resumenRes.data.data);
      setGastos(gastosRes.data.data);
      setDiferencias(difRes.data.data);
    } catch {
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  /* --- Derived data for charts --- */
  const pieData = gastos.reduce<{ name: string; value: number }[]>((acc, g) => {
    const area = g.area === 'MOS' ? 'MOS' : 'INS';
    const existing = acc.find((a) => a.name === area);
    if (existing) {
      existing.value += g.total;
    } else {
      acc.push({ name: area, value: g.total });
    }
    return acc;
  }, []);

  const difSummary = diferencias.reduce(
    (acc, d) => {
      acc.totalItems += 1;
      if (d.diferencia < 0) acc.totalShortage += Math.abs(d.diferencia);
      if (d.diferencia > 0) acc.totalSurplus += d.diferencia;
      return acc;
    },
    { totalItems: 0, totalShortage: 0, totalSurplus: 0 },
  );

  return (
    <div className="space-y-6">
      {/* ---- Header: Week Selector ---- */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="semana-input" className="mb-1 block text-sm font-medium">
                Semana
              </Label>
              <Input
                id="semana-input"
                type="week"
                value={semana}
                onChange={(e) => setSemana(e.target.value)}
                className="w-full sm:w-48 min-h-[44px]"
              />
            </div>
            <Button
              onClick={load}
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              Cargar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- Section 1: Weekly Summary Cards ---- */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requisiciones</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.totalRequisiciones}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordenes de Compra</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.totalOrdenesCompra}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.totalEntregas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumen.gastoTotal)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---- Section 2: Supplier Spending Charts ---- */}
      {gastos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart: 2/3 width on desktop */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Gasto por Proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={Math.max(300, gastos.length * 40)}>
                  <BarChart data={gastos} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} />
                    <YAxis dataKey="proveedor" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie chart: 1/3 width on desktop */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">MOS vs INS</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={(props) =>
                      `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || '#8884d8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            {/* Legend */}
            <div className="flex justify-center gap-6 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600">MOS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-600">INS</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ---- Section 3: Differences Report ---- */}
      {diferencias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Reporte de Diferencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Esperada</TableHead>
                    <TableHead className="text-right">Recibida</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diferencias.map((d, idx) => (
                    <TableRow key={`${d.sucursal}-${d.item}-${idx}`}>
                      <TableCell className="min-h-[44px]">{d.sucursal}</TableCell>
                      <TableCell>{d.item}</TableCell>
                      <TableCell>
                        <Badge
                          variant={d.area === 'MOS' ? 'default' : 'secondary'}
                          className={
                            d.area === 'MOS'
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          }
                        >
                          {d.area}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{d.esperada}</TableCell>
                      <TableCell className="text-right">{d.recibida}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            d.diferencia < 0
                              ? 'text-red-600 font-medium'
                              : d.diferencia > 0
                                ? 'text-emerald-600 font-medium'
                                : 'text-slate-500'
                          }
                        >
                          {d.diferencia < 0 && <TrendingDown className="inline h-3 w-3 mr-1" />}
                          {d.diferencia > 0 && <TrendingUp className="inline h-3 w-3 mr-1" />}
                          {d.diferencia > 0 ? '+' : ''}{d.diferencia}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-sm text-slate-500">Items con diferencias</p>
                <p className="text-lg font-bold text-slate-900">{difSummary.totalItems}</p>
              </div>
              <div className="rounded-lg border p-3 text-center border-red-200 bg-red-50">
                <p className="text-sm text-red-600">Faltante total</p>
                <p className="text-lg font-bold text-red-700">
                  <TrendingDown className="inline h-4 w-4 mr-1" />
                  {difSummary.totalShortage}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center border-emerald-200 bg-emerald-50">
                <p className="text-sm text-emerald-600">Excedente total</p>
                <p className="text-lg font-bold text-emerald-700">
                  <TrendingUp className="inline h-4 w-4 mr-1" />
                  {difSummary.totalSurplus}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no data loaded */}
      {!loading && !resumen && (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <BarChart3 className="mx-auto h-12 w-12 mb-4 text-slate-300" />
            <p className="text-lg font-medium">Selecciona una semana y carga el reporte</p>
            <p className="text-sm mt-1">Los datos del resumen semanal, gastos por proveedor y diferencias se mostrar&aacute;n aqu&iacute;.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
