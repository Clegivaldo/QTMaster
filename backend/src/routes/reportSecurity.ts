import { Router } from 'express';
import { digitalSignatureService } from '../services/digitalSignatureService.js';
import { reportSharingService } from '../services/reportSharingService.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, Permission } from '../middleware/authorization.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';

const router = Router();

/**
 * @route   POST /api/reports/:id/sign
 * @desc    Assinar relatório digitalmente
 * @access  Private (REPORT_UPDATE)
 */
router.post(
  '/:id/sign',
  authenticate,
  requirePermission(Permission.REPORT_UPDATE),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do relatório é obrigatório' });
      }

      const userId = req.user?.id || 'system';
      const { reason, location, contactInfo } = req.body;

      // Carregar PDF do relatório
      const report = await (await import('../lib/prisma.js')).prisma.report.findUnique({
        where: { id },
      });

      if (!report || !report.pdfPath) {
        return res.status(404).json({
          success: false,
          error: 'Relatório ou PDF não encontrado',
        });
      }

      const pdfBuffer = await fs.readFile(report.pdfPath);

      // Assinar relatório
      const result = await digitalSignatureService.signReport(id, userId, pdfBuffer, {
        reason,
        location,
        contactInfo,
      });

      return res.json({
        success: true,
        data: {
          signature: result.signature,
          certificateInfo: result.certificateInfo,
          signedPdfPath: result.signedPdfPath,
        },
        message: 'Relatório assinado digitalmente com sucesso',
      });
    } catch (error) {
      logger.error('Erro ao assinar relatório', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   GET /api/reports/:id/signature/verify
 * @desc    Verificar assinatura digital do relatório
 * @access  Public
 */
router.get('/:id/signature/verify', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do relatório é obrigatório' });
    }

    const verification = await digitalSignatureService.verifySignature(id);

    return res.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    logger.error('Erro ao verificar assinatura', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * @route   GET /api/reports/:id/signature
 * @desc    Obter informações de assinatura
 * @access  Private (REPORT_READ)
 */
router.get(
  '/:id/signature',
  authenticate,
  requirePermission(Permission.REPORT_READ),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do relatório é obrigatório' });
      }

      const signatureInfo = await digitalSignatureService.getSignatureInfo(id);

      return res.json({
        success: true,
        data: signatureInfo,
      });
    } catch (error) {
      logger.error('Erro ao obter informações de assinatura', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   DELETE /api/reports/:id/signature
 * @desc    Remover assinatura digital
 * @access  Private (REPORT_UPDATE)
 */
router.delete(
  '/:id/signature',
  authenticate,
  requirePermission(Permission.REPORT_UPDATE),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do relatório é obrigatório' });
      }

      const userId = req.user?.id || 'system';

      await digitalSignatureService.removeSignature(id, userId);

      return res.json({
        success: true,
        message: 'Assinatura removida com sucesso',
      });
    } catch (error) {
      logger.error('Erro ao remover assinatura', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   POST /api/reports/:id/share
 * @desc    Criar link de compartilhamento seguro
 * @access  Private (REPORT_READ)
 */
router.post(
  '/:id/share',
  authenticate,
  requirePermission(Permission.REPORT_READ),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do relatório é obrigatório' });
      }

      const userId = req.user?.id || 'system';
      const { expiresInHours, maxAccess, password, allowedIPs } = req.body;

      const sharedLink = await reportSharingService.createSharedLink({
        reportId: id,
        expiresInHours,
        maxAccess,
        password,
        allowedIPs,
        createdBy: userId,
      });

      return res.status(201).json({
        success: true,
        data: sharedLink,
        message: 'Link de compartilhamento criado com sucesso',
      });
    } catch (error) {
      logger.error('Erro ao criar link de compartilhamento', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   GET /api/reports/:id/share
 * @desc    Listar links de compartilhamento
 * @access  Private (REPORT_READ)
 */
router.get(
  '/:id/share',
  authenticate,
  requirePermission(Permission.REPORT_READ),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do relatório é obrigatório' });
      }

      const links = await reportSharingService.listSharedLinks(id);

      return res.json({
        success: true,
        data: links,
      });
    } catch (error) {
      logger.error('Erro ao listar links de compartilhamento', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   DELETE /api/reports/share/:linkId
 * @desc    Revogar link de compartilhamento
 * @access  Private (REPORT_UPDATE)
 */
router.delete(
  '/share/:linkId',
  authenticate,
  requirePermission(Permission.REPORT_UPDATE),
  async (req, res) => {
    try {
      const { linkId } = req.params;
      if (!linkId) {
        return res.status(400).json({ success: false, error: 'ID do link é obrigatório' });
      }

      const userId = req.user?.id || 'system';

      await reportSharingService.revokeSharedLink(linkId, userId);

      return res.json({
        success: true,
        message: 'Link de compartilhamento revogado',
      });
    } catch (error) {
      logger.error('Erro ao revogar link de compartilhamento', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   GET /api/reports/share/:linkId/stats
 * @desc    Obter estatísticas de acesso do link
 * @access  Private (REPORT_READ)
 */
router.get(
  '/share/:linkId/stats',
  authenticate,
  requirePermission(Permission.REPORT_READ),
  async (req, res) => {
    try {
      const { linkId } = req.params;
      if (!linkId) {
        return res.status(400).json({ success: false, error: 'ID do link é obrigatório' });
      }

      const stats = await reportSharingService.getLinkStatistics(linkId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas do link', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   POST /api/reports/shared/:token
 * @desc    Acessar relatório via link compartilhado (público)
 * @access  Public
 */
router.post('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token é obrigatório' });
    }

    const { password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || null;

    const result = await reportSharingService.accessSharedLink({
      token,
      ip,
      ...(userAgent && { userAgent }),
      ...(password && { password }),
    });

    if (!result.success) {
      return res.status(403).json({
        success: false,
        error: result.error,
      });
    }

    // Retornar PDF
    if (result.reportPath) {
      const pdfBuffer = await fs.readFile(result.reportPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${result.reportName}.pdf"`);
      return res.send(pdfBuffer);
    }

    return res.status(404).json({
      success: false,
      error: 'PDF não encontrado',
    });
  } catch (error) {
    logger.error('Erro ao acessar link compartilhado', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

export default router;
