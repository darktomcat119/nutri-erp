-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'ENCARGADO', 'CHOFER');

-- CreateEnum
CREATE TYPE "RequisicionEstado" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "AreaCompra" AS ENUM ('MOS', 'INS');

-- CreateEnum
CREATE TYPE "OrdenCompraEstado" AS ENUM ('GENERADA', 'APROBADA', 'EN_EJECUCION', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoCambio" AS ENUM ('CANTIDAD', 'PRECIO', 'PROVEEDOR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "sucursal_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "orden_ruta" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_sistema" TEXT,
    "categoria" TEXT,
    "marca" TEXT,
    "pz_x_display" INTEGER NOT NULL,
    "costo_display" DECIMAL(10,2) NOT NULL,
    "costo_unitario" DECIMAL(10,2) NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "ordereat_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "unidad" TEXT NOT NULL,
    "presentacion" TEXT,
    "costo_unitario" DECIMAL(10,2) NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platillos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platillos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_sucursal_producto" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "precio_venta" DECIMAL(10,2),
    "margen" DECIMAL(5,2),
    "max_semanal" INTEGER,
    "quien_surte" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "config_sucursal_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisiciones" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "creado_por_id" TEXT NOT NULL,
    "estado" "RequisicionEstado" NOT NULL DEFAULT 'BORRADOR',
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisiciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisicion_items" (
    "id" TEXT NOT NULL,
    "requisicion_id" TEXT NOT NULL,
    "area" "AreaCompra" NOT NULL,
    "producto_id" TEXT,
    "insumo_id" TEXT,
    "cantidad_solicitada" DECIMAL(10,2) NOT NULL,
    "notas" TEXT,

    CONSTRAINT "requisicion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "estado" "OrdenCompraEstado" NOT NULL DEFAULT 'GENERADA',
    "total_estimado" DECIMAL(12,2),
    "total_real" DECIMAL(12,2),
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra_items" (
    "id" TEXT NOT NULL,
    "orden_compra_id" TEXT NOT NULL,
    "area" "AreaCompra" NOT NULL,
    "producto_id" TEXT,
    "insumo_id" TEXT,
    "proveedor_id" TEXT NOT NULL,
    "cantidad_solicitada" DECIMAL(10,2) NOT NULL,
    "cantidad_comprada" DECIMAL(10,2),
    "precio_estimado" DECIMAL(10,2) NOT NULL,
    "precio_real" DECIMAL(10,2),
    "comprado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "orden_compra_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cambios_compra_log" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo_cambio" "TipoCambio" NOT NULL,
    "valor_anterior" TEXT NOT NULL,
    "valor_nuevo" TEXT NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cambios_compra_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_entrega" (
    "id" TEXT NOT NULL,
    "orden_compra_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_entrega_items" (
    "id" TEXT NOT NULL,
    "orden_entrega_id" TEXT NOT NULL,
    "area" "AreaCompra" NOT NULL,
    "producto_id" TEXT,
    "insumo_id" TEXT,
    "cantidad_asignada" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "orden_entrega_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepciones" (
    "id" TEXT NOT NULL,
    "orden_entrega_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "recibido_por_id" TEXT NOT NULL,
    "firma_digital" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recepciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepcion_items" (
    "id" TEXT NOT NULL,
    "recepcion_id" TEXT NOT NULL,
    "area" "AreaCompra" NOT NULL,
    "producto_id" TEXT,
    "insumo_id" TEXT,
    "cantidad_esperada" DECIMAL(10,2) NOT NULL,
    "cantidad_recibida" DECIMAL(10,2) NOT NULL,
    "diferencia" DECIMAL(10,2) NOT NULL,
    "notas" TEXT,

    CONSTRAINT "recepcion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_pos" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "inventario_total" INTEGER NOT NULL,
    "reservado" INTEGER NOT NULL DEFAULT 0,
    "disponible" INTEGER NOT NULL,
    "limite_diario" INTEGER,
    "fecha_import" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_pos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_uploads" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL,
    "total_piezas" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos_semanales" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "presupuesto_mos" DECIMAL(12,2) NOT NULL,
    "presupuesto_ins" DECIMAL(12,2) NOT NULL,
    "gasto_real_mos" DECIMAL(12,2),
    "gasto_real_ins" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_semanales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sucursales_codigo_key" ON "sucursales"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_nombre_key" ON "proveedores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "insumos_codigo_key" ON "insumos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "platillos_nombre_key" ON "platillos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "config_sucursal_producto_sucursal_id_producto_id_key" ON "config_sucursal_producto"("sucursal_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "requisiciones_semana_sucursal_id_key" ON "requisiciones"("semana", "sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_folio_key" ON "ordenes_compra"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_entrega_orden_compra_id_sucursal_id_key" ON "ordenes_entrega"("orden_compra_id", "sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "recepciones_orden_entrega_id_key" ON "recepciones"("orden_entrega_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_pos_sucursal_id_producto_id_fecha_import_key" ON "inventario_pos"("sucursal_id", "producto_id", "fecha_import");

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_semanales_semana_sucursal_id_key" ON "presupuestos_semanales"("semana", "sucursal_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_sucursal_producto" ADD CONSTRAINT "config_sucursal_producto_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_sucursal_producto" ADD CONSTRAINT "config_sucursal_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisiciones" ADD CONSTRAINT "requisiciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisiciones" ADD CONSTRAINT "requisiciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicion_items" ADD CONSTRAINT "requisicion_items_requisicion_id_fkey" FOREIGN KEY ("requisicion_id") REFERENCES "requisiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicion_items" ADD CONSTRAINT "requisicion_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicion_items" ADD CONSTRAINT "requisicion_items_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios_compra_log" ADD CONSTRAINT "cambios_compra_log_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "orden_compra_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios_compra_log" ADD CONSTRAINT "cambios_compra_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_entrega" ADD CONSTRAINT "ordenes_entrega_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_entrega" ADD CONSTRAINT "ordenes_entrega_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_entrega_items" ADD CONSTRAINT "orden_entrega_items_orden_entrega_id_fkey" FOREIGN KEY ("orden_entrega_id") REFERENCES "ordenes_entrega"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_entrega_items" ADD CONSTRAINT "orden_entrega_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_entrega_items" ADD CONSTRAINT "orden_entrega_items_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_orden_entrega_id_fkey" FOREIGN KEY ("orden_entrega_id") REFERENCES "ordenes_entrega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_recibido_por_id_fkey" FOREIGN KEY ("recibido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_recepcion_id_fkey" FOREIGN KEY ("recepcion_id") REFERENCES "recepciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_pos" ADD CONSTRAINT "inventario_pos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_pos" ADD CONSTRAINT "inventario_pos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_uploads" ADD CONSTRAINT "pos_uploads_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos_semanales" ADD CONSTRAINT "presupuestos_semanales_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
