import { IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatilloDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costo?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
}
