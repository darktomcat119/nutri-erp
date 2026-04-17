import { Module } from '@nestjs/common';
import { RequisicionMosController } from './requisicion-mos.controller';
import { RequisicionMosService } from './requisicion-mos.service';
import { OrdereatModule } from '../ordereat/ordereat.module';

@Module({
  imports: [OrdereatModule],
  controllers: [RequisicionMosController],
  providers: [RequisicionMosService],
  exports: [RequisicionMosService],
})
export class RequisicionMosModule {}
