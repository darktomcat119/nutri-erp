import { PageHeader } from '@/components/page-header';
import { SucursalesTable } from '@/features/sucursales/components/SucursalesTable';

export default function SucursalesPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Sucursales" description="Centros de operacion" />
      <SucursalesTable />
    </div>
  );
}
