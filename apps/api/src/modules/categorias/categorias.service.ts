import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  async findAll(tipo?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;

    return this.prisma.categoria.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  async create(dto: CreateCategoriaDto): Promise<unknown> {
    const existing = await this.prisma.categoria.findUnique({
      where: { nombre_tipo: { nombre: dto.nombre, tipo: dto.tipo } },
    });
    if (existing) throw new ConflictException('Ya existe una categoria con ese nombre para este tipo');

    return this.prisma.categoria.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoriaDto): Promise<unknown> {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoria no encontrada');

    if (dto.nombre) {
      const existing = await this.prisma.categoria.findUnique({
        where: { nombre_tipo: { nombre: dto.nombre, tipo: categoria.tipo } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe una categoria con ese nombre para este tipo');
      }
    }

    return this.prisma.categoria.update({ where: { id }, data: dto });
  }

  async toggleActivo(id: string): Promise<unknown> {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoria no encontrada');

    return this.prisma.categoria.update({
      where: { id },
      data: { activo: !categoria.activo },
    });
  }

  async seed(): Promise<{ created: number }> {
    const count = await this.prisma.categoria.count();
    if (count > 0) return { created: 0 };

    const mosCats = ['GALLETAS', 'PASTELITOS', 'BEBIDAS', 'FRITURAS', 'DULCES', 'CONGELADOS', 'LACTEOS', 'ABARROTES', 'OTROS'];
    const insCats = ['VERDURAS', 'CARNES', 'EMBUTIDOS', 'LACTEOS', 'PANADERIA', 'ABARROTES', 'DESECHABLES', 'TORTILLERIA', 'OTROS'];

    const data = [
      ...mosCats.map((nombre) => ({ nombre, tipo: 'MOS' })),
      ...insCats.map((nombre) => ({ nombre, tipo: 'INS' })),
    ];

    await this.prisma.categoria.createMany({ data, skipDuplicates: true });
    return { created: data.length };
  }
}
