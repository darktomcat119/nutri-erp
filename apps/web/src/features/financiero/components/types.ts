export interface Sucursal {
  id: string;
  nombre: string;
  codigo: string;
}

export interface BudgetVsActual {
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

export interface GastoProveedor {
  proveedor: string;
  total: number;
}

export interface Diferencia {
  id: string;
  sucursal: string;
  producto: string;
  area: string;
  cantidadEsperada: number;
  cantidadRecibida: number;
  diferencia: number;
}

export function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getProgressColor(pct: number): string {
  if (pct > 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function getProgressTextColor(pct: number): string {
  if (pct > 100) return 'text-red-600';
  if (pct >= 80) return 'text-amber-600';
  return 'text-emerald-600';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}
