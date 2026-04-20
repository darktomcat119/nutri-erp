import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './common/utils/crypto.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { ProductosModule } from './modules/productos/productos.module';
import { InsumosModule } from './modules/insumos/insumos.module';
import { PlatillosModule } from './modules/platillos/platillos.module';
import { RequisicionesModule } from './modules/requisiciones/requisiciones.module';
import { OrdenesCompraModule } from './modules/ordenes-compra/ordenes-compra.module';
import { EjecucionModule } from './modules/ejecucion/ejecucion.module';
import { OrdenesEntregaModule } from './modules/ordenes-entrega/ordenes-entrega.module';
import { RecepcionesModule } from './modules/recepciones/recepciones.module';
import { PosModule } from './modules/pos/pos.module';
import { PresupuestosModule } from './modules/presupuestos/presupuestos.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { OrdereatModule } from './modules/ordereat/ordereat.module';
import { PresupuestoInsModule } from './modules/presupuesto-ins/presupuesto-ins.module';
import { RequisicionMosModule } from './modules/requisicion-mos/requisicion-mos.module';

@Module({
  imports: [
    PrismaModule,
    CryptoModule,
    JobsModule,
    AuthModule,
    UsuariosModule,
    SucursalesModule,
    ProveedoresModule,
    ProductosModule,
    InsumosModule,
    CategoriasModule,
    PlatillosModule,
    RequisicionesModule,
    OrdenesCompraModule,
    EjecucionModule,
    OrdenesEntregaModule,
    RecepcionesModule,
    PosModule,
    PresupuestosModule,
    ReportesModule,
    OrdereatModule,
    PresupuestoInsModule,
    RequisicionMosModule,
  ],
})
export class AppModule {}
