import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ReorderProveedoresDto } from './dto/reorder-proveedores.dto';

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { categoria?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = { activo: true };
    if (query?.categoria) where.categoria = query.categoria;

    return this.prisma.proveedor.findMany({
      where,
      orderBy: { ordenRuta: 'asc' },
    });
  }

  async findOne(id: string): Promise<unknown> {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async create(dto: CreateProveedorDto): Promise<unknown> {
    const existing = await this.prisma.proveedor.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existing) throw new ConflictException('El proveedor ya existe');

    return this.prisma.proveedor.create({ data: dto });
  }

  async update(id: string, dto: UpdateProveedorDto): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.proveedor.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.proveedor.update({
      where: { id },
      data: { activo: false },
    });
  }

  async reorder(dto: ReorderProveedoresDto): Promise<{ message: string }> {
    const updates = dto.proveedores.map((p) =>
      this.prisma.proveedor.update({
        where: { id: p.id },
        data: { ordenRuta: p.ordenRuta },
      }),
    );
    await this.prisma.$transaction(updates);
    return { message: 'Orden de ruta actualizado' };
  }
}
