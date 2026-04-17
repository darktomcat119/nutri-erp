import { PageHeader } from '@/components/page-header';
import { PlatillosTable } from '@/features/platillos/components/PlatillosTable';

export default function PlatillosPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Platillos" description="Recetas y costos por platillo" />
      <PlatillosTable />
    </div>
  );
}
