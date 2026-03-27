import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RequisicionesService } from './requisiciones.service';
import { CreateRequisicionDto } from './dto/create-requisicion.dto';
import { UpdateRequisicionDto } from './dto/update-requisicion.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Requisiciones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('requisiciones')
export class RequisicionesController {
  constructor(private requisicionesService: RequisicionesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar todas las requisiciones' })
  @ApiQuery({ name: 'semana', required: false })
  @ApiQuery({ name: 'sucursalId', required: false })
  @ApiQuery({ name: 'estado', required: false })
  async findAll(
    @Query('semana') semana?: string,
    @Query('sucursalId') sucursalId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.requisicionesService.findAll({ semana, sucursalId, estado });
  }

  @Get('mi-sucursal')
  @UseGuards(RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Requisiciones de mi sucursal' })
  async findMyBranch(@CurrentUser() user: JwtPayload) {
    return this.requisicionesService.findByBranch(user.sucursalId!);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener requisicion con items' })
  async findOne(@Param('id') id: string) {
    return this.requisicionesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Crear requisicion' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRequisicionDto) {
    return this.requisicionesService.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar requisicion (solo borrador)' })
  async update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateRequisicionDto) {
    return this.requisicionesService.update(id, user, dto);
  }

  @Post(':id/enviar')
  @UseGuards(RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Enviar requisicion para aprobacion' })
  async submit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.requisicionesService.submit(id, user);
  }

  @Post(':id/aprobar')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  @ApiOperation({ summary: 'Aprobar requisicion' })
  async approve(@Param('id') id: string) {
    return this.requisicionesService.approve(id);
  }

  @Post(':id/rechazar')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  @ApiOperation({ summary: 'Rechazar requisicion' })
  async reject(@Param('id') id: string, @Body('notas') notas?: string) {
    return this.requisicionesService.reject(id, notas);
  }
}
