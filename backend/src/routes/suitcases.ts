import { Router } from 'express';
import { SuitcaseController } from '../controllers/suitcaseController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const suitcaseController = new SuitcaseController();

// All routes require authentication
router.use(authenticate);

// GET /api/suitcases - List suitcases with pagination and search
router.get('/', suitcaseController.getSuitcases.bind(suitcaseController));

// GET /api/suitcases/:id - Get single suitcase
router.get('/:id', suitcaseController.getSuitcase.bind(suitcaseController));

// POST /api/suitcases - Create new suitcase
router.post('/', suitcaseController.createSuitcase.bind(suitcaseController));

// PUT /api/suitcases/:id - Update suitcase
router.put('/:id', suitcaseController.updateSuitcase.bind(suitcaseController));

// DELETE /api/suitcases/:id - Delete suitcase
router.delete('/:id', suitcaseController.deleteSuitcase.bind(suitcaseController));

export default router;