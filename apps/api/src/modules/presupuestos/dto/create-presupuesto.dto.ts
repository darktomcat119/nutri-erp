import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePresupuestoDto {
  @ApiProperty({ example: '2026-W14' })
  @IsString()
  semana: string;

  @ApiProperty({ example: 'uuid-de-la-sucursal' })
  @IsString()
  sucursalId: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  presupuestoMos: number;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Min(0)
  presupuestoIns: number;
}
