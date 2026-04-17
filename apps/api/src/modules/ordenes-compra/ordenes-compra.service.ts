import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createPdfDocument,
  drawHeader,
  drawInfoRow,
  drawTable,
  drawFooter,
  PdfTableColumn,
} from '../../common/utils/pdf.utils';

@Injectable()
export class OrdenesCompraService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { semana?: string; estado?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (query?.semana) where.semana = query.semana;
    if (query?.estado) where.estado = query.estado;

    return this.prisma.ordenCompra.findMany({
      where,
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<unknown> {
    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: true,
            insumo: true,
            proveedor: true,
            cambiosLog: {
              include: { usuario: { select: { nombre: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { proveedor: { ordenRuta: 'asc' } },
        },
      },
    });
    if (!oc) throw new NotFoundException('Orden de compra no encontrada');
    return oc;
  }

  async findBySupplier(id: string): Promise<unknown> {
    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        items: {
          include: { producto: true, insumo: true, proveedor: true },
          orderBy: { proveedor: { ordenRuta: 'asc' } },
        },
      },
    });
    if (!oc) throw new NotFoundException('Orden de compra no encontrada');

    // Group items by supplier
    const grouped: Record<string, { proveedor: unknown; items: unknown[] }> = {};
    for (const item of (oc.items as Array<Record<string, unknown>>)) {
      const prov = item.proveedor as { id: string; nombre: string; ordenRuta: number };
      if (!grouped[prov.id]) {
        grouped[prov.id] = { proveedor: prov, items: [] };
      }
      grouped[prov.id].items.push(item);
    }

    const suppliers = Object.values(grouped).sort(
      (a, b) => ((a.proveedor as { ordenRuta: number }).ordenRuta) - ((b.proveedor as { ordenRuta: number }).ordenRuta)
    );

    return { ...oc, itemsBySupplier: suppliers };
  }

  async generar(semana: string): Promise<unknown> {
    // 1. Check no existing OC for this week
    const existing = await this.prisma.ordenCompra.findFirst({ where: { semana } });
    if (existing) {
      throw new BadRequestException(`Ya existe una orden de compra para la semana ${semana}: ${existing.folio}`);
    }

    // 2. Get all approved INS requisitions for the week
    const requisiciones = await this.prisma.requisicion.findMany({
      where: { semana, estado: 'APROBADA' },
      include: {
        items: {
          include: {
            producto: { include: { proveedor: true } },
            insumo: { include: { proveedor: true } },
          },
        },
      },
    });

    // 3. Get all approved MOS requisitions for the week
    const requisicionesMos = await this.prisma.requisicionMos.findMany({
      where: { semana, estado: 'APROBADA' },
      include: {
        items: { include: { producto: { include: { proveedor: true } } } },
      },
    });

    if (requisiciones.length === 0 && requisicionesMos.length === 0) {
      throw new BadRequestException('No hay requisiciones aprobadas para esta semana (ni INS ni MOS)');
    }

    // 4. Consolidate: group by (productoId/insumoId + proveedorId), sum quantities
    const consolidated = new Map<string, {
      area: string;
      productoId: string | null;
      insumoId: string | null;
      proveedorId: string;
      cantidadTotal: number;
      precioEstimado: number;
    }>();

    // Add INS items from Requisicion
    for (const req of requisiciones) {
      for (const item of req.items) {
        const isProduct = item.area === 'MOS' && item.producto;
        const isInsumo = item.area === 'INS' && item.insumo;

        let key: string;
        let proveedorId: string;
        let precio: number;

        if (isProduct && item.producto) {
          key = `MOS-${item.productoId}`;
          proveedorId = item.producto.proveedorId;
          precio = Number(item.producto.costoDisplay);
        } else if (isInsumo && item.insumo) {
          key = `INS-${item.insumoId}`;
          proveedorId = item.insumo.proveedorId;
          precio = Number(item.insumo.costoUnitario);
        } else {
          continue;
        }

        const existing = consolidated.get(key);
        if (existing) {
          existing.cantidadTotal += Number(item.cantidadSolicitada);
        } else {
          consolidated.set(key, {
            area: item.area,
            productoId: item.productoId,
            insumoId: item.insumoId,
            proveedorId,
            cantidadTotal: Number(item.cantidadSolicitada),
            precioEstimado: precio,
          });
        }
      }
    }

    // Add MOS items from RequisicionMos (auto-calculated)
    for (const reqMos of requisicionesMos) {
      for (const item of reqMos.items) {
        if (!item.producto) continue;
        const displays = item.cantidadFinal ?? item.displaysAComprar;
        if (displays <= 0) continue;

        const key = `MOS-${item.productoId}`;
        const existing = consolidated.get(key);
        if (existing) {
          existing.cantidadTotal += displays;
        } else {
          consolidated.set(key, {
            area: 'MOS',
            productoId: item.productoId,
            insumoId: null,
            proveedorId: item.producto.proveedorId,
            cantidadTotal: displays,
            precioEstimado: Number(item.costoDisplay),
          });
        }
      }
    }

    if (consolidated.size === 0) {
      throw new BadRequestException('Las requisiciones aprobadas no contienen items validos');
    }

    // 4. Generate folio
    const weekNum = semana.replace('-', '');
    const count = await this.prisma.ordenCompra.count({ where: { semana } });
    const folio = `OC-${weekNum}-${String(count + 1).padStart(3, '0')}`;

    // 5. Calculate total
    let totalEstimado = 0;
    const itemsData = Array.from(consolidated.values()).map((c) => {
      const subtotal = c.cantidadTotal * c.precioEstimado;
      totalEstimado += subtotal;
      return {
        area: c.area as 'MOS' | 'INS',
        productoId: c.productoId,
        insumoId: c.insumoId,
        proveedorId: c.proveedorId,
        cantidadSolicitada: c.cantidadTotal,
        precioEstimado: c.precioEstimado,
      };
    });

    // 6. Create OC with items
    const oc = await this.prisma.ordenCompra.create({
      data: {
        semana,
        folio,
        totalEstimado: new Decimal(totalEstimado.toFixed(2)),
        items: { create: itemsData },
      },
      include: {
        items: {
          include: { producto: true, insumo: true, proveedor: true },
          orderBy: { proveedor: { ordenRuta: 'asc' } },
        },
      },
    });

    return oc;
  }

  async aprobar(id: string): Promise<unknown> {
    const oc = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!oc) throw new NotFoundException('Orden de compra no encontrada');
    if (oc.estado !== 'GENERADA') throw new BadRequestException('Solo se pueden aprobar ordenes en estado GENERADA');

    return this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: 'APROBADA' },
    });
  }

  async generatePdf(id: string): Promise<Buffer> {
    const result = await this.findBySupplier(id);
    const oc = result as Record<string, unknown>;

    const doc = createPdfDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    drawHeader(doc, 'Orden de Compra', `Folio: ${oc.folio}`);

    drawInfoRow(doc, 'Folio', String(oc.folio));
    drawInfoRow(doc, 'Semana', String(oc.semana));
    drawInfoRow(doc, 'Estado', String(oc.estado));
    drawInfoRow(doc, 'Fecha', new Date(oc.createdAt as string).toLocaleDateString('es-MX'));
    drawInfoRow(doc, 'Total Estimado', `$${Number(oc.totalEstimado).toFixed(2)}`);
    drawInfoRow(doc, 'Total Real', oc.totalReal ? `$${Number(oc.totalReal).toFixed(2)}` : 'Pendiente');
    doc.moveDown(0.5);

    const columns: PdfTableColumn[] = [
      { header: 'Area', key: 'area', width: 50 },
      { header: 'Producto / Insumo', key: 'nombre', width: 160 },
      { header: 'Cant. Solicitada', key: 'cantSolicitada', width: 80, align: 'right' },
      { header: 'Cant. Comprada', key: 'cantComprada', width: 80, align: 'right' },
      { header: 'Precio Est.', key: 'precioEst', width: 80, align: 'right' },
      { header: 'Precio Real', key: 'precioReal', width: 82, align: 'right' },
    ];

    const supplierGroups = (oc.itemsBySupplier as Array<{ proveedor: Record<string, unknown>; items: Array<Record<string, unknown>> }>) || [];

    for (const group of supplierGroups) {
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold').text(String((group.proveedor as Record<string, unknown>).nombre));
      doc.moveDown(0.3);

      const rows = group.items.map((item) => {
        const producto = item.producto as Record<string, unknown> | null;
        const insumo = item.insumo as Record<string, unknown> | null;
        const nombre = producto ? String(producto.nombre) : insumo ? String(insumo.nombre) : '—';
        return {
          area: String(item.area),
          nombre,
          cantSolicitada: Number(item.cantidadSolicitada).toFixed(2),
          cantComprada: item.cantidadComprada ? Number(item.cantidadComprada).toFixed(2) : '—',
          precioEst: `$${Number(item.precioEstimado).toFixed(2)}`,
          precioReal: item.precioReal ? `$${Number(item.precioReal).toFixed(2)}` : '—',
        };
      });

      drawTable(doc, columns, rows);
    }

    drawFooter(doc);
    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async getCambiosLog(ordenCompraId: string) {
    const oc = await this.prisma.ordenCompra.findUnique({ where: { id: ordenCompraId } });
    if (!oc) throw new NotFoundException('OC no encontrada');

    const cambios = await this.prisma.cambioCompraLog.findMany({
      where: { item: { ordenCompraId } },
      include: {
        usuario: { select: { nombre: true } },
        item: {
          select: {
            producto: { select: { nombre: true, codigo: true } },
            insumo: { select: { nombre: true, codigo: true } },
            area: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: cambios, message: 'Historial de cambios' };
  }

  async iniciarEjecucion(id: string): Promise<unknown> {
    const oc = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!oc) throw new NotFoundException('Orden de compra no encontrada');
    if (oc.estado !== 'APROBADA') throw new BadRequestException('Solo se pueden ejecutar ordenes aprobadas');

    return this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: 'EN_EJECUCION' },
    });
  }
}
