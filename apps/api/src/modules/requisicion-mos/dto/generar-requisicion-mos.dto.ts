import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerarRequisicionMosDto {
  @ApiProperty({ example: '2026-W14' })
  @IsString()
  semana: string;

  @ApiProperty({ example: 'uuid-sucursal' })
  @IsString()
  sucursalId: string;
}
