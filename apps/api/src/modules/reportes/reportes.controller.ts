import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportesService } from './reportes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get('resumen-semanal/:semana')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Resumen completo de la semana' })
  async resumenSemanal(@Param('semana') semana: string) {
    return this.reportesService.resumenSemanal(semana);
  }

  @Get('diferencias/:semana')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Diferencias entre recibido y esperado en la semana' })
  async diferencias(@Param('semana') semana: string) {
    return this.reportesService.diferencias(semana);
  }

  @Get('gastos-proveedor/:semana')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Gastos agrupados por proveedor en la semana' })
  async gastosProveedor(@Param('semana') semana: string) {
    return this.reportesService.gastosProveedor(semana);
  }
}
