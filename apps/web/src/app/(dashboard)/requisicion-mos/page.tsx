'use client';

import { PageHeader } from '@/components/page-header';
import { RequisicionMosPage } from '@/features/requisicion-mos/components/RequisicionMosPage';

export default function Page(): JSX.Element {
  return (
    <div>
      <PageHeader
        title="Requisicion Mostrador"
        description="Calculo automatico de compras basado en inventario actual y maximos por sucursal"
      />
      <RequisicionMosPage />
    </div>
  );
}
