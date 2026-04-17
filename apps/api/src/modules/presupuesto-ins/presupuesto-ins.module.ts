import { Module } from '@nestjs/common';
import { PresupuestoInsController } from './presupuesto-ins.controller';
import { PresupuestoInsService } from './presupuesto-ins.service';
import { OrdereatModule } from '../ordereat/ordereat.module';

@Module({
  imports: [OrdereatModule],
  controllers: [PresupuestoInsController],
  providers: [PresupuestoInsService],
  exports: [PresupuestoInsService],
})
export class PresupuestoInsModule {}
