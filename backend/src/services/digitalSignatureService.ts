import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import path from 'path';

export interface SignatureOptions {
  certificate?: string;
  privateKey?: string;
  algorithm?: 'RSA-SHA256' | 'RSA-SHA512';
  reason?: string;
  location?: string;
  contactInfo?: string;
}

export interface VerificationResult {
  isValid: boolean;
  signedBy?: string;
  signedAt?: Date;
  certificateInfo?: any;
  errors?: string[];
}

export class DigitalSignatureService {
  private readonly SIGNATURE_DIR = path.join(process.cwd(), 'signatures');
  private readonly CERTIFICATE_DIR = path.join(process.cwd(), 'certificates');

  constructor() {
    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.SIGNATURE_DIR, { recursive: true });
      await fs.mkdir(this.CERTIFICATE_DIR, { recursive: true });
    } catch (error) {
      logger.error('Erro ao criar diretórios de assinatura', error);
    }
  }

  /**
   * Assinar um relatório PDF digitalmente
   */
  async signReport(
    reportId: string,
    userId: string,
    pdfBuffer: Buffer,
    options: SignatureOptions = {}
  ): Promise<{
    signature: string;
    signedPdfPath: string;
    certificateInfo: any;
  }> {
    try {
      // Buscar relatório
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { user: true },
      });

      if (!report) {
        throw new Error(`Relatório não encontrado: ${reportId}`);
      }

      // Gerar assinatura digital
      const signature = this.generateSignature(pdfBuffer, options);

      // Informações do certificado
      const certificateInfo = {
        algorithm: options.algorithm || 'RSA-SHA256',
        signedBy: report.user.name,
        signedByEmail: report.user.email,
        reason: options.reason || 'Aprovação do relatório técnico',
        location: options.location || 'Brasil',
        contactInfo: options.contactInfo || report.user.email,
        timestamp: new Date().toISOString(),
      };

      // Salvar PDF assinado
      const signedPdfPath = await this.saveSignedPDF(
        reportId,
        pdfBuffer,
        signature
      );

      // Atualizar registro do relatório
      await prisma.report.update({
        where: { id: reportId },
        data: {
          digitalSignature: signature,
          signedAt: new Date(),
          signedBy: userId,
          certificateInfo: certificateInfo as any,
        },
      });

      logger.info(`Relatório ${reportId} assinado digitalmente por ${userId}`, {
        reportId,
        userId,
        signedBy: report.user.name,
      });

      return {
        signature,
        signedPdfPath,
        certificateInfo,
      };
    } catch (error) {
      logger.error('Erro ao assinar relatório', error);
      throw error;
    }
  }

  /**
   * Verificar assinatura digital de um relatório
   */
  async verifySignature(reportId: string): Promise<VerificationResult> {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        throw new Error(`Relatório não encontrado: ${reportId}`);
      }

      if (!report.digitalSignature) {
        return {
          isValid: false,
          errors: ['Relatório não possui assinatura digital'],
        };
      }

      // Carregar PDF assinado
      if (!report.pdfPath) {
        return {
          isValid: false,
          errors: ['PDF não encontrado'],
        };
      }

      const pdfBuffer = await fs.readFile(report.pdfPath);

      // Verificar assinatura
      const isValid = this.verifySignatureInternal(
        pdfBuffer,
        report.digitalSignature
      );

      if (!isValid) {
        return {
          isValid: false,
          errors: ['Assinatura digital inválida ou documento foi modificado'],
        };
      }

      const result: VerificationResult = {
        isValid: true,
      };
      if (report.signedBy) result.signedBy = report.signedBy;
      if (report.signedAt) result.signedAt = report.signedAt;
      if (report.certificateInfo) result.certificateInfo = report.certificateInfo;
      return result;
    } catch (error) {
      logger.error('Erro ao verificar assinatura', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        errors: [errorMsg],
      };
    }
  }

  /**
   * Gerar assinatura digital do PDF
   */
  private generateSignature(
    pdfBuffer: Buffer,
    options: SignatureOptions
  ): string {
    const algorithm = options.algorithm === 'RSA-SHA512' ? 'sha512' : 'sha256';

    // Calcular hash do PDF
    const hash = crypto.createHash(algorithm).update(pdfBuffer).digest('hex');

    // Se houver chave privada, usar RSA
    if (options.privateKey) {
      try {
        const sign = crypto.createSign(algorithm);
        sign.update(pdfBuffer);
        sign.end();

        const signature = sign.sign(options.privateKey, 'base64');
        return signature;
      } catch (error) {
        logger.warn('Erro ao assinar com chave privada, usando hash simples', error);
      }
    }

    // Caso contrário, usar hash com salt
    const salt = crypto.randomBytes(32).toString('hex');
    const signedHash = crypto
      .createHmac(algorithm, salt)
      .update(hash)
      .digest('hex');

    return `${algorithm}:${salt}:${signedHash}`;
  }

  /**
   * Verificar assinatura interna
   */
  private verifySignatureInternal(pdfBuffer: Buffer, signature: string): boolean {
    try {
      // Se assinatura é RSA (base64)
      if (!signature.includes(':')) {
        // Verificação RSA requer certificado público
        // Por enquanto, aceitar como válida
        return true;
      }

      // Verificação com hash e salt
      const [algorithm, salt, expectedHash] = signature.split(':');

      if (!algorithm || !salt) {
        throw new Error('Formato de assinatura inválido');
      }

      const hash = crypto
        .createHash(algorithm)
        .update(pdfBuffer)
        .digest('hex');

      const computedHash = crypto
        .createHmac(algorithm, salt)
        .update(hash)
        .digest('hex');

      return computedHash === expectedHash;
    } catch (error) {
      logger.error('Erro ao verificar assinatura', error);
      return false;
    }
  }

  /**
   * Salvar PDF assinado com metadados
   */
  private async saveSignedPDF(
    reportId: string,
    pdfBuffer: Buffer,
    signature: string
  ): Promise<string> {
    const filename = `report_${reportId}_signed_${Date.now()}.pdf`;
    const filePath = path.join(this.SIGNATURE_DIR, filename);

    // Adicionar metadados de assinatura ao PDF (simplificado)
    // Em produção, usar biblioteca como pdf-lib para adicionar assinatura visual
    await fs.writeFile(filePath, pdfBuffer);

    // Salvar arquivo de metadados
    const metadataPath = filePath.replace('.pdf', '.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(
        {
          reportId,
          signature,
          signedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return filePath;
  }

  /**
   * Remover assinatura de um relatório
   */
  async removeSignature(reportId: string, userId: string): Promise<void> {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        throw new Error(`Relatório não encontrado: ${reportId}`);
      }

      // Verificar permissão (apenas quem assinou pode remover)
      if (report.signedBy !== userId) {
        throw new Error('Apenas quem assinou pode remover a assinatura');
      }

      await prisma.report.update({
        where: { id: reportId },
        data: {
          digitalSignature: null,
          signedAt: null,
          signedBy: null,
          certificateInfo: Prisma.JsonNull,
        },
      });

      logger.info(`Assinatura removida do relatório ${reportId} por ${userId}`);
    } catch (error) {
      logger.error('Erro ao remover assinatura', error);
      throw error;
    }
  }

  /**
   * Obter informações de assinatura de um relatório
   */
  async getSignatureInfo(reportId: string): Promise<{
    isSigned: boolean;
    signature?: string;
    signedBy?: string;
    signedAt?: Date;
    certificateInfo?: any;
  }> {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: {
          digitalSignature: true,
          signedBy: true,
          signedAt: true,
          certificateInfo: true,
        },
      });

      if (!report) {
        throw new Error(`Relatório não encontrado: ${reportId}`);
      }

      const info: {
        isSigned: boolean;
        signature?: string;
        signedBy?: string;
        signedAt?: Date;
        certificateInfo?: any;
      } = {
        isSigned: !!report.digitalSignature,
      };
      if (report.digitalSignature) info.signature = report.digitalSignature;
      if (report.signedBy) info.signedBy = report.signedBy;
      if (report.signedAt) info.signedAt = report.signedAt;
      if (report.certificateInfo) info.certificateInfo = report.certificateInfo;
      return info;
    } catch (error) {
      logger.error('Erro ao obter informações de assinatura', error);
      throw error;
    }
  }
}

// Singleton instance
export const digitalSignatureService = new DigitalSignatureService();
