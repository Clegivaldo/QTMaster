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
import testRoutes from './test.js';
import templateEditorRoutes from './templateEditor.js';

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
      health: '/api/health',
    },
  });
});

export default router;