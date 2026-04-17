import { IsString, IsOptional, IsNumber, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInsumoDto {
  @ApiPropertyOptional({ example: 'IN-016' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiProperty({ example: 'PAPA' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'VERDURAS' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unidad: string;

  @ApiPropertyOptional({ example: 'Por kilo' })
  @IsOptional()
  @IsString()
  presentacion?: string;

  @ApiProperty({ example: 18.00 })
  @IsNumber()
  @Min(0)
  costoUnitario: number;

  @ApiProperty()
  @IsUUID()
  proveedorId: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadPorDisplay?: number;

  @ApiPropertyOptional({ example: 'Nacional' })
  @IsOptional()
  @IsString()
  origen?: string;
}
