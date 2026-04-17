import { PageHeader } from '@/components/page-header';
import { ProductosTable } from '@/features/productos/components/ProductosTable';

export default function ProductosPage(): JSX.Element {
  return (
    <div>
      <PageHeader title="Productos (Mostrador)" description="Catalogo de productos de venta directa" />
      <ProductosTable />
    </div>
  );
}
