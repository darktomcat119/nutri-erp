import { Module } from '@nestjs/common';
import { RecepcionesController } from './recepciones.controller';
import { RecepcionesService } from './recepciones.service';
import { OrdereatModule } from '../ordereat/ordereat.module';

@Module({
  imports: [OrdereatModule],
  controllers: [RecepcionesController],
  providers: [RecepcionesService],
  exports: [RecepcionesService],
})
export class RecepcionesModule {}
