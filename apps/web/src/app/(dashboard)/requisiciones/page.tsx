import { PageHeader } from '@/components/page-header';
import { RequisicionesList } from '@/features/requisiciones/components/RequisicionesList';

export default function RequisicionesPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Requisiciones" description="Revision y aprobacion de pedidos semanales" />
      <RequisicionesList />
    </div>
  );
}
