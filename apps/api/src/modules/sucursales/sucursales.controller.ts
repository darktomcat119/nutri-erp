import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SucursalesService } from './sucursales.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Sucursales')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sucursales')
export class SucursalesController {
  constructor(private sucursalesService: SucursalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sucursales activas' })
  async findAll() {
    return this.sucursalesService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear sucursal' })
  async create(@Body() dto: CreateSucursalDto) {
    return this.sucursalesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar sucursal' })
  async update(@Param('id') id: string, @Body() dto: UpdateSucursalDto) {
    return this.sucursalesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar sucursal' })
  async remove(@Param('id') id: string) {
    return this.sucursalesService.remove(id);
  }
}
