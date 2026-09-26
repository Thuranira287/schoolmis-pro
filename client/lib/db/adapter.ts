// lib/db/adapter.ts
import { db as indexedDB, dbOps as indexedDBOps } from './index';
import { PostgreSQLManager } from './postgres-manager';
import type { 
  School, 
  User, 
  Student, 
  Settings, 
  Class, 
  Subject, 
  Mark,  
  AuditLog 
} from './schema';
//Database Adapter

type DatabaseType = 'indexeddb' | 'sqlite' | 'postgresql';

function createDefaultSettings(schoolId: string): Settings {
  const currentYear = new Date().getFullYear();
  
  return {
    id: `settings_${schoolId}`,
    schoolId,
    general: {
      schoolName: '',
      schoolAddress: '',
      schoolPhone: '',
      schoolEmail: '',
      principalName: '',
      registrationNumber: '',
      motto: '',
      logo: '',
    },
    academic: {
      currentTerm: `Term 1, ${currentYear}`,
      academicYear: String(currentYear),
      termStart: '',
      termEnd: '',
      gradingSystem: 'cbc',
      assessmentTypes: ['Formative 1', 'Formative 2', 'Summative', 'End of Term'],
    },
    financial: {
      currency: 'KES',
      feeStructure: [],
      paymentMethods: ['Cash', 'M-Pesa', 'Bank', 'Cheque'],
      lateFeePercentage: 10,
      defaultFeeAmount: 15000,
    },
    system: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      requireStrongPassword: true,
      enableTwoFactor: false,
      enableAuditLog: true,
      enableAutoBackup: true,
      backupFrequency: 'daily',
      maintenanceMode: false,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      feeReminders: true,
      attendanceAlerts: true,
      gradeAlerts: false,
      systemAlerts: true,
    },
    security: {
      allowPasswordChange: true,
      sessionTimeout: 30,
      ipWhitelist: [],
      allowedDomains: [],
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      },
    },
    updatedAt: Date.now(),
  };
}

class DatabaseAdapter {
  private dbType: DatabaseType = 'indexeddb';
  private sqliteManager: any = null;
  private postgresManager: PostgreSQLManager | null = null;

  async initialize(): Promise<void> {
    this.dbType = this.detectDatabaseType();
    console.log(`Initializing database adapter for: ${this.dbType}`);

    switch (this.dbType) {
      case 'postgresql':
        // Initialize PostgreSQL
        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        if (!connectionString) {
          throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required for PostgreSQL');
        }
        this.postgresManager = new PostgreSQLManager(connectionString);
        await this.postgresManager.initialize();
        break;
      case 'sqlite':
        // Lazy load SQLite manager only in Electron
        const { SQLiteManager } = await import('./sqlite-manager');
        this.sqliteManager = new SQLiteManager();
        await this.sqliteManager.initialize();
        break;

      case 'indexeddb':
      default:
        await indexedDB.initialize();
        break;
    }
  }

  /**
   * Detect which database to use based on environment
   */
  private detectDatabaseType(): DatabaseType {
    // Check if running in Electron
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      return 'postgresql';
    }
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return 'sqlite';
    }

    // Check if running in Node/Electron main process
    if (typeof process !== 'undefined' && process.versions?.electron) {
      return 'sqlite';
    }

    // Default to IndexedDB for web
    return 'indexeddb';
  }

  async getSchool(schoolId: string): Promise<School | undefined> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getSchool(schoolId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getSchool(schoolId);
    }
    return indexedDBOps.getSchool(schoolId);
  }

  async createSchool(school: School): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createSchool(school);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.createSchool(school);
    }
    return indexedDBOps.createSchool(school);
  }

  async getUser(userId: string): Promise<User | undefined> {
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getUser(userId);
    }
    return indexedDBOps.getUser(userId);
  }

  async getUserByEmail(schoolId: string, email: string): Promise<User | undefined> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getUserByEmail(schoolId, email);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getUserByEmail(schoolId, email);
    }
    return indexedDBOps.getUserByEmail(schoolId, email);
  }

  async getUsersByRole(schoolId: string, role: string): Promise<User[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getUsersByRole(schoolId, role);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getUsersByRole(schoolId, role);
    }
    return indexedDBOps.getUsersByRole(schoolId, role);
  }

  async createUser(user: User): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createUser(user);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.createUser(user);
    }
    return indexedDBOps.createUser(user);
  }

  async updateUser(user: User): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.updateUser(user);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.updateUser(user);
    }
    return indexedDBOps.updateUser(user);
  }

  async getStudent(studentId: string): Promise<Student | undefined> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getStudent(studentId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getStudent(studentId);
    }
    return indexedDBOps.getStudent(studentId);
  }

  async getStudentsByClass(classId: string): Promise<Student[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getStudentsByClass(classId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getStudentsByClass(classId);
    }
    return indexedDBOps.getStudentsByClass(classId);
  }

  async createStudent(student: Student): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createStudent(student);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.createStudent(student);
    }
    return indexedDBOps.createStudent(student);
  }

  async updateStudent(student: Student): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.updateStudent(student);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.updateStudent(student);
    }
    return indexedDBOps.updateStudent(student);
  }

  async getClass(classId: string): Promise<Class | undefined> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getClass(classId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getClass(classId);
    }
    return indexedDBOps.getClass(classId);
  }

  async getClassesBySchool(schoolId: string): Promise<Class[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getClassesBySchool(schoolId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getClassesBySchool(schoolId);
    }
    return indexedDBOps.getClassesBySchool(schoolId);
  }

  async createClass(classData: Class): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createClass(classData);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.createClass(classData);
    }
    return indexedDBOps.createClass(classData);
  }

  async getSubject(subjectId: string): Promise<Subject | undefined> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getSubject(subjectId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getSubject(subjectId);
    }
    return indexedDBOps.getSubject(subjectId);
  }

  async getSubjectsBySchool(schoolId: string): Promise<Subject[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getSubjectsBySchool(schoolId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getSubjectsBySchool(schoolId);
    }
    return indexedDBOps.getSubjectsBySchool(schoolId);
  }

  async createSubject(subject: Subject): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createSubject(subject);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.createSubject(subject);
    }
    return indexedDBOps.createSubject(subject);
  }

  async getSettings(schoolId: string): Promise<Settings | undefined> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getSettings(schoolId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getSettings(schoolId);
    }
    // IndexedDB fallback
    const allSettings = await this.getAll('settings') as Settings[];
    const found = allSettings.find((s) => s.schoolId === schoolId);
    
    if (found) {
      return found;
    }
    
    // If no settings found, create default settings for this school
    const defaultSettings = createDefaultSettings(schoolId);
    await this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  async saveSettings(settings: Settings): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createSettings(settings);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      if (this.sqliteManager.createSettings) {
        return this.sqliteManager.createSettings(settings);
      }
      return this.sqliteManager.write('settings', settings);
    }
    return this.write('settings', settings);
  }

  async getMark(markId: string): Promise<Mark | undefined> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getMark(markId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getMark(markId);
    }
    return indexedDBOps.getMark(markId);
  }

  async getMarksByStudent(studentId: string): Promise<Mark[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getMarksByStudent(studentId);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getMarksByStudent(studentId);
    }
    return indexedDBOps.getMarksByStudent(studentId);
  }

  async createMark(mark: Mark): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createMark(mark);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.createMark(mark);
    }
    return indexedDBOps.createMark(mark);
  }

  async createAuditLog(log: AuditLog): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.createAuditLog(log);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.createAuditLog(log);
    }
    return indexedDBOps.createAuditLog(log);
  }

  async getAuditLogs(schoolId: string, limit?: number): Promise<AuditLog[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getAuditLogs(schoolId, limit);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getAuditLogs(schoolId, limit);
    }
    return indexedDBOps.getAuditLogs(schoolId, limit);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.getAll(storeName);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.getAll(storeName);
    }
    return indexedDBOps.getAll(storeName);
  }

  async write<T>(storeName: string, data: T): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.write(storeName, data);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.write(storeName, data);
    }
    return indexedDBOps.write(storeName, data);
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.delete(storeName, key);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.delete(storeName, key);
    }
    return indexedDBOps.delete(storeName, key);
  }

  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.queryByIndex(storeName, indexName, query);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.queryByIndex(storeName, indexName, query);
    }
    return indexedDBOps.queryByIndex(storeName, indexName, query);
  }

  async exportAll(): Promise<Record<string, any[]>> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.exportAll();
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.exportAll();
    }
    return indexedDB.exportAll();
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    if (this.dbType === 'postgresql' && this.postgresManager) {
      return this.postgresManager.importAll(data);
    }
    if (this.dbType === 'sqlite' && this.sqliteManager) {
      return this.sqliteManager.importAll(data);
    }
    return indexedDB.importAll(data);
  }

  /**
   * Sync between local database and PostgreSQL cloud (future feature)
   */
  async syncWithCloud(direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional'): Promise<void> {
    console.log(`Cloud sync (${direction}) - implementation pending`);
    // TODO: Implement cloud sync logic with PostgreSQL
    // - Push: Send local changes to cloud
    // - Pull: Fetch latest from cloud
    // - Bidirectional: Conflict resolution and two-way sync
  }

  /**
   * Get database type for debugging
   */
  getDatabaseType(): DatabaseType {
    return this.dbType;
  }
}

// Export singleton instance
export const dbAdapter = new DatabaseAdapter();