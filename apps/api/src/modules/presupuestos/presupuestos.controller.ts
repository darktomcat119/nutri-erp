import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PresupuestosService } from './presupuestos.service';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Presupuestos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('presupuestos')
export class PresupuestosController {
  constructor(private presupuestosService: PresupuestosService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos los presupuestos semanales' })
  async findAll() {
    return this.presupuestosService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear o actualizar presupuesto semanal (upsert por semana+sucursal)' })
  async upsert(@Body() dto: CreatePresupuestoDto) {
    return this.presupuestosService.upsert(dto);
  }

  @Post('cerrar-semana')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cerrar semana' })
  async cerrarSemana(@CurrentUser() user: JwtPayload, @Body() body: { semana: string; notas?: string }) {
    return this.presupuestosService.cerrarSemana(body.semana, user.sub, body.notas);
  }

  @Delete('reabrir-semana/:semana')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reabrir semana cerrada' })
  async reabrirSemana(@Param('semana') semana: string) {
    return this.presupuestosService.reabrirSemana(semana);
  }

  @Get('semana-cerrada/:semana')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Verificar si semana esta cerrada' })
  async isCerrada(@Param('semana') semana: string) {
    return this.presupuestosService.isCerrada(semana);
  }

  @Get('semanas-cerradas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar semanas cerradas' })
  async getSemanasСerradas() {
    return this.presupuestosService.getSemanasСerradas();
  }

  @Get(':semana/:sucursalId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener presupuesto vs gasto real para una semana y sucursal' })
  async getBudgetVsActual(
    @Param('semana') semana: string,
    @Param('sucursalId') sucursalId: string,
  ) {
    return this.presupuestosService.getBudgetVsActual(semana, sucursalId);
  }
}
