'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import type { Sucursal, Presupuesto } from './types';
import { GenerateForm } from './GenerateForm';
import { PresupuestosList } from './PresupuestosList';

export function PresupuestoInsPage(): JSX.Element {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);

  const loadSucursales = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/sucursales');
      const data: Sucursal[] = res.data?.data ?? res.data ?? [];
      setSucursales(data);
    } catch {
      toast.error('Error al cargar sucursales');
    }
  }, []);

  const loadPresupuestos = useCallback(async (): Promise<void> => {
    setLoadingList(true);
    try {
      const res = await api.get('/presupuesto-ins');
      const data: Presupuesto[] = res.data?.data ?? res.data ?? [];
      setPresupuestos(data);
    } catch {
      toast.error('Error al cargar presupuestos');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadSucursales();
    void loadPresupuestos();
  }, [loadSucursales, loadPresupuestos]);

  return (
    <div className="space-y-6">
      <GenerateForm
        sucursales={sucursales}
        presupuestos={presupuestos}
        onGenerated={() => {
          void loadPresupuestos();
        }}
      />
      <PresupuestosList
        presupuestos={presupuestos}
        loadingList={loadingList}
        isAdmin={isAdmin}
        onChanged={() => {
          void loadPresupuestos();
        }}
      />
    </div>
  );
}
