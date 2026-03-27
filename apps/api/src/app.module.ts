import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { ProductosModule } from './modules/productos/productos.module';
import { InsumosModule } from './modules/insumos/insumos.module';
import { PlatillosModule } from './modules/platillos/platillos.module';
import { RequisicionesModule } from './modules/requisiciones/requisiciones.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsuariosModule,
    SucursalesModule,
    ProveedoresModule,
    ProductosModule,
    InsumosModule,
    PlatillosModule,
    RequisicionesModule,
  ],
})
export class AppModule {}
