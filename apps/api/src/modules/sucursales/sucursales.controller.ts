import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SucursalesService } from './sucursales.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { UpdateOrdereatTokenDto } from './dto/update-ordereat-token.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Sucursales')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sucursales')
export class SucursalesController {
  constructor(private sucursalesService: SucursalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sucursales' })
  async findAll() {
    return this.sucursalesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener sucursal' })
  async findOne(@Param('id') id: string) {
    return this.sucursalesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear sucursal' })
  async create(@Body() dto: CreateSucursalDto) {
    return this.sucursalesService.create(dto);
  }

  @Patch(':id/toggle-activo')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar sucursal' })
  async toggleActivo(@Param('id') id: string) {
    return this.sucursalesService.toggleActivo(id);
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

  @Get(':id/ordereat-token-status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Estado del token de OrderEat para esta sucursal (nunca devuelve el token)' })
  async getOrdereatTokenStatus(@Param('id') id: string) {
    return this.sucursalesService.getOrdereatTokenStatus(id);
  }

  @Put(':id/ordereat-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Guardar token de OrderEat (write-only, se cifra antes de persistir)' })
  async setOrdereatToken(
    @Param('id') id: string,
    @Body() dto: UpdateOrdereatTokenDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sucursalesService.setOrdereatToken(id, dto.token, user.email);
  }

  @Delete(':id/ordereat-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar token de OrderEat de esta sucursal' })
  async clearOrdereatToken(@Param('id') id: string) {
    return this.sucursalesService.clearOrdereatToken(id);
  }
}
