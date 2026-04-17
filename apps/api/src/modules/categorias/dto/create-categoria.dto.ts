import { IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'GALLETAS' })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({ example: 'MOS', enum: ['MOS', 'INS'] })
  @IsString()
  @IsIn(['MOS', 'INS'])
  tipo: string;
}
