import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerarPresupuestoInsDto {
  @ApiProperty({ example: '2026-W14' })
  @IsString()
  semana: string;

  @ApiProperty({ example: 'uuid-sucursal' })
  @IsString()
  sucursalId: string;

  @ApiProperty({ example: '2026-04-07' })
  @IsDateString()
  fechaEjecucion: string;
}
