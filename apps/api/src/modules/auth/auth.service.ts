import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ access_token: string; user: Record<string, unknown> }> {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { sucursal: true },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sucursalId: user.sucursalId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        sucursalId: user.sucursalId,
        sucursal: user.sucursal,
      },
    };
  }

  async getProfile(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { sucursal: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Contrasena actual incorrecta');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Contrasena actualizada exitosamente' };
  }
}
