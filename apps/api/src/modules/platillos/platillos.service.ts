import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { CreatePlatilloDto } from './dto/create-platillo.dto';
import { UpdatePlatilloDto } from './dto/update-platillo.dto';
import ExcelJS from 'exceljs';

@Injectable()
export class PlatillosService {
  private readonly logger = new Logger(PlatillosService.name);
  constructor(private prisma: PrismaService, private jobs: JobsService) {}

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

  /**
   * Preview an Excel import without writing to the database. Parses the file,
   * runs the same validation as the real import, and classifies each row as
   * "would create", "would update", "would skip" (valid but no-op), or invalid.
   * Also returns sample labels for the first 10 rows in each bucket.
   */
  async previewImportExcel(fileBuffer: Buffer): Promise<{
    total: number;
    willCreate: number;
    willUpdate: number;
    willSkip: number;
    invalid: number;
    sampleCreate: Array<{ label: string; detail?: string }>;
    sampleUpdate: Array<{ label: string; detail?: string }>;
    invalidReasons: Array<{ row: number; reason: string }>;
    updates: Array<{
      key: string;
      label: string;
      changes: Array<{
        field: string;
        old: string | number | null;
        new: string | number | null;
      }>;
    }>;
  }> {
    const wb = new ExcelJS.Workbook();
    const ab = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    ) as ArrayBuffer;
    await wb.xlsx.load(ab);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('Archivo sin hojas');

    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '')
        .trim()
        .toUpperCase();
      if ((val === 'NOMBRE' || val.includes('RECETA') || val.includes('PLATILLO')) && !headerRow) {
        headerRow = ri;
      }
    });
    if (!headerRow) headerRow = 1;

    const getVal = (cell: ExcelJS.Cell): unknown => {
      const v = cell.value;
      if (v && typeof v === 'object' && 'result' in v) return (v as { result: unknown }).result;
      return v;
    };

    const rows: Array<{ nombre: string; costo: number; precio: number; ri: number }> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const nombre = String(row.getCell(1).value || '').trim();
      if (!nombre) return;
      rows.push({
        nombre,
        costo: Number(getVal(row.getCell(2))) || 0,
        precio: Number(getVal(row.getCell(3))) || 0,
        ri,
      });
    });

    let willCreate = 0;
    let willUpdate = 0;
    let willSkip = 0;
    const sampleCreate: Array<{ label: string; detail?: string }> = [];
    const sampleUpdate: Array<{ label: string; detail?: string }> = [];
    const invalidReasons: Array<{ row: number; reason: string }> = [];
    const updates: Array<{
      key: string;
      label: string;
      changes: Array<{
        field: string;
        old: string | number | null;
        new: string | number | null;
      }>;
    }> = [];

    for (const r of rows) {
      if (r.costo <= 0) {
        invalidReasons.push({ row: r.ri, reason: `${r.nombre}: costo invalido o faltante` });
        continue;
      }
      const existing = await this.prisma.platillo.findUnique({ where: { nombre: r.nombre } });
      if (existing) {
        const oldCost = Number(existing.costo);
        const newCost = r.costo;
        const oldPrecio = existing.precio !== null ? Number(existing.precio) : null;
        const newPrecio = r.precio > 0 ? r.precio : null;
        const costoChanged = Math.abs(oldCost - newCost) > 0.001;
        const precioChanged =
          newPrecio !== null &&
          (oldPrecio === null || Math.abs((oldPrecio ?? 0) - newPrecio) > 0.001);
        if (costoChanged || precioChanged) {
          willUpdate++;
          const changes: Array<{
            field: string;
            old: string | number | null;
            new: string | number | null;
          }> = [];
          if (costoChanged) changes.push({ field: 'costo', old: oldCost, new: newCost });
          if (precioChanged) changes.push({ field: 'precio', old: oldPrecio, new: newPrecio });
          updates.push({ key: existing.nombre, label: existing.nombre, changes });
          if (sampleUpdate.length < 10) {
            sampleUpdate.push({
              label: r.nombre,
              detail: `$${oldCost.toFixed(2)} -> $${newCost.toFixed(2)}`,
            });
          }
        } else {
          willSkip++;
        }
      } else {
        willCreate++;
        if (sampleCreate.length < 10) {
          sampleCreate.push({ label: r.nombre, detail: `$${r.costo.toFixed(2)}` });
        }
      }
    }

    return {
      total: rows.length,
      willCreate,
      willUpdate,
      willSkip,
      invalid: invalidReasons.length,
      sampleCreate,
      sampleUpdate,
      invalidReasons,
      updates,
    };
  }

  /**
   * Start an async import job and return the jobId immediately.
   * Progress events are emitted to the job stream: parsing → validating → saving → done.
   */
  startImportExcelJob(fileBuffer: Buffer, excludeKeys: string[] = []): string {
    // Copy the buffer — Multer's buffer is tied to the request lifecycle and may be
    // reused/freed once the controller returns.
    const bytes = Buffer.from(fileBuffer);
    const excluded = new Set(excludeKeys);
    const jobId = this.jobs.startJob('platillos-import');
    // Fire and forget; errors land on the job stream. Small delay so the client has
    // time to open the SSE stream before events start flowing.
    setTimeout(() => {
      this.runImportExcel(jobId, bytes, excluded).catch((e) => {
        this.logger.error(`Job ${jobId} failed: ${(e as Error).message}`, (e as Error).stack);
        this.jobs.emit(jobId, { type: 'error', message: (e as Error).message || 'Error desconocido' });
      });
    }, 50);
    return jobId;
  }

  private async runImportExcel(
    jobId: string,
    fileBuffer: Buffer,
    excluded: Set<string> = new Set(),
  ): Promise<void> {
    // Stage 1: parsing
    this.jobs.emit(jobId, { type: 'stage', stage: 'parse', message: 'Analizando archivo Excel...' });
    const wb = new ExcelJS.Workbook();
    // Slice to a fresh ArrayBuffer — fileBuffer.buffer is the pooled backing store
    // which may include unrelated bytes from other Buffers.
    const ab = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    ) as ArrayBuffer;
    await wb.xlsx.load(ab);
    const ws = wb.worksheets[0];
    if (!ws) {
      this.jobs.emit(jobId, { type: 'error', message: 'Archivo sin hojas' });
      return;
    }

    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '').trim().toUpperCase();
      if ((val === 'NOMBRE' || val.includes('RECETA') || val.includes('PLATILLO')) && !headerRow) headerRow = ri;
    });
    if (!headerRow) headerRow = 1;

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

    this.jobs.emit(jobId, { type: 'stage', stage: 'validate', message: `${rows.length} filas encontradas`, total: rows.length });

    // Stage 2: validation
    const validRows: typeof rows = [];
    const errors: string[] = [];
    for (const r of rows) {
      if (r.costo <= 0) { errors.push(`Fila ${r.ri}: ${r.nombre} sin costo`); continue; }
      validRows.push(r);
    }
    this.jobs.emit(jobId, { type: 'stage', stage: 'save', message: `Guardando ${validRows.length} platillos...`, total: validRows.length });

    // Stage 3: save with per-row progress
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      try {
        const existing = await this.prisma.platillo.findUnique({ where: { nombre: r.nombre } });
        if (existing) {
          if (excluded.has(existing.nombre)) {
            skipped++;
          } else {
            await this.prisma.platillo.update({
              where: { nombre: r.nombre },
              data: { costo: r.costo, precio: r.precio > 0 ? r.precio : undefined },
            });
            updated++;
          }
        } else {
          await this.prisma.platillo.create({
            data: { nombre: r.nombre, costo: r.costo, precio: r.precio > 0 ? r.precio : undefined },
          });
          created++;
        }
      } catch (e) {
        errors.push(`Fila ${r.ri}: ${(e as Error).message}`);
      }
      // Emit every 5 rows, or on the last one
      if (i === validRows.length - 1 || i % 5 === 0) {
        this.jobs.emit(jobId, {
          type: 'progress',
          current: i + 1,
          total: validRows.length,
          message: `${i + 1} / ${validRows.length} — ${r.nombre.slice(0, 40)}`,
        });
      }
    }

    this.jobs.emit(jobId, {
      type: 'done',
      result: { created, updated, skipped, errors, total: rows.length },
      message:
        skipped > 0
          ? `${created} nuevos, ${updated} actualizados, ${skipped} omitidos`
          : `${created} nuevos, ${updated} actualizados`,
    });
  }
}
