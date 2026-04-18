import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/utils/crypto.service';
import ExcelJS from 'exceljs';
import axios from 'axios';

@Injectable()
export class OrdereatService {
  private readonly logger = new Logger(OrdereatService.name);
  private readonly apiUrl = process.env.ORDEREAT_API_URL || 'https://api.ordereat.com';

  constructor(private prisma: PrismaService, private crypto: CryptoService) {}

  private async resolveAuthForSucursal(sucursalId: string): Promise<{ cafeteriaId: string; token: string }> {
    const suc = await this.prisma.sucursal.findUnique({ where: { id: sucursalId } });
    if (!suc) throw new NotFoundException('Sucursal no encontrada');
    if (!suc.cafeteriaId) {
      throw new BadRequestException('La sucursal no tiene cafeteriaId de OrderEat configurado');
    }
    if (!suc.ordereatTokenEnc) {
      throw new BadRequestException('La sucursal no tiene token de OrderEat configurado. Configurarlo en ajustes.');
    }
    return { cafeteriaId: suc.cafeteriaId, token: this.crypto.decrypt(suc.ordereatTokenEnc) };
  }

  /**
   * Translate axios errors from the upstream OrderEat API into Nest HttpExceptions
   * that surface as clean 4xx/5xx with meaningful messages instead of generic 500s.
   */
  private translateAxiosError(e: unknown, context: string): HttpException {
    if (axios.isAxiosError(e)) {
      if (e.response) {
        const status = e.response.status;
        const data = e.response.data as { message?: string; error?: string } | string | undefined;
        const upstreamMsg =
          typeof data === 'string'
            ? data
            : data?.message || data?.error || e.response.statusText || `HTTP ${status}`;
        this.logger.warn(`OrderEat ${context} failed: ${status} ${upstreamMsg}`);

        if (status === 401) {
          return new HttpException(
            'OrderEat rechazó el token. Verifica que esté vigente en Configuracion > Integraciones.',
            HttpStatus.UNAUTHORIZED,
          );
        }
        if (status === 403) {
          return new HttpException(
            'OrderEat: permisos insuficientes. El token podría ser de otra cafeteria.',
            HttpStatus.FORBIDDEN,
          );
        }
        if (status === 404) {
          return new HttpException(
            `OrderEat: recurso no encontrado (${context}). Verifica que el cafeteriaId sea correcto.`,
            HttpStatus.NOT_FOUND,
          );
        }
        if (status === 429) {
          return new HttpException(
            'OrderEat: límite de peticiones alcanzado. Espera unos minutos antes de reintentar.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        if (status >= 500) {
          return new HttpException(
            `OrderEat servicio no disponible (${status}). Reintenta en unos minutos.`,
            HttpStatus.BAD_GATEWAY,
          );
        }
        return new HttpException(`OrderEat (${context}): ${upstreamMsg}`, HttpStatus.BAD_GATEWAY);
      }
      if (e.code === 'ECONNABORTED') {
        return new HttpException(
          `OrderEat tardó demasiado en responder (${context}).`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      this.logger.warn(`OrderEat ${context} network error: ${e.message}`);
      return new HttpException(
        `OrderEat no alcanzable (${context}): ${e.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    this.logger.error(`Unexpected error calling OrderEat (${context}): ${(e as Error).message}`);
    return new HttpException(`Error inesperado (${context})`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private async apiGet<T>(token: string, path: string, params?: Record<string, string>): Promise<T> {
    try {
      const res = await axios.get<T>(`${this.apiUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: 30000,
      });
      return res.data;
    } catch (e) {
      throw this.translateAxiosError(e, `GET ${path}`);
    }
  }

  private async apiPost<T>(token: string, path: string, body: unknown): Promise<T> {
    try {
      const res = await axios.post<T>(`${this.apiUrl}${path}`, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return res.data;
    } catch (e) {
      throw this.translateAxiosError(e, `POST ${path}`);
    }
  }

  /**
   * Get inventory from OrderEat API (live) for a sucursal
   */
  async getInventoryForSucursal(sucursalId: string) {
    const { cafeteriaId, token } = await this.resolveAuthForSucursal(sucursalId);
    const [products, dailyStocks] = await Promise.all([
      this.apiGet<Array<{ id: number; name: string; currentStock: number | null; status: string }>>(
        token,
        `/cafeterias/${cafeteriaId}/products`,
      ),
      this.apiGet<Array<{ productId: number; reservedStock: number }>>(
        token,
        `/cafeterias/${cafeteriaId}/stockflow/daily-stocks`,
      ),
    ]);

    const reservedMap = new Map(dailyStocks.map(s => [s.productId, s.reservedStock]));

    const items = products
      .filter(p => p.status === 'ENABLED' && p.currentStock !== null)
      .map(p => ({
        producto: p.name,
        inventarioTotal: p.currentStock || 0,
        reservado: reservedMap.get(p.id) || 0,
        disponible: (p.currentStock || 0) - (reservedMap.get(p.id) || 0),
        limiteDiario: null,
        productId: p.id,
      }));

    return {
      data: { fecha: new Date().toISOString(), cafeteriaId, totalProductos: items.length, items, source: 'api' },
      message: 'Inventario obtenido de OrderEat API',
    };
  }

  /**
   * Get sales from OrderEat API (live) for a sucursal
   */
  async getSalesForSucursal(sucursalId: string, from: string, until: string) {
    const { cafeteriaId, token } = await this.resolveAuthForSucursal(sucursalId);
    const [data, allProducts] = await Promise.all([
      this.apiGet<{
        cafeteriaId: number;
        items: Array<{ quantity: number; type: string; price: number; productId?: number; productVersion?: number; avgItemCost?: number | null; name?: string }>;
        totalDiscountAmount?: number;
      }>(token, `/cafeterias/${cafeteriaId}/reports/sales/products`, { from, until, dateFilterType: 'ORDER_DATE' }),
      this.apiGet<Array<{ id: number; name: string }>>(token, `/cafeterias/${cafeteriaId}/products`),
    ]);

    const productMap = new Map(allProducts.map(p => [p.id, p.name]));

    const items = data.items
      .filter(i => i.type === 'PRODUCT' && i.productId)
      .map(i => ({
        productId: i.productId,
        producto: productMap.get(i.productId!) || `Producto ${i.productId}`,
        cantidadVendida: i.quantity,
        precioUnitario: i.price,
        costoUnitario: i.avgItemCost ?? 0,
        totalVendido: i.quantity * i.price,
      }));

    return {
      data: {
        cafeteriaId,
        periodo: `${from} - ${until}`,
        totalProductos: items.length,
        totalDescuentos: data.totalDiscountAmount ?? 0,
        items,
        source: 'api',
      },
      message: 'Ventas obtenidas de OrderEat API',
    };
  }

  /**
   * Get stock movement history for a product in a sucursal
   */
  async getStockHistoryForSucursal(sucursalId: string, productId: number, from: string, until: string) {
    const { cafeteriaId, token } = await this.resolveAuthForSucursal(sucursalId);
    const data = await this.apiGet<Array<{ productId: number; type: string; amount: number; description: string | null; dateTime: string; sellerId: number; transactionStatus?: string }>>(
      token,
      `/cafeterias/${cafeteriaId}/stockflow`,
      { productId: String(productId), from, until },
    );
    return { data: { cafeteriaId, productId, from, until, movimientos: data }, message: 'Historial obtenido' };
  }

  /**
   * Push stock movements (IN) to OrderEat API
   */
  async pushStockMovementsForSucursal(
    sucursalId: string,
    movements: Array<{ productId: number; amount: number; description: string; type?: 'IN' | 'OUT' | 'INITIALIZE_STOCK' | 'CLEAR_STOCK' }>,
  ) {
    if (!movements?.length) throw new BadRequestException('Sin movimientos para enviar');
    const { cafeteriaId, token } = await this.resolveAuthForSucursal(sucursalId);
    const body = movements.map(m => ({
      productId: m.productId,
      type: m.type || 'IN',
      amount: m.amount,
      description: m.description,
    }));
    const result = await this.apiPost<unknown>(token, `/cafeterias/${cafeteriaId}/stockflow`, body);
    return { data: { cafeteriaId, enviados: movements.length, result }, message: `${movements.length} movimientos enviados a OrderEat` };
  }

  /**
   * Check global API config + per-sucursal token status
   */
  async getApiStatus() {
    const sucursales = await this.prisma.sucursal.findMany({
      where: { activa: true },
      select: {
        id: true, codigo: true, nombre: true, cafeteriaId: true,
        ordereatTokenLast4: true, ordereatTokenUpdatedAt: true,
      },
      orderBy: { codigo: 'asc' },
    });
    return {
      data: {
        baseUrl: this.apiUrl,
        sucursales: sucursales.map(s => ({
          id: s.id,
          codigo: s.codigo,
          nombre: s.nombre,
          cafeteriaId: s.cafeteriaId,
          tokenConfigured: !!s.ordereatTokenLast4,
          tokenLast4: s.ordereatTokenLast4,
          tokenUpdatedAt: s.ordereatTokenUpdatedAt,
        })),
      },
      message: 'Estado de integracion OrderEat',
    };
  }

  /**
   * Import all products from OrderEat for a sucursal into the local Producto catalog.
   * Upserts (codigo="OE-{codigo}-{id}") and creates ConfigSucursalProducto with defaults.
   * Returns counts: { created, updated, total, skipped }
   */
  async importProductsFromOrderEat(sucursalId: string): Promise<{
    data: {
      sucursalCodigo: string;
      total: number;
      created: number;
      updated: number;
      skipped: number;
      skippedReasons: Array<{ name: string; reason: string }>;
    };
    message: string;
  }> {
    const { cafeteriaId, token } = await this.resolveAuthForSucursal(sucursalId);
    const suc = await this.prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { codigo: true } });
    if (!suc) throw new NotFoundException('Sucursal no encontrada');

    type OeProduct = {
      id: number; name: string; price: number; cost: number | null;
      currentStock: number | null; status: string;
    };
    const products = await this.apiGet<OeProduct[]>(token, `/cafeterias/${cafeteriaId}/products`);
    const enabled = products.filter(p => p.status === 'ENABLED' && p.currentStock !== null);

    // Default provider (auto-create if needed)
    let defaultProv = await this.prisma.proveedor.findFirst({ where: { nombre: 'OrderEat (Auto)' } });
    if (!defaultProv) {
      defaultProv = await this.prisma.proveedor.create({
        data: { nombre: 'OrderEat (Auto)', categoria: 'Auto', ordenRuta: 1 },
      });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const skippedReasons: Array<{ name: string; reason: string }> = [];

    for (const p of enabled) {
      const codigo = `OE-${suc.codigo}-${p.id}`;
      const costoUnitario = Number(p.cost) > 0 ? Number(p.cost) : Number(p.price) * 0.5;
      const pzXDisplay = 24;
      const costoDisplay = Math.round(costoUnitario * pzXDisplay * 100) / 100;

      if (!(costoUnitario > 0)) {
        skipped++;
        skippedReasons.push({ name: p.name, reason: 'precio/costo invalidos' });
        continue;
      }

      const existing = await this.prisma.producto.findUnique({ where: { codigo } });
      const producto = existing
        ? await this.prisma.producto.update({
            where: { codigo },
            data: {
              nombre: p.name,
              nombreSistema: p.name,
              ordereatId: String(p.id),
              costoUnitario: costoUnitario.toFixed(2),
              costoDisplay: costoDisplay.toFixed(2),
            },
          })
        : await this.prisma.producto.create({
            data: {
              codigo,
              nombre: p.name,
              nombreSistema: p.name,
              ordereatId: String(p.id),
              costoUnitario: costoUnitario.toFixed(2),
              costoDisplay: costoDisplay.toFixed(2),
              pzXDisplay,
              proveedorId: defaultProv.id,
            },
          });
      if (existing) updated++;
      else created++;

      // Upsert config with reasonable maxSemanal (2x currentStock, min 24)
      const maxSemanal = Math.max(Number(p.currentStock) * 2, 24);
      await this.prisma.configSucursalProducto.upsert({
        where: { sucursalId_productoId: { sucursalId, productoId: producto.id } },
        update: { maxSemanal, precioVenta: p.price },
        create: {
          sucursalId,
          productoId: producto.id,
          maxSemanal,
          precioVenta: p.price,
          activo: true,
        },
      });
    }

    return {
      data: {
        sucursalCodigo: suc.codigo,
        total: enabled.length,
        created,
        updated,
        skipped,
        skippedReasons: skippedReasons.slice(0, 20),
      },
      message: `${suc.codigo}: ${created} creados, ${updated} actualizados, ${skipped} omitidos`,
    };
  }

  /**
   * Parse OrderEat Sales Report Excel
   * Returns: array of { producto, cantidadVendida, precioUnitario, costoUnitario, totalVendido }
   */
  async parseSalesReport(fileBuffer: Buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('Archivo sin hojas');

    // Find header row (contains "Producto" and "Cantidad vendida")
    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const firstCell = String(row.getCell(1).value || '');
      if (firstCell === 'Producto' && String(row.getCell(2).value || '').includes('Cantidad')) {
        headerRow = ri;
      }
    });
    if (!headerRow) throw new BadRequestException('No se encontro la fila de encabezados');

    const items: Array<{
      producto: string;
      cantidadVendida: number;
      precioUnitario: number;
      costoUnitario: number;
      totalVendido: number;
    }> = [];

    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const producto = String(row.getCell(1).value || '').trim();
      if (!producto || producto.startsWith('Descuento') || producto.startsWith('Total vendido')) return;

      items.push({
        producto,
        cantidadVendida: Number(row.getCell(2).value) || 0,
        precioUnitario: Number(row.getCell(4).value) || 0,
        costoUnitario: Number(row.getCell(5).value) || 0,
        totalVendido: Number(row.getCell(7).value) || 0,
      });
    });

    // Extract period from row 1
    const periodText = String(ws.getRow(1).getCell(1).value || '');

    return {
      data: { periodo: periodText, totalProductos: items.length, items },
      message: 'Reporte de ventas procesado',
    };
  }

  /**
   * Parse OrderEat Inventory Report Excel
   * Returns: array of { producto, inventarioTotal, reservado, disponible, limiteDiario }
   */
  async parseInventoryReport(fileBuffer: Buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('Archivo sin hojas');

    // Find header row (contains "Producto" and "Inventario")
    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const firstCell = String(row.getCell(1).value || '').trim();
      if (firstCell === 'Producto' && String(row.getCell(2).value || '').includes('Inventario')) {
        headerRow = ri;
      }
    });
    if (!headerRow) throw new BadRequestException('No se encontro la fila de encabezados');

    const items: Array<{
      producto: string;
      inventarioTotal: number;
      reservado: number;
      disponible: number;
      limiteDiario: number | null;
    }> = [];

    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const producto = String(row.getCell(1).value || '').trim();
      if (!producto) return;

      items.push({
        producto,
        inventarioTotal: Number(row.getCell(2).value) || 0,
        reservado: Number(row.getCell(3).value) || 0,
        disponible: Number(row.getCell(4).value) || 0,
        limiteDiario: row.getCell(5).value ? Number(row.getCell(5).value) : null,
      });
    });

    // Extract date from row 1
    const dateText = String(ws.getRow(1).getCell(1).value || '');

    return {
      data: { fecha: dateText, totalProductos: items.length, items },
      message: 'Inventario procesado',
    };
  }

  /**
   * Calculate INS budget from sales report
   * Cross-references sold items against platillos catalog
   * Returns budget per branch
   */
  async calculateInsBudget(fileBuffer: Buffer, sucursalId: string) {
    const salesData = await this.parseSalesReport(fileBuffer);

    // Get all platillos
    const platillos = await this.prisma.platillo.findMany({ where: { activo: true } });
    const platilloMap = new Map(platillos.map((p) => [p.nombre.toLowerCase().trim(), p]));

    // Get all MOS products for cross-reference
    const productos = await this.prisma.producto.findMany({ where: { activo: true } });
    const productoMap = new Map(
      productos.map((p) => [(p.nombreSistema || p.nombre).toLowerCase().trim(), p]),
    );

    let presupuesto = 0;
    const matched: Array<{
      producto: string;
      cantidad: number;
      costoPlatillo: number;
      subtotal: number;
    }> = [];
    const unmatched: string[] = [];

    for (const item of salesData.data.items) {
      const key = item.producto.toLowerCase().trim();
      const platillo = platilloMap.get(key);
      const productoMos = productoMap.get(key);

      if (platillo) {
        const subtotal = item.cantidadVendida * Number(platillo.costo);
        presupuesto += subtotal;
        matched.push({
          producto: item.producto,
          cantidad: item.cantidadVendida,
          costoPlatillo: Number(platillo.costo),
          subtotal,
        });
      } else if (productoMos) {
        // It's a MOS product, not INS — skip but don't flag as unmatched
      } else {
        unmatched.push(item.producto);
      }
    }

    return {
      data: {
        sucursalId,
        periodo: salesData.data.periodo,
        presupuestoTotal: Math.round(presupuesto * 100) / 100,
        productosVinculados: matched.length,
        productosNoEncontrados: unmatched.length,
        detalle: matched,
        noEncontrados: unmatched,
      },
      message: 'Presupuesto INS calculado',
    };
  }

  /**
   * Calculate MOS purchase needs from inventory report
   * Formula: purchase = maxSemanal - current_inventory
   * Convert to displays with rounding
   */
  async calculateMosPurchase(fileBuffer: Buffer, sucursalId: string) {
    const invData = await this.parseInventoryReport(fileBuffer);

    // Get product config per branch (need maxSemanal stock)
    const configs = await this.prisma.configSucursalProducto.findMany({
      where: { sucursalId },
      include: { producto: true },
    });

    // Also get all products for name matching
    const allProducts = await this.prisma.producto.findMany({ where: { activo: true } });
    const productByName = new Map<string, (typeof allProducts)[0]>();
    for (const p of allProducts) {
      productByName.set((p.nombreSistema || p.nombre).toLowerCase().trim(), p);
    }

    const configMap = new Map(configs.map((c) => [c.productoId, c]));

    const purchases: Array<{
      producto: string;
      inventarioActual: number;
      maximo: number;
      compraNecesaria: number;
      displaysAComprar: number;
      pzXDisplay: number;
      costoDisplay: number;
      dinero: number;
    }> = [];
    const unmatchedInventory: string[] = [];

    for (const inv of invData.data.items) {
      const key = inv.producto.toLowerCase().trim();
      const producto = productByName.get(key);

      if (!producto) {
        unmatchedInventory.push(inv.producto);
        continue;
      }

      const config = configMap.get(producto.id);
      const maximo = config?.maxSemanal ?? 0;
      if (maximo <= 0) continue; // No max configured

      const compraNecesaria = Math.max(0, maximo - inv.disponible);
      if (compraNecesaria <= 0) continue; // No need to purchase

      // Convert to displays with rounding: < 0.5 down, >= 0.5 up
      const pzXDisplay = producto.pzXDisplay;
      const displaysExact = pzXDisplay > 0 ? compraNecesaria / pzXDisplay : 0;
      const displaysAComprar = Math.round(displaysExact);

      if (displaysAComprar <= 0) continue;

      const costoDisplay = Number(producto.costoDisplay);

      purchases.push({
        producto: producto.nombre,
        inventarioActual: inv.disponible,
        maximo,
        compraNecesaria,
        displaysAComprar,
        pzXDisplay,
        costoDisplay,
        dinero: displaysAComprar * costoDisplay,
      });
    }

    const totalDinero = purchases.reduce((sum, p) => sum + p.dinero, 0);

    return {
      data: {
        sucursalId,
        fecha: invData.data.fecha,
        totalProductos: purchases.length,
        totalDinero: Math.round(totalDinero * 100) / 100,
        productosNoVinculados: unmatchedInventory.length,
        compras: purchases,
        noVinculados: unmatchedInventory,
      },
      message: 'Calculo MOS generado',
    };
  }

  /**
   * Parse MO02 Excel (per-branch maximum stock and pricing)
   * Each sheet is a branch (BASE, CDUP, PUP, AV, IBPRIM, IBPREP)
   * Headers at row 10, data from row 11
   * Columns: 1=PRODUCTO, 2=Nombre sistema, 3=Categoria, 4=COSTO POR PZ, 5=PRECIO MIN 50%, 6=PRECIO SUJERIDO, 7=PZ X DISPLAY, 8=COSTO X DISPLAY, 9=MAXIMO EN DISPLAYS, 10=MAXIMO EN PZ
   */
  async importMo02Config(fileBuffer: Buffer): Promise<{ data: { totalConfigs: number; byBranch: Record<string, number>; unmatched: string[] }; message: string }> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);

    const sucursales = await this.prisma.sucursal.findMany({ where: { activa: true } });
    const sucursalMap = new Map(sucursales.map(s => [s.codigo, s.id]));

    const productos = await this.prisma.producto.findMany({ where: { activo: true } });
    const productoMap = new Map<string, string>();
    for (const p of productos) {
      if (p.nombreSistema) productoMap.set(p.nombreSistema.toLowerCase().trim(), p.id);
      productoMap.set(p.nombre.toLowerCase().trim(), p.id);
    }

    const getResolvedValue = (cell: ExcelJS.Cell): unknown => {
      let v: unknown = cell.value;
      if (v && typeof v === 'object' && 'result' in v) v = (v as { result: unknown }).result;
      return v;
    };

    let totalConfigs = 0;
    const byBranch: Record<string, number> = {};
    const unmatched: string[] = [];

    for (const ws of wb.worksheets) {
      const branchCode = ws.name.toUpperCase();
      if (branchCode === 'BASE') continue;

      const sucursalId = sucursalMap.get(branchCode);
      if (!sucursalId) {
        unmatched.push(`Sucursal ${branchCode} no encontrada`);
        continue;
      }

      byBranch[branchCode] = 0;

      for (let ri = 11; ri <= ws.rowCount; ri++) {
        const row = ws.getRow(ri);
        const producto = String(getResolvedValue(row.getCell(1)) || '').trim();
        const nombreSistema = String(getResolvedValue(row.getCell(2)) || '').trim();
        if (!producto && !nombreSistema) continue;

        const precioSujerido = Number(getResolvedValue(row.getCell(6))) || 0;
        const precioMin = Number(getResolvedValue(row.getCell(5))) || 0;
        const pzXDisplay = Number(getResolvedValue(row.getCell(7))) || 1;
        const maximoDisplays = Number(getResolvedValue(row.getCell(9))) || 0;
        const maximoPz = Number(getResolvedValue(row.getCell(10))) || 0;

        const finalMax = maximoPz || maximoDisplays * pzXDisplay;
        if (finalMax <= 0) continue;

        const key1 = nombreSistema.toLowerCase().trim();
        const key2 = producto.toLowerCase().trim();
        const productoId = productoMap.get(key1) || productoMap.get(key2);

        if (!productoId) {
          unmatched.push(`${branchCode}: ${producto || nombreSistema}`);
          continue;
        }

        const precioVenta = precioSujerido || precioMin;

        await this.prisma.configSucursalProducto.upsert({
          where: { sucursalId_productoId: { sucursalId, productoId } },
          update: {
            maxSemanal: finalMax,
            precioVenta: precioVenta > 0 ? precioVenta : undefined,
          },
          create: {
            sucursalId,
            productoId,
            maxSemanal: finalMax,
            precioVenta: precioVenta > 0 ? precioVenta : undefined,
            activo: true,
          },
        });

        totalConfigs++;
        byBranch[branchCode]++;
      }
    }

    return {
      data: { totalConfigs, byBranch, unmatched: unmatched.slice(0, 50) },
      message: `${totalConfigs} configuraciones importadas`,
    };
  }

  /**
   * Parse IN02 Excel (recipes/platillos costs)
   * Sheet "Indice de recetas" has headers at row 3, data from row 4
   * Columns: 2=Nombre de la receta, 3=Vinculo, 4=Categoria, 5=Rendimiento, 6=Medida, 7=Costo, 8=Precio por formula, 9=Precio final
   */
  async importIn02Recipes(fileBuffer: Buffer): Promise<{ data: { totalPlatillos: number; created: number; updated: number; errors: string[] }; message: string }> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);

    const ws = wb.worksheets.find(w => {
      const n = w.name.toLowerCase().replace(/[\u00ED\u00CD]/g, 'i');
      return n.includes('indice') && n.includes('receta');
    });
    if (!ws) throw new BadRequestException('Hoja "Indice de recetas" no encontrada');

    const getResolvedValue = (cell: ExcelJS.Cell): unknown => {
      let v: unknown = cell.value;
      if (v && typeof v === 'object' && 'result' in v) v = (v as { result: unknown }).result;
      return v;
    };

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    let totalPlatillos = 0;

    for (let ri = 4; ri <= ws.rowCount; ri++) {
      const row = ws.getRow(ri);
      const nombre = String(getResolvedValue(row.getCell(2)) || '').trim();
      if (!nombre || nombre.toLowerCase() === 'nombre de la receta') continue;

      const costo = Number(getResolvedValue(row.getCell(7))) || 0;
      const precio = Number(getResolvedValue(row.getCell(9))) || 0;

      if (costo <= 0) {
        errors.push(`${nombre}: sin costo`);
        continue;
      }

      try {
        const existing = await this.prisma.platillo.findUnique({ where: { nombre } });
        if (existing) {
          await this.prisma.platillo.update({
            where: { nombre },
            data: {
              costo: Math.round(costo * 100) / 100,
              precio: precio > 0 ? Math.round(precio * 100) / 100 : undefined,
            },
          });
          updated++;
        } else {
          await this.prisma.platillo.create({
            data: {
              nombre,
              costo: Math.round(costo * 100) / 100,
              precio: precio > 0 ? Math.round(precio * 100) / 100 : undefined,
            },
          });
          created++;
        }
        totalPlatillos++;
      } catch (e) {
        errors.push(`${nombre}: ${(e as Error).message}`);
      }
    }

    return {
      data: { totalPlatillos, created, updated, errors },
      message: `${totalPlatillos} platillos importados (${created} nuevos, ${updated} actualizados)`,
    };
  }

  /**
   * Generate downloadable Excel template for sales report
   */
  async generateSalesTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Reporte de Ventas');

    ws.getRow(1).getCell(1).value = 'Periodo: DD/MM/YYYY - DD/MM/YYYY';
    ws.getRow(2).getCell(1).value = 'Tipo de fecha: Fecha de Entrega';

    const headers = [
      'Producto',
      'Cantidad vendida (uds)',
      'Cupones canjeados (uds)',
      'Precio Unitario',
      'Costo unitario',
      'Utilidad',
      'Total Vendido',
    ];
    ws.getRow(4).values = headers;
    ws.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    ws.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    ws.columns = headers.map((h, i) => ({ width: i === 0 ? 30 : 18 }));

    // Sample row
    ws.getRow(5).values = ['Chilaquiles', 87, '', 49, '', 49, 4263];

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /**
   * Generate downloadable Excel template for inventory report
   */
  async generateInventoryTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Inventario');

    ws.getRow(1).getCell(1).value = 'Fecha: DD/MM/YYYY';

    const headers = [
      'Producto',
      'Inventario Total',
      'Inventario Reservado',
      'Inventario Disponible',
      'Limite Diario Disponible',
    ];
    ws.getRow(3).values = headers;
    ws.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    ws.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    ws.columns = headers.map((h, i) => ({ width: i === 0 ? 35 : 20 }));

    // Sample row
    ws.getRow(4).values = ['COCA COLA 355ML', 50, 5, 45, 10];

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
