import { SucursalesTable } from '@/features/sucursales/components/SucursalesTable';

export default function SucursalesPage(): JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Sucursales</h1>
      <SucursalesTable />
    </div>
  );
}
