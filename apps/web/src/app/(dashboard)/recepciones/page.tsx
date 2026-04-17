import { PageHeader } from '@/components/page-header';
import { RecepcionesPage } from '@/features/recepciones/components/RecepcionesPage';

export default function RecepcionesRoute(): JSX.Element {
  return (
    <div>
      <PageHeader title="Recepciones" description="Confirmacion de entregas recibidas" />
      <RecepcionesPage />
    </div>
  );
}
