export interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

export interface ImportResult {
  totalRows: number;
  matched: number;
  unmatched: number;
  unmatchedNames: string[];
}

export interface InventarioRow {
  id: string;
  producto: { nombre: string };
  inventarioTotal: number;
  reservado: number;
  disponible: number;
  limiteDiario: number;
}

export interface OrdenEntrega {
  id: string;
  sucursal: { codigo: string; nombre: string };
  semana: string;
  _count: { items: number };
}

export interface GenerarResult {
  totalItems: number;
  totalPiezas: number;
}

export interface PosUpload {
  id: string;
  sucursal: { codigo: string; nombre: string };
  semana: string;
  totalItems: number;
  totalPiezas: number;
  createdAt: string;
  archivoUrl: string;
}
