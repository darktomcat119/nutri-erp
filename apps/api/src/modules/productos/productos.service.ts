import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

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

  async create(dto: CreateProductoDto): Promise<unknown> {
    const existing = await this.prisma.producto.findUnique({ where: { codigo: dto.codigo } });
    if (existing) throw new ConflictException('El codigo de producto ya existe');

    return this.prisma.producto.create({
      data: dto,
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
}
