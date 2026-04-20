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
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  private readonly logger = new Logger(ProductosService.name);
  constructor(private prisma: PrismaService, private jobs: JobsService) {}

  async findAll(query?: { categoria?: string; proveedorId?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = { activo: true };
    if (query?.categoria) where.categoria = query.categoria;
    if (query?.proveedorId) where.proveedorId = query.proveedorId;

    return this.prisma.producto.findMany({
      where,
      include: { proveedor: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string): Promise<unknown> {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { proveedor: true, configSucursales: { include: { sucursal: true } } },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async getNextCode() {
    const last = await this.prisma.producto.findFirst({ where: { codigo: { startsWith: 'MO-' } }, orderBy: { codigo: 'desc' } });
    const num = last ? parseInt(last.codigo.replace('MO-', '')) + 1 : 1;
    return { data: `MO-${String(num).padStart(3, '0')}`, message: 'Siguiente codigo' };
  }

  async create(dto: CreateProductoDto): Promise<unknown> {
    if (!dto.codigo) {
      const { data: nextCode } = await this.getNextCode();
      dto.codigo = nextCode;
    } else {
      const existing = await this.prisma.producto.findUnique({ where: { codigo: dto.codigo } });
      if (existing) throw new ConflictException('El codigo de producto ya existe');
    }

    return this.prisma.producto.create({
      data: dto as any,
      include: { proveedor: true },
    });
  }

  async update(id: string, dto: UpdateProductoDto): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: dto,
      include: { proveedor: true },
    });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
  }

  async exportExcel(): Promise<Buffer> {
    const productos = await this.prisma.producto.findMany({
      include: { proveedor: true },
      orderBy: { codigo: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Productos MOS');

    // Row 1-4: warning/instruction rows matching MO01 format
    ws.mergeCells('A1:I1');
    ws.getCell('A1').value = 'CATÁLOGO DE PRODUCTOS (MOS) — NO MODIFICAR ESTRUCTURA';
    ws.getCell('A1').font = { bold: true, color: { argb: 'FFFF0000' }, size: 12 };

    ws.mergeCells('A2:I2');
    ws.getCell('A2').value = 'NO FILTRAR, NO AGREGAR COLUMNAS INTERMEDIAS';
    ws.getCell('A2').font = { bold: true, color: { argb: 'FFFF0000' } };

    ws.mergeCells('A3:I3');
    ws.getCell('A3').value = 'Los datos inician en la fila 6. La fila 5 contiene los encabezados.';
    ws.getCell('A3').font = { italic: true };

    ws.mergeCells('A4:I4');
    ws.getCell('A4').value = '';

    // Row 5: headers matching MO01 exactly
    const headers = ['PRODUCTO', 'NOMBRE SISTEMA', 'CATEGORÍA', 'MARCA', 'PZ X DISPLAY', 'PROVEEDOR', 'COSTO X DISPLAY', 'COSTO UNITARIO', 'QUIEN SURTE'];
    const headerRow = ws.getRow(5);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Column widths
    ws.getColumn(1).width = 30; // PRODUCTO
    ws.getColumn(2).width = 30; // NOMBRE SISTEMA
    ws.getColumn(3).width = 18; // CATEGORÍA
    ws.getColumn(4).width = 18; // MARCA
    ws.getColumn(5).width = 14; // PZ X DISPLAY
    ws.getColumn(6).width = 22; // PROVEEDOR
    ws.getColumn(7).width = 18; // COSTO X DISPLAY
    ws.getColumn(8).width = 18; // COSTO UNITARIO
    ws.getColumn(9).width = 16; // QUIEN SURTE

    // Row 6+: data
    for (const p of productos) {
      const origenExport = (p.origen || 'Compras').toUpperCase() === 'SUCURSAL' ? 'SUCURSAL' : 'COMPRAS';
      ws.addRow([
        p.nombre,
        p.nombreSistema || p.nombre,
        p.categoria,
        p.marca,
        p.pzXDisplay,
        p.proveedor.nombre,
        Number(p.costoDisplay),
        Number(p.costoUnitario),
        origenExport,
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
    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '').trim().toUpperCase();
      if (val === 'PRODUCTO' && !headerRow) headerRow = ri;
    });
    if (!headerRow) throw new BadRequestException('No se encontró la fila de encabezados (busca "PRODUCTO" en columna 1)');

    const proveedores = await this.prisma.proveedor.findMany();
    const provMap = new Map(proveedores.map(p => [p.nombre.toLowerCase().trim(), p.id]));

    let created = 0, updated = 0;
    const errors: string[] = [];

    // MO01 format: PRODUCTO(1) | NOMBRE SISTEMA(2) | CATEGORÍA(3) | MARCA(4) | PZ X DISPLAY(5) | PROVEEDOR(6) | COSTO X DISPLAY(7) | COSTO UNITARIO(8) | QUIEN SURTE(9)
    const rows: Array<Record<string, unknown>> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const producto = String(row.getCell(1).value || '').trim();
      if (!producto) return;

      rows.push({
        producto,
        nombreSistema: String(row.getCell(2).value || '').trim(),
        categoria: String(row.getCell(3).value || '').trim() || null,
        marca: String(row.getCell(4).value || '').trim() || null,
        pzXDisplay: parseInt(String(row.getCell(5).value)) || 0,
        proveedor: String(row.getCell(6).value || '').trim(),
        costoDisplay: parseFloat(String(row.getCell(7).value)) || 0,
        costoUnitarioRaw: row.getCell(8).value,
        origen: String(row.getCell(9).value || 'Compras').trim(),
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

        const pzXDisplay = r.pzXDisplay as number;
        const costoDisplay = r.costoDisplay as number;
        const costoUnitario = pzXDisplay > 0 ? Math.round((costoDisplay / pzXDisplay) * 100) / 100 : 0;

        const nombreSistema = r.nombreSistema as string || r.producto as string;
        const nombre = [nombreSistema, pzXDisplay > 0 ? `${pzXDisplay}PZ` : '', r.marca].filter(Boolean).join(' ');
        const origen = r.origen as string;
        const origenNorm = origen.toUpperCase().includes('SUCURSAL') ? 'Sucursal' : 'Compras';

        const data = {
          nombre,
          nombreSistema,
          categoria: r.categoria as string,
          marca: r.marca as string,
          pzXDisplay,
          costoDisplay,
          costoUnitario,
          proveedorId: provId,
          origen: origenNorm,
        };

        // Use producto name as matching key since codes might not exist in import
        const existingByName = await this.prisma.producto.findFirst({
          where: { OR: [{ nombreSistema }, { nombre: r.producto as string }] },
        });

        if (existingByName) {
          await this.prisma.producto.update({ where: { id: existingByName.id }, data });
          updated++;
        } else {
          const last = await this.prisma.producto.findFirst({ where: { codigo: { startsWith: 'MO-' } }, orderBy: { codigo: 'desc' } });
          const num = last ? parseInt(last.codigo.replace('MO-', '')) + 1 : 1;
          await this.prisma.producto.create({ data: { ...data, codigo: `MO-${String(num).padStart(3, '0')}` } });
          created++;
        }
      } catch (e) {
        errors.push(`Fila ${r.rowNum}: ${(e as Error).message}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Preview an Excel import without writing to the database. Mirrors the parsing
   * and matching rules of runImportExcel but does not touch Prisma (other than
   * read-only lookups) — no proveedores are created, no productos are modified.
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

    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '')
        .trim()
        .toUpperCase();
      if (val === 'PRODUCTO' && !headerRow) headerRow = ri;
    });
    if (!headerRow) {
      throw new BadRequestException(
        'No se encontró la fila de encabezados (busca "PRODUCTO" en columna 1)',
      );
    }

    const rows: Array<{
      producto: string;
      nombreSistema: string;
      categoria: string | null;
      proveedor: string;
      pzXDisplay: number;
      costoDisplay: number;
      rowNum: number;
    }> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const producto = String(row.getCell(1).value || '').trim();
      if (!producto) return;
      rows.push({
        producto,
        nombreSistema: String(row.getCell(2).value || '').trim(),
        categoria: String(row.getCell(3).value || '').trim() || null,
        proveedor: String(row.getCell(6).value || '').trim(),
        pzXDisplay: parseInt(String(row.getCell(5).value)) || 0,
        costoDisplay: parseFloat(String(row.getCell(7).value)) || 0,
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
        invalidReasons.push({ row: r.rowNum, reason: `${r.producto}: sin proveedor` });
        continue;
      }
      if (r.costoDisplay <= 0) {
        invalidReasons.push({
          row: r.rowNum,
          reason: `${r.producto}: costo display invalido`,
        });
        continue;
      }

      const nombreSistema = r.nombreSistema || r.producto;
      const existing = await this.prisma.producto.findFirst({
        where: { OR: [{ nombreSistema }, { nombre: r.producto }] },
      });

      if (existing) {
        const oldCostDisplay = Number(existing.costoDisplay);
        const newCostDisplay = r.costoDisplay;
        const pz = r.pzXDisplay;
        const newCostoUnitario =
          pz > 0 ? Math.round((newCostDisplay / pz) * 100) / 100 : 0;
        const oldCostoUnitario = Number(existing.costoUnitario);
        const oldCategoria = existing.categoria ?? null;
        const newCategoria = r.categoria;
        const oldProveedorName = provByIdToName.get(existing.proveedorId) ?? null;
        const newProveedorName = r.proveedor;

        const costDisplayChanged = Math.abs(oldCostDisplay - newCostDisplay) > 0.001;
        const costUnitChanged =
          newCostoUnitario > 0 &&
          Math.abs(oldCostoUnitario - newCostoUnitario) > 0.001;
        const categoriaChanged = (oldCategoria || '') !== (newCategoria || '');
        const proveedorChanged =
          !!newProveedorName &&
          (oldProveedorName || '').toLowerCase().trim() !==
            newProveedorName.toLowerCase().trim();

        if (costDisplayChanged || costUnitChanged || categoriaChanged || proveedorChanged) {
          willUpdate++;
          const changes: Array<{
            field: string;
            old: string | number | null;
            new: string | number | null;
          }> = [];
          if (costDisplayChanged) {
            changes.push({ field: 'costoDisplay', old: oldCostDisplay, new: newCostDisplay });
          }
          if (costUnitChanged) {
            changes.push({
              field: 'costoUnitario',
              old: oldCostoUnitario,
              new: newCostoUnitario,
            });
          }
          if (categoriaChanged) {
            changes.push({ field: 'categoria', old: oldCategoria, new: newCategoria });
          }
          if (proveedorChanged) {
            changes.push({ field: 'proveedor', old: oldProveedorName, new: newProveedorName });
          }
          updates.push({
            key: existing.codigo,
            label: existing.codigo
              ? `${existing.codigo} — ${existing.nombre}`
              : existing.nombre,
            changes,
          });
          if (sampleUpdate.length < 10) {
            sampleUpdate.push({
              label: existing.codigo || r.producto,
              detail: `cost $${oldCostDisplay.toFixed(2)} -> $${newCostDisplay.toFixed(2)}`,
            });
          }
        } else {
          willSkip++;
        }
      } else {
        willCreate++;
        if (sampleCreate.length < 10) {
          sampleCreate.push({ label: r.producto, detail: nombreSistema });
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
    const jobId = this.jobs.startJob('productos-import');
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
    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const val = String(row.getCell(1).value || '').trim().toUpperCase();
      if (val === 'PRODUCTO' && !headerRow) headerRow = ri;
    });
    if (!headerRow) {
      this.jobs.emit(jobId, {
        type: 'error',
        message: 'No se encontró la fila de encabezados (busca "PRODUCTO" en columna 1)',
      });
      return;
    }

    // MO01 format: PRODUCTO(1) | NOMBRE SISTEMA(2) | CATEGORÍA(3) | MARCA(4) | PZ X DISPLAY(5) |
    // PROVEEDOR(6) | COSTO X DISPLAY(7) | COSTO UNITARIO(8) | QUIEN SURTE(9)
    const rows: Array<Record<string, unknown>> = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const producto = String(row.getCell(1).value || '').trim();
      if (!producto) return;
      rows.push({
        producto,
        nombreSistema: String(row.getCell(2).value || '').trim(),
        categoria: String(row.getCell(3).value || '').trim() || null,
        marca: String(row.getCell(4).value || '').trim() || null,
        pzXDisplay: parseInt(String(row.getCell(5).value)) || 0,
        proveedor: String(row.getCell(6).value || '').trim(),
        costoDisplay: parseFloat(String(row.getCell(7).value)) || 0,
        costoUnitarioRaw: row.getCell(8).value,
        origen: String(row.getCell(9).value || 'Compras').trim(),
        rowNum: ri,
      });
    });

    this.jobs.emit(jobId, {
      type: 'stage',
      stage: 'validate',
      message: `${rows.length} filas encontradas`,
      total: rows.length,
    });

    // All rows with a producto name are considered valid candidates — proveedor may
    // be auto-created during save.
    const validRows = rows;
    const errors: string[] = [];

    const proveedores = await this.prisma.proveedor.findMany();
    const provMap = new Map(proveedores.map((p) => [p.nombre.toLowerCase().trim(), p.id]));

    this.jobs.emit(jobId, {
      type: 'stage',
      stage: 'save',
      message: `Guardando ${validRows.length} productos...`,
      total: validRows.length,
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      try {
        const nombreSistemaLookup = (r.nombreSistema as string) || (r.producto as string);
        // Look up the existing row first so we can decide whether this update is excluded
        // before doing any write (including the proveedor auto-create).
        const existingByName = await this.prisma.producto.findFirst({
          where: {
            OR: [{ nombreSistema: nombreSistemaLookup }, { nombre: r.producto as string }],
          },
        });

        if (existingByName && excluded.has(existingByName.codigo)) {
          skipped++;
          continue;
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

        const pzXDisplay = r.pzXDisplay as number;
        const costoDisplay = r.costoDisplay as number;
        const costoUnitario =
          pzXDisplay > 0 ? Math.round((costoDisplay / pzXDisplay) * 100) / 100 : 0;

        const nombreSistema = (r.nombreSistema as string) || (r.producto as string);
        const nombre = [nombreSistema, pzXDisplay > 0 ? `${pzXDisplay}PZ` : '', r.marca]
          .filter(Boolean)
          .join(' ');
        const origen = r.origen as string;
        const origenNorm = origen.toUpperCase().includes('SUCURSAL') ? 'Sucursal' : 'Compras';

        const data = {
          nombre,
          nombreSistema,
          categoria: r.categoria as string,
          marca: r.marca as string,
          pzXDisplay,
          costoDisplay,
          costoUnitario,
          proveedorId: provId,
          origen: origenNorm,
        };

        if (existingByName) {
          await this.prisma.producto.update({ where: { id: existingByName.id }, data });
          updated++;
        } else {
          const last = await this.prisma.producto.findFirst({
            where: { codigo: { startsWith: 'MO-' } },
            orderBy: { codigo: 'desc' },
          });
          const num = last ? parseInt(last.codigo.replace('MO-', '')) + 1 : 1;
          await this.prisma.producto.create({
            data: { ...data, codigo: `MO-${String(num).padStart(3, '0')}` },
          });
          created++;
        }
      } catch (e) {
        errors.push(`Fila ${r.rowNum}: ${(e as Error).message}`);
      }
      // Emit every 5 rows, or on the last one
      if (i === validRows.length - 1 || i % 5 === 0) {
        const label = String(r.producto || '').slice(0, 40);
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
