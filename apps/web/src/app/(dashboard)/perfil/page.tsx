'use client';

import { PageHeader } from '@/components/page-header';
import { PerfilPage } from '@/features/perfil/components/PerfilPage';

export default function Page(): JSX.Element {
  return (
    <div>
      <PageHeader title="Mi Perfil" description="Informacion personal y seguridad" />
      <PerfilPage />
    </div>
  );
}
