import { Controller, Get, Post, Patch, Delete, Body, Param, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
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

  @Get('export-excel')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Exportar platillos a Excel' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.platillosService.exportExcel();
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename=platillos.xlsx' });
    res.send(buffer);
  }

  @Post('import-excel')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar platillos desde Excel' })
  async importExcel(@UploadedFile() file: Express.Multer.File) { return this.platillosService.importExcel(file.buffer); }

  @Post()
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear platillo' })
  async create(@Body() dto: CreatePlatilloDto) { return this.platillosService.create(dto); }

  @Patch(':id/toggle-activo')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar platillo' })
  async toggleActivo(@Param('id') id: string) { return this.platillosService.toggleActivo(id); }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar platillo' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlatilloDto) { return this.platillosService.update(id, dto); }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar platillo' })
  async remove(@Param('id') id: string) { return this.platillosService.remove(id); }
}
