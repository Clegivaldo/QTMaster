import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/authService.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { AuditService } from '../services/auditService.js';
import { securityLogger } from '../utils/logger.js';

const authService = new AuthService();

// Rate limiting for login attempts
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication middleware
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      securityLogger.warn('Authentication failed - missing token', {
        event: 'AUTH_MISSING_TOKEN',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
      });
      
      res.status(401).json({
        error: 'Access token required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = await authService.verifyToken(token);
    const user = await authService.getUserById(decoded.userId);
    
    req.user = user;
    next();
  } catch (error) {
    securityLogger.warn('Authentication failed - invalid token', {
      event: 'AUTH_INVALID_TOKEN',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(401).json({
      error: 'Invalid or expired token',
    });
  }
};

// Alias for backward compatibility
export const authenticateToken = authenticate;

// Authorization middleware for admin only
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      error: 'Admin access required',
    });
    return;
  }

  next();
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await authService.verifyToken(token);
      const user = await authService.getUserById(decoded.userId);
      req.user = user;
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
  }
  
  next();
};