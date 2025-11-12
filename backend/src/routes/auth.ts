import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate, loginRateLimit } from '../middleware/auth.js';

// When running end-to-end tests, allow disabling the login rate limit
const applyLoginRateLimit = process.env.TEST_E2E === 'true' ? ((req, res, next) => next()) : loginRateLimit;

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', applyLoginRateLimit, authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));

export default router;