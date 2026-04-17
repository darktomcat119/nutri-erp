import { PageHeader } from '@/components/page-header';
import { UsuariosTable } from '@/features/usuarios/components/UsuariosTable';

export default function UsuariosPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Usuarios" description="Administracion de cuentas y roles" />
      <UsuariosTable />
    </div>
  );
}
