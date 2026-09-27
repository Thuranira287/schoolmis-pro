import { db as indexedDB, dbOps as indexedDBOps } from './index';
import type {
  School,
  User,
  Student,
  Teacher,
  Class,
  Subject,
  Mark,
  Attendance,
  Payment,
  AuditLog,
  ReportCard,
  Settings,
} from './schema';

type DatabaseType = 'indexeddb' | 'sqlite';

export class DatabaseAdapter {
  private dbType: DatabaseType = 'indexeddb';
  private sqliteManager: any = null;

  private detectDatabaseType(): DatabaseType {
    if (
      typeof window !== 'undefined' &&
      (window as any).electronAPI
    ) {
      return 'sqlite';
    }

    if (
      typeof process !== 'undefined' &&
      process.versions?.electron
    ) {
      return 'sqlite';
    }

    return 'indexeddb';
  }

  async initialize(): Promise<void> {
    this.dbType = this.detectDatabaseType();

    if (this.dbType === 'sqlite') {
      const { SQLiteManager } = await import('./sqlite-manager');
      this.sqliteManager = new SQLiteManager();
      await this.sqliteManager.initialize();
      return;
    }

    await indexedDB.initialize();
  }

  getDatabaseType(): DatabaseType {
    return this.dbType;
  }

  isInitialized(): boolean {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager !== null;
    }

    return true;
  }

  async getSchool(schoolId: string): Promise<School | undefined> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getSchool(schoolId);
    }

    return indexedDBOps.getSchool(schoolId);
  }

  async createSchool(school: School): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('schools', school);
    }

    return indexedDBOps.createSchool(school);
  }

  async getUser(userId: string): Promise<User | undefined> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getUser(userId);
    }

    return indexedDBOps.getUser(userId);
  }

  async getUserByEmail(
    schoolId: string,
    email: string
  ): Promise<User | undefined> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getUserByEmail(schoolId, email);
    }

    return indexedDBOps.getUserByEmail(schoolId, email);
  }

  async getUsersByRole(
    schoolId: string,
    role: string
  ): Promise<User[]> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.queryByIndex(
        'users',
        'role',
        [schoolId, role]
      );
    }

    return indexedDBOps.getUsersByRole(schoolId, role);
  }

  async createUser(user: User): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('users', user);
    }

    return indexedDBOps.createUser(user);
  }

  async updateUser(user: User): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('users', user);
    }

    return indexedDBOps.updateUser(user);
  }

  async deleteUser(userId: string): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.delete('users', userId);
    }

    return indexedDBOps.delete('users', userId);
  }

  async getStudent(
    studentId: string
  ): Promise<Student | undefined> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getStudent(studentId);
    }

    return indexedDBOps.getStudent(studentId);
  }

  async getStudentsByClass(
    classId: string
  ): Promise<Student[]> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.queryByIndex(
        'students',
        'classId',
        classId
      );
    }

    return indexedDBOps.getStudentsByClass(classId);
  }

  async createStudent(student: Student): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('students', student);
    }

    return indexedDBOps.createStudent(student);
  }

  async updateStudent(student: Student): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('students', student);
    }

    return indexedDBOps.updateStudent(student);
  }

  async deleteStudent(studentId: string): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.delete('students', studentId);
    }

    return indexedDBOps.delete('students', studentId);
  }

  async getClass(
    classId: string
  ): Promise<Class | undefined> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getClass(classId);
    }

    return indexedDBOps.getClass(classId);
  }

  async getClassesBySchool(
    schoolId: string
  ): Promise<Class[]> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.queryByIndex(
        'classes',
        'schoolId',
        schoolId
      );
    }

    return indexedDBOps.getClassesBySchool(schoolId);
  }

  async createClass(classData: Class): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('classes', classData);
    }

    return indexedDBOps.createClass(classData);
  }

  async deleteClass(classId: string): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.delete('classes', classId);
    }

    return indexedDBOps.delete('classes', classId);
  }

  async getSubject(
    subjectId: string
  ): Promise<Subject | undefined> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getSubject(subjectId);
    }

    return indexedDBOps.getSubject(subjectId);
  }

  async getSubjectsBySchool(
    schoolId: string
  ): Promise<Subject[]> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.queryByIndex(
        'subjects',
        'schoolId',
        schoolId
      );
    }

    return indexedDBOps.getSubjectsBySchool(schoolId);
  }

  async createSubject(subject: Subject): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('subjects', subject);
    }

    return indexedDBOps.createSubject(subject);
  }

  async deleteSubject(subjectId: string): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.delete('subjects', subjectId);
    }

    return indexedDBOps.delete('subjects', subjectId);
  }

  async getMark(
    markId: string
  ): Promise<Mark | undefined> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getMark(markId);
    }

    return indexedDBOps.getMark(markId);
  }

  async getMarksByStudent(
    studentId: string
  ): Promise<Mark[]> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.queryByIndex(
        'marks',
        'studentId',
        studentId
      );
    }

    return indexedDBOps.getMarksByStudent(studentId);
  }

  async createMark(mark: Mark): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('marks', mark);
    }

    return indexedDBOps.createMark(mark);
  }

  async deleteMark(markId: string): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.delete('marks', markId);
    }

    return indexedDBOps.delete('marks', markId);
  }

  async createAuditLog(log: AuditLog): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write('auditLogs', log);
    }

    return indexedDBOps.createAuditLog(log);
  }

  async getAuditLogs(
    schoolId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    if (this.dbType === 'sqlite') {
      const logs = await this.sqliteManager.queryByIndex(
        'auditLogs',
        'schoolId',
        schoolId
      );

      return logs
        .sort((a: AuditLog, b: AuditLog) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }

    return indexedDBOps.getAuditLogs(schoolId, limit);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.getAll(storeName);
    }

    return indexedDBOps.getAll<T>(storeName);
  }

  async write<T>(
    storeName: string,
    data: T
  ): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.write(storeName, data);
    }

    return indexedDBOps.write(storeName, data);
  }

  async delete(
    storeName: string,
    key: IDBValidKey
  ): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.delete(storeName, key);
    }

    return indexedDBOps.delete(storeName, key);
  }

  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.queryByIndex(
        storeName,
        indexName,
        query
      );
    }

    return indexedDBOps.queryByIndex<T>(
      storeName,
      indexName,
      query
    );
  }

  async clear(storeName: string): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.clear(storeName);
    }

    return indexedDB.clear(storeName);
  }

  async batchWrite<T>(
    storeName: string,
    items: T[]
  ): Promise<void> {
    if (this.dbType === 'sqlite') {
      for (const item of items) {
        await this.sqliteManager.write(storeName, item);
      }
      return;
    }

    return indexedDB.batchWrite(storeName, items);
  }

  async exportAll(): Promise<Record<string, any[]>> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.exportAll();
    }

    return indexedDB.exportAll();
  }

  async importAll(
    data: Record<string, any[]>
  ): Promise<void> {
    if (this.dbType === 'sqlite') {
      return this.sqliteManager.importAll(data);
    }

    return indexedDB.importAll(data);
  }

  async syncWithCloud(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      if (typeof this.sqliteManager.close === 'function') {
        await this.sqliteManager.close();
      }

      this.sqliteManager = null;
    }
  }
}

export const dbAdapter = new DatabaseAdapter();