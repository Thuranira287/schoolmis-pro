// lib/audit/index.ts
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

//Audit log entry

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const schoolId = auth.getCurrentSchoolId();
    const userId = auth.getCurrentUserId();

    if (!schoolId) {
      console.warn('Cannot create audit log: No school ID found');
      return;
    }

    const auditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      schoolId,
      userId: userId || 'system',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || '',
      details: data.details || '',
      changes: data.changes || {},
      timestamp: Date.now(),
    };

    await dbOps.write('auditLogs', auditLog);
    console.log('Audit log created:', auditLog);
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Convenience functions
export const audit = {
  log: createAuditLog,
  create: (entityType: string, entityId: string, details?: string) =>
    createAuditLog({ action: 'create', entityType, entityId, details }),
  update: (entityType: string, entityId: string, details?: string, changes?: Record<string, any>) =>
    createAuditLog({ action: 'update', entityType, entityId, details, changes }),
  delete: (entityType: string, entityId: string, details?: string) =>
    createAuditLog({ action: 'delete', entityType, entityId, details }),
  login: (userId: string) =>
    createAuditLog({ action: 'login', entityType: 'user', entityId: userId, details: 'User logged in' }),
  logout: (userId: string) =>
    createAuditLog({ action: 'logout', entityType: 'user', entityId: userId, details: 'User logged out' }),
  export: (entityType: string, details?: string) =>
    createAuditLog({ action: 'export', entityType, details }),
  print: (entityType: string, details?: string) =>
    createAuditLog({ action: 'print', entityType, details }),
};