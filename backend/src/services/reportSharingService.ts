import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export interface CreateSharedLinkOptions {
  reportId: string;
  expiresInHours?: number;
  maxAccess?: number;
  password?: string;
  allowedIPs?: string[];
  createdBy: string;
}

export interface AccessSharedLinkOptions {
  token: string;
  ip: string;
  userAgent?: string;
  password?: string;
}

export interface SharedLinkInfo {
  id: string;
  token: string;
  expiresAt: Date;
  maxAccess?: number;
  accessCount: number;
  hasPassword: boolean;
  isActive: boolean;
  createdAt: Date;
  report: {
    id: string;
    name: string;
  };
}

export class ReportSharingService {
  private readonly TOKEN_LENGTH = 32;
  private readonly DEFAULT_EXPIRATION_HOURS = 24;

  /**
   * Criar link de compartilhamento seguro
   */
  async createSharedLink(
    options: CreateSharedLinkOptions
  ): Promise<SharedLinkInfo> {
    try {
      // Verificar se relatório existe
      const report = await prisma.report.findUnique({
        where: { id: options.reportId },
        select: { id: true, name: true, pdfPath: true },
      });

      if (!report) {
        throw new Error(`Relatório não encontrado: ${options.reportId}`);
      }

      if (!report.pdfPath) {
        throw new Error('Relatório não possui PDF gerado');
      }

      // Gerar token único
      const token = this.generateToken();

      // Calcular expiração
      const expiresInHours = options.expiresInHours || this.DEFAULT_EXPIRATION_HOURS;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // Hash da senha se fornecida
      let hashedPassword: string | undefined = undefined;
      if (options.password) {
        hashedPassword = await bcrypt.hash(options.password, 10);
      }

      // Criar link compartilhado
      const createData: any = {
        reportId: options.reportId,
        token,
        expiresAt,
        allowedIPs: options.allowedIPs || [],
        createdBy: options.createdBy,
      };
      if (options.maxAccess !== undefined) createData.maxAccess = options.maxAccess;
      if (hashedPassword) createData.password = hashedPassword;

      const sharedLink = await prisma.reportSharedLink.create({
        data: createData,
        include: {
          report: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Link compartilhado criado para relatório ${options.reportId}`, {
        token,
        expiresAt,
        createdBy: options.createdBy,
      });

      const result: SharedLinkInfo = {
        id: sharedLink.id,
        token: sharedLink.token,
        expiresAt: sharedLink.expiresAt,
        maxAccess: sharedLink.maxAccess ?? 0,
        accessCount: sharedLink.accessCount,
        hasPassword: !!sharedLink.password,
        isActive: sharedLink.isActive,
        createdAt: sharedLink.createdAt,
        report: sharedLink.report,
      };
      return result;
    } catch (error) {
      logger.error('Erro ao criar link compartilhado', error);
      throw error;
    }
  }

  /**
   * Acessar relatório via link compartilhado
   */
  async accessSharedLink(
    options: AccessSharedLinkOptions
  ): Promise<{
    success: boolean;
    reportPath?: string;
    reportName?: string;
    error?: string;
  }> {
    try {
      // Buscar link compartilhado
      const sharedLink = await prisma.reportSharedLink.findUnique({
        where: { token: options.token },
        include: {
          report: {
            select: {
              id: true,
              name: true,
              pdfPath: true,
            },
          },
        },
      });

      if (!sharedLink) {
        await this.logAccess(null, options, false);
        return {
          success: false,
          error: 'Link inválido',
        };
      }

      // Verificar se link está ativo
      if (!sharedLink.isActive) {
        await this.logAccess(sharedLink.id, options, false);
        return {
          success: false,
          error: 'Link desativado',
        };
      }

      // Verificar expiração
      if (new Date() > sharedLink.expiresAt) {
        await this.logAccess(sharedLink.id, options, false);
        await this.deactivateLink(sharedLink.id);
        return {
          success: false,
          error: 'Link expirado',
        };
      }

      // Verificar limite de acessos
      if (
        sharedLink.maxAccess &&
        sharedLink.accessCount >= sharedLink.maxAccess
      ) {
        await this.logAccess(sharedLink.id, options, false);
        await this.deactivateLink(sharedLink.id);
        return {
          success: false,
          error: 'Limite de acessos atingido',
        };
      }

      // Verificar IP se lista de IPs permitidos foi definida
      if (sharedLink.allowedIPs.length > 0) {
        if (!sharedLink.allowedIPs.includes(options.ip)) {
          await this.logAccess(sharedLink.id, options, false);
          return {
            success: false,
            error: 'IP não autorizado',
          };
        }
      }

      // Verificar senha se definida
      if (sharedLink.password) {
        if (!options.password) {
          return {
            success: false,
            error: 'Senha necessária',
          };
        }

        const passwordValid = await bcrypt.compare(
          options.password,
          sharedLink.password
        );

        if (!passwordValid) {
          await this.logAccess(sharedLink.id, options, false);
          return {
            success: false,
            error: 'Senha incorreta',
          };
        }
      }

      // Incrementar contador de acessos
      await prisma.reportSharedLink.update({
        where: { id: sharedLink.id },
        data: {
          accessCount: { increment: 1 },
          lastAccess: new Date(),
        },
      });

      // Registrar acesso bem-sucedido
      await this.logAccess(sharedLink.id, options, true);

      logger.info(`Acesso bem-sucedido ao link compartilhado ${options.token}`, {
        ip: options.ip,
        accessCount: sharedLink.accessCount + 1,
      });

      const result: {
        success: boolean;
        reportPath?: string;
        reportName?: string;
        error?: string;
      } = {
        success: true,
        reportName: sharedLink.report.name,
      };
      if (sharedLink.report.pdfPath) result.reportPath = sharedLink.report.pdfPath;
      return result;
    } catch (error) {
      logger.error('Erro ao acessar link compartilhado', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Listar links compartilhados de um relatório
   */
  async listSharedLinks(reportId: string): Promise<SharedLinkInfo[]> {
    try {
      const links = await prisma.reportSharedLink.findMany({
        where: { reportId },
        include: {
          report: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return links.map((link): SharedLinkInfo => ({
        id: link.id,
        token: link.token,
        expiresAt: link.expiresAt,
        maxAccess: link.maxAccess ?? 0,
        accessCount: link.accessCount,
        hasPassword: !!link.password,
        isActive: link.isActive,
        createdAt: link.createdAt,
        report: link.report,
      }));
    } catch (error) {
      logger.error('Erro ao listar links compartilhados', error);
      throw error;
    }
  }

  /**
   * Revogar link compartilhado
   */
  async revokeSharedLink(linkId: string, userId: string): Promise<void> {
    try {
      const link = await prisma.reportSharedLink.findUnique({
        where: { id: linkId },
      });

      if (!link) {
        throw new Error(`Link não encontrado: ${linkId}`);
      }

      // Verificar permissão (apenas quem criou pode revogar)
      if (link.createdBy !== userId) {
        throw new Error('Apenas quem criou o link pode revogá-lo');
      }

      await this.deactivateLink(linkId);

      logger.info(`Link compartilhado ${linkId} revogado por ${userId}`);
    } catch (error) {
      logger.error('Erro ao revogar link compartilhado', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de acesso de um link
   */
  async getLinkStatistics(linkId: string): Promise<{
    totalAccess: number;
    successfulAccess: number;
    failedAccess: number;
    lastAccess?: Date;
    accessByIP: Record<string, number>;
    recentAccesses: Array<{
      ip: string;
      timestamp: Date;
      success: boolean;
    }>;
  }> {
    try {
      const [link, accesses] = await Promise.all([
        prisma.reportSharedLink.findUnique({
          where: { id: linkId },
        }),
        prisma.sharedLinkAccess.findMany({
          where: { linkId },
          orderBy: { timestamp: 'desc' },
          take: 50,
        }),
      ]);

      if (!link) {
        throw new Error(`Link não encontrado: ${linkId}`);
      }

      const successfulAccess = accesses.filter((a) => a.success).length;
      const failedAccess = accesses.filter((a) => !a.success).length;

      // Agrupar por IP
      const accessByIP: Record<string, number> = {};
      accesses.forEach((access) => {
        accessByIP[access.ip] = (accessByIP[access.ip] || 0) + 1;
      });

      const stats: {
        totalAccess: number;
        successfulAccess: number;
        failedAccess: number;
        lastAccess?: Date;
        accessByIP: Record<string, number>;
        recentAccesses: { ip: string; timestamp: Date; success: boolean }[];
      } = {
        totalAccess: link.accessCount,
        successfulAccess,
        failedAccess,
        accessByIP,
        recentAccesses: accesses.slice(0, 10).map((a) => ({
          ip: a.ip,
          timestamp: a.timestamp,
          success: a.success,
        })),
      };
      if (link.lastAccess) stats.lastAccess = link.lastAccess;
      return stats;
    } catch (error) {
      logger.error('Erro ao obter estatísticas de link', error);
      throw error;
    }
  }

  /**
   * Limpar links expirados
   */
  async cleanupExpiredLinks(): Promise<number> {
    try {
      const result = await prisma.reportSharedLink.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      if (result.count > 0) {
        logger.info(`${result.count} links compartilhados expirados desativados`);
      }

      return result.count;
    } catch (error) {
      logger.error('Erro ao limpar links expirados', error);
      return 0;
    }
  }

  /**
   * Gerar token único
   */
  private generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('base64url');
  }

  /**
   * Desativar link
   */
  private async deactivateLink(linkId: string): Promise<void> {
    await prisma.reportSharedLink.update({
      where: { id: linkId },
      data: { isActive: false },
    });
  }

  /**
   * Registrar tentativa de acesso
   */
  private async logAccess(
    linkId: string | null,
    options: AccessSharedLinkOptions,
    success: boolean
  ): Promise<void> {
    try {
      if (!linkId) return;

      const accessData: any = {
        linkId,
        ip: options.ip,
        success,
      };
      if (options.userAgent) accessData.userAgent = options.userAgent;

      await prisma.sharedLinkAccess.create({
        data: accessData,
      });
    } catch (error) {
      logger.error('Erro ao registrar acesso', error);
    }
  }
}

// Singleton instance
export const reportSharingService = new ReportSharingService();
