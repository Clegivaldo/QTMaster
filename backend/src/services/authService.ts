import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';
import { prisma as prismaSingleton } from '../lib/prisma.js';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export class AuthService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private tokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.prisma = prismaSingleton as PrismaClient;
    const isProd = process.env.NODE_ENV === 'production';
    const secret = process.env.JWT_SECRET || '';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
    if (isProd && (!secret || !refreshSecret)) {
      throw new Error('JWT secrets are required in production');
    }
    this.jwtSecret = secret || 'your-secret-key-change-in-production';
    this.jwtRefreshSecret = refreshSecret || 'your-refresh-secret-change-in-production';
    this.tokenExpiry = process.env.JWT_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  async register(data: RegisterData): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Verificar se o email já existe
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError('Email já está em uso', 400);
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Criar usuário
      const user = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: (data.role || 'USER') as any,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Gerar tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return { user, tokens };
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao registrar usuário:', error);
      throw new AppError('Erro ao registrar usuário', 500);
    }
  }

  async login(data: LoginData): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Buscar usuário
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError('Credenciais inválidas', 401);
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Credenciais inválidas', 401);
      }

      // Gerar tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Remover senha do retorno
      const { password, ...userWithoutPassword } = user;

      return { user: userWithoutPassword, tokens };
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao fazer login:', error);
      throw new AppError('Erro ao fazer login', 500);
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verificar se o token JWT é válido
      const decoded = (jwt as any).verify(refreshToken, this.jwtRefreshSecret) as TokenPayload;

      // Buscar usuário no banco
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new AppError('Usuário não encontrado', 401);
      }

      // Gerar novos tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return tokens;
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao atualizar token:', error);
      throw new AppError('Erro ao atualizar token', 401);
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // TODO: Implementar blacklist de tokens ou invalidação
      // Por enquanto, apenas retorna sucesso
      return;
      
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Não lançar erro para não quebrar o fluxo
    }
  }

  async logoutAll(_userId: string): Promise<void> {
    // Token blacklist not configured in Prisma schema; noop for now
    return;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Buscar usuário
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Verificar senha antiga
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        throw new AppError('Senha atual incorreta', 400);
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Atualizar senha
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Invalidar todos os tokens de refresh
      await this.logoutAll(userId);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao alterar senha:', error);
      throw new AppError('Erro ao alterar senha', 500);
    }
  }

  async resetPassword(_email: string, _resetToken: string, _newPassword: string): Promise<void> {
    throw new AppError('Password reset não configurado', 501);
  }

  async generatePasswordResetToken(_email: string): Promise<string> {
    throw new AppError('Password reset não configurado', 501);
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      userId,
      email,
      role,
      permissions: await this.getUserPermissions(userId),
    };

    const accessToken = (jwt as any).sign(payload, this.jwtSecret, { expiresIn: this.tokenExpiry });
    const refreshToken = (jwt as any).sign(payload, this.jwtRefreshSecret, { expiresIn: this.refreshTokenExpiry });

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new AppError('Token inválido', 401);
    }
  }

  async getUserById(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    return user;
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    // TODO: Implementar sistema de permissões
    // Por enquanto, retornar array vazio
    return [];
  }

  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Helpers used by controllers
  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const authService = new AuthService();
