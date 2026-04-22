import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ReorderProveedoresDto } from './dto/reorder-proveedores.dto';

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { categoria?: string; activo?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (query?.activo !== undefined) where.activo = query.activo === 'true';
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

    if (!dto.ordenRuta && dto.ordenRuta !== 0) {
      const max = await this.prisma.proveedor.aggregate({ _max: { ordenRuta: true } });
      dto.ordenRuta = (max._max.ordenRuta || 0) + 1;
    }

    return this.prisma.proveedor.create({ data: dto });
  }

  async toggleActivo(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return this.prisma.proveedor.update({ where: { id }, data: { activo: !proveedor.activo } });
  }

  async update(id: string, dto: UpdateProveedorDto): Promise<unknown> {
    const current = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Proveedor no encontrado');

    // If ordenRuta changed, shift others to avoid duplicates
    if (dto.ordenRuta !== undefined && dto.ordenRuta !== current.ordenRuta) {
      const newPos = dto.ordenRuta;
      const oldPos = current.ordenRuta;
      if (newPos < oldPos) {
        // Moving up: shift items between newPos and oldPos down by 1
        await this.prisma.proveedor.updateMany({
          where: { ordenRuta: { gte: newPos, lt: oldPos }, id: { not: id } },
          data: { ordenRuta: { increment: 1 } },
        });
      } else {
        // Moving down: shift items between oldPos and newPos up by 1
        await this.prisma.proveedor.updateMany({
          where: { ordenRuta: { gt: oldPos, lte: newPos }, id: { not: id } },
          data: { ordenRuta: { decrement: 1 } },
        });
      }
    }

    return this.prisma.proveedor.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.proveedor.update({
      where: { id },
      data: { activo: false },
    });
  }

  async checkHardDelete(id: string) {
    await this.findOne(id);
    const [productos, insumos, ordenCompraItems] = await Promise.all([
      this.prisma.producto.count({ where: { proveedorId: id } }),
      this.prisma.insumo.count({ where: { proveedorId: id } }),
      this.prisma.ordenCompraItem.count({ where: { proveedorId: id } }),
    ]);
    const blockers = { productos, insumos, ordenCompraItems };
    const total = productos + insumos + ordenCompraItems;
    return { canDelete: total === 0, blockers };
  }

  async hardDelete(id: string): Promise<{ success: boolean }> {
    const check = await this.checkHardDelete(id);
    if (!check.canDelete) {
      throw new BadRequestException(
        'No se puede eliminar: el proveedor tiene productos, insumos o movimientos asociados. Use desactivar.',
      );
    }
    await this.prisma.proveedor.delete({ where: { id } });
    return { success: true };
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
