import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './sqlite';
import { and, eq, isNull } from 'drizzle-orm';
import path from 'path';
import { app } from 'electron';
import type { School, User, Student, Teacher, Class, Subject, Mark, Attendance, Settings, Payment, AuditLog, ReportCard } from './schema';

/**
 * SQLite Manager for Electron
 * Uses better-sqlite3 + Drizzle ORM for local database operations
 * Provides same interface as IndexedDB operations but with SQL backend
 *
 * IMPORTANT: better-sqlite3 returns raw rows keyed by the literal SQL column
 * name (snake_case). Casting a row directly `as User` etc. does NOT convert
 * it to camelCase - it's a compile-time-only assertion that lies about the
 * runtime shape. Every read in this file goes through mapRow()/mapRows() (or
 * an entity-specific mapper where columns don't line up 1:1 with the
 * interface) to actually produce the camelCase shape the rest of the app
 * expects.
 *
 * NOTE ON EXISTING DB FILES: these CREATE TABLE statements use
 * IF NOT EXISTS, so any new columns added here will NOT appear on a
 * school-mis.db file that was already created by an older version of this
 * file. Delete the dev DB (or write a migration) after pulling this change.
 */

export class SQLiteManager {
  private db: Database.Database | null = null;
  private drizzle: ReturnType<typeof drizzle> | null = null;
  private dbPath: string;

  constructor() {
    // Store database in user's app data folder
    const dataPath = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'data')
      : path.join((app && app.getPath) ? app.getPath('userData') : process.cwd(), 'data');

    this.dbPath = path.join(dataPath, 'school-mis.db');
  }

  /**
   * Initialize SQLite database
   */
  async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      this.drizzle = drizzle(this.db, { schema });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Create tables if they don't exist
      this.createTables();

      console.log(`SQLite database initialized at: ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  /**
   * Create tables if they don't exist
   */
  private createTables(): void {
    if (!this.db) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        admin_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        registration_number TEXT UNIQUE,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        county TEXT,
        country TEXT,
        logo TEXT,
        currency TEXT DEFAULT 'KES',
        timezone TEXT DEFAULT 'Africa/Nairobi',
        academic_year_start INTEGER,
        academic_year_end INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        email TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL,
        password_hash TEXT,
        avatar TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(email, school_id)
      )`,

      `CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        admission_number TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT,
        class_id TEXT NOT NULL,
        stream TEXT,
        subjects TEXT,
        parent_email TEXT,
        parent_phone TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(admission_number, school_id)
      )`,

      `CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        department TEXT,
        subjects TEXT,
        classes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(user_id)
      )`,

      `CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        level TEXT NOT NULL,
        form INTEGER,
        class_teacher_id TEXT NOT NULL,
        student_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        level TEXT NOT NULL,
        max_marks INTEGER NOT NULL DEFAULT 100,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS marks (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        marks REAL,
        marks_obtained REAL,
        grade TEXT,
        term INTEGER,
        academic_year INTEGER,
        year INTEGER,
        remarks TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        attendance_date TEXT NOT NULL,
        status TEXT NOT NULL,
        remarks TEXT,
        recorded_by TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT,
        description TEXT,
        due_date TEXT,
        paid_date TEXT,
        status TEXT NOT NULL,
        payment_method TEXT,
        reference TEXT,
        term INTEGER,
        year INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        changes TEXT,
        ip_address TEXT,
        timestamp INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS report_cards (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        term INTEGER NOT NULL,
        year INTEGER NOT NULL,
        marks TEXT,
        performance TEXT,
        generated_at INTEGER NOT NULL
      )`,

       `CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL UNIQUE,
        general TEXT,
        academic TEXT,
        financial TEXT,
        system TEXT,
        notifications TEXT,
        security TEXT,
        updated_at INTEGER NOT NULL
      )`,
    ];

    tables.forEach((sql) => {
      this.db?.exec(sql);
    });

    // Create indexes for common queries
    this.createIndexes();
  }

  /**
   * Create indexes for performance
   */
  private createIndexes(): void {
    if (!this.db) return;

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_marks_class_id ON marks(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date)',
      'CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON audit_logs(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_report_cards_school_id ON report_cards(school_id)',
      'CREATE INDEX IF NOT EXISTS idx_report_cards_student_id ON report_cards(student_id)',
    ];

    indexes.forEach((sql) => {
      this.db?.exec(sql);
    });
  }

  /**
   * School operations
   */
  async getSchool(schoolId: string): Promise<School | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM schools WHERE id = ?`)
      .get(schoolId) as Record<string, any> | undefined;
    return this.mapRow<School>(row);
  }

  async getSchoolByAdminKey(adminKey: string): Promise<School | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM schools WHERE admin_key = ?`)
      .get(adminKey) as Record<string, any> | undefined;
    return this.mapRow<School>(row);
  }

  async createSchool(school: School): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO schools (id, admin_key, name, registration_number, email, phone, address, city, county, country, logo, currency, timezone, academic_year_start, academic_year_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      school.id,
      school.adminKey,
      school.name,
      school.registrationNumber,
      school.email,
      school.phoneNumber,
      school.address,
      school.city,
      school.county,
      school.country,
      school.logo,
      school.currency,
      school.timezone,
      school.academicYearStart,
      school.academicYearEnd,
      school.createdAt,
      school.updatedAt
    );
  }

  /**
   * User operations
   */
  async getUser(userId: string): Promise<User | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .get(userId) as Record<string, any> | undefined;
    return this.mapRow<User>(row);
  }

  async getUserByEmail(schoolId: string, email: string): Promise<User | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM users WHERE school_id = ? AND email = ?`)
      .get(schoolId, email) as Record<string, any> | undefined;
    return this.mapRow<User>(row);
  }

  async getUsersByRole(schoolId: string, role: string): Promise<User[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM users WHERE school_id = ? AND role = ?`)
      .all(schoolId, role) as Record<string, any>[];
    return this.mapRows<User>(rows);
  }

  async createUser(user: User): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO users (id, school_id, email, first_name, last_name, phone, role, password_hash, avatar, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      user.id,
      user.schoolId,
      user.email,
      user.firstName,
      user.lastName,
      user.phoneNumber,
      user.role,
      user.passwordHash,
      user.avatar,
      user.isActive ? 1 : 0,
      user.createdAt,
      user.updatedAt
    );
  }

  async updateUser(user: User): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      UPDATE users SET
        school_id = ?, email = ?, first_name = ?, last_name = ?,
        phone = ?, role = ?, password_hash = ?, avatar = ?,
        is_active = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      user.schoolId,
      user.email,
      user.firstName,
      user.lastName,
      user.phoneNumber,
      user.role,
      user.passwordHash,
      user.avatar,
      user.isActive ? 1 : 0,
      user.updatedAt,
      user.id
    );
  }

  /**
   * Student operations
   */
  async getStudent(studentId: string): Promise<Student | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM students WHERE id = ?`)
      .get(studentId) as Record<string, any> | undefined;
    return this.mapRow<Student>(row);
  }

  async getStudentsByClass(classId: string): Promise<Student[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM students WHERE class_id = ?`)
      .all(classId) as Record<string, any>[];
    return this.mapRows<Student>(rows);
  }

  async createStudent(student: Student): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO students (id, school_id, first_name, last_name, admission_number, date_of_birth, gender, class_id, stream, parent_email, parent_phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      student.id,
      student.schoolId,
      student.firstName,
      student.lastName,
      student.admissionNumber,
      student.dateOfBirth,
      student.gender,
      student.classId,
      student.stream,
      student.parentEmail,
      student.parentPhone,
      student.isActive ? 1 : 0,
      student.createdAt,
      student.updatedAt
    );
  }

  async updateStudent(student: Student): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      UPDATE students SET
        school_id = ?, first_name = ?, last_name = ?,
        admission_number = ?, date_of_birth = ?, gender = ?,
        class_id = ?, stream = ?, parent_email = ?, parent_phone = ?,
        is_active = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      student.schoolId,
      student.firstName,
      student.lastName,
      student.admissionNumber,
      student.dateOfBirth,
      student.gender,
      student.classId,
      student.stream,
      student.parentEmail,
      student.parentPhone,
      student.isActive ? 1 : 0,
      student.updatedAt,
      student.id
    );
  }

//Teacher operations
  async getTeacher(teacherId: string): Promise<Teacher | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM teachers WHERE id = ?`)
      .get(teacherId) as Record<string, any> | undefined;
    return this.mapTeacherRow(row);
  }

  async getTeacherByUserId(userId: string): Promise<Teacher | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM teachers WHERE user_id = ?`)
      .get(userId) as Record<string, any> | undefined;
    return this.mapTeacherRow(row);
  }

  async getTeachersBySchool(schoolId: string): Promise<Teacher[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM teachers WHERE school_id = ?`)
      .all(schoolId) as Record<string, any>[];
    return rows.map((row) => this.mapTeacherRow(row)!).filter(Boolean);
  }

  async createTeacher(teacher: Teacher): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO teachers (id, school_id, user_id, department, subjects, classes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      teacher.id,
      teacher.schoolId,
      teacher.userId,
      teacher.department,
      teacher.employeeNumber,
      this.toJSON(teacher.subjects),
      this.toJSON(teacher.classes),
      teacher.createdAt,
      teacher.updatedAt
    );
  }

  private mapTeacherRow(row: Record<string, any> | undefined): Teacher | undefined {
    if (!row) return undefined;
    return {
      id: row.id,
      schoolId: row.school_id,
      userId: row.user_id,
      department: row.department ?? undefined,
      subjects: this.fromJSON<string[]>(row.subjects, []),
      classes: this.fromJSON<string[]>(row.classes, []),
      isActive: true, 
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

//Class operations
  async getClass(classId: string): Promise<Class | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM classes WHERE id = ?`)
      .get(classId) as Record<string, any> | undefined;
    return this.mapRow<Class>(row);
  }

  async getClassesBySchool(schoolId: string): Promise<Class[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM classes WHERE school_id = ?`)
      .all(schoolId) as Record<string, any>[];
    return this.mapRows<Class>(rows);
  }

  async createClass(classData: Class): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO classes (id, school_id, name, level, form, class_teacher_id, student_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      classData.id,
      classData.schoolId,
      classData.name,
      classData.level,
      classData.classTeacherId,
      classData.studentCount,
      classData.createdAt,
      classData.updatedAt
    );
  }
//Subject operations
  async getSubject(subjectId: string): Promise<Subject | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM subjects WHERE id = ?`)
      .get(subjectId) as Record<string, any> | undefined;
    return this.mapRow<Subject>(row);
  }

  async getSubjectsBySchool(schoolId: string): Promise<Subject[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM subjects WHERE school_id = ?`)
      .all(schoolId) as Record<string, any>[];
    return this.mapRows<Subject>(rows);
  }

  async createSubject(subject: Subject): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO subjects (id, school_id, name, code, level, max_marks, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      subject.id,
      subject.schoolId,
      subject.name,
      subject.code,
      subject.classLevel,
      subject.maxMarks,
      subject.description,
      subject.createdAt,
      subject.updatedAt
    );
  }

//Mark operations
  async getMark(markId: string): Promise<Mark | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM marks WHERE id = ?`)
      .get(markId) as Record<string, any> | undefined;
    return this.mapRow<Mark>(row);
  }

  async getMarksByStudent(studentId: string): Promise<Mark[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM marks WHERE student_id = ?`)
      .all(studentId) as Record<string, any>[];
    return this.mapRows<Mark>(rows);
  }

  async createMark(mark: Mark): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO marks (id, school_id, student_id, class_id, subject_id, teacher_id, marks, marks_obtained, grade, term, academic_year, year, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      mark.id,
      mark.schoolId,
      mark.studentId,
      mark.classId,
      mark.subjectId,
      mark.teacherId,
      mark.marksObtained,
      mark.grade,
      mark.term,
      mark.academicYear,
      mark.year,
      mark.remarks,
      mark.createdAt,
      mark.updatedAt
    );
  }

  //Attendance operations
  async getAttendance(attendanceId: string): Promise<Attendance | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM attendance WHERE id = ?`)
      .get(attendanceId) as Record<string, any> | undefined;
    return this.mapAttendanceRow(row);
  }

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM attendance WHERE student_id = ?`)
      .all(studentId) as Record<string, any>[];
    return rows.map((row) => this.mapAttendanceRow(row)!).filter(Boolean);
  }

  async getAttendanceByClass(classId: string, date?: string): Promise<Attendance[]> {
    if (!this.db) return [];

    const rows = date
      ? (this.db.prepare(`SELECT * FROM attendance WHERE class_id = ? AND attendance_date = ?`).all(classId, date) as Record<string, any>[])
      : (this.db.prepare(`SELECT * FROM attendance WHERE class_id = ?`).all(classId) as Record<string, any>[]);
    return rows.map((row) => this.mapAttendanceRow(row)!).filter(Boolean);
  }

  async createAttendance(attendance: Attendance): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO attendance (id, school_id, student_id, class_id, attendance_date, status, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      attendance.id,
      attendance.schoolId,
      attendance.studentId,
      attendance.classId,
      attendance.date,
      attendance.status,
      attendance.remark,
      attendance.createdAt,
      attendance.updatedAt
    );
  }

  async getSettings(schoolId: string): Promise<Settings | undefined> {
  if (!this.db) return;

  const row = this.db
    .prepare(`SELECT * FROM settings WHERE school_id = ?`)
    .get(schoolId) as Record<string, any> | undefined;
  
  if (!row) return undefined;

  // Default values for all fields
  const defaultGeneral = {
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    principalName: '',
    registrationNumber: '',
    motto: '',
    logo: '',
  };

  const defaultAcademic = {
    currentTerm: `Term 1, ${new Date().getFullYear()}`,
    academicYear: String(new Date().getFullYear()),
    termStart: '',
    termEnd: '',
    gradingSystem: 'cbc' as const,
    assessmentTypes: ['Formative 1', 'Formative 2', 'Summative', 'End of Term'],
  };

  const defaultFinancial = {
    currency: 'KES',
    feeStructure: [],
    paymentMethods: ['Cash', 'M-Pesa', 'Bank', 'Cheque'],
    lateFeePercentage: 10,
    defaultFeeAmount: 15000,
  };

  const defaultSystem = {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    requireStrongPassword: true,
    enableTwoFactor: false,
    enableAuditLog: true,
    enableAutoBackup: true,
    backupFrequency: 'daily' as const,
    maintenanceMode: false,
  };

  const defaultNotifications = {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    feeReminders: true,
    attendanceAlerts: true,
    gradeAlerts: false,
    systemAlerts: true,
  };

  const defaultSecurity = {
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
  };

  return {
    id: row.id,
    schoolId: row.school_id,
    general: this.fromJSON(row.general, defaultGeneral),
    academic: this.fromJSON(row.academic, defaultAcademic),
    financial: this.fromJSON(row.financial, defaultFinancial),
    system: this.fromJSON(row.system, defaultSystem),
    notifications: this.fromJSON(row.notifications, defaultNotifications),
    security: this.fromJSON(row.security, defaultSecurity),
    updatedAt: row.updated_at,
  };
}
  async createSettings(settings: Settings): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (id, school_id, general, academic, financial, system, notifications, security, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      settings.id,
      settings.schoolId,
      this.toJSON(settings.general),
      this.toJSON(settings.academic),
      this.toJSON(settings.financial),
      this.toJSON(settings.system),
      this.toJSON(settings.notifications),
      this.toJSON(settings.security),
      settings.updatedAt
    );
  }
//Attendance Operations
  private mapAttendanceRow(row: Record<string, any> | undefined): Attendance | undefined {
    if (!row) return undefined;
    return {
      id: row.id,
      schoolId: row.school_id,
      studentId: row.student_id,
      classId: row.class_id,
      date: row.attendance_date,
      status: row.status,
      remark: row.remarks ?? undefined,
      recordedBy: row.recorded_by ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
//Payment operations
  async getPayment(paymentId: string): Promise<Payment | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM payments WHERE id = ?`)
      .get(paymentId) as Record<string, any> | undefined;
    return this.mapPaymentRow(row);
  }

  async getPaymentsByStudent(studentId: string): Promise<Payment[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM payments WHERE student_id = ?`)
      .all(studentId) as Record<string, any>[];
    return rows.map((row) => this.mapPaymentRow(row)!).filter(Boolean);
  }

  async createPayment(payment: Payment): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO payments (id, school_id, student_id, amount, type, status, due_date, paid_date, term, year, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      payment.id,
      payment.schoolId,
      payment.studentId,
      payment.amount,
      payment.type,
      payment.status,
      payment.dueDate,
      payment.paidDate,
      payment.term,
      payment.year,
      payment.createdAt,
      payment.updatedAt
    );
  }

  private mapPaymentRow(row: Record<string, any> | undefined): Payment | undefined {
    if (!row) return undefined;
    return {
      id: row.id,
      schoolId: row.school_id,
      studentId: row.student_id,
      amount: row.amount,
      type: row.type,
      status: row.status,
      dueDate: row.due_date,
      paidDate: row.paid_date ?? undefined,
      term: row.term,
      year: row.year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

//Audit log operations
  async createAuditLog(log: AuditLog): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, school_id, user_id, action, entity_type, entity_id, changes, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.id,
      log.schoolId,
      log.userId,
      log.action,
      log.entityType,
      log.entityId,
      this.toJSON(log.changes),
      log.ipAddress,
      log.timestamp
    );
  }

  async getAuditLogs(schoolId: string, limit: number = 100): Promise<AuditLog[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM audit_logs WHERE school_id = ? ORDER BY timestamp DESC LIMIT ?`)
      .all(schoolId, limit) as Record<string, any>[];

    return rows.map((row) => this.mapAuditLogRow(row));
  }

  private mapAuditLogRow(row: Record<string, any>): AuditLog {
    return {
      id: row.id,
      schoolId: row.school_id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? undefined,
      changes: this.fromJSON<Record<string, any> | undefined>(row.changes, undefined),
      ipAddress: row.ip_address ?? undefined,
      timestamp: row.timestamp,
    };
  }
//Report card operations
  async getReportCard(reportCardId: string): Promise<ReportCard | undefined> {
    if (!this.db) return;

    const row = this.db
      .prepare(`SELECT * FROM report_cards WHERE id = ?`)
      .get(reportCardId) as Record<string, any> | undefined;
    return this.mapReportCardRow(row);
  }

  async getReportCardsByStudent(studentId: string): Promise<ReportCard[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM report_cards WHERE student_id = ?`)
      .all(studentId) as Record<string, any>[];
    return rows.map((row) => this.mapReportCardRow(row)!).filter(Boolean);
  }

  async createReportCard(reportCard: ReportCard): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO report_cards (id, school_id, student_id, class_id, term, year, marks, performance, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      reportCard.id,
      reportCard.schoolId,
      reportCard.studentId,
      reportCard.classId,
      reportCard.term,
      reportCard.year,
      this.toJSON(reportCard.marks),
      this.toJSON(reportCard.performance),
      reportCard.generatedAt
    );
  }

  private mapReportCardRow(row: Record<string, any> | undefined): ReportCard | undefined {
    if (!row) return undefined;
    return {
      id: row.id,
      schoolId: row.school_id,
      studentId: row.student_id,
      classId: row.class_id,
      term: row.term,
      year: row.year,
      marks: this.fromJSON(row.marks, []),
      performance: this.fromJSON(row.performance, undefined),
      generatedAt: row.generated_at,
    };
  }
//Generic operations for store-based access
  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) return [];

    const rows = this.db
      .prepare(`SELECT * FROM ${this.sanitizeTableName(storeName)}`)
      .all() as Record<string, any>[];
    return this.mapRows(rows);
  }

  async write(storeName: string, data: any): Promise<void> {
    if (!this.db) return;

    const tableName = this.sanitizeTableName(storeName);
    const keys = Object.keys(data);
    const values = keys.map((k) => {
      const value = data[k];
      if (value !== null && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map((k) => this.camelToSnake(k)).join(', ');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${tableName} (${columns})
      VALUES (${placeholders})
    `);

    stmt.run(...values);
  }

  async delete(storeName: string, key: any): Promise<void> {
    if (!this.db) return;

    const tableName = this.sanitizeTableName(storeName);
    const stmt = this.db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    stmt.run(key);
  }

  async queryByIndex(storeName: string, indexName: string, query: any): Promise<any[]> {
    if (!this.db) return [];

    const tableName = this.sanitizeTableName(storeName);
    const columnName = this.camelToSnake(indexName);
    const stmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE ${columnName} = ?`);
    const rows = stmt.all(query) as Record<string, any>[];
    return this.mapRows(rows);
  }

  async exportAll(): Promise<Record<string, any[]>> {
    if (!this.db) return {};

    const result: Record<string, any[]> = {};
    const tables = [
      'schools', 'users', 'students', 'teachers', 'classes', 'subjects',
      'marks', 'attendance', 'payments', 'audit_logs', 'report_cards'
    ];

    for (const table of tables) {
      const rows = this.db.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[];
      result[table] = this.mapRows(rows);
    }

    return result;
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    if (!this.db) return;

    // Clear existing data
    const tables = ['report_cards', 'audit_logs', 'marks', 'attendance', 'payments', 'students', 'teachers', 'classes', 'subjects', 'users', 'schools'];
    for (const table of tables) {
      this.db.prepare(`DELETE FROM ${table}`).run();
    }

    // Import data
    for (const [table, records] of Object.entries(data)) {
      for (const record of records) {
        await this.write(table, record);
      }
    }
  }
//Utility methods
  private sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '');
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
  }

  private mapRow<T>(row: Record<string, any> | undefined): T | undefined {
    if (!row) return undefined;

    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = this.snakeToCamel(key);
      mapped[camelKey] = camelKey === 'isActive' ? value === 1 : value;
    }
    return mapped as T;
  }

  private mapRows<T>(rows: Record<string, any>[]): T[] {
    return rows.map((row) => this.mapRow<T>(row) as T);
  }

  private toJSON(value: any): string | null {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
  }

  private fromJSON<T>(value: any, fallback: T): T {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
//Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('SQLite database closed');
    }
  }
}