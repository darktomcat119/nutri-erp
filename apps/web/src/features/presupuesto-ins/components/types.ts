export interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

export interface PresupuestoDetalle {
  id?: string;
  productoVendido: string;
  cantidad: number;
  costoPlatillo: number;
  subtotal: number;
  vinculado: boolean;
}

export interface Presupuesto {
  id: string;
  semana: string;
  sucursalId: string;
  sucursal?: { codigo: string; nombre: string };
  montoCalculado: number;
  montoAprobado?: number | null;
  estado: 'BORRADOR' | 'APROBADO' | 'RECHAZADO';
  generadoPor?: { nombre: string } | null;
  createdAt: string;
  notas?: string | null;
  detalles?: PresupuestoDetalle[];
}

export interface GenerarResultado {
  id?: string;
  montoCalculado: number;
  productosVinculados: number;
  productosNoEncontrados: number;
  detalles?: PresupuestoDetalle[];
}

export function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function estadoVariant(estado: Presupuesto['estado']): string {
  switch (estado) {
    case 'APROBADO':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
    case 'RECHAZADO':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    default:
      return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
  }
}
