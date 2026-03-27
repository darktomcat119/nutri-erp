import { UsuariosTable } from '@/features/usuarios/components/UsuariosTable';

export default function UsuariosPage(): JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Usuarios</h1>
      <UsuariosTable />
    </div>
  );
}
