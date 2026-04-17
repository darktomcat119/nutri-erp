'use client';

import { PageHeader } from '@/components/page-header';
import { PresupuestoInsPage } from '@/features/presupuesto-ins/components/PresupuestoInsPage';

export default function Page(): JSX.Element {
  return (
    <div>
      <PageHeader title="Presupuesto Insumos" description="Generacion y aprobacion de presupuestos semanales basados en ventas de OrderEat" />
      <PresupuestoInsPage />
    </div>
  );
}
