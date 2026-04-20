import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import ExcelJS from 'exceljs';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';

@Injectable()
export class InsumosService {
  private readonly logger = new Logger(InsumosService.name);
  constructor(private prisma: PrismaService, private jobs: JobsService) {}

  async findAll(query?: { categoria?: string; proveedorId?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = { activo: true };
    if (query?.categoria) where.categoria = query.categoria;
    if (query?.proveedorId) where.proveedorId = query.proveedorId;
    return this.prisma.insumo.findMany({ where, include: { proveedor: true }, orderBy: { codigo: 'asc' } });
  }

  async findOne(id: string): Promise<unknown> {
    const insumo = await this.prisma.insumo.findUnique({ where: { id }, include: { proveedor: true } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  async getNextCode() {
    const last = await this.prisma.insumo.findFirst({ where: { codigo: { startsWith: 'IN-' } }, orderBy: { codigo: 'desc' } });
    const num = last ? parseInt(last.codigo.replace('IN-', '')) + 1 : 1;
    return { data: `IN-${String(num).padStart(3, '0')}`, message: 'Siguiente codigo' };
  }

  async create(dto: CreateInsumoDto): Promise<unknown> {
    if (!dto.codigo) {
      const { data: nextCode } = await this.getNextCode();
      dto.codigo = nextCode;
    } else {
      const existing = await this.prisma.insumo.findUnique({ where: { codigo: dto.codigo } });
      if (existing) throw new ConflictException('El codigo de insumo ya existe');
    }
    return this.prisma.insumo.create({ data: dto as any, include: { proveedor: true } });
  }

  async update(id: string, dto: UpdateInsumoDto): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.insumo.update({ where: { id }, data: dto, include: { proveedor: true } });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.insumo.update({ where: { id }, data: { activo: false } });
  }

  async exportExcel(): Promise<Buffer> {
    const insumos = await this.prisma.insumo.findMany({
      include: { proveedor: true },
      orderBy: { codigo: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Insumos');

    // Row 1-4: warning/instruction rows matching IN01 format
    ws.mergeCells('A1:H1');
    ws.getCell('A1').value = 'CATÁLOGO DE INSUMOS (INS) — NO MODIFICAR ESTRUCTURA';
    ws.getCell('A1').font = { bold: true, color: { argb: 'FFFF0000' }, size: 12 };

    ws.mergeCells('A2:H2');
    ws.getCell('A2').value = 'NO FILTRAR, NO AGREGAR COLUMNAS INTERMEDIAS';
    ws.getCell('A2').font = { bold: true, color: { argb: 'FFFF0000' } };

    ws.mergeCells('A3:H3');
    ws.getCell('A3').value = 'Los datos inician en la fila 6. La fila 5 contiene los encabezados.';
    ws.getCell('A3').font = { italic: true };

    ws.mergeCells('A4:H4');
    ws.getCell('A4').value = '';

    // Row 5: headers matching IN01 exactly
    const headers = ['PRODUCTO', 'CATEGORÍA', 'MARCA', 'PRESENTACIÓN', 'CANTIDAD X PRES en ml,g, pz', 'PROVEEDOR', 'COSTO X PRESENTACIÓN', 'COSTO UNITARIO'];
    const headerRow = ws.getRow(5);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Column widths
    ws.getColumn(1).width = 30; // PRODUCTO
    ws.getColumn(2).width = 18; // CATEGORÍA
    ws.getColumn(3).width = 18; // MARCA
    ws.getColumn(4).width = 18; // PRESENTACIÓN
    ws.getColumn(5).width = 28; // CANTIDAD X PRES
    ws.getColumn(6).width = 22; // PROVEEDOR
    ws.getColumn(7).width = 22; // COSTO X PRESENTACIÓN
    ws.getColumn(8).width = 18; // COSTO UNITARIO

    // Row 6+: data
    for (const i of insumos) {
      const cantPres = i.cantidadPorDisplay || 0;
      const costoUnit = Number(i.costoUnitario);
      const costoPresentacion = cantPres > 0 ? Math.round(costoUnit * cantPres * 100) / 100 : costoUnit;
      ws.addRow([
        i.nombre,
        i.categoria,
        null, // MARCA — not stored on Insumo model
        i.presentacion,
        cantPres,
        i.proveedor.nombre,
        costoPresentacion,
        costoUnit,
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importExcel(fileBuffer: Buffer): Promise<{ created: number; updated: number; errors: string[] }> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('El archivo no contiene hojas');

    // Smart header detection — find row containing "PRODUCTO" in column 1
    let headerRowNum = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '').trim().toUpperCase();
      if (val === 'PRODUCTO' && !headerRowNum) headerRowNum = ri;
    });
    if (!headerRowNum) throw new BadRequestException('No se encontró la fila de encabezados (busca "PRODUCTO" en columna 1)');

    const proveedores = await this.prisma.proveedor.findMany();
    const provMap = new Map(proveedores.map(p => [p.nombre.toLowerCase().trim(), p.id]));

    let created = 0, updated = 0;
    const errors: string[] = [];

    // IN01 format: PRODUCTO(1) | CATEGORÍA(2) | MARCA(3) | PRESENTACIÓN(4) | CANTIDAD X PRES(5) | PROVEEDOR(6) | COSTO X PRESENTACIÓN(7) | COSTO UNITARIO(8)
    const rows: Array<Record<string, unknown>> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRowNum) return;
      const nombre = String(row.getCell(1).value || '').trim();
      if (!nombre) return;

      rows.push({
        nombre,
        categoria: String(row.getCell(2).value || '').trim() || null,
        marca: String(row.getCell(3).value || '').trim() || null,
        presentacion: String(row.getCell(4).value || '').trim() || null,
        cantidadPorDisplay: parseInt(String(row.getCell(5).value)) || null,
        proveedor: String(row.getCell(6).value || '').trim(),
        costoPresentacion: parseFloat(String(row.getCell(7).value)) || 0,
        costoUnitario: parseFloat(String(row.getCell(8).value)) || 0,
        rowNum: ri,
      });
    });

    for (const r of rows) {
      try {
        const provNombre = (r.proveedor as string).toLowerCase().trim();
        let provId = provMap.get(provNombre);

        // If proveedor not found, try partial match
        if (!provId) {
          for (const [name, id] of provMap) {
            if (name.includes(provNombre) || provNombre.includes(name)) {
              provId = id; break;
            }
          }
        }
        // Auto-create supplier if not found
        if (!provId) {
          const provName = (r.proveedor as string).trim();
          if (!provName) { errors.push(`Fila ${r.rowNum}: Sin proveedor`); continue; }
          const maxRuta = await this.prisma.proveedor.aggregate({ _max: { ordenRuta: true } });
          const newProv = await this.prisma.proveedor.create({
            data: { nombre: provName, ordenRuta: (maxRuta._max.ordenRuta || 0) + 1 },
          });
          provId = newProv.id;
          provMap.set(provNombre, provId);
        }

        const nombre = r.nombre as string;
        const cantidadPorDisplay = r.cantidadPorDisplay as number | null;
        let costoUnitario = r.costoUnitario as number;

        // If costoUnitario is 0 but we have costoPresentacion and cantidadPorDisplay, calculate it
        if (!costoUnitario && (r.costoPresentacion as number) > 0 && cantidadPorDisplay && cantidadPorDisplay > 0) {
          costoUnitario = Math.round(((r.costoPresentacion as number) / cantidadPorDisplay) * 100) / 100;
        }

        // Derive unidad from presentacion if possible
        const presentacion = r.presentacion as string || null;
        let unidad = 'PZ';
        if (presentacion) {
          const presLower = presentacion.toLowerCase();
          if (presLower.includes('ml') || presLower.includes('litro') || presLower.includes('lt')) unidad = 'ML';
          else if (presLower.includes('kg') || presLower.includes('kilo')) unidad = 'KG';
          else if (presLower.includes('gr') || presLower.includes('gramo')) unidad = 'GR';
          else if (presLower.includes('pz') || presLower.includes('pieza')) unidad = 'PZ';
        }

        const data = {
          nombre,
          categoria: r.categoria as string,
          unidad,
          presentacion,
          cantidadPorDisplay,
          costoUnitario,
          proveedorId: provId,
          origen: 'Compras' as string,
        };

        // Match by nombre
        const existingByName = await this.prisma.insumo.findFirst({
          where: { nombre },
        });

        if (existingByName) {
          await this.prisma.insumo.update({ where: { id: existingByName.id }, data });
          updated++;
        } else {
          const last = await this.prisma.insumo.findFirst({ where: { codigo: { startsWith: 'IN-' } }, orderBy: { codigo: 'desc' } });
          const num = last ? parseInt(last.codigo.replace('IN-', '')) + 1 : 1;
          await this.prisma.insumo.create({ data: { ...data, codigo: `IN-${String(num).padStart(3, '0')}` } });
          created++;
        }
      } catch (e) {
        errors.push(`Fila ${r.rowNum}: ${(e as Error).message}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Preview an Excel import without writing to the database. Parses the file,
   * runs read-only matching against existing insumos, and reports what would
   * be created/updated/skipped along with first-10 sample rows per bucket.
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
    if (!ws) throw new BadRequestException('El archivo no contiene hojas');

    let headerRowNum = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '')
        .trim()
        .toUpperCase();
      if (val === 'PRODUCTO' && !headerRowNum) headerRowNum = ri;
    });
    if (!headerRowNum) {
      throw new BadRequestException(
        'No se encontró la fila de encabezados (busca "PRODUCTO" en columna 1)',
      );
    }

    const rows: Array<{
      nombre: string;
      categoria: string | null;
      proveedor: string;
      cantidadPorDisplay: number | null;
      costoPresentacion: number;
      costoUnitario: number;
      rowNum: number;
    }> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRowNum) return;
      const nombre = String(row.getCell(1).value || '').trim();
      if (!nombre) return;
      rows.push({
        nombre,
        categoria: String(row.getCell(2).value || '').trim() || null,
        proveedor: String(row.getCell(6).value || '').trim(),
        cantidadPorDisplay: parseInt(String(row.getCell(5).value)) || null,
        costoPresentacion: parseFloat(String(row.getCell(7).value)) || 0,
        costoUnitario: parseFloat(String(row.getCell(8).value)) || 0,
        rowNum: ri,
      });
    });

    // Preload proveedores so we can compute diffs by name without hitting DB per row
    const proveedoresAll = await this.prisma.proveedor.findMany();
    const provByIdToName = new Map(proveedoresAll.map((p) => [p.id, p.nombre]));

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
      if (!r.proveedor) {
        invalidReasons.push({ row: r.rowNum, reason: `${r.nombre}: sin proveedor` });
        continue;
      }

      // Compute effective costoUnitario the same way runImportExcel does
      let effectiveCostoUnitario = r.costoUnitario;
      if (
        !effectiveCostoUnitario &&
        r.costoPresentacion > 0 &&
        r.cantidadPorDisplay &&
        r.cantidadPorDisplay > 0
      ) {
        effectiveCostoUnitario =
          Math.round((r.costoPresentacion / r.cantidadPorDisplay) * 100) / 100;
      }

      if (effectiveCostoUnitario <= 0) {
        invalidReasons.push({
          row: r.rowNum,
          reason: `${r.nombre}: costo unitario invalido`,
        });
        continue;
      }

      const existing = await this.prisma.insumo.findFirst({ where: { nombre: r.nombre } });

      if (existing) {
        const oldCost = Number(existing.costoUnitario);
        const oldCategoria = existing.categoria ?? null;
        const newCategoria = r.categoria;
        const oldProveedorName = provByIdToName.get(existing.proveedorId) ?? null;
        const newProveedorName = r.proveedor;

        const costChanged = Math.abs(oldCost - effectiveCostoUnitario) > 0.001;
        const categoriaChanged = (oldCategoria || '') !== (newCategoria || '');
        const proveedorChanged =
          !!newProveedorName &&
          (oldProveedorName || '').toLowerCase().trim() !==
            newProveedorName.toLowerCase().trim();

        if (costChanged || categoriaChanged || proveedorChanged) {
          willUpdate++;
          const changes: Array<{
            field: string;
            old: string | number | null;
            new: string | number | null;
          }> = [];
          if (costChanged) {
            changes.push({
              field: 'costoUnitario',
              old: oldCost,
              new: effectiveCostoUnitario,
            });
          }
          if (categoriaChanged) {
            changes.push({ field: 'categoria', old: oldCategoria, new: newCategoria });
          }
          if (proveedorChanged) {
            changes.push({ field: 'proveedor', old: oldProveedorName, new: newProveedorName });
          }
          const key = existing.codigo || existing.nombre;
          updates.push({
            key,
            label: existing.codigo
              ? `${existing.codigo} — ${existing.nombre}`
              : existing.nombre,
            changes,
          });
          if (sampleUpdate.length < 10) {
            sampleUpdate.push({
              label: existing.codigo || r.nombre,
              detail: `cost $${oldCost.toFixed(2)} -> $${effectiveCostoUnitario.toFixed(2)}`,
            });
          }
        } else {
          willSkip++;
        }
      } else {
        willCreate++;
        if (sampleCreate.length < 10) {
          sampleCreate.push({ label: r.nombre, detail: r.nombre });
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
    const jobId = this.jobs.startJob('insumos-import');
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
      this.jobs.emit(jobId, { type: 'error', message: 'El archivo no contiene hojas' });
      return;
    }

    // Smart header detection — find row containing "PRODUCTO" in column 1
    let headerRowNum = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '').trim().toUpperCase();
      if (val === 'PRODUCTO' && !headerRowNum) headerRowNum = ri;
    });
    if (!headerRowNum) {
      this.jobs.emit(jobId, {
        type: 'error',
        message: 'No se encontró la fila de encabezados (busca "PRODUCTO" en columna 1)',
      });
      return;
    }

    // IN01 format: PRODUCTO(1) | CATEGORÍA(2) | MARCA(3) | PRESENTACIÓN(4) |
    // CANTIDAD X PRES(5) | PROVEEDOR(6) | COSTO X PRESENTACIÓN(7) | COSTO UNITARIO(8)
    const rows: Array<Record<string, unknown>> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRowNum) return;
      const nombre = String(row.getCell(1).value || '').trim();
      if (!nombre) return;
      rows.push({
        nombre,
        categoria: String(row.getCell(2).value || '').trim() || null,
        marca: String(row.getCell(3).value || '').trim() || null,
        presentacion: String(row.getCell(4).value || '').trim() || null,
        cantidadPorDisplay: parseInt(String(row.getCell(5).value)) || null,
        proveedor: String(row.getCell(6).value || '').trim(),
        costoPresentacion: parseFloat(String(row.getCell(7).value)) || 0,
        costoUnitario: parseFloat(String(row.getCell(8).value)) || 0,
        rowNum: ri,
      });
    });

    this.jobs.emit(jobId, {
      type: 'stage',
      stage: 'validate',
      message: `${rows.length} filas encontradas`,
      total: rows.length,
    });

    const validRows = rows;
    const errors: string[] = [];

    const proveedores = await this.prisma.proveedor.findMany();
    const provMap = new Map(proveedores.map((p) => [p.nombre.toLowerCase().trim(), p.id]));

    this.jobs.emit(jobId, {
      type: 'stage',
      stage: 'save',
      message: `Guardando ${validRows.length} insumos...`,
      total: validRows.length,
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      try {
        const nombre = r.nombre as string;
        // Resolve the existing row first so the exclude check can short-circuit before
        // any writes (including proveedor auto-create).
        const existingByName = await this.prisma.insumo.findFirst({ where: { nombre } });
        if (existingByName) {
          const key = existingByName.codigo || existingByName.nombre;
          if (excluded.has(key)) {
            skipped++;
            continue;
          }
        }

        const provNombre = (r.proveedor as string).toLowerCase().trim();
        let provId = provMap.get(provNombre);

        // If proveedor not found, try partial match
        if (!provId) {
          for (const [name, id] of provMap) {
            if (name.includes(provNombre) || provNombre.includes(name)) {
              provId = id;
              break;
            }
          }
        }
        // Auto-create supplier if not found
        if (!provId) {
          const provName = (r.proveedor as string).trim();
          if (!provName) {
            errors.push(`Fila ${r.rowNum}: Sin proveedor`);
            continue;
          }
          const maxRuta = await this.prisma.proveedor.aggregate({ _max: { ordenRuta: true } });
          const newProv = await this.prisma.proveedor.create({
            data: { nombre: provName, ordenRuta: (maxRuta._max.ordenRuta || 0) + 1 },
          });
          provId = newProv.id;
          provMap.set(provNombre, provId);
        }

        const cantidadPorDisplay = r.cantidadPorDisplay as number | null;
        let costoUnitario = r.costoUnitario as number;

        // If costoUnitario is 0 but we have costoPresentacion and cantidadPorDisplay, calculate it
        if (
          !costoUnitario &&
          (r.costoPresentacion as number) > 0 &&
          cantidadPorDisplay &&
          cantidadPorDisplay > 0
        ) {
          costoUnitario =
            Math.round(((r.costoPresentacion as number) / cantidadPorDisplay) * 100) / 100;
        }

        // Derive unidad from presentacion if possible
        const presentacion = (r.presentacion as string) || null;
        let unidad = 'PZ';
        if (presentacion) {
          const presLower = presentacion.toLowerCase();
          if (presLower.includes('ml') || presLower.includes('litro') || presLower.includes('lt'))
            unidad = 'ML';
          else if (presLower.includes('kg') || presLower.includes('kilo')) unidad = 'KG';
          else if (presLower.includes('gr') || presLower.includes('gramo')) unidad = 'GR';
          else if (presLower.includes('pz') || presLower.includes('pieza')) unidad = 'PZ';
        }

        const data = {
          nombre,
          categoria: r.categoria as string,
          unidad,
          presentacion,
          cantidadPorDisplay,
          costoUnitario,
          proveedorId: provId,
          origen: 'Compras' as string,
        };

        if (existingByName) {
          await this.prisma.insumo.update({ where: { id: existingByName.id }, data });
          updated++;
        } else {
          const last = await this.prisma.insumo.findFirst({
            where: { codigo: { startsWith: 'IN-' } },
            orderBy: { codigo: 'desc' },
          });
          const num = last ? parseInt(last.codigo.replace('IN-', '')) + 1 : 1;
          await this.prisma.insumo.create({
            data: { ...data, codigo: `IN-${String(num).padStart(3, '0')}` },
          });
          created++;
        }
      } catch (e) {
        errors.push(`Fila ${r.rowNum}: ${(e as Error).message}`);
      }
      // Emit every 5 rows, or on the last one
      if (i === validRows.length - 1 || i % 5 === 0) {
        const label = String(r.nombre || '').slice(0, 40);
        this.jobs.emit(jobId, {
          type: 'progress',
          current: i + 1,
          total: validRows.length,
          message: `${i + 1} / ${validRows.length} — ${label}`,
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
