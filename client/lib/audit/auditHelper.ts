// lib/audit/auditHelper.ts
import { dbOps } from '@/lib/db';
import { auth } from '@/lib/auth';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'print';

export interface AuditLogData {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: string;
  changes?: Record<string, any>;
}

//Create an audit log entry

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const schoolId = auth.getCurrentSchoolId();
    const userId = auth.getCurrentUserId();

    if (!schoolId) {
      console.warn('Cannot create audit log: No school ID found');
      return;
    }

    const auditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      schoolId,
      userId: userId || 'system',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || '',
      details: data.details || '',
      changes: data.changes || {},
      timestamp: Date.now(),
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent,
    };

    await dbOps.createAuditLog(auditLog);
    console.log('Audit log created:', auditLog);
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

//Get client IP address
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

//Convenience functions for common audit actions

export async function logLogin(userId: string): Promise<void> {
  await createAuditLog({
    action: 'login',
    entityType: 'user',
    entityId: userId,
    details: 'User logged in',
  });
}

export async function logLogout(userId: string): Promise<void> {
  await createAuditLog({
    action: 'logout',
    entityType: 'user',
    entityId: userId,
    details: 'User logged out',
  });
}

export async function logCreate(entityType: string, entityId: string, details?: string): Promise<void> {
  await createAuditLog({
    action: 'create',
    entityType,
    entityId,
    details: details || `${entityType} created`,
  });
}

export async function logUpdate(entityType: string, entityId: string, details?: string, changes?: Record<string, any>): Promise<void> {
  await createAuditLog({
    action: 'update',
    entityType,
    entityId,
    details: details || `${entityType} updated`,
    changes,
  });
}

export async function logDelete(entityType: string, entityId: string, details?: string): Promise<void> {
  await createAuditLog({
    action: 'delete',
    entityType,
    entityId,
    details: details || `${entityType} deleted`,
  });
}

export async function logExport(entityType: string, details?: string): Promise<void> {
  await createAuditLog({
    action: 'export',
    entityType,
    details: details || `${entityType} exported`,
  });
}

export async function logPrint(entityType: string, details?: string): Promise<void> {
  await createAuditLog({
    action: 'print',
    entityType,
    details: details || `${entityType} printed`,
  });
}