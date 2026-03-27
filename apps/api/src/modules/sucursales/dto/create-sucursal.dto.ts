import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSucursalDto {
  @ApiProperty({ example: 'CDUP' })
  @IsString()
  @MinLength(2)
  codigo: string;

  @ApiProperty({ example: 'Campus Deportivo Universitario Poniente' })
  @IsString()
  @MinLength(3)
  nombre: string;
}
