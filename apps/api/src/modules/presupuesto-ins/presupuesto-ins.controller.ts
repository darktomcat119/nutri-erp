import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PresupuestoInsService } from './presupuesto-ins.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Presupuesto INS')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('presupuesto-ins')
export class PresupuestoInsController {
  constructor(private presupuestoInsService: PresupuestoInsService) {}

  @Post('generar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Generar presupuesto INS desde Excel de ventas' })
  async generar(
    @UploadedFile() file: Express.Multer.File,
    @Body('sucursalId') sucursalId: string,
    @Body('semana') semana: string,
    @Body('fechaEjecucion') fechaEjecucion: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo Excel');
    if (!sucursalId) throw new BadRequestException('Se requiere sucursalId');
    if (!semana) throw new BadRequestException('Se requiere semana');
    if (!fechaEjecucion) throw new BadRequestException('Se requiere fechaEjecucion');

    return this.presupuestoInsService.generateFromSalesExcel(
      file.buffer,
      sucursalId,
      semana,
      new Date(fechaEjecucion),
      user.sub,
    );
  }

  @Post('generar-live')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generar presupuesto INS desde ventas live de OrderEat' })
  async generarLive(
    @Body('sucursalId') sucursalId: string,
    @Body('semana') semana: string,
    @Body('fechaEjecucion') fechaEjecucion: string,
    @Body('from') from: string | undefined,
    @Body('until') until: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!sucursalId) throw new BadRequestException('Se requiere sucursalId');
    if (!semana) throw new BadRequestException('Se requiere semana');
    if (!fechaEjecucion) throw new BadRequestException('Se requiere fechaEjecucion');
    return this.presupuestoInsService.generateFromOrderEatLive(
      sucursalId,
      semana,
      new Date(fechaEjecucion),
      user.sub,
      from ? new Date(from) : undefined,
      until ? new Date(until) : undefined,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar presupuestos INS' })
  @ApiQuery({ name: 'semana', required: false })
  async findAll(@Query('semana') semana?: string) {
    return this.presupuestoInsService.findAll(semana);
  }

  @Get('branch/:semana/:sucursalId')
  @ApiOperation({ summary: 'Obtener presupuesto INS aprobado para sucursal y semana' })
  async getForBranch(
    @Param('semana') semana: string,
    @Param('sucursalId') sucursalId: string,
  ) {
    return this.presupuestoInsService.getForBranch(semana, sucursalId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Detalle de presupuesto INS' })
  async findOne(@Param('id') id: string) {
    return this.presupuestoInsService.findOne(id);
  }

  @Patch(':id/aprobar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar presupuesto INS' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('montoAprobado') montoAprobado?: number,
  ) {
    return this.presupuestoInsService.approve(id, user.sub, montoAprobado);
  }

  @Patch(':id/rechazar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rechazar presupuesto INS' })
  async reject(
    @Param('id') id: string,
    @Body('notas') notas: string,
  ) {
    return this.presupuestoInsService.reject(id, notas);
  }
}
