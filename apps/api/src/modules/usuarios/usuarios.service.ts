import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { role?: string; sucursalId?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (query.role) where.role = query.role;
    if (query.sucursalId) where.sucursalId = query.sucursalId;

    const users = await this.prisma.usuario.findMany({
      where,
      include: { sucursal: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ passwordHash, ...rest }) => rest);
  }

  async findOne(id: string): Promise<unknown> {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      include: { sucursal: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { passwordHash, ...result } = user;
    return result;
  }

  async create(dto: CreateUsuarioDto): Promise<unknown> {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('El email ya esta registrado');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        nombre: dto.nombre,
        role: dto.role,
        sucursalId: dto.sucursalId || null,
      },
      include: { sucursal: true },
    });
    const { passwordHash, ...result } = user;
    return result;
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<unknown> {
    await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.sucursalId !== undefined) data.sucursalId = dto.sucursalId;
    if (dto.activo !== undefined) data.activo = dto.activo;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.usuario.update({
      where: { id },
      data,
      include: { sucursal: true },
    });
    const { passwordHash, ...result } = user;
    return result;
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    const user = await this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
    const { passwordHash, ...result } = user;
    return result;
  }
}
