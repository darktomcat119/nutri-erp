import { Module } from '@nestjs/common';
import { RequisicionesController } from './requisiciones.controller';
import { RequisicionesService } from './requisiciones.service';

@Module({
  controllers: [RequisicionesController],
  providers: [RequisicionesService],
  exports: [RequisicionesService],
})
export class RequisicionesModule {}
