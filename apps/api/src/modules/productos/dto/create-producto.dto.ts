import { IsString, IsOptional, IsInt, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiPropertyOptional({ example: 'MO-021' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiProperty({ example: 'GALLETA NUEVA' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'GALLETA NUEVA' })
  @IsOptional()
  @IsString()
  nombreSistema?: string;

  @ApiPropertyOptional({ example: 'GALLETAS' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ example: 'Gamesa' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  pzXDisplay: number;

  @ApiProperty({ example: 48.00 })
  @IsNumber()
  @Min(0)
  costoDisplay: number;

  @ApiProperty({ example: 4.00 })
  @IsNumber()
  @Min(0)
  costoUnitario: number;

  @ApiProperty()
  @IsUUID()
  proveedorId: string;

  @ApiPropertyOptional({ example: '126934' })
  @IsOptional()
  @IsString()
  ordereatId?: string;

  @ApiPropertyOptional({ example: 'Nacional' })
  @IsOptional()
  @IsString()
  origen?: string;
}
