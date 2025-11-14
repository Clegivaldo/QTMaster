import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { prisma } from '../lib/prisma.js';
import { logger, securityLogger } from '../utils/logger.js';
import { AuditService } from '../services/auditService.js';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      
      // Attempt login
      const result = await authService.login(validatedData);
      
      // Log successful login
      await AuditService.logLogin(
        result.user.id,
        result.user.email,
        req.ip || 'unknown',
        req.get('User-Agent'),
        true
      );
      
      securityLogger.info('User login successful', {
        event: 'USER_LOGIN_SUCCESS',
        userId: result.user.id,
        userEmail: result.user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }

      if (error instanceof Error && error.message === 'Invalid credentials') {
        // Log failed login attempt
        await AuditService.logLogin(
          'unknown',
          req.body.email || 'unknown',
          req.ip || 'unknown',
          req.get('User-Agent'),
          false,
          'Invalid credentials'
        );
        
        securityLogger.warn('User login failed - invalid credentials', {
          event: 'USER_LOGIN_FAILED',
          email: req.body.email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'Invalid credentials',
        });
        
        res.status(401).json({
          error: 'Invalid email or password',
        });
        return;
      }

      logger.error('Login error:', { error: error instanceof Error ? error.message : error, email: req.body.email });
      
      // Log system error during login
      await AuditService.logFailedAction(
        'USER_LOGIN',
        'authentication',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        req.body.email || 'unknown',
        req.ip || 'unknown',
        req.get('User-Agent')
      );
      
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);
      
      const result = await authService.refreshToken(validatedData.refreshToken);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }

      if (error instanceof Error && error.message === 'Invalid refresh token') {
        res.status(401).json({
          error: 'Invalid or expired refresh token',
        });
        return;
      }

      logger.error('Refresh token error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Log logout if user is authenticated
      if (req.user) {
        await AuditService.logLogout(
          req.user.id,
          req.user.email,
          req.ip || 'unknown',
          req.get('User-Agent')
        );
        
        securityLogger.info('User logout', {
          event: 'USER_LOGOUT',
          userId: req.user.id,
          userEmail: req.user.email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
      }
      
      // For JWT tokens, logout is handled client-side by removing the token
      // In a more complex setup, you might maintain a blacklist of tokens
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      const user = await authService.getUserById(req.user.id);
      
      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get user error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      const changePasswordSchema = z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
      });

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        res.status(404).json({
          error: 'User not found',
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await authService.comparePassword(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        res.status(400).json({
          error: 'Current password is incorrect',
        });
        return;
      }

      // Hash new password
      const hashedNewPassword = await authService.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedNewPassword },
      });

      // Log password change
      await AuditService.logUserAction(
        'PASSWORD_CHANGE',
        'user',
        req.user.id,
        req.user.email,
        req.ip || 'unknown',
        req.get('User-Agent'),
        req.user.id
      );
      
      securityLogger.info('User password changed', {
        event: 'PASSWORD_CHANGE',
        userId: req.user.id,
        userEmail: req.user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
        return;
      }

      logger.error('Change password error:', { error: error instanceof Error ? error.message : error, userId: req.user?.id });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}