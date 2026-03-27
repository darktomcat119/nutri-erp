import { IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInsumoDto {
  @ApiProperty({ example: 'IN-016' })
  @IsString()
  codigo: string;

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
}
