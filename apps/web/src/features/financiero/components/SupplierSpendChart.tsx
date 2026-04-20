'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { GastoProveedor } from './types';
import { formatCurrency } from './types';

interface SupplierSpendChartProps {
  gastosProveedor: GastoProveedor[];
}

export function SupplierSpendChart({
  gastosProveedor,
}: SupplierSpendChartProps): JSX.Element | null {
  if (gastosProveedor.length === 0) return null;

  return (
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
            <BarChart data={gastosProveedor} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="proveedor"
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 12 }}
                height={80}
              />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Gasto']} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
