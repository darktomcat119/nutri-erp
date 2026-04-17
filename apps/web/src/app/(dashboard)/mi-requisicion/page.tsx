'use client';
import { PageHeader } from '@/components/page-header';
import { RequisicionInsForm } from '@/features/requisiciones/components/RequisicionInsForm';

export default function Page() {
  return (
    <div>
      <PageHeader title="Mi Requisicion Insumos" description="Crear pedido semanal de insumos para tu sucursal" />
      <RequisicionInsForm />
    </div>
  );
}
