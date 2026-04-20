'use client';

import { useAuthStore } from '@/stores/authStore';
import { AdminView } from './AdminView';
import { EncargadoView } from './EncargadoView';

export function RecepcionesPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isEncargado = user?.role === 'ENCARGADO';

  return <div className="space-y-6">{isEncargado ? <EncargadoView /> : <AdminView />}</div>;
}
