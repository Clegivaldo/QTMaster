import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.js';
import { AuditService } from '../services/auditService.js';
import { securityLogger } from '../utils/logger.js';

/**
 * Sistema de permissões granulares
 */
export enum Permission {
  // User management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Client management
  CLIENT_READ = 'client:read',
  CLIENT_CREATE = 'client:create',
  CLIENT_UPDATE = 'client:update',
  CLIENT_DELETE = 'client:delete',
  
  // Template management
  TEMPLATE_READ = 'template:read',
  TEMPLATE_CREATE = 'template:create',
  TEMPLATE_UPDATE = 'template:update',
  TEMPLATE_DELETE = 'template:delete',
  
  // Report management
  REPORT_READ = 'report:read',
  REPORT_CREATE = 'report:create',
  REPORT_UPDATE = 'report:update',
  REPORT_DELETE = 'report:delete',
  REPORT_EXPORT = 'report:export',
  REPORT_APPROVE = 'report:approve',
  
  // Validation management
  VALIDATION_READ = 'validation:read',
  VALIDATION_CREATE = 'validation:create',
  VALIDATION_UPDATE = 'validation:update',
  VALIDATION_DELETE = 'validation:delete',
  VALIDATION_APPROVE = 'validation:approve',
  
  // Sensor management
  SENSOR_READ = 'sensor:read',
  SENSOR_CREATE = 'sensor:create',
  SENSOR_UPDATE = 'sensor:update',
  SENSOR_DELETE = 'sensor:delete',
  
  // Data import
  DATA_IMPORT = 'data:import',
  DATA_EXPORT = 'data:export',
  
  // System configuration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_AUDIT = 'system:audit',
}

/**
 * Mapeamento de roles para permissões
 */
const rolePermissions: Record<string, Permission[]> = {
  ADMIN: Object.values(Permission), // Admin tem todas as permissões
  
  USER: [
    // Leitura geral
    Permission.CLIENT_READ,
    Permission.TEMPLATE_READ,
    Permission.REPORT_READ,
    Permission.VALIDATION_READ,
    Permission.SENSOR_READ,
    
    // Criação básica
    Permission.REPORT_CREATE,
    Permission.VALIDATION_CREATE,
    
    // Exportação
    Permission.REPORT_EXPORT,
    Permission.DATA_EXPORT,
  ],
};

/**
 * Obtém as permissões de um usuário baseado em sua role
 */
export function getUserPermissions(role: string): Permission[] {
  return rolePermissions[role] ?? rolePermissions.USER ?? [];
}

/**
 * Verifica se um usuário tem uma permissão específica
 */
export function hasPermission(userRole: string, permission: Permission): boolean {
  const permissions = getUserPermissions(userRole);
  return permissions.includes(permission);
}

/**
 * Verifica se um usuário tem pelo menos uma das permissões especificadas
 */
export function hasAnyPermission(userRole: string, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Verifica se um usuário tem todas as permissões especificadas
 */
export function hasAllPermissions(userRole: string, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Middleware para verificar permissões
 * @param permissions - Uma ou mais permissões requeridas (OR logic)
 * @param requireAll - Se true, requer todas as permissões (AND logic)
 */
export function requirePermission(...permissions: Permission[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Verificar autenticação
      if (!req.user) {
        securityLogger.warn('Authorization failed - not authenticated', {
          event: 'AUTHZ_NOT_AUTHENTICATED',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method,
        });
        
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      // Verificar permissões
      const hasRequiredPermission = hasAnyPermission(req.user.role, permissions);

      if (!hasRequiredPermission) {
        // Log de tentativa de acesso não autorizado
        await AuditService.logFailedAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.originalUrl,
          'Insufficient permissions',
          req.user.id,
          req.user.email,
          req.ip,
          req.get('User-Agent'),
          undefined,
          {
            method: req.method,
            requiredPermissions: permissions,
            userPermissions: getUserPermissions(req.user.role),
          }
        );

        securityLogger.warn('Authorization failed - insufficient permissions', {
          event: 'AUTHZ_INSUFFICIENT_PERMISSIONS',
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          requiredPermissions: permissions,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method,
        });

        res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
        });
        return;
      }

      next();
    } catch (error) {
      securityLogger.error('Authorization middleware error', {
        event: 'AUTHZ_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method,
      });

      res.status(500).json({
        error: 'Authorization error',
      });
    }
  };
}

/**
 * Middleware para verificar múltiplas permissões (AND logic)
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      const hasAllRequired = hasAllPermissions(req.user.role, permissions);

      if (!hasAllRequired) {
        await AuditService.logFailedAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.originalUrl,
          'Insufficient permissions (requires all)',
          req.user.id,
          req.user.email,
          req.ip,
          req.get('User-Agent'),
          undefined,
          {
            method: req.method,
            requiredPermissions: permissions,
            userPermissions: getUserPermissions(req.user.role),
          }
        );

        securityLogger.warn('Authorization failed - missing required permissions', {
          event: 'AUTHZ_MISSING_PERMISSIONS',
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          requiredPermissions: permissions,
          ip: req.ip,
          url: req.originalUrl,
          method: req.method,
        });

        res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
        });
        return;
      }

      next();
    } catch (error) {
      securityLogger.error('Authorization middleware error', {
        event: 'AUTHZ_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Authorization error',
      });
    }
  };
}

/**
 * Middleware para verificar ownership (usuário pode acessar apenas seus próprios recursos)
 * @param resourceIdParam - Nome do parâmetro que contém o ID do recurso
 * @param getUserIdFromResource - Função para obter o userId do recurso
 */
export function requireOwnership(
  resourceIdParam: string,
  getUserIdFromResource: (resourceId: string) => Promise<string | null>
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      // Admin sempre tem acesso
      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        res.status(400).json({
          error: 'Resource ID required',
        });
        return;
      }

      const resourceUserId = await getUserIdFromResource(resourceId);

      if (resourceUserId !== req.user.id) {
        await AuditService.logFailedAction(
          'UNAUTHORIZED_OWNERSHIP_ACCESS',
          `${req.originalUrl}`,
          'User does not own this resource',
          req.user.id,
          req.user.email,
          req.ip,
          req.get('User-Agent'),
          resourceId,
          {
            method: req.method,
            resourceId,
            resourceUserId,
          }
        );

        securityLogger.warn('Authorization failed - not resource owner', {
          event: 'AUTHZ_NOT_OWNER',
          userId: req.user.id,
          resourceId,
          resourceUserId,
          url: req.originalUrl,
          method: req.method,
        });

        res.status(403).json({
          error: 'Access denied - not resource owner',
        });
        return;
      }

      next();
    } catch (error) {
      securityLogger.error('Ownership check error', {
        event: 'AUTHZ_OWNERSHIP_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Authorization error',
      });
    }
  };
}
