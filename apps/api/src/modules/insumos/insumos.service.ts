import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import ExcelJS from 'exceljs';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';

@Injectable()
export class InsumosService {
  constructor(private prisma: PrismaService) {}

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
}
