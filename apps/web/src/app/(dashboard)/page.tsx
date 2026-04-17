'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, ShoppingCart, Truck, DollarSign, ClipboardCheck,
  Package, ArrowRight, ArrowUpRight, ArrowDownRight,
  Users, Store, CheckCircle2, Clock, AlertCircle,
  BarChart3, Sparkles, CircleDot, Route,
} from 'lucide-react';
import Link from 'next/link';
import { HeroCarousel } from '@/components/dashboard/HeroCarousel';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
  RadialBarChart, RadialBar,
} from 'recharts';

/* ═══ Helpers ═══ */

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function formatCurrencyFull(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil((diff / 604800000) + start.getDay() / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/* ═══ Quick Actions ═══ */

const quickActions = [
  { label: 'Nueva Requisicion', description: 'Crear pedido semanal', href: '/mi-requisicion', icon: FileText, color: 'from-blue-500 to-blue-600', roles: ['ENCARGADO'] },
  { label: 'Requisiciones', description: 'Revisar y aprobar pedidos', href: '/requisiciones', icon: FileText, color: 'from-blue-500 to-blue-600', roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Ordenes de Compra', description: 'Generar y gestionar OC', href: '/ordenes-compra', icon: ShoppingCart, color: 'from-violet-500 to-violet-600', roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Ruta del Dia', description: 'Ver productos a comprar', href: '/ruta', icon: Truck, color: 'from-amber-500 to-amber-600', roles: ['CHOFER'] },
  { label: 'Entregas', description: 'Generar ordenes de entrega', href: '/entregas', icon: Package, color: 'from-emerald-500 to-emerald-600', roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Recepciones', description: 'Confirmar entregas', href: '/recepciones', icon: ClipboardCheck, color: 'from-teal-500 to-teal-600', roles: ['ADMIN', 'SUPERVISOR', 'ENCARGADO'] },
  { label: 'Control Financiero', description: 'Presupuesto vs gasto real', href: '/financiero', icon: DollarSign, color: 'from-rose-500 to-rose-600', roles: ['ADMIN'] },
  { label: 'Reportes', description: 'Resumen semanal completo', href: '/reportes', icon: BarChart3, color: 'from-indigo-500 to-indigo-600', roles: ['ADMIN', 'SUPERVISOR'] },
];

/* ═══ Animated Number ═══ */

function AnimatedValue({ value, prefix = '', suffix = '' }: { value: string; prefix?: string; suffix?: string }) {
  return (
    <span className="tabular-nums tracking-tight">
      {prefix}{value}{suffix}
    </span>
  );
}

/* ═══ Stat Card ═══ */

function StatCard({
  label, value, subtitle, icon: Icon, href, color, trend, pulse,
}: {
  label: string; value: string; subtitle?: string; icon: React.ElementType;
  href: string; color: string; trend?: { value: string; up: boolean }; pulse?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${color} opacity-[0.04] -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500`} />
        <CardContent className="pt-4 pb-3 px-4 sm:pt-5 sm:pb-4 sm:px-5 relative">
          <div className="flex items-start justify-between mb-3">
            <div className={`h-10 w-10 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`} style={{ backgroundColor: `color-mix(in srgb, currentColor 8%, transparent)` }}>
              <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div className="flex items-center gap-1.5">
              {pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
              {trend && (
                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trend.up ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                  {trend.up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                  {trend.value}
                </span>
              )}
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-slate-900 leading-none">
            <AnimatedValue value={value} />
          </p>
          <p className="text-xs text-slate-500 mt-1.5">{label}</p>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

/* ═══ Budget Gauge ═══ */

function BudgetGauge({ label, budget, spent, color }: { label: string; budget: number; spent: number; color: string }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = spent > budget;
  const barColor = isOver ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : color;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className={`text-xs font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>
          {formatCurrencyFull(spent)} / {formatCurrencyFull(budget)}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] ${isOver ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
          {isOver ? `Excedido ${formatCurrencyFull(spent - budget)}` : `Disponible ${formatCurrencyFull(budget - spent)}`}
        </span>
        <span className="text-[10px] text-slate-400">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

/* ═══ Main Dashboard ═══ */

export default function DashboardPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const semana = getCurrentWeek();
  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isEncargado = user?.role === 'ENCARGADO';
  const isChofer = user?.role === 'CHOFER';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    reqPendientes: 0, reqTotal: 0,
    ocActivas: 0, ocCompletadas: 0, ocTotal: 0,
    entregas: 0, recepciones: 0,
    productos: 0, proveedores: 0, usuarios: 0,
    gastoMos: 0, gastoIns: 0, gastoTotal: 0,
  });
  type BranchBudget = { id: string; codigo: string; nombre: string; budgetMos: number; budgetIns: number; spentMos: number; spentIns: number };
  const [branchBudgets, setBranchBudgets] = useState<BranchBudget[]>([]);
  const [supplierData, setSupplierData] = useState<{ name: string; total: number }[]>([]);
  const [activities, setActivities] = useState<{ id: string; icon: React.ElementType; color: string; label: string; detail: string; time: string }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; cost: number; qty: number }[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Unwrap double-wrapped responses: { data: { data: actual, message } } or { data: actual }
      const safe = (p: Promise<{ data: unknown }>) => p.then(r => {
        const outer = (r.data as Record<string, unknown>)?.data;
        if (outer && typeof outer === 'object' && 'data' in (outer as Record<string, unknown>)) {
          return (outer as Record<string, unknown>).data;
        }
        return outer;
      }).catch(() => null);

      const [reqs, ocs, entregas, receps, prods, provs, usrs, gastos, sucursales, resumen] = await Promise.all([
        safe(api.get('/requisiciones')),
        safe(api.get('/ordenes-compra')),
        safe(api.get('/ordenes-entrega')),
        safe(api.get('/recepciones')),
        safe(api.get('/productos')),
        safe(api.get('/proveedores')),
        safe(api.get('/usuarios')),
        safe(api.get(`/reportes/gastos-proveedor/${semana}`)),
        safe(api.get('/sucursales')),
        safe(api.get(`/reportes/resumen-semanal/${semana}`)),
      ]);

      const reqArr = (reqs || []) as Array<{ estado: string; createdAt: string; sucursal: { codigo: string }; creadoPor: { nombre: string } }>;
      const ocArr = (ocs || []) as Array<{ estado: string; folio: string; semana: string; createdAt: string; totalReal: string | null }>;
      const entArr = (entregas || []) as Array<{ id: string }>;
      const recArr = (receps || []) as Array<{ id: string; createdAt: string; sucursal: { codigo: string }; recibidoPor: { nombre: string } }>;
      const prodArr = (prods || []) as Array<{ id: string; nombre: string; costoDisplay: string }>;
      const provArr = (provs || []) as Array<{ id: string }>;
      const usrArr = (usrs || []) as Array<{ id: string }>;
      const gastosRaw = (gastos || []) as Array<{ proveedor: string | { nombre: string }; total: number; itemCount?: number }>;
      const gastosArr = gastosRaw.map(g => ({
        proveedor: typeof g.proveedor === 'string' ? g.proveedor : g.proveedor?.nombre || '',
        total: g.total,
      }));
      const sucArr = (sucursales || []) as Array<{ id: string; codigo: string; nombre: string; activa?: boolean }>;

      // Get spending from resumen or calculate from suppliers
      const resumenData = resumen as { gastoTotal?: number; gastoMos?: number; gastoIns?: number } | null;
      let gastoTotal = resumenData?.gastoTotal || 0;
      let gastoMos = resumenData?.gastoMos || 0;
      let gastoIns = resumenData?.gastoIns || 0;
      if (!gastoTotal && gastosArr.length > 0) {
        for (const g of gastosArr) gastoTotal += g.total;
        gastoMos = gastoTotal * 0.55;
        gastoIns = gastoTotal * 0.45;
      }

      // Load budget data per branch (dynamic, any number of sucursales)
      const activeBranches = sucArr.filter(s => s.activa !== false);
      const budgetResults = await Promise.all(
        activeBranches.map(async (suc): Promise<BranchBudget> => {
          try {
            const bvr = await api.get(`/presupuestos/${semana}/${suc.id}`);
            const raw = bvr.data.data;
            const d = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as Record<string, unknown>).data as Record<string, unknown> : raw as Record<string, unknown>;
            const pres = (d as Record<string, unknown>).presupuesto as Record<string, unknown> | undefined;
            const gasto = (d as Record<string, unknown>).gastoReal as Record<string, number> | undefined;
            return {
              id: suc.id,
              codigo: suc.codigo,
              nombre: suc.nombre,
              budgetMos: Number(pres?.presupuestoMos) || 0,
              budgetIns: Number(pres?.presupuestoIns) || 0,
              spentMos: gasto?.mos || 0,
              spentIns: gasto?.ins || 0,
            };
          } catch {
            return { id: suc.id, codigo: suc.codigo, nombre: suc.nombre, budgetMos: 0, budgetIns: 0, spentMos: 0, spentIns: 0 };
          }
        }),
      );

      setBranchBudgets(budgetResults);
      setStats({
        reqPendientes: reqArr.filter(r => r.estado === 'ENVIADA').length,
        reqTotal: reqArr.length,
        ocActivas: ocArr.filter(o => o.estado === 'EN_EJECUCION').length,
        ocCompletadas: ocArr.filter(o => o.estado === 'COMPLETADA').length,
        ocTotal: ocArr.length,
        entregas: entArr.length,
        recepciones: recArr.length,
        productos: prodArr.length,
        proveedores: provArr.length,
        usuarios: usrArr.length,
        gastoMos, gastoIns, gastoTotal,
      });

      setSupplierData(gastosArr.slice(0, 8).map(g => ({ name: g.proveedor?.length > 12 ? g.proveedor.slice(0, 12) + '…' : g.proveedor, total: g.total })));

      // Top products by cost
      const sorted = [...prodArr].sort((a, b) => Number(b.costoDisplay) - Number(a.costoDisplay));
      setTopProducts(sorted.slice(0, 5).map(p => ({ name: p.nombre, cost: Number(p.costoDisplay), qty: 0 })));

      // Activity
      const acts: typeof activities = [];
      for (const r of reqArr.slice(0, 4)) {
        acts.push({
          id: `req-${acts.length}`,
          icon: FileText,
          color: r.estado === 'APROBADA' ? 'text-emerald-500 bg-emerald-50' : r.estado === 'ENVIADA' ? 'text-amber-500 bg-amber-50' : 'text-slate-400 bg-slate-50',
          label: `Requisicion ${r.sucursal?.codigo}`, detail: r.estado, time: r.createdAt,
        });
      }
      for (const o of ocArr.slice(0, 3)) {
        acts.push({
          id: `oc-${o.folio}`,
          icon: ShoppingCart,
          color: o.estado === 'COMPLETADA' ? 'text-emerald-500 bg-emerald-50' : 'text-blue-500 bg-blue-50',
          label: o.folio, detail: o.estado.replace('_', ' '), time: o.createdAt,
        });
      }
      for (const rec of recArr.slice(0, 3)) {
        acts.push({
          id: `rec-${rec.id}`,
          icon: ClipboardCheck,
          color: 'text-teal-500 bg-teal-50',
          label: `Recepcion ${rec.sucursal?.codigo}`, detail: `por ${rec.recibidoPor?.nombre}`, time: rec.createdAt,
        });
      }
      acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(acts.slice(0, 6));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [semana]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const totalBudget = branchBudgets.reduce((sum, b) => sum + b.budgetMos + b.budgetIns, 0);
  const totalSpent = branchBudgets.reduce((sum, b) => sum + b.spentMos + b.spentIns, 0);
  const budgetPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const pieData = [
    { name: 'Mostrador', value: stats.gastoMos, color: '#3b82f6' },
    { name: 'Insumos', value: stats.gastoIns, color: '#10b981' },
  ].filter(d => d.value > 0);

  // Radial gauge data
  const radialData = [
    { name: 'Presupuesto', value: Math.min(budgetPct, 100), fill: budgetPct > 100 ? '#ef4444' : budgetPct >= 80 ? '#f59e0b' : '#10b981' },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ Hero Carousel ═══ */}
      <HeroCarousel
        userName={user?.nombre?.split(' ')[0] || ''}
        roleLabel={
          isAdmin ? 'Panel de Administracion' :
          isSupervisor ? 'Panel de Supervision' :
          isEncargado ? (user?.sucursal?.nombre || 'Mi Sucursal') :
          'Ruta de Compras'
        }
        semana={semana}
      />

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Requisiciones" value={String(stats.reqPendientes)}
          subtitle={`${stats.reqTotal} total esta semana`}
          icon={FileText} href="/requisiciones" color="bg-blue-500"
          pulse={stats.reqPendientes > 0}
        />
        <StatCard
          label="Ordenes de Compra" value={String(stats.ocTotal)}
          subtitle={`${stats.ocCompletadas} completadas`}
          icon={ShoppingCart} href="/ordenes-compra" color="bg-violet-500"
          trend={stats.ocCompletadas > 0 ? { value: `${stats.ocCompletadas}`, up: true } : undefined}
        />
        <StatCard
          label="Entregas" value={String(stats.entregas)}
          subtitle={`${stats.recepciones} recibidas`}
          icon={Truck} href="/entregas" color="bg-emerald-500"
        />
        <StatCard
          label="Gasto Semanal" value={formatCurrency(stats.gastoTotal)}
          subtitle={totalBudget > 0 ? `${budgetPct.toFixed(0)}% del presupuesto` : 'Sin presupuesto'}
          icon={DollarSign} href="/financiero" color="bg-amber-500"
          trend={stats.gastoTotal > 0 ? { value: formatCurrency(stats.gastoTotal), up: budgetPct <= 100 } : undefined}
        />
      </div>

      {/* ═══ Row 2: Budget Health + Supplier Chart ═══ */}
      {(isAdmin || isSupervisor) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Budget Health */}
          <Card className="lg:col-span-4 border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-br from-slate-50 to-white">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                Salud Presupuestal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Radial Gauge */}
              <div className="flex items-center justify-center">
                <div className="relative h-[140px] w-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                      <RadialBar background dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                    <span className={`text-2xl font-bold ${budgetPct > 100 ? 'text-red-600' : budgetPct >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {budgetPct.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400">utilizado</span>
                  </div>
                </div>
              </div>
              <div className="text-center mb-3">
                <p className="text-xs text-slate-500">
                  {formatCurrencyFull(totalSpent)} de {formatCurrencyFull(totalBudget)}
                </p>
              </div>

              {/* Per-branch mini bars — dynamic */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Por Sucursal</p>
                {branchBudgets.length === 0 && (
                  <p className="text-xs text-slate-400">Sin sucursales configuradas.</p>
                )}
                {branchBudgets.map(b => (
                  <div key={b.id} className="space-y-2">
                    <BudgetGauge label={`${b.codigo} — Mostrador`} budget={b.budgetMos} spent={b.spentMos} color="bg-blue-500" />
                    <BudgetGauge label={`${b.codigo} — Insumos`} budget={b.budgetIns} spent={b.spentIns} color="bg-emerald-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Supplier Chart */}
          <Card className="lg:col-span-5 border-0 shadow-sm">
            <CardHeader className="pb-2 bg-gradient-to-br from-slate-50 to-white">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Store className="h-3.5 w-3.5 text-blue-600" />
                </div>
                Gasto por Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplierData.length > 0 ? (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value) => [formatCurrencyFull(Number(value)), 'Gasto']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                      />
                      <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={24}>
                        {supplierData.map((_, i) => (
                          <Cell key={i} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308'][i % 8]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-sm text-slate-300">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                    Sin datos de gastos
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Pie + Top Products */}
          <div className="lg:col-span-3 space-y-4">
            {/* MOS vs INS Donut */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-1 bg-gradient-to-br from-slate-50 to-white">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <CircleDot className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  MOS vs INS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {pieData.length > 0 ? (
                  <>
                    <div className="h-[130px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" stroke="none" paddingAngle={3}>
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />MOS {formatCurrencyFull(stats.gastoMos)}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />INS {formatCurrencyFull(stats.gastoIns)}</span>
                    </div>
                  </>
                ) : (
                  <div className="h-[130px] flex items-center justify-center text-xs text-slate-300">Sin datos</div>
                )}
              </CardContent>
            </Card>

            {/* Top Products by Cost */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 bg-gradient-to-br from-slate-50 to-white">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  Top Productos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-300 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-900">{formatCurrencyFull(p.cost)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══ Encargado: Branch-specific view ═══ */}
      {isEncargado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Mi Sucursal — Presupuesto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const mine = branchBudgets.find(b => b.id === user?.sucursal?.id) || branchBudgets[0];
                return (
                  <>
                    <BudgetGauge label="Mostrador (MOS)" budget={mine?.budgetMos || 0} spent={mine?.spentMos || 0} color="bg-blue-500" />
                    <BudgetGauge label="Insumos (INS)" budget={mine?.budgetIns || 0} spent={mine?.spentIns || 0} color="bg-emerald-500" />
                  </>
                );
              })()}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Estado del Ciclo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3 py-2">
                <CheckCircle2 className={`h-5 w-5 ${stats.reqTotal > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className="text-sm text-slate-700">Requisicion enviada</span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <CheckCircle2 className={`h-5 w-5 ${stats.entregas > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className="text-sm text-slate-700">Entrega asignada</span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <CheckCircle2 className={`h-5 w-5 ${stats.recepciones > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className="text-sm text-slate-700">Recepcion confirmada</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Chofer: Route view ═══ */}
      {isChofer && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-8 text-center">
            <Route className="h-12 w-12 mx-auto mb-3 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-800">Ruta del Dia</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              {stats.ocActivas > 0 ? `Tienes ${stats.ocActivas} orden(es) de compra activa(s)` : 'No hay ordenes de compra en ejecucion'}
            </p>
            <Link href="/ruta">
              <Button className="bg-amber-500 hover:bg-amber-600 min-h-[44px]">
                <Route className="h-4 w-4 mr-2" /> Ir a Mi Ruta
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ═══ Quick Actions + Activity ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-3">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Acciones Rapidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {quickActions
              .filter(a => a.roles.includes(user?.role || ''))
              .map(action => (
                <Link key={action.href} href={action.href}>
                  <div className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shrink-0 shadow-sm`}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{action.description}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Actividad Reciente</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-3 pb-1">
              {loading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-7 w-7 rounded-full bg-slate-100" />
                      <div className="flex-1 space-y-1"><div className="h-3 bg-slate-100 rounded w-3/4" /><div className="h-2 bg-slate-50 rounded w-1/2" /></div>
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {activities.map(act => (
                    <div key={act.id} className="flex items-center gap-3 py-2.5">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${act.color}`}>
                        <act.icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{act.label}</p>
                        <p className="text-[10px] text-slate-400">{act.detail}</p>
                      </div>
                      <span className="text-[10px] text-slate-300 shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />{timeAgo(act.time)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-300">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1.5" />Sin actividad
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Counts */}
          {(isAdmin || isSupervisor) && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-white rounded-xl border border-slate-100 p-2.5 text-center">
                <Package className="h-3.5 w-3.5 mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-bold text-slate-800">{stats.productos}</p>
                <p className="text-[9px] text-slate-400">Productos</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-2.5 text-center">
                <Store className="h-3.5 w-3.5 mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-bold text-slate-800">{stats.proveedores}</p>
                <p className="text-[9px] text-slate-400">Proveedores</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-2.5 text-center">
                <Users className="h-3.5 w-3.5 mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-bold text-slate-800">{stats.usuarios}</p>
                <p className="text-[9px] text-slate-400">Usuarios</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Cycle Progress Banner ═══ */}
      <div className="relative overflow-hidden rounded-xl">
        <Image src="/assets/images/dark-abstract.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-slate-900/80 to-violet-900/70" />
        <div className="relative z-10 p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-3">Progreso del Ciclo — {semana}</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Requisiciones', done: stats.reqTotal > 0 },
              { label: 'Consolidacion', done: stats.ocTotal > 0 },
              { label: 'Ejecucion', done: stats.ocCompletadas > 0 },
              { label: 'Entrega', done: stats.entregas > 0 },
              { label: 'Recepcion', done: stats.recepciones > 0 },
              { label: 'Financiero', done: stats.gastoTotal > 0 },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                step.done ? 'bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/10' : 'bg-white/5 text-white/30'
              }`}>
                {step.done ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-white/20" />}
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
