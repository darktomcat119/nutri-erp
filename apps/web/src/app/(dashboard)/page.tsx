'use client';

import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ShoppingCart, Truck, DollarSign } from 'lucide-react';

export default function DashboardPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Dashboard
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Bienvenido, {user?.nombre} ({user?.role})
        {user?.sucursal ? ` — ${user.sucursal.nombre}` : ''}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Requisiciones Pendientes
            </CardTitle>
            <FileText className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              OC en Ejecucion
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Entregas Pendientes
            </CardTitle>
            <Truck className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Gasto Semanal
            </CardTitle>
            <DollarSign className="h-5 w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">$0.00</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
