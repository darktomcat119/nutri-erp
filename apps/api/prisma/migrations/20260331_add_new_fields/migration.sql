-- Add centroCompras to proveedores
ALTER TABLE "proveedores" ADD COLUMN IF NOT EXISTS "centro_compras" TEXT;

-- Add origen to productos
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "origen" TEXT NOT NULL DEFAULT 'Compras';

-- Change pz_x_display default to 0
ALTER TABLE "productos" ALTER COLUMN "pz_x_display" SET DEFAULT 0;

-- Add origen and cantidad_por_display to insumos
ALTER TABLE "insumos" ADD COLUMN IF NOT EXISTS "cantidad_por_display" INTEGER;
ALTER TABLE "insumos" ADD COLUMN IF NOT EXISTS "origen" TEXT NOT NULL DEFAULT 'Compras';
