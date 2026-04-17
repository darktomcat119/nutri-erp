import { PageHeader } from '@/components/page-header';
import { ProveedoresTable } from '@/features/proveedores/components/ProveedoresTable';

export default function ProveedoresPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Proveedores" description="Gestion de proveedores y rutas de compra" />
      <ProveedoresTable />
    </div>
  );
}
