import { PageHeader } from '@/components/page-header';
import { ReportesPage } from '@/features/reportes/components/ReportesPage';

export default function ReportesRoute(): JSX.Element {
  return (
    <div>
      <PageHeader title="Reportes" description="Resumen y analisis del ciclo de compras" />
      <ReportesPage />
    </div>
  );
}
