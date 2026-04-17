import { PageHeader } from '@/components/page-header';
import { RutaChofer } from '@/features/ejecucion/components/RutaChofer';

export default function RutaPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Ruta del Dia" description="Ejecucion de compras por proveedor" />
      <RutaChofer />
    </div>
  );
}
