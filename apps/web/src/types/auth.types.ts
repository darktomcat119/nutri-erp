export interface User {
  id: string;
  email: string;
  nombre: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'ENCARGADO' | 'CHOFER';
  sucursalId: string | null;
  sucursal: { id: string; codigo: string; nombre: string } | null;
  activo: boolean;
}

export interface LoginResponse {
  data: {
    access_token: string;
    user: User;
  };
  message: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}
