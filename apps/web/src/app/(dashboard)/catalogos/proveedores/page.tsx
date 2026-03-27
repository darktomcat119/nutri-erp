import { ProveedoresTable } from '@/features/proveedores/components/ProveedoresTable';

export default function ProveedoresPage(): JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Proveedores</h1>
      <ProveedoresTable />
    </div>
  );
}
