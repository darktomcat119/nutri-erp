import { Module } from '@nestjs/common';
import { OrdenesEntregaController } from './ordenes-entrega.controller';
import { OrdenesEntregaService } from './ordenes-entrega.service';

@Module({
  controllers: [OrdenesEntregaController],
  providers: [OrdenesEntregaService],
  exports: [OrdenesEntregaService],
})
export class OrdenesEntregaModule {}
