import { Router } from 'express';
import { TestController } from '../controllers/testController.js';
import { TemplateTestController } from '../controllers/templateTestController.js';

const router = Router();

// Rotas de teste (sem autenticação para facilitar testes)
router.get('/report', TestController.testReportGeneration);
router.get('/template', TestController.testTemplate);
router.get('/mock-report', TestController.testMockReport);
router.get('/advanced-report', TestController.testAdvancedReport);

// Rotas de teste de templates
router.get('/templates', TemplateTestController.listTemplates);
router.post('/templates/reload', TemplateTestController.reloadTemplates);
router.get('/templates/:templateName', TemplateTestController.testSpecificTemplate);
router.get('/helpers/test', TemplateTestController.testHelpers);

export default router;