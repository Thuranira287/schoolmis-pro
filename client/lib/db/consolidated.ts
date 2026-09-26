/**
 * Database Export Consolidation
 * 
 * This file exports the appropriate database instance based on the environment.
 * Components should import from here instead of directly importing db or dbAdapter.
 */

import { dbAdapter } from './adapter';

// Export adapter as db for backward compatibility
export { dbAdapter as db };

// Also export the adapter directly
export { dbAdapter };

// Export individual operation shortcuts
export async function getSchool(schoolId: string) {
  return dbAdapter.getSchool(schoolId);
}

export async function getUser(userId: string) {
  return dbAdapter.getUser(userId);
}

export async function getStudent(studentId: string) {
  return dbAdapter.getStudent(studentId);
}

export async function getClass(classId: string) {
  return dbAdapter.getClass(classId);
}

export async function getSubject(subjectId: string) {
  return dbAdapter.getSubject(subjectId);
}

export async function getMark(markId: string) {
  return dbAdapter.getMark(markId);
}

// Export all operations
export const dbOps = dbAdapter;
