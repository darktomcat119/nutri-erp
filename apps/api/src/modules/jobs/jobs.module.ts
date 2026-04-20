import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
