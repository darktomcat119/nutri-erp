import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RecepcionesService } from './recepciones.service';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Recepciones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('recepciones')
export class RecepcionesController {
  constructor(private recepcionesService: RecepcionesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar todas las recepciones' })
  async findAll() {
    return this.recepcionesService.findAll();
  }

  @Get('pendientes')
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Obtener entregas pendientes de recepcion para mi sucursal' })
  async getPendientes(@CurrentUser() user: JwtPayload) {
    return this.recepcionesService.getPendientes(user);
  }

  @Post()
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Crear recepcion confirmando entrega' })
  async crear(@CurrentUser() user: JwtPayload, @Body() dto: CreateRecepcionDto) {
    return this.recepcionesService.crear(dto, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.ENCARGADO, Role.CHOFER)
  @ApiOperation({ summary: 'Obtener detalle de recepcion con items y diferencias' })
  async findOne(@Param('id') id: string) {
    return this.recepcionesService.findOne(id);
  }

  @Get(':id/push-preview')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Previsualizar que items se enviarian a OrderEat' })
  async pushPreview(@Param('id') id: string) {
    return this.recepcionesService.previewPushToOrderEat(id);
  }

  @Post(':id/push-to-ordereat')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Enviar cantidades recibidas a OrderEat como movimientos IN' })
  async pushToOrderEat(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.recepcionesService.pushToOrderEat(id, user.email);
  }
}
