import { ProductosTable } from '@/features/productos/components/ProductosTable';

export default function ProductosPage(): JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Productos (Mostrador)</h1>
      <ProductosTable />
    </div>
  );
}
