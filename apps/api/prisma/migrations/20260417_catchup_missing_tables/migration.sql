-- CreateEnum
CREATE TYPE "PresupuestoInsEstado" AS ENUM ('BORRADOR', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "RequisicionMosEstado" AS ENUM ('GENERADA', 'REVISADA', 'APROBADA');

-- AlterEnum
ALTER TYPE "RequisicionEstado" ADD VALUE 'APROBADA_SUPERVISOR';

-- DropIndex
DROP INDEX "requisiciones_semana_sucursal_id_key";

-- AlterTable
ALTER TABLE "platillos" ADD COLUMN     "precio" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "requisicion_items" ADD COLUMN     "costo_unitario" DECIMAL(10,2),
ADD COLUMN     "subtotal" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "requisiciones" ADD COLUMN     "area" "AreaCompra" NOT NULL DEFAULT 'INS',
ADD COLUMN     "excede_presupuesto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "justificacion_exceso" TEXT,
ADD COLUMN     "monto_total" DECIMAL(12,2),
ADD COLUMN     "notas_admin" TEXT,
ADD COLUMN     "notas_supervisor" TEXT,
ADD COLUMN     "presupuesto_ins_id" TEXT;

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_items" (
    "id" TEXT NOT NULL,
    "platillo_id" TEXT NOT NULL,
    "ingrediente" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "costo_unit" DECIMAL(10,4) NOT NULL,
    "costo_total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "receta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos_ins" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "fecha_ejecucion" TIMESTAMP(3) NOT NULL,
    "periodo_ventas" TEXT,
    "monto_calculado" DECIMAL(12,2) NOT NULL,
    "monto_aprobado" DECIMAL(12,2),
    "estado" "PresupuestoInsEstado" NOT NULL DEFAULT 'BORRADOR',
    "generado_por_id" TEXT NOT NULL,
    "aprobado_por_id" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_ins_detalles" (
    "id" TEXT NOT NULL,
    "presupuesto_ins_id" TEXT NOT NULL,
    "producto_vendido" TEXT NOT NULL,
    "cantidad_vendida" INTEGER NOT NULL,
    "costo_platillo" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "presupuesto_ins_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisiciones_mos" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "fecha_inventario" TIMESTAMP(3) NOT NULL,
    "total_displays" INTEGER NOT NULL,
    "total_dinero" DECIMAL(12,2) NOT NULL,
    "estado" "RequisicionMosEstado" NOT NULL DEFAULT 'GENERADA',
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisiciones_mos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisicion_mos_items" (
    "id" TEXT NOT NULL,
    "requisicion_mos_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "inventario_actual" INTEGER NOT NULL,
    "maximo" INTEGER NOT NULL,
    "compra_necesaria" INTEGER NOT NULL,
    "displays_a_comprar" INTEGER NOT NULL,
    "costo_display" DECIMAL(10,2) NOT NULL,
    "dinero" DECIMAL(10,2) NOT NULL,
    "sugerencia_encargado" TEXT,
    "cantidad_final" INTEGER,

    CONSTRAINT "requisicion_mos_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semanas_cerradas" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "cerrado_por_id" TEXT NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semanas_cerradas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_tipo_key" ON "categorias"("nombre", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_ins_semana_sucursal_id_key" ON "presupuestos_ins"("semana", "sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "requisiciones_mos_semana_sucursal_id_key" ON "requisiciones_mos"("semana", "sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "semanas_cerradas_semana_key" ON "semanas_cerradas"("semana");

-- CreateIndex
CREATE UNIQUE INDEX "requisiciones_semana_sucursal_id_area_key" ON "requisiciones"("semana", "sucursal_id", "area");

-- AddForeignKey
ALTER TABLE "receta_items" ADD CONSTRAINT "receta_items_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "platillos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos_ins" ADD CONSTRAINT "presupuestos_ins_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos_ins" ADD CONSTRAINT "presupuestos_ins_generado_por_id_fkey" FOREIGN KEY ("generado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos_ins" ADD CONSTRAINT "presupuestos_ins_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_ins_detalles" ADD CONSTRAINT "presupuesto_ins_detalles_presupuesto_ins_id_fkey" FOREIGN KEY ("presupuesto_ins_id") REFERENCES "presupuestos_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisiciones_mos" ADD CONSTRAINT "requisiciones_mos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicion_mos_items" ADD CONSTRAINT "requisicion_mos_items_requisicion_mos_id_fkey" FOREIGN KEY ("requisicion_mos_id") REFERENCES "requisiciones_mos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicion_mos_items" ADD CONSTRAINT "requisicion_mos_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semanas_cerradas" ADD CONSTRAINT "semanas_cerradas_cerrado_por_id_fkey" FOREIGN KEY ("cerrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

