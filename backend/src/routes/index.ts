import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import clientRoutes from './clients';
import sensorTypeRoutes from './sensorTypes';
import sensorRoutes from './sensors';
import suitcaseRoutes from './suitcases';
import fileRoutes from './files';
import validationRoutes from './validations';
import reportRoutes from './reports';
import reportTemplateRoutes from './reportTemplates';
import monitoringRoutes from './monitoring';
import testRoutes from './test';
import templateEditorRoutes from './templateEditor';
import editorTemplatesRoutes from './editorTemplates';
import uploadsRoutes from './uploads';

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
router.use('/test', testRoutes);
router.use('/template-editor', templateEditorRoutes);
router.use('/editor-templates', editorTemplatesRoutes);
router.use('/uploads', uploadsRoutes);

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
      test: '/api/test',
      templateEditor: '/api/template-editor',
      editorTemplates: '/api/editor-templates',
      uploads: '/api/uploads',
      health: '/api/health',
    },
  });
});

export default router;