import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSucursalDto {
  @ApiPropertyOptional({ example: 'IPADE' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  codigo?: string;

  @ApiPropertyOptional({ example: 'Nutri Cafeteria - Ciudad UP - IPADE' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  nombre?: string;

  @ApiPropertyOptional({ example: '359', description: 'ID numerico de cafeteria en OrderEat' })
  @IsOptional()
  @IsString()
  cafeteriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
