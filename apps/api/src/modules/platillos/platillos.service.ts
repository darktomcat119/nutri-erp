import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatilloDto } from './dto/create-platillo.dto';
import { UpdatePlatilloDto } from './dto/update-platillo.dto';
import ExcelJS from 'exceljs';

@Injectable()
export class PlatillosService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<unknown[]> {
    return this.prisma.platillo.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string): Promise<unknown> {
    const platillo = await this.prisma.platillo.findUnique({ where: { id } });
    if (!platillo) throw new NotFoundException('Platillo no encontrado');
    return platillo;
  }

  async create(dto: CreatePlatilloDto): Promise<unknown> {
    const existing = await this.prisma.platillo.findUnique({ where: { nombre: dto.nombre } });
    if (existing) throw new ConflictException('El platillo ya existe');
    return this.prisma.platillo.create({ data: dto });
  }

  async update(id: string, dto: UpdatePlatilloDto): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.platillo.update({ where: { id }, data: dto });
  }

  async toggleActivo(id: string) {
    const platillo = await this.prisma.platillo.findUnique({ where: { id } });
    if (!platillo) throw new NotFoundException('Platillo no encontrado');
    return this.prisma.platillo.update({ where: { id }, data: { activo: !platillo.activo } });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.platillo.update({ where: { id }, data: { activo: false } });
  }

  async exportExcel(): Promise<Buffer> {
    const platillos = await this.prisma.platillo.findMany({ orderBy: { nombre: 'asc' } });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Platillos');

    ws.columns = [
      { header: 'NOMBRE', key: 'nombre', width: 30 },
      { header: 'COSTO', key: 'costo', width: 15 },
      { header: 'PRECIO', key: 'precio', width: 15 },
      { header: 'ACTIVO', key: 'activo', width: 10 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    for (const p of platillos) {
      ws.addRow({ nombre: p.nombre, costo: Number(p.costo), precio: p.precio ? Number(p.precio) : '', activo: p.activo ? 'Si' : 'No' });
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async importExcel(fileBuffer: Buffer): Promise<{ created: number; updated: number; errors: string[] }> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('Archivo sin hojas');

    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '').trim().toUpperCase();
      if ((val === 'NOMBRE' || val.includes('RECETA') || val.includes('PLATILLO')) && !headerRow) headerRow = ri;
    });
    if (!headerRow) headerRow = 1;

    let created = 0, updated = 0;
    const errors: string[] = [];

    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const nombre = String(row.getCell(1).value || '').trim();
      if (!nombre) return;

      const getVal = (cell: ExcelJS.Cell): unknown => {
        const v = cell.value;
        if (v && typeof v === 'object' && 'result' in v) return (v as { result: unknown }).result;
        return v;
      };

      const costo = Number(getVal(row.getCell(2))) || 0;
      const precio = Number(getVal(row.getCell(3))) || 0;

      // Queue for processing (can't be async inside eachRow)
      (row as unknown as { _parsed: { nombre: string; costo: number; precio: number; ri: number } })._parsed = { nombre, costo, precio, ri };
    });

    // Collect parsed rows
    const rows: Array<{ nombre: string; costo: number; precio: number; ri: number }> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const nombre = String(row.getCell(1).value || '').trim();
      if (!nombre) return;
      const getVal = (cell: ExcelJS.Cell): unknown => {
        const v = cell.value;
        if (v && typeof v === 'object' && 'result' in v) return (v as { result: unknown }).result;
        return v;
      };
      rows.push({ nombre, costo: Number(getVal(row.getCell(2))) || 0, precio: Number(getVal(row.getCell(3))) || 0, ri });
    });

    for (const r of rows) {
      try {
        if (r.costo <= 0) { errors.push(`Fila ${r.ri}: ${r.nombre} sin costo`); continue; }
        const existing = await this.prisma.platillo.findUnique({ where: { nombre: r.nombre } });
        if (existing) {
          await this.prisma.platillo.update({ where: { nombre: r.nombre }, data: { costo: r.costo, precio: r.precio > 0 ? r.precio : undefined } });
          updated++;
        } else {
          await this.prisma.platillo.create({ data: { nombre: r.nombre, costo: r.costo, precio: r.precio > 0 ? r.precio : undefined } });
          created++;
        }
      } catch (e) { errors.push(`Fila ${r.ri}: ${(e as Error).message}`); }
    }
    return { created, updated, errors };
  }
}
