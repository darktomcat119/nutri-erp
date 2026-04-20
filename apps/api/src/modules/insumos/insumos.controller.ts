import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { InsumosService } from './insumos.service';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Insumos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('insumos')
export class InsumosController {
  constructor(private insumosService: InsumosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar insumos' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'proveedorId', required: false })
  async findAll(@Query('categoria') categoria?: string, @Query('proveedorId') proveedorId?: string) {
    return this.insumosService.findAll({ categoria, proveedorId });
  }

  @Get('next-code')
  @ApiOperation({ summary: 'Obtener siguiente codigo auto-generado' })
  async getNextCode() { return this.insumosService.getNextCode(); }

  @Get('export-excel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Exportar insumos a Excel' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.insumosService.exportExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=insumos.xlsx',
    });
    res.send(buffer);
  }

  @Post('import-excel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar insumos desde Excel (bloqueante, legado)' })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.insumosService.importExcel(file.buffer);
  }

  @Post('import-excel-stream')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar insumos desde Excel con progreso via SSE' })
  async importExcelStream(
    @UploadedFile() file: Express.Multer.File,
    @Body('excludeKeys') excludeKeysRaw?: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'No se recibio ningun archivo. Asegurate de adjuntar un Excel en el campo "file".',
      );
    }
    let excludeKeys: string[] = [];
    if (excludeKeysRaw) {
      try {
        const parsed: unknown = JSON.parse(excludeKeysRaw);
        if (Array.isArray(parsed)) {
          excludeKeys = parsed.filter((v): v is string => typeof v === 'string');
        }
      } catch {
        excludeKeys = excludeKeysRaw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    const jobId = this.insumosService.startImportExcelJob(file.buffer, excludeKeys);
    return { jobId };
  }

  @Post('import-excel-preview')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Previsualizar importacion sin escribir' })
  async importExcelPreview(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No se recibio ningun archivo.');
    }
    return this.insumosService.previewImportExcel(file.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener insumo' })
  async findOne(@Param('id') id: string) { return this.insumosService.findOne(id); }

  @Post()
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear insumo' })
  async create(@Body() dto: CreateInsumoDto) { return this.insumosService.create(dto); }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar insumo' })
  async update(@Param('id') id: string, @Body() dto: UpdateInsumoDto) { return this.insumosService.update(id, dto); }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar insumo' })
  async remove(@Param('id') id: string) { return this.insumosService.remove(id); }
}
