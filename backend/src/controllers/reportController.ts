import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getReportGenerationService } from '../services/serviceInstances.js';
import path from 'path';
import fs from 'fs';
import { requireParam } from '../utils/requestUtils.js';

const prisma = new PrismaClient();

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
      const pdfBuffer = await getReportGenerationService().generateReport(
        validationId,
        templateId as string
      );

      // Salvar o PDF no sistema de arquivos
      const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Remover relatórios anteriores desta validação (substituir comportamento)
      const existingReports = await prisma.report.findMany({ where: { validationId } });
      for (const r of existingReports) {
        if (r.pdfPath) {
          const oldPath = path.join(process.cwd(), r.pdfPath);
          try {
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          } catch (err) {
            console.warn('Falha ao remover arquivo antigo do relatório:', oldPath, err);
          }
        }
        try {
          await prisma.report.delete({ where: { id: r.id } });
        } catch (err) {
          console.warn('Falha ao remover registro antigo do relatório:', r.id, err);
        }
      }

      const filename = `laudo_${validationId}_${Date.now()}.pdf`;
      const filepath = path.join(reportsDir, filename);
      fs.writeFileSync(filepath, pdfBuffer);

      // Criar registro do relatório no banco
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId as string);

      const reportData: any = {
        validationId,
        userId: req.user?.id || validation.userId,
        clientId: validation.clientId,
        name: `Laudo - ${validation.name}`,
        status: 'FINALIZED',
        pdfPath: `uploads/reports/${filename}`
      };

      if (isUUID) {
        reportData.editorTemplateId = templateId as string;
      } else {
        reportData.templateId = templateId as string || 'default';
      }

      const report = await prisma.report.create({
        data: reportData
      });

      // Retornar informação do relatório gerado (não enviar o PDF direto aqui)
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
      // Ensure proxies and browsers don't cache the PDF (always get the latest)
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

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
      const pdfBuffer = await getReportGenerationService().generateReport(validationId);

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
   * Cria um novo relatório
   */
  static async createReport(req: Request, res: Response) {
    try {
      const { validationId, name, templateId } = req.body;

      if (!validationId || !name) {
        return res.status(400).json({
          success: false,
          error: 'Validation ID e nome são obrigatórios'
        });
      }

      // Verificar se a validação existe
      const validation = await prisma.validation.findUnique({
        where: { id: validationId }
      });

      if (!validation) {
        return res.status(404).json({
          success: false,
          error: 'Validação não encontrada'
        });
      }

      // Buscar template ativo se não especificado
      let finalTemplateId = templateId;
      if (!finalTemplateId) {
        const activeTemplate = await prisma.reportTemplate.findFirst({
          where: { isActive: true }
        });
        if (activeTemplate) {
          finalTemplateId = activeTemplate.id;
        } else {
          // Criar um template default se não existir
          const newTemplate = await prisma.reportTemplate.create({
            data: {
              name: 'Template Padrão',
              description: 'Template criado automaticamente',
              templatePath: '/templates/default.html',
              isActive: true
            }
          });
          finalTemplateId = newTemplate.id;
        }
      }

      // Criar o relatório
      const report = await prisma.report.create({
        data: {
          name,
          validationId,
          clientId: validation.clientId,
          userId: req.user?.id || validation.userId,
          templateId: finalTemplateId,
          status: 'DRAFT'
        },
        include: {
          validation: true,
          client: true,
          user: true
        }
      });

      return res.status(201).json({
        success: true,
        data: { report }
      });

    } catch (error) {
      console.error('Erro ao criar relatório:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualiza um relatório
   */
  static async updateReport(req: Request, res: Response) {
    try {
      const id = requireParam(req, res, 'id');
      if (!id) return;

      const { name, templateId, status } = req.body;

      const report = await prisma.report.findUnique({
        where: { id: id! }
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Relatório não encontrado'
        });
      }

      const updated = await prisma.report.update({
        where: { id: id! },
        data: {
          ...(name && { name }),
          ...(templateId && { templateId }),
          ...(status && { status })
        },
        include: {
          validation: true,
          client: true,
          user: true
        }
      });

      return res.json({
        success: true,
        data: { report: updated }
      });

    } catch (error) {
      console.error('Erro ao atualizar relatório:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Retorna estatísticas gerais dos relatórios
   */
  static async getStatistics(req: Request, res: Response) {
    try {
      const [total, byStatus] = await Promise.all([
        prisma.report.count(),
        prisma.report.groupBy({
          by: ['status'],
          _count: true
        })
      ]);

      const statistics = {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>)
      };

      return res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
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