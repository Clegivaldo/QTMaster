import { Router } from 'express';
import { ClientController } from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, Permission } from '../middleware/authorization.js';
import { 
  cacheClientList, 
  cacheClientDetail, 
  invalidateClientCache 
} from '../middleware/cacheMiddleware.js';

const router = Router();
const clientController = new ClientController();

// All routes require authentication
router.use(authenticate);

// GET /api/clients - List clients with pagination and search
router.get('/', requirePermission(Permission.CLIENT_READ), cacheClientList, clientController.getClients.bind(clientController));

// GET /api/clients/:id - Get single client
router.get('/:id', requirePermission(Permission.CLIENT_READ), cacheClientDetail, clientController.getClient.bind(clientController));

// POST /api/clients - Create new client
router.post('/', requirePermission(Permission.CLIENT_CREATE), invalidateClientCache, clientController.createClient.bind(clientController));

// PUT /api/clients/:id - Update client
router.put('/:id', requirePermission(Permission.CLIENT_UPDATE), invalidateClientCache, clientController.updateClient.bind(clientController));

// DELETE /api/clients/:id - Delete client
router.delete('/:id', requirePermission(Permission.CLIENT_DELETE), invalidateClientCache, clientController.deleteClient.bind(clientController));

export default router;