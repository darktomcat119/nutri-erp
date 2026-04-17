import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum AreaCompra { MOS = 'MOS', INS = 'INS' }

class RequisicionItemDto {
  @ApiProperty({ enum: AreaCompra })
  @IsEnum(AreaCompra)
  area: AreaCompra;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  insumoId?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  cantidadSolicitada: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}

export class CreateRequisicionDto {
  @ApiProperty({ example: '2026-W12' })
  @IsString()
  semana: string;

  @ApiPropertyOptional({ enum: AreaCompra, default: 'INS' })
  @IsOptional()
  @IsEnum(AreaCompra)
  area?: AreaCompra;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  presupuestoInsId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justificacionExceso?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [RequisicionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisicionItemDto)
  items: RequisicionItemDto[];
}
