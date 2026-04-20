'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Sucursal, BudgetVsActual } from './types';
import { getProgressColor, getProgressTextColor, formatCurrency } from './types';

/* ── Budget Progress Bar ── */
function BudgetBar({ label, budget, actual }: { label: string; budget: number; actual: number }) {
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

interface BudgetOverviewProps {
  presupuestos: { sucursal: Sucursal; data: BudgetVsActual }[];
}

export function BudgetOverview({ presupuestos }: BudgetOverviewProps): JSX.Element | null {
  if (presupuestos.length === 0) return null;

  return (
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
          const totalPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

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
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Atencion
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      En rango
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BudgetBar label="MOS" budget={budgetMos} actual={actualMos} />
                <BudgetBar label="INS" budget={budgetIns} actual={actualIns} />
                <div className="border-t pt-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                    <span className="font-semibold text-slate-800">Total</span>
                    <span className={`font-bold ${getProgressTextColor(totalPct)}`}>
                      {formatCurrency(totalActual)} / {formatCurrency(totalBudget)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
