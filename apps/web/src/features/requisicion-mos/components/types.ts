export interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

export interface RequisicionMos {
  id: string;
  semana: string;
  sucursal: { codigo: string; nombre: string };
  totalDisplays: number;
  totalDinero: string;
  estado: string;
  createdAt: string;
}

export interface RequisicionMosItem {
  id: string;
  producto: { nombre: string; codigo: string };
  inventarioActual: number;
  maximo: number;
  compraNecesaria: number;
  displaysAComprar: number;
  dinero: string;
  sugerenciaEncargado?: string | null;
  cantidadFinal?: number | null;
}

export interface RequisicionMosDetail {
  id: string;
  semana: string;
  estado: string;
  totalDisplays: number;
  totalDinero: string;
  sucursal: { codigo: string; nombre: string };
  items: RequisicionMosItem[];
}

export interface GenerarResult {
  id: string;
  totalDisplays: number;
  totalDinero: number;
  productosNoVinculados: string[];
}

export const estadoBadge: Record<string, string> = {
  GENERADA: 'bg-slate-100 text-slate-700',
  REVISADA: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
};

export function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil(diff / 604800000 + start.getDay() / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function fmtMoney(v: string | number): string {
  return `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
