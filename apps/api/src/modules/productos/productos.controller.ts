import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos MOS' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'proveedorId', required: false })
  async findAll(
    @Query('categoria') categoria?: string,
    @Query('proveedorId') proveedorId?: string,
  ) {
    return this.productosService.findAll({ categoria, proveedorId });
  }

  @Get('next-code')
  @ApiOperation({ summary: 'Obtener siguiente codigo auto-generado' })
  async getNextCode() {
    return this.productosService.getNextCode();
  }

  @Get('export-excel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Exportar productos a Excel' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.productosService.exportExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=productos_mos.xlsx',
    });
    res.send(buffer);
  }

  @Post('import-excel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar productos desde Excel' })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.productosService.importExcel(file.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto con config de sucursales' })
  async findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear producto' })
  async create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar producto' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar producto' })
  async remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}
