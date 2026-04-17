import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerarOcDto {
  @ApiProperty({ example: '2026-W12' })
  @IsString()
  semana: string;
}
