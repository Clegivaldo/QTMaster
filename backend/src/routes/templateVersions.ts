import { Router } from 'express';
import { templateVersionService } from '../services/templateVersionService';
import { templateEngineService } from '../services/templateEngineService';
import { authenticate } from '../middleware/auth';
import { requirePermission, Permission } from '../middleware/authorization';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/templates/:id/versions
 * @desc    Listar todas as versões de um template
 * @access  Private (TEMPLATE_READ)
 */
router.get(
  '/:id/versions',
  authenticate,
  requirePermission(Permission.TEMPLATE_READ),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do template é obrigatório' });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await templateVersionService.listVersions(id, { limit, offset });

      return res.json({
        success: true,
        data: result.versions,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      });
    } catch (error) {
      logger.error('Erro ao listar versões do template', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   GET /api/templates/:id/versions/:version
 * @desc    Obter uma versão específica do template
 * @access  Private (TEMPLATE_READ)
 */
router.get(
  '/:id/versions/:version',
  authenticate,
  requirePermission(Permission.TEMPLATE_READ),
  async (req, res) => {
    try {
      const { id, version } = req.params;
      if (!id || !version) {
        return res.status(400).json({ success: false, error: 'ID e versão são obrigatórios' });
      }
      
      const versionNumber = parseInt(version);

      const templateVersion = await templateVersionService.getVersion(id, versionNumber);

      return res.json({
        success: true,
        data: templateVersion,
      });
    } catch (error) {
      logger.error('Erro ao obter versão do template', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(404).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   POST /api/templates/:id/versions
 * @desc    Criar uma nova versão do template
 * @access  Private (TEMPLATE_UPDATE)
 */
router.post(
  '/:id/versions',
  authenticate,
  requirePermission(Permission.TEMPLATE_UPDATE),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do template é obrigatório' });
      }
      
      const userId = req.user?.id || 'system';
      const { name, description, elements, globalStyles, pages, pageSettings, changeLog } = req.body;

      if (!elements || !globalStyles) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: elements, globalStyles',
        });
      }

      const version = await templateVersionService.createVersion(
        id,
        {
          name,
          description,
          elements,
          globalStyles,
          pages,
          pageSettings,
          changeLog,
        },
        userId
      );

      return res.status(201).json({
        success: true,
        data: version,
        message: `Versão ${version.version} criada com sucesso`,
      });
    } catch (error) {
      logger.error('Erro ao criar versão do template', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   POST /api/templates/:id/rollback/:version
 * @desc    Fazer rollback do template para uma versão específica
 * @access  Private (TEMPLATE_UPDATE)
 */
router.post(
  '/:id/rollback/:version',
  authenticate,
  requirePermission(Permission.TEMPLATE_UPDATE),
  async (req, res) => {
    try {
      const { id, version } = req.params;
      if (!id || !version) {
        return res.status(400).json({ success: false, error: 'ID e versão são obrigatórios' });
      }
      
      const userId = req.user?.id || 'system';
      const versionNumber = parseInt(version);
      const { createNewVersion = true } = req.body;

      const template = await templateVersionService.rollbackToVersion(
        id,
        versionNumber,
        userId,
        createNewVersion
      );

      return res.json({
        success: true,
        data: template,
        message: `Rollback para versão ${versionNumber} realizado com sucesso`,
      });
    } catch (error) {
      logger.error('Erro ao fazer rollback do template', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   GET /api/templates/:id/compare/:version1/:version2
 * @desc    Comparar duas versões do template
 * @access  Private (TEMPLATE_READ)
 */
router.get(
  '/:id/compare/:version1/:version2',
  authenticate,
  requirePermission(Permission.TEMPLATE_READ),
  async (req, res) => {
    try {
      const { id, version1, version2 } = req.params;
      if (!id || !version1 || !version2) {
        return res.status(400).json({ success: false, error: 'ID e versões são obrigatórios' });
      }
      
      const v1 = parseInt(version1);
      const v2 = parseInt(version2);

      const comparison = await templateVersionService.compareVersions(id, v1, v2);

      return res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('Erro ao comparar versões', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   DELETE /api/templates/:id/versions/prune
 * @desc    Deletar versões antigas (manter apenas N últimas)
 * @access  Private (TEMPLATE_DELETE)
 */
router.delete(
  '/:id/versions/prune',
  authenticate,
  requirePermission(Permission.TEMPLATE_DELETE),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do template é obrigatório' });
      }
      
      const keepLast = parseInt(req.query.keepLast as string) || 10;

      const deletedCount = await templateVersionService.pruneOldVersions(id, keepLast);

      return res.json({
        success: true,
        data: { deletedCount, kept: keepLast },
        message: `${deletedCount} versões antigas deletadas`,
      });
    } catch (error) {
      logger.error('Erro ao deletar versões antigas', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   POST /api/templates/preview
 * @desc    Gerar preview do template com dados de amostra
 * @access  Private (TEMPLATE_READ)
 */
router.post(
  '/preview',
  authenticate,
  requirePermission(Permission.TEMPLATE_READ),
  async (req, res) => {
    try {
      const { templateContent, sampleData } = req.body;

      if (!templateContent) {
        return res.status(400).json({
          success: false,
          error: 'templateContent é obrigatório',
        });
      }

      // Usar dados de amostra padrão se não fornecidos
      const data = sampleData || generateSampleData();

      // Renderizar template
      const result = await templateEngineService.renderTemplateWithData(
        templateContent,
        data,
        { cache: false }
      );

      return res.json({
        success: true,
        data: {
          html: result.html,
          warnings: result.warnings,
          errors: result.errors,
        },
      });
    } catch (error) {
      logger.error('Erro ao gerar preview do template', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * @route   GET /api/templates/variables
 * @desc    Obter lista de variáveis disponíveis para templates
 * @access  Private (TEMPLATE_READ)
 */
router.get(
  '/variables',
  authenticate,
  requirePermission(Permission.TEMPLATE_READ),
  async (req, res) => {
    try {
      const variables = await templateEngineService.getTemplateVariables();

      // Agrupar por categoria
      const grouped = variables.reduce((acc: any, variable: any) => {
        const category = variable.category || 'outros';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(variable);
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          variables,
          grouped,
        },
      });
    } catch (error) {
      logger.error('Erro ao obter variáveis do template', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * Gerar dados de amostra para preview
 */
function generateSampleData(): any {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return {
    client: {
      id: 'sample-client-id',
      name: 'Empresa ABC Ltda',
      email: 'contato@empresaabc.com.br',
      phone: '(11) 98765-4321',
      address: 'Rua das Flores, 123 - Centro - São Paulo/SP',
      cnpj: '12.345.678/0001-90',
      street: 'Rua das Flores',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      complement: 'Sala 101',
    },
    validation: {
      id: 'sample-validation-id',
      name: 'Validação Câmara Fria - Julho 2024',
      description: 'Validação térmica de câmara fria para armazenamento de medicamentos',
      startDate: yesterday.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      duration: '24 horas',
      minTemperature: 2.0,
      maxTemperature: 8.0,
      minHumidity: 45.0,
      maxHumidity: 75.0,
      isApproved: true,
      createdAt: yesterday,
      updatedAt: now,
    },
    statistics: {
      temperature: {
        average: 5.2,
        min: 2.1,
        max: 7.8,
        standardDeviation: 1.2,
      },
      humidity: {
        average: 62.5,
        min: 48.3,
        max: 73.1,
        standardDeviation: 6.8,
      },
      readingsCount: 1440,
    },
    sensorData: Array.from({ length: 10 }, (_, i) => ({
      id: `sensor-data-${i}`,
      sensorId: `sensor-${i % 3}`,
      timestamp: new Date(yesterday.getTime() + i * 2 * 60 * 60 * 1000),
      temperature: 5.0 + Math.random() * 2 - 1,
      humidity: 60 + Math.random() * 10 - 5,
    })),
    sensors: [
      {
        id: 'sensor-0',
        serialNumber: 'SN-001234',
        model: 'TH-Logger Pro',
        position: 1,
      },
      {
        id: 'sensor-1',
        serialNumber: 'SN-001235',
        model: 'TH-Logger Pro',
        position: 2,
      },
      {
        id: 'sensor-2',
        serialNumber: 'SN-001236',
        model: 'TH-Logger Pro',
        position: 3,
      },
    ],
    currentDate: now.toLocaleDateString('pt-BR'),
    currentTime: now.toLocaleTimeString('pt-BR'),
    user: {
      id: 'sample-user-id',
      name: 'João Silva',
      email: 'joao.silva@empresaabc.com.br',
    },
  };
}

export default router;
