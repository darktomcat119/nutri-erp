import { IsString, IsOptional, IsInt, IsNumber, Min, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombreSistema?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  pzXDisplay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoDisplay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ordereatId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
