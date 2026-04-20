'use client';

import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
import { AdminView } from './AdminView';
import { EncargadoView } from './EncargadoView';

export function RequisicionMosPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return isAdmin ? (
    <AdminView canApprove={user.role === 'ADMIN'} />
  ) : (
    <EncargadoView sucursalId={user.sucursalId} />
  );
}
