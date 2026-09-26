// lib/db/postgres-manager.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, or, sql, desc, asc, like, ilike, between, gte, lte } from 'drizzle-orm';
import * as schema from './postgres-schema';
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
  Settings 
} from './postgres-schema';

export class PostgreSQLManager {
  private pool: Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private isConnected: boolean = false;

  constructor(private connectionString: string) {}

  async initialize(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      await this.pool.query('SELECT 1');
      
      this.db = drizzle(this.pool);
      this.isConnected = true;
      
      console.log('✅ PostgreSQL connected successfully');
      
      // Create tables if they don't exist
      await this.createTables();
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.pool) return;

    const tables = [
      // Schools
      `CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        admin_key TEXT NOT NULL UNIQUE,
        registration_number TEXT UNIQUE,
        logo TEXT,
        email TEXT,
        phone_number TEXT,
        address TEXT,
        country TEXT DEFAULT 'Kenya',
        county TEXT NOT NULL,
        city TEXT,
        currency TEXT DEFAULT 'KES',
        timezone TEXT DEFAULT 'Africa/Nairobi',
        academic_year_start TEXT,
        academic_year_end TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1
      )`,

      // Users
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password_hash TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL,
        tsc_number TEXT,
        specialization TEXT,
        qualification TEXT,
        phone_number TEXT,
        avatar TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1,
        UNIQUE(school_id, email)
      )`,

      // Students
      `CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        admission_number TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT,
        class_id TEXT NOT NULL,
        stream TEXT,
        subjects JSONB,
        pathway TEXT,
        parent_name TEXT,
        parent_email TEXT,
        parent_phone TEXT,
        admission_date TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1,
        UNIQUE(school_id, admission_number)
      )`,

      // Teachers
      `CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_number TEXT,
        department TEXT,
        tsc_number TEXT,
        specialization TEXT,
        qualification TEXT,
        is_active BOOLEAN DEFAULT true,
        subjects JSONB,
        classes JSONB,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1,
        UNIQUE(user_id)
      )`,

      // Classes
      `CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        level TEXT NOT NULL,
        stream TEXT,
        class_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        student_count INTEGER DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1
      )`,

      // Subjects
      `CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        class_level TEXT,
        max_marks INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1
      )`,

      // Marks
      `CREATE TABLE IF NOT EXISTS marks (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        marks_obtained REAL,
        grade TEXT,
        remarks TEXT,
        term INTEGER NOT NULL,
        year INTEGER NOT NULL,
        academic_year TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1
      )`,

      // Attendance
      `CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id TEXT,
        user_id TEXT,
        class_id TEXT,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        type TEXT,
        clock_in TEXT,
        clock_out TEXT,
        hours_worked REAL,
        teacher_name TEXT,
        time_in TEXT,
        time_out TEXT,
        remark TEXT,
        recorded_by TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1
      )`,

      // Payments
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        due_date TEXT NOT NULL,
        paid_date TEXT,
        term INTEGER NOT NULL,
        year INTEGER NOT NULL,
        description TEXT,
        payment_method TEXT,
        reference_number TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        synced_at BIGINT,
        sync_status TEXT DEFAULT 'synced',
        version INTEGER DEFAULT 1
      )`,

      // Audit Logs
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        changes JSONB,
        ip_address TEXT,
        timestamp BIGINT NOT NULL,
        details TEXT,
        ip TEXT,
        user_agent TEXT
      )`,

      // Report Cards
      `CREATE TABLE IF NOT EXISTS report_cards (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        term INTEGER NOT NULL,
        year INTEGER NOT NULL,
        marks JSONB,
        performance JSONB,
        generated_at BIGINT NOT NULL
      )`,

      // Settings
      `CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
        general JSONB,
        academic JSONB,
        financial JSONB,
        system JSONB,
        notifications JSONB,
        security JSONB,
        updated_at BIGINT NOT NULL
      )`,

      // Sync Events
      `CREATE TABLE IF NOT EXISTS sync_events (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        status TEXT NOT NULL,
        conflict_resolution TEXT,
        error_message TEXT,
        created_at BIGINT NOT NULL
      )`,

      // School Sync Status
      `CREATE TABLE IF NOT EXISTS school_sync_status (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
        last_sync_push BIGINT,
        last_sync_pull BIGINT,
        is_syncing BOOLEAN DEFAULT false,
        sync_status TEXT DEFAULT 'idle',
        last_error TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )`,
    ];

    for (const table of tables) {
      try {
        await this.pool.query(table);
      } catch (error) {
        console.warn('Table creation warning:', error);
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_marks_class_id ON marks(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)',
      'CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON audit_logs(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_report_cards_student_id ON report_cards(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_settings_school_id ON settings(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_events_school_id ON sync_events(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at)',
    ];

    for (const index of indexes) {
      try {
        await this.pool.query(index);
      } catch (error) {
        console.warn('Index creation warning:', error);
      }
    }

    console.log('✅ PostgreSQL tables created/verified');
  }

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================
  
  // Schools
  async getSchool(id: string): Promise<School | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.schools).where(eq(schema.schools.id, id));
    return result[0];
  }

  async createSchool(school: School): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.schools).values(school);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByEmail(schoolId: string, email: string): Promise<User | undefined> {
    if (!this.db) return;
    const result = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.schoolId, schoolId), eq(schema.users.email, email)));
    return result[0];
  }

  async getUsersByRole(schoolId: string, role: string): Promise<User[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.schoolId, schoolId), eq(schema.users.role, role)));
    return result;
  }

  async createUser(user: User): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.users).values(user);
  }

  async updateUser(user: User): Promise<void> {
    if (!this.db) return;
    await this.db.update(schema.users).set(user).where(eq(schema.users.id, user.id));
  }

  // Students
  async getStudent(id: string): Promise<Student | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.students).where(eq(schema.students.id, id));
    return result[0];
  }

  async getStudentsByClass(classId: string): Promise<Student[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.students)
      .where(eq(schema.students.classId, classId));
    return result;
  }

  async createStudent(student: Student): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.students).values(student);
  }

  async updateStudent(student: Student): Promise<void> {
    if (!this.db) return;
    await this.db.update(schema.students).set(student).where(eq(schema.students.id, student.id));
  }

  // Classes
  async getClass(id: string): Promise<Class | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.classes).where(eq(schema.classes.id, id));
    return result[0];
  }

  async getClassesBySchool(schoolId: string): Promise<Class[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.schoolId, schoolId));
    return result;
  }

  async createClass(classData: Class): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.classes).values(classData);
  }

  // Subjects
  async getSubject(id: string): Promise<Subject | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.subjects).where(eq(schema.subjects.id, id));
    return result[0];
  }

  async getSubjectsBySchool(schoolId: string): Promise<Subject[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.schoolId, schoolId));
    return result;
  }

  async createSubject(subject: Subject): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.subjects).values(subject);
  }

  // Settings
  async getSettings(schoolId: string): Promise<Settings | undefined> {
    if (!this.db) return;
    const result = await this.db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.schoolId, schoolId));
    return result[0];
  }

  async createSettings(settings: Settings): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.settings).values(settings);
  }

  async updateSettings(settings: Settings): Promise<void> {
    if (!this.db) return;
    await this.db
      .update(schema.settings)
      .set(settings)
      .where(eq(schema.settings.schoolId, settings.schoolId));
  }

  // Marks
  async getMark(id: string): Promise<Mark | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.marks).where(eq(schema.marks.id, id));
    return result[0];
  }

  async getMarksByStudent(studentId: string): Promise<Mark[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.marks)
      .where(eq(schema.marks.studentId, studentId));
    return result;
  }

  async createMark(mark: Mark): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.marks).values(mark);
  }

  // Attendance
  async getAttendance(id: string): Promise<Attendance | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.attendance).where(eq(schema.attendance.id, id));
    return result[0];
  }

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.studentId, studentId));
    return result;
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.date, date));
    return result;
  }

  async createAttendance(attendance: Attendance): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.attendance).values(attendance);
  }

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.payments).where(eq(schema.payments.id, id));
    return result[0];
  }

  async getPaymentsByStudent(studentId: string): Promise<Payment[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.studentId, studentId));
    return result;
  }

  async createPayment(payment: Payment): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.payments).values(payment);
  }

  // Audit Logs
  async createAuditLog(log: AuditLog): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.auditLogs).values(log);
  }

  async getAuditLogs(schoolId: string, limit: number = 100): Promise<AuditLog[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.schoolId, schoolId))
      .orderBy(sql`${schema.auditLogs.timestamp} DESC`)
      .limit(limit);
    return result;
  }

  // Report Cards
  async getReportCard(id: string): Promise<ReportCard | undefined> {
    if (!this.db) return;
    const result = await this.db.select().from(schema.reportCards).where(eq(schema.reportCards.id, id));
    return result[0];
  }

  async getReportCardsByStudent(studentId: string): Promise<ReportCard[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(schema.reportCards)
      .where(eq(schema.reportCards.studentId, studentId));
    return result;
  }

  async createReportCard(reportCard: ReportCard): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.reportCards).values(reportCard);
  }

  // ============================================================
  // GENERIC OPERATIONS
  // ============================================================
  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) return [];
    const tableMap: Record<string, any> = {
      schools: schema.schools,
      users: schema.users,
      students: schema.students,
      teachers: schema.teachers,
      classes: schema.classes,
      subjects: schema.subjects,
      marks: schema.marks,
      attendance: schema.attendance,
      payments: schema.payments,
      auditLogs: schema.auditLogs,
      reportCards: schema.reportCards,
      settings: schema.settings,
    };
    
    const table = tableMap[storeName];
    if (!table) return [];
    
    const result = await this.db.select().from(table);
    return result;
  }

  async write(storeName: string, data: any): Promise<void> {
    if (!this.db) return;
    const tableMap: Record<string, any> = {
      schools: schema.schools,
      users: schema.users,
      students: schema.students,
      teachers: schema.teachers,
      classes: schema.classes,
      subjects: schema.subjects,
      marks: schema.marks,
      attendance: schema.attendance,
      payments: schema.payments,
      auditLogs: schema.auditLogs,
      reportCards: schema.reportCards,
      settings: schema.settings,
    };
    
    const table = tableMap[storeName];
    if (!table) throw new Error(`Table ${storeName} not found`);
    
    // Check if record exists
    const existing = await this.db.select().from(table).where(eq(table.id, data.id));
    
    if (existing.length > 0) {
      await this.db.update(table).set(data).where(eq(table.id, data.id));
    } else {
      await this.db.insert(table).values(data);
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) return;
    const tableMap: Record<string, any> = {
      schools: schema.schools,
      users: schema.users,
      students: schema.students,
      teachers: schema.teachers,
      classes: schema.classes,
      subjects: schema.subjects,
      marks: schema.marks,
      attendance: schema.attendance,
      payments: schema.payments,
      auditLogs: schema.auditLogs,
      reportCards: schema.reportCards,
      settings: schema.settings,
    };
    
    const table = tableMap[storeName];
    if (!table) throw new Error(`Table ${storeName} not found`);
    
    await this.db.delete(table).where(eq(table.id, id));
  }

  async queryByIndex(storeName: string, indexName: string, query: any): Promise<any[]> {
    if (!this.db) return [];
    
    const columnMap: Record<string, Record<string, string>> = {
      schools: { adminKey: 'admin_key' },
      users: { schoolId: 'school_id', email: 'email', role: 'role' },
      students: { schoolId: 'school_id', classId: 'class_id', admissionNumber: 'admission_number' },
    };
    
    const tableMap: Record<string, any> = {
      schools: schema.schools,
      users: schema.users,
      students: schema.students,
      teachers: schema.teachers,
      classes: schema.classes,
      subjects: schema.subjects,
      marks: schema.marks,
      attendance: schema.attendance,
      payments: schema.payments,
      auditLogs: schema.auditLogs,
      reportCards: schema.reportCards,
      settings: schema.settings,
    };
    
    const table = tableMap[storeName];
    if (!table) return [];
    
    const column = columnMap[storeName]?.[indexName] || indexName;
    const result = await this.db
      .select()
      .from(table)
      .where(sql`${table[column]} = ${query}`);
    
    return result;
  }

  async exportAll(): Promise<Record<string, any[]>> {
    if (!this.db) return {};
    const stores = ['schools', 'users', 'students', 'teachers', 'classes', 'subjects', 'marks', 'attendance', 'payments', 'auditLogs', 'reportCards', 'settings'];
    const result: Record<string, any[]> = {};
    
    for (const store of stores) {
      result[store] = await this.getAll(store);
    }
    
    return result;
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    if (!this.db) return;
    for (const [store, records] of Object.entries(data)) {
      for (const record of records) {
        await this.write(store, record);
      }
    }
  }

  // ============================================================
  // SYNC OPERATIONS
  // ============================================================
  async getSyncStatus(schoolId: string): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select()
      .from(schema.schoolSyncStatus)
      .where(eq(schema.schoolSyncStatus.schoolId, schoolId));
    return result[0];
  }

  async updateSyncStatus(schoolId: string, status: any): Promise<void> {
    if (!this.db) return;
    const existing = await this.getSyncStatus(schoolId);
    if (existing) {
      await this.db
        .update(schema.schoolSyncStatus)
        .set({ ...status, updatedAt: Date.now() })
        .where(eq(schema.schoolSyncStatus.schoolId, schoolId));
    } else {
      await this.db
        .insert(schema.schoolSyncStatus)
        .values({ 
          id: `sync_${schoolId}`, 
          schoolId, 
          ...status, 
          createdAt: Date.now(), 
          updatedAt: Date.now() 
        });
    }
  }

  async createSyncEvent(event: any): Promise<void> {
    if (!this.db) return;
    await this.db.insert(schema.syncEvents).values(event);
  }

  async getPendingSync(schoolId: string): Promise<any[]> {
    if (!this.db) return [];
    const stores = ['schools', 'users', 'students', 'teachers', 'classes', 'subjects', 'marks', 'attendance', 'payments', 'settings'];
    const results: any[] = [];
    
    for (const store of stores) {
      const records = await this.queryByIndex(store, 'schoolId', schoolId);
      const pending = records.filter((r: any) => r.syncStatus === 'pending');
      results.push(...pending.map((r: any) => ({ ...r, _store: store })));
    }
    
    return results;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('PostgreSQL connection closed');
    }
  }
}