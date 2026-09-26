// lib/audit/auditService.ts
import { dbOps } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { AuditLog } from '@/lib/db/schema';


export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'print';

export interface AuditLogData {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: string;
  changes?: Record<string, any>;
}

class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      const schoolId = auth.getCurrentSchoolId();
      const userId = auth.getCurrentUserId();

      if (!schoolId) {
        console.warn('Cannot create audit log: No school ID found');
        return;
      }

      const auditLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        schoolId,
        userId: userId || 'system',
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details,
        changes: data.changes,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: Date.now(),
      };

      await dbOps.createAuditLog(auditLog);
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

//Get audit logs for a school, newest first.

  async getLogs(schoolId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      return await dbOps.getAuditLogs(schoolId, limit);
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return [];
    }
  }


  async getLogsByUser(schoolId: string, userId: string): Promise<AuditLog[]> {
    try {
      const allLogs = await dbOps.getAll<AuditLog>('auditLogs');
      return allLogs
        .filter((l) => l.schoolId === schoolId && l.userId === userId)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      return [];
    }
  }

  async getLogsByEntity(schoolId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
    try {
      const allLogs = await dbOps.getAll<AuditLog>('auditLogs');
      return allLogs
        .filter((l) => l.schoolId === schoolId && l.entityType === entityType && l.entityId === entityId)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (error) {
      console.error('Failed to get entity audit logs:', error);
      return [];
    }
  }
}

export const auditService = new AuditService();


export function logLogin(userId: string): Promise<void> {
  return auditService.log({
    action: 'login',
    entityType: 'user',
    entityId: userId,
    details: 'User logged in',
  });
}

export function logLogout(userId: string): Promise<void> {
  return auditService.log({
    action: 'logout',
    entityType: 'user',
    entityId: userId,
    details: 'User logged out',
  });
}

export function logCreate(entityType: string, entityId: string, details?: string): Promise<void> {
  return auditService.log({
    action: 'create',
    entityType,
    entityId,
    details: details || `${entityType} created`,
  });
}

export function logUpdate(
  entityType: string,
  entityId: string,
  details?: string,
  changes?: Record<string, any>
): Promise<void> {
  return auditService.log({
    action: 'update',
    entityType,
    entityId,
    details: details || `${entityType} updated`,
    changes,
  });
}

export function logDelete(entityType: string, entityId: string, details?: string): Promise<void> {
  return auditService.log({
    action: 'delete',
    entityType,
    entityId,
    details: details || `${entityType} deleted`,
  });
}

export function logExport(entityType: string, details?: string): Promise<void> {
  return auditService.log({
    action: 'export',
    entityType,
    details: details || `${entityType} exported`,
  });
}

export function logPrint(entityType: string, details?: string): Promise<void> {
  return auditService.log({
    action: 'print',
    entityType,
    details: details || `${entityType} printed`,
  });
}