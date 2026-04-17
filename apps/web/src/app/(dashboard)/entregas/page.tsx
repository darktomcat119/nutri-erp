import { PageHeader } from '@/components/page-header';
import { EntregasPage } from '@/features/entregas/components/EntregasPage';

export default function EntregasRoute(): JSX.Element {
  return (
    <div>
      <PageHeader title="Entregas" description="Ordenes de entrega por sucursal" />
      <EntregasPage />
    </div>
  );
}
