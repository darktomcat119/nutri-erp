import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import ExcelJS from 'exceljs';

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  async importarInventario(file: Express.Multer.File, sucursalId: string) {
    if (!file) {
      throw new BadRequestException('Archivo Excel requerido');
    }

    const sucursal = await this.prisma.sucursal.findUnique({ where: { id: sucursalId } });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('El archivo no contiene hojas');

    const productos = await this.prisma.producto.findMany({ where: { activo: true } });
    const fechaImport = new Date();

    let total = 0;
    let matched = 0;
    let unmatched = 0;
    const unmatchedNames: string[] = [];

    const rows: Array<{
      nombre: string;
      inventarioTotal: number;
      reservado: number;
      disponible: number;
      limiteDiario: number | null;
    }> = [];

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const nombre = String(row.getCell(1).value || '').trim();
      if (!nombre) return;

      rows.push({
        nombre,
        inventarioTotal: Number(row.getCell(2).value) || 0,
        reservado: Number(row.getCell(3).value) || 0,
        disponible: Number(row.getCell(4).value) || 0,
        limiteDiario: row.getCell(5).value != null ? Number(row.getCell(5).value) : null,
      });
    });

    total = rows.length;

    for (const row of rows) {
      // Try to match by ordereatId first, then by nombreSistema (case-insensitive contains)
      let producto = productos.find((p) => p.ordereatId && p.ordereatId === row.nombre);

      if (!producto) {
        producto = productos.find(
          (p) =>
            p.nombreSistema &&
            p.nombreSistema.toLowerCase().includes(row.nombre.toLowerCase()),
        );
      }

      if (!producto) {
        // Also try the reverse: row name contains nombreSistema
        producto = productos.find(
          (p) =>
            p.nombreSistema &&
            row.nombre.toLowerCase().includes(p.nombreSistema.toLowerCase()),
        );
      }

      if (producto) {
        await this.prisma.inventarioPos.upsert({
          where: {
            sucursalId_productoId_fechaImport: {
              sucursalId,
              productoId: producto.id,
              fechaImport: fechaImport,
            },
          },
          update: {
            inventarioTotal: row.inventarioTotal,
            reservado: row.reservado,
            disponible: row.disponible,
            limiteDiario: row.limiteDiario,
          },
          create: {
            sucursalId,
            productoId: producto.id,
            inventarioTotal: row.inventarioTotal,
            reservado: row.reservado,
            disponible: row.disponible,
            limiteDiario: row.limiteDiario,
            fechaImport: fechaImport,
          },
        });
        matched++;
      } else {
        unmatched++;
        unmatchedNames.push(row.nombre);
      }
    }

    return {
      data: { total, matched, unmatched, unmatchedNames },
      message: 'Inventario importado',
    };
  }

  async getInventario(sucursalId: string) {
    // Find the most recent fechaImport for this branch
    const latest = await this.prisma.inventarioPos.findFirst({
      where: { sucursalId },
      orderBy: { fechaImport: 'desc' },
      select: { fechaImport: true },
    });

    if (!latest) {
      return { data: [], message: 'Sin inventario' };
    }

    const records = await this.prisma.inventarioPos.findMany({
      where: {
        sucursalId,
        fechaImport: latest.fechaImport,
      },
      include: { producto: true },
      orderBy: { producto: { nombre: 'asc' } },
    });

    return { data: records, message: 'Inventario POS' };
  }

  async generarCarga(ordenEntregaId: string) {
    const ordenEntrega = await this.prisma.ordenEntrega.findUnique({
      where: { id: ordenEntregaId },
      include: {
        ordenCompra: true,
        sucursal: true,
        items: {
          include: { producto: true },
        },
      },
    });

    if (!ordenEntrega) throw new NotFoundException('Orden de entrega no encontrada');

    // Filter: only area MOS and producto with ordereatId
    const mosItems = ordenEntrega.items.filter(
      (item) => item.area === 'MOS' && item.producto && item.producto.ordereatId,
    );

    if (mosItems.length === 0) {
      throw new BadRequestException('No hay items MOS con ID de OrderEat');
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Carga POS');

    ws.columns = [
      { header: 'ID DEL PRODUCTO', key: 'idProducto', width: 20 },
      { header: 'NOMBRE DEL PRODUCTO', key: 'nombreProducto', width: 40 },
      { header: 'TIPO DE MOVIMIENTO', key: 'tipoMovimiento', width: 20 },
      { header: 'CANTIDAD', key: 'cantidad', width: 15 },
      { header: 'DESCRIPCION', key: 'descripcion', width: 30 },
    ];

    let totalItems = 0;
    let totalPiezas = 0;

    for (const item of mosItems) {
      const piezas = Number(item.cantidadAsignada) * item.producto!.pzXDisplay;
      totalItems++;
      totalPiezas += piezas;

      ws.addRow({
        idProducto: item.producto!.ordereatId,
        nombreProducto: item.producto!.nombreSistema || item.producto!.nombre,
        tipoMovimiento: 'Entrada',
        cantidad: piezas,
        descripcion: `Semana ${ordenEntrega.ordenCompra.semana}`,
      });
    }

    const buffer = await wb.xlsx.writeBuffer();

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `carga-pos-${ordenEntrega.sucursal.nombre.replace(/\s+/g, '-')}-${ordenEntrega.ordenCompra.semana}-${Date.now()}.xlsx`;
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, Buffer.from(buffer));

    const posUpload = await this.prisma.posUpload.create({
      data: {
        sucursalId: ordenEntrega.sucursalId,
        semana: ordenEntrega.ordenCompra.semana,
        archivoUrl: filePath,
        totalItems,
        totalPiezas,
      },
    });

    return {
      data: { upload: posUpload, totalItems, totalPiezas },
      message: 'Archivo generado',
    };
  }

  async getUploads() {
    const uploads = await this.prisma.posUpload.findMany({
      include: { sucursal: true },
      orderBy: { createdAt: 'desc' },
    });

    return { data: uploads, message: 'Cargas POS' };
  }

  async downloadUpload(id: string) {
    const upload = await this.prisma.posUpload.findUnique({ where: { id } });
    if (!upload) throw new NotFoundException('Archivo no encontrado');

    return { data: { archivoUrl: upload.archivoUrl }, message: 'URL de descarga' };
  }
}
