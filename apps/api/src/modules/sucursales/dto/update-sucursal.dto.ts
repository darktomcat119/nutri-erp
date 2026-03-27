import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSucursalDto {
  @ApiPropertyOptional({ example: 'CDUP' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  codigo?: string;

  @ApiPropertyOptional({ example: 'Campus Deportivo' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
