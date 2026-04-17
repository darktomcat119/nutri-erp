import { PageHeader } from '@/components/page-header';
import { OrdenesCompraPage } from '@/features/ordenes-compra/components/OrdenesCompraPage';

export default function OrdenesCompraRoute(): JSX.Element {
  return (
    <div>
      <PageHeader title="Ordenes de Compra" description="Generacion y seguimiento de OC" />
      <OrdenesCompraPage />
    </div>
  );
}
