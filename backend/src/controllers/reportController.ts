import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportGenerationService } from '../services/reportGenerationService.js';
import path from 'path';
import fs from 'fs';
import { requireParam } from '../utils/requestUtils.js';

const prisma = new PrismaClient();
const reportService = new ReportGenerationService();

export class ReportController {
  /**
   * Gera um relatório PDF
   */
  static async generateReport(req: Request, res: Response) {
    try {
  const validationId = requireParam(req, res, 'validationId');
  if (!validationId) return;
      const { templateId } = req.query;

      if (!validationId) {
        return res.status(400).json({
          success: false,
          error: 'ID da validação é obrigatório'
        });
      }

      // Verificar se a validação existe e o usuário tem acesso
      const validation = await prisma.validation.findUnique({
        where: { id: validationId },
        include: {
          client: true,
          user: true
        }
      });

      if (!validation) {
        return res.status(404).json({
          success: false,
          error: 'Validação não encontrada'
        });
      }

      // Gerar o PDF
      const pdfBuffer = await reportService.generateReport(
        validationId, 
        templateId as string
      );

      // Salvar o PDF no sistema de arquivos
      const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filename = `laudo_${validationId}_${Date.now()}.pdf`;
      const filepath = path.join(reportsDir, filename);
      fs.writeFileSync(filepath, pdfBuffer);

      // Criar registro do relatório no banco
      const report = await prisma.report.create({
        data: {
          validationId,
          templateId: templateId as string || 'default',
          userId: req.user?.id || validation.userId,
          clientId: validation.clientId,
          name: `Laudo - ${validation.name}`,
          status: 'FINALIZED',
          pdfPath: `uploads/reports/${filename}`
        }
      });

      // Retornar o PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.json({
        success: true,
        data: {
          reportId: report.id,
          filename,
          downloadUrl: `/api/reports/${report.id}/download`
        }
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Lista relatórios
   */
  static async listReports(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, clientId, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (clientId) where.clientId = clientId;
      if (status) where.status = status;

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          include: {
            validation: true,
            client: true,
            user: true,
            template: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.report.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          reports,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });

    } catch (error) {
      console.error('Erro ao listar relatórios:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Busca um relatório específico
   */
  static async getReport(req: Request, res: Response) {
    try {
  const id = requireParam(req, res, 'id');
  if (!id) return;

      const report = await prisma.report.findUnique({
        where: { id: id! },
        include: {
          validation: {
            include: {
              suitcase: {
                include: {
                  sensors: {
                    include: {
                      sensor: {
                        include: {
                          type: true
                        }
                      }
                    }
                  }
                }
              },
              sensorData: {
                include: {
                  sensor: true
                }
              }
            }
          },
          client: true,
          user: true,
          template: true
        }
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Relatório não encontrado'
        });
      }

      return res.json({
        success: true,
        data: { report }
      });

    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Download do PDF do relatório
   */
  static async downloadReport(req: Request, res: Response) {
    try {
  const id = requireParam(req, res, 'id');
  if (!id) return;

      const report = await prisma.report.findUnique({
        where: { id: id! }
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Relatório não encontrado'
        });
      }

      if (!report.pdfPath) {
        return res.status(404).json({
          success: false,
          error: 'Arquivo PDF não encontrado'
        });
      }

      const filepath = path.join(process.cwd(), report.pdfPath);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          error: 'Arquivo PDF não encontrado'
        });
      }

      const filename = path.basename(report.pdfPath);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
      return;

    } catch (error) {
      console.error('Erro ao fazer download do relatório:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Preview do relatório (retorna PDF inline)
   */
  static async previewReport(req: Request, res: Response) {
    try {
      const validationId = requireParam(req, res, 'validationId');
      if (!validationId) return;

      // Gerar o PDF
      const pdfBuffer = await reportService.generateReport(validationId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer);

    } catch (error) {
      console.error('Erro ao gerar preview do relatório:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deleta um relatório
   */
  static async deleteReport(req: Request, res: Response) {
    try {
  const id = requireParam(req, res, 'id');
  if (!id) return;

      const report = await prisma.report.findUnique({
        where: { id: id! }
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Relatório não encontrado'
        });
      }

      // Remover arquivo PDF
      if (report.pdfPath) {
        const filepath = path.join(process.cwd(), report.pdfPath);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
      // Remover registro do banco
      await prisma.report.delete({
        where: { id: id! }
      });

      return res.json({
        success: true,
        message: 'Relatório removido com sucesso'
      });

    } catch (error) {
      console.error('Erro ao remover relatório:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}