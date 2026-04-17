import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSucursalDto {
  @ApiProperty({ example: 'IPADE' })
  @IsString()
  @MinLength(2)
  codigo: string;

  @ApiProperty({ example: 'Nutri Cafeteria - Ciudad UP - IPADE' })
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiPropertyOptional({ example: '359', description: 'ID numerico de cafeteria en OrderEat' })
  @IsOptional()
  @IsString()
  cafeteriaId?: string;
}
