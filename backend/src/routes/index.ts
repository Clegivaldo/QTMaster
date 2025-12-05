import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import clientRoutes from './clients.js';
import sensorTypeRoutes from './sensorTypes.js';
import sensorRoutes from './sensors.js';
import suitcaseRoutes from './suitcases.js';
import fileRoutes from './files.js';
import validationRoutes from './validations.js';
import reportRoutes from './reports.js';
import reportTemplateRoutes from './reportTemplates.js';
import monitoringRoutes from './monitoring.js';

import templateEditorRoutes from './templateEditor.js';
import editorTemplatesRoutes from './editorTemplates.js';
import templateVersionsRoutes from './templateVersions.js';
import uploadsRoutes from './uploads.js';
import reportSecurityRoutes from './reportSecurity.js';
import equipmentRoutes from './equipment.js';
import { textSnippetRoutes } from './textSnippets.js';
import { EditorTemplateController } from '../controllers/editorTemplateController.js';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/sensor-types', sensorTypeRoutes);
router.use('/sensors', sensorRoutes);
router.use('/suitcases', suitcaseRoutes);
router.use('/files', fileRoutes);
router.use('/validations', validationRoutes);
router.use('/reports', reportRoutes);
router.use('/report-templates', reportTemplateRoutes);
router.use('/monitoring', monitoringRoutes);

router.use('/template-editor', templateEditorRoutes);
// Public testing export route (no auth) - useful for local E2E checks
const editorTemplateController = new EditorTemplateController();
router.post('/editor-templates/:id/export-public', (req, res) => editorTemplateController.exportTemplatePublic(req, res));
router.use('/editor-templates', editorTemplatesRoutes);
router.use('/templates', templateVersionsRoutes);
router.use('/reports', reportSecurityRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/metadata', equipmentRoutes);
router.use('/text-snippets', textSnippetRoutes);

// Legacy health check route (kept for backward compatibility)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// API info route
router.get('/', (req, res) => {
  res.json({
    message: 'Sistema de Laudos de Qualificação Térmica API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      clients: '/api/clients',
      sensorTypes: '/api/sensor-types',
      sensors: '/api/sensors',
      suitcases: '/api/suitcases',
      files: '/api/files',
      validations: '/api/validations',
      reports: '/api/reports',
      reportTemplates: '/api/report-templates',
      monitoring: '/api/monitoring',

      templateEditor: '/api/template-editor',
      editorTemplates: '/api/editor-templates',
      uploads: '/api/uploads',
      metadata: '/api/metadata',
      textSnippets: '/api/text-snippets',
      health: '/api/health',
    },
  });
});

export default router;