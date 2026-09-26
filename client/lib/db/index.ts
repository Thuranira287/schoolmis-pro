import { DB_STORES, DB_NAME, DB_VERSION } from './schema';
import type { School, User, Student, Teacher, Class, Subject, Mark, Attendance, Payment, AuditLog } from './schema';

/**
 * Database Manager
 * Handles all IndexedDB operations with proper error handling and transaction support
 *
 * NOTE: This is the raw IndexedDB backend. It must stay free of any dependency on
 * './adapter' — adapter.ts depends on this file (db/dbOps) to implement its
 * 'indexeddb' branch. If this file imports adapter.ts back, dbOps ends up calling
 * dbAdapter, which calls back into dbOps, which calls dbAdapter again — infinite
 * recursion. Anything platform-aware (choosing IndexedDB vs SQLite vs Postgres)
 * belongs in adapter.ts, not here.
 */
class DatabaseManager {
  private db: IDBDatabase | null = null;
  private initialized = false;

  /**
   * Initialize the database and create all stores
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Database initialization error:', request.error);
        reject(new Error(`Failed to initialize database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create all stores
        Object.entries(DB_STORES).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: config.keyPath,
            });

            // Create indexes
            config.indexes.forEach((index) => {
              store.createIndex(index.name, index.keyPath, {
                unique: (index as any).unique || false,
              });
            });

            console.log(`Created store: ${storeName}`);
          }
        });
      };
    });
  }

  /**
   * Get the database instance
   */
  private getDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Generic read operation
   */
  async read<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Generic write operation
   */
  async write<T>(storeName: string, data: T): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Generic delete operation
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Query by index
   */
  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get all records from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Paginated query
   */
  async getAllPaginated<T>(
    storeName: string,
    pageSize: number = 20,
    pageNumber: number = 1
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      // Get total count
      const countRequest = store.count();
      let total = 0;

      countRequest.onsuccess = () => {
        total = countRequest.result;

        // Get paginated data
        const offset = (pageNumber - 1) * pageSize;
        const dataRequest = store.getAll(undefined, pageSize);

        // Skip to offset
        let skipped = 0;
        const data: T[] = [];
        const openRequest = store.openCursor();

        openRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            if (skipped >= offset && data.length < pageSize) {
              data.push(cursor.value);
            }
            skipped++;
            cursor.continue();
          } else {
            resolve({ data, total, page: pageNumber, pageSize });
          }
        };

        openRequest.onerror = () => reject(openRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Batch write operation (multiple records)
   */
  async batchWrite<T>(storeName: string, items: T[]): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach((item) => {
        const request = store.put(item);
        request.onerror = () => reject(request.error);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Export all data for backup
   */
  async exportAll(): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};

    for (const storeName of Object.keys(DB_STORES)) {
      result[storeName] = await this.getAll(storeName);
    }

    return result;
  }

  /**
   * Import data from backup
   */
  async importAll(data: Record<string, any[]>): Promise<void> {
    const db = this.getDb();

    for (const [storeName, records] of Object.entries(data)) {
      if (DB_STORES[storeName as keyof typeof DB_STORES]) {
        await this.clear(storeName);
        await this.batchWrite(storeName, records);
      }
    }
  }
}

// Singleton instance of the raw IndexedDB backend.
const dbManager = new DatabaseManager();

export { dbManager as db };

// Convenience methods for common operations on the raw IndexedDB backend.
// adapter.ts imports this as `indexedDBOps` and uses it for the web/Capacitor
// path. App code should generally prefer importing dbAdapter (from './adapter')
// or the shared exports in './consolidated' instead of this file directly,
// since this file only ever talks to IndexedDB.
export const dbOps = {
  // School operations
  async getSchool(schoolId: string): Promise<School | undefined> {
    return dbManager.read('schools', schoolId);
  },

  async createSchool(school: School): Promise<void> {
    return dbManager.write('schools', school);
  },

  // User operations
  async getUser(userId: string): Promise<User | undefined> {
    return dbManager.read('users', userId);
  },

  async getUserByEmail(schoolId: string, email: string): Promise<User | undefined> {
    const users = await dbManager.queryByIndex<User>('users', 'email', [schoolId, email]);
    return users[0];
  },

  async getUsersByRole(schoolId: string, role: string): Promise<User[]> {
    return dbManager.queryByIndex('users', 'role', [schoolId, role]);
  },

  async getAll<T>(storeName: string): Promise<T[]> {
    return dbManager.getAll(storeName);
  },

  async write<T>(storeName: string, data: T): Promise<void> {
    return dbManager.write(storeName, data);
  },

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return dbManager.delete(storeName, key);
  },

  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    return dbManager.queryByIndex(storeName, indexName, query);
  },

  async createUser(user: User): Promise<void> {
    return dbManager.write('users', user);
  },

  async updateUser(user: User): Promise<void> {
    return dbManager.write('users', user);
  },

  // Student operations
  async getStudent(studentId: string): Promise<Student | undefined> {
    return dbManager.read('students', studentId);
  },

  async getStudentsByClass(classId: string): Promise<Student[]> {
    return dbManager.queryByIndex('students', 'classId', classId);
  },

  async createStudent(student: Student): Promise<void> {
    return dbManager.write('students', student);
  },

  async updateStudent(student: Student): Promise<void> {
    return dbManager.write('students', student);
  },

  // Class operations
  async getClass(classId: string): Promise<Class | undefined> {
    return dbManager.read('classes', classId);
  },

  async getClassesBySchool(schoolId: string): Promise<Class[]> {
    return dbManager.queryByIndex('classes', 'schoolId', schoolId);
  },

  async createClass(classData: Class): Promise<void> {
    return dbManager.write('classes', classData);
  },

  // Subject operations
  async getSubject(subjectId: string): Promise<Subject | undefined> {
    return dbManager.read('subjects', subjectId);
  },

  async getSubjectsBySchool(schoolId: string): Promise<Subject[]> {
    return dbManager.queryByIndex('subjects', 'schoolId', schoolId);
  },

  async createSubject(subject: Subject): Promise<void> {
    return dbManager.write('subjects', subject);
  },

  // Mark operations
  async getMark(markId: string): Promise<Mark | undefined> {
    return dbManager.read('marks', markId);
  },

  async getMarksByStudent(studentId: string): Promise<Mark[]> {
    return dbManager.queryByIndex('marks', 'studentId', studentId);
  },

  async createMark(mark: Mark): Promise<void> {
    return dbManager.write('marks', mark);
  },

  // Audit log operations
  async createAuditLog(log: AuditLog): Promise<void> {
    return dbManager.write('auditLogs', log);
  },

  async getAuditLogs(schoolId: string, limit: number = 100): Promise<AuditLog[]> {
    const logs = await dbManager.queryByIndex<AuditLog>('auditLogs', 'schoolId', schoolId);
    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },
};