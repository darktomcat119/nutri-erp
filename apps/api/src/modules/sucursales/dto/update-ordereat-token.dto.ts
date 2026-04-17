import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrdereatTokenDto {
  @ApiProperty({ description: 'JWT de OrderEat. No se puede leer despues de guardarlo.' })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  token: string;
}
