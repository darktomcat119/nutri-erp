import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PlatillosService } from './platillos.service';
import { CreatePlatilloDto } from './dto/create-platillo.dto';
import { UpdatePlatilloDto } from './dto/update-platillo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Platillos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('platillos')
export class PlatillosController {
  constructor(private platillosService: PlatillosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar platillos' })
  async findAll() { return this.platillosService.findAll(); }

  @Post()
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear platillo' })
  async create(@Body() dto: CreatePlatilloDto) { return this.platillosService.create(dto); }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar platillo' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlatilloDto) { return this.platillosService.update(id, dto); }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar platillo' })
  async remove(@Param('id') id: string) { return this.platillosService.remove(id); }
}
