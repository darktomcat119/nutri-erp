import { PageHeader } from '@/components/page-header';
import { FinancieroPage } from '@/features/financiero/components/FinancieroPage';

export default function FinancieroRoute(): JSX.Element {
  return (
    <div>
      <PageHeader title="Control Financiero" description="Presupuestos, gastos y analisis semanal" />
      <FinancieroPage />
    </div>
  );
}
