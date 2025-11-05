import { Router } from 'express';
import { SensorController } from '../controllers/sensorController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const sensorController = new SensorController();

// All routes require authentication
router.use(authenticate);

// GET /api/sensors - List sensors with pagination and search
router.get('/', sensorController.getSensors.bind(sensorController));

// GET /api/sensors/:id - Get single sensor
router.get('/:id', sensorController.getSensor.bind(sensorController));

// POST /api/sensors - Create new sensor
router.post('/', sensorController.createSensor.bind(sensorController));

// PUT /api/sensors/:id - Update sensor
router.put('/:id', sensorController.updateSensor.bind(sensorController));

// DELETE /api/sensors/:id - Delete sensor
router.delete('/:id', sensorController.deleteSensor.bind(sensorController));

export default router;