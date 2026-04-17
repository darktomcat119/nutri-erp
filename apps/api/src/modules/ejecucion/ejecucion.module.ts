import { Module } from '@nestjs/common';
import { EjecucionController } from './ejecucion.controller';
import { EjecucionService } from './ejecucion.service';

@Module({
  controllers: [EjecucionController],
  providers: [EjecucionService],
  exports: [EjecucionService],
})
export class EjecucionModule {}
