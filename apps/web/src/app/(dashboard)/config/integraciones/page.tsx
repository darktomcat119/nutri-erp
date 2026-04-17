import { PageHeader } from '@/components/page-header';
import { IntegracionesOrderEat } from '@/features/integraciones/components/IntegracionesOrderEat';

export default function IntegracionesPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integraciones"
        description="Tokens y configuracion de servicios externos"
      />
      <IntegracionesOrderEat />
    </div>
  );
}
