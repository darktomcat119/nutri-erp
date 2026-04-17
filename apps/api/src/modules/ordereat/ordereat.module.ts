import { Module } from '@nestjs/common';
import { OrdereatController } from './ordereat.controller';
import { OrdereatService } from './ordereat.service';

@Module({
  controllers: [OrdereatController],
  providers: [OrdereatService],
  exports: [OrdereatService],
})
export class OrdereatModule {}
