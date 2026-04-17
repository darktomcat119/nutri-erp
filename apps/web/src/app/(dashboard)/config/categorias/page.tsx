'use client';
import { PageHeader } from '@/components/page-header';
import { CategoriasPage } from '@/features/categorias/components/CategoriasPage';

export default function Page() {
  return (
    <div>
      <PageHeader title="Categorias" description="Administracion de categorias para productos e insumos" />
      <CategoriasPage />
    </div>
  );
}
