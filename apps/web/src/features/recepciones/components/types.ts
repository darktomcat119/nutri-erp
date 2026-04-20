export interface PendingItem {
  id: string;
  nombre: string;
  area: string;
  cantidadAsignada: number;
}

export interface PendingDelivery {
  id: string;
  folio: string;
  semana: string;
  sucursal: { nombre: string; codigo: string };
  items: PendingItem[];
  createdAt: string;
}

export interface RecepcionItemForm {
  ordenEntregaItemId: string;
  nombre: string;
  area: string;
  cantidadAsignada: number;
  cantidadRecibida: number;
  notas: string;
}

export interface RecepcionListItem {
  id: string;
  folio: string;
  semana: string;
  sucursal: { nombre: string; codigo: string };
  estado: string;
  firmaDigital: string | null;
  notas: string | null;
  createdAt: string;
  recibidoPor: { nombre: string } | null;
  _count?: { items: number };
}

export interface RecepcionDetailItem {
  id: string;
  area: string;
  cantidadEsperada: number | string;
  cantidadRecibida: number | string;
  diferencia: number | string;
  notas: string | null;
  producto?: { nombre: string; codigo: string } | null;
  insumo?: { nombre: string; codigo: string } | null;
}

export interface RecepcionDetail {
  id: string;
  folio: string;
  semana: string;
  sucursal: { nombre: string; codigo: string };
  estado: string;
  firmaDigital: string | null;
  notas: string | null;
  createdAt: string;
  recibidoPor: { nombre: string } | null;
  items: RecepcionDetailItem[];
}

export interface PushPreview {
  recepcionId: string;
  sucursalCodigo: string;
  eligible: Array<{
    productoNombre: string;
    cantidadRecibidaDisplays: number;
    pzXDisplay: number;
    amountPieces: number;
  }>;
  skipped: Array<{ item: string; reason: string }>;
}
