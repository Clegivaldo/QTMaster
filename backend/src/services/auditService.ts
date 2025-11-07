import { PrismaClient } from '@prisma/client';
import { auditLogger, logAuditEvent } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface AuditEvent {
  action: string;
  resource: string;
  resourceId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  success: boolean;
  errorMessage?: string | null;
}

export class AuditService {
  static async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Log to structured audit log
      logAuditEvent(event.action, {
        resource: event.resource,
        resourceId: event.resourceId,
        userId: event.userId,
        userEmail: event.userEmail,
        ip: event.ip,
        userAgent: event.userAgent,
        oldValues: event.oldValues,
        newValues: event.newValues,
        metadata: event.metadata,
        success: event.success,
        errorMessage: event.errorMessage,
      });
      
      // Store in database for queryable audit trail
      await prisma.auditLog.create({
        data: {
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId || null,
          userId: event.userId || null,
          userEmail: event.userEmail || null,
          ip: event.ip || null,
          userAgent: event.userAgent || null,
          oldValues: event.oldValues ? JSON.stringify(event.oldValues) : null,
          newValues: event.newValues ? JSON.stringify(event.newValues) : null,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          success: event.success,
          errorMessage: event.errorMessage || null,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // If audit logging fails, log to application logger
      auditLogger.error('Failed to log audit event', {
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  static async logUserAction(
    action: string,
    resource: string,
    userId: string,
    userEmail: string,
    ip: string,
    userAgent?: string,
    resourceId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action,
      resource,
      resourceId: resourceId ?? null,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
  oldValues: oldValues ?? null,
  newValues: newValues ?? null,
  metadata: metadata ?? null,
      success: true,
    });
  }
  
  static async logFailedAction(
    action: string,
    resource: string,
    errorMessage: string,
    userId?: string,
    userEmail?: string,
    ip?: string,
    userAgent?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action,
      resource,
      resourceId: resourceId ?? null,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
  metadata: metadata ?? null,
      success: false,
      errorMessage,
    });
  }
  
  // Specific audit methods for common operations
  static async logLogin(userId: string, userEmail: string, ip: string, userAgent?: string, success: boolean = true, errorMessage?: string): Promise<void> {
    await this.logEvent({
      action: 'USER_LOGIN',
      resource: 'authentication',
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      success,
      errorMessage: errorMessage ?? null,
    });
  }
  
  static async logLogout(userId: string, userEmail: string, ip: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      action: 'USER_LOGOUT',
      resource: 'authentication',
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      success: true,
    });
  }
  
  static async logDataCreation(
    resource: string,
    resourceId: string,
    userId: string,
    userEmail: string,
    ip: string,
    newValues: Record<string, any>,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'CREATE',
      resource,
      resourceId: resourceId ?? null,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
  newValues: newValues ?? null,
      success: true,
    });
  }
  
  static async logDataUpdate(
    resource: string,
    resourceId: string,
    userId: string,
    userEmail: string,
    ip: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'UPDATE',
      resource,
      resourceId: resourceId ?? null,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
  oldValues: oldValues ?? null,
  newValues: newValues ?? null,
      success: true,
    });
  }
  
  static async logDataDeletion(
    resource: string,
    resourceId: string,
    userId: string,
    userEmail: string,
    ip: string,
    oldValues: Record<string, any>,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'DELETE',
      resource,
      resourceId: resourceId ?? null,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
  oldValues: oldValues ?? null,
      success: true,
    });
  }
  
  static async logFileUpload(
    fileName: string,
    fileSize: number,
    userId: string,
    userEmail: string,
    ip: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'FILE_UPLOAD',
      resource: 'file',
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: {
        fileName,
        fileSize,
      },
      success,
      errorMessage: errorMessage ?? null,
    });
  }
  
  static async logReportGeneration(
    reportId: string,
    templateId: string,
    userId: string,
    userEmail: string,
    ip: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'REPORT_GENERATION',
      resource: 'report',
      resourceId: reportId ?? null,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: {
        templateId,
      },
      success,
      errorMessage: errorMessage ?? null,
    });
  }
  
  static async logValidationApproval(
    validationId: string,
    approved: boolean,
    userId: string,
    userEmail: string,
    ip: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'VALIDATION_APPROVAL',
      resource: 'validation',
      resourceId: validationId ?? null,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: {
        approved,
      },
      success: true,
    });
  }
  
  // Query audit logs
  static async getAuditLogs(
    filters: {
      userId?: string;
      resource?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    } = {},
    page: number = 1,
    limit: number = 50
  ) {
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;
    if (filters.success !== undefined) where.success = filters.success;
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    return {
      logs: logs.map(log => ({
        ...log,
        oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
        newValues: log.newValues ? JSON.parse(log.newValues) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}