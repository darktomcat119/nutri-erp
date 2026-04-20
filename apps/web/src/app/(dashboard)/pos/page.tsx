import { PageHeader } from '@/components/page-header';
import { PosIntegrationPage } from '@/features/pos/components/PosIntegrationPage';

export const metadata = { title: 'Integracion POS' };

export default function PosPage(): JSX.Element {
  return (
    <div>
      <PageHeader
        title="Integracion POS"
        description="Importacion y exportacion de datos OrderEat"
      />
      <PosIntegrationPage />
    </div>
  );
}
