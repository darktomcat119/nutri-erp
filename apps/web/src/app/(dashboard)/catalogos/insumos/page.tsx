import { PageHeader } from '@/components/page-header';
import { InsumosTable } from '@/features/insumos/components/InsumosTable';

export default function InsumosPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Insumos" description="Catalogo de ingredientes y materiales" />
      <InsumosTable />
    </div>
  );
}
