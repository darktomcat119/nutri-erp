import { IsString, IsOptional, IsNumber, Min, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInsumoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() codigo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoria?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unidad?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() presentacion?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costoUnitario?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() proveedorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
}
