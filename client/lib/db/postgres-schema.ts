// lib/db/postgres-schema.ts
import { 
  pgTable, 
  text, 
  boolean, 
  integer, 
  bigint, 
  real, 
  jsonb,
  unique,
  primaryKey
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================
// SCHOOLS
// ============================================================
export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  adminKey: text('admin_key').notNull().unique(),
  registrationNumber: text('registration_number').unique(),
  logo: text('logo'),
  email: text('email'),
  phoneNumber: text('phone_number'),
  address: text('address'),
  country: text('country').default('Kenya'),
  county: text('county').notNull(),
  city: text('city'),
  currency: text('currency').default('KES'),
  timezone: text('timezone').default('Africa/Nairobi'),
  academicYearStart: text('academic_year_start'), // YYYY-MM-DD
  academicYearEnd: text('academic_year_end'),     // YYYY-MM-DD
  isActive: boolean('is_active').default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'), // pending, syncing, synced, conflict
  version: integer('version').default(1),
});

// ============================================================
// USERS
// ============================================================
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull(), // admin, principal, teacher, accountant, student
  tscNumber: text('tsc_number'),
  specialization: text('specialization'),
  qualification: text('qualification'),
  phoneNumber: text('phone_number'),
  avatar: text('avatar'),
  isActive: boolean('is_active').default(true),
  lastLogin: bigint('last_login', { mode: 'number' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
}, (table) => ({
  uniqueEmailPerSchool: unique('unique_email_per_school').on(table.schoolId, table.email),
}));

// ============================================================
// STUDENTS
// ============================================================
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  admissionNumber: text('admission_number').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'), // M, F
  classId: text('class_id').notNull(),
  stream: text('stream'),
  subjects: jsonb('subjects').$type<string[]>(), // Array of subject IDs
  pathway: text('pathway'), // stem, social, mixed, undefined
  parentName: text('parent_name'),
  parentEmail: text('parent_email'),
  parentPhone: text('parent_phone'),
  admissionDate: text('admission_date'),
  isActive: boolean('is_active').default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
}, (table) => ({
  uniqueAdmissionPerSchool: unique('unique_admission_per_school').on(table.schoolId, table.admissionNumber),
}));

// ============================================================
// TEACHERS
// ============================================================
export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  employeeNumber: text('employee_number'),
  department: text('department'),
  tscNumber: text('tsc_number'),
  specialization: text('specialization'),
  qualification: text('qualification'),
  isActive: boolean('is_active').default(true),
  subjects: jsonb('subjects').$type<string[]>(), // Array of subject IDs
  classes: jsonb('classes').$type<string[]>(), // Array of class IDs
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
}, (table) => ({
  uniqueUserId: unique('unique_user_id').on(table.userId),
}));

// ============================================================
// CLASSES
// ============================================================
export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  level: text('level').notNull(), // PP1, PP2, Grade1, Grade2, etc.
  stream: text('stream'),
  classTeacherId: text('class_teacher_id').references(() => users.id, { onDelete: 'set null' }),
  studentCount: integer('student_count').default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
});

// ============================================================
// SUBJECTS
// ============================================================
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  classLevel: text('class_level'), // junior, senior
  maxMarks: integer('max_marks').default(100),
  isActive: boolean('is_active').default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
});

// ============================================================
// MARKS
// ============================================================
export const marks = pgTable('marks', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  marksObtained: real('marks_obtained'),
  grade: text('grade'), // EE, ME, AE, BE
  remarks: text('remarks'),
  term: integer('term').notNull(), // 1, 2, 3
  year: integer('year').notNull(),
  academicYear: text('academic_year').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
});

// ============================================================
// ATTENDANCE
// ============================================================
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id'),
  userId: text('user_id'), // For teacher attendance
  classId: text('class_id'),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').notNull(), // present, absent, late, excused
  type: text('type'), // student, teacher
  clockIn: text('clock_in'), // HH:mm:ss
  clockOut: text('clock_out'), // HH:mm:ss
  hoursWorked: real('hours_worked'),
  teacherName: text('teacher_name'),
  timeIn: text('time_in'), // HH:mm:ss
  timeOut: text('time_out'), // HH:mm:ss
  remark: text('remark'),
  recordedBy: text('recorded_by').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
});

// ============================================================
// PAYMENTS
// ============================================================
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  type: text('type').notNull(), // tuition, activity, uniform, books, other
  status: text('status').notNull(), // pending, paid, overdue
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  paidDate: text('paid_date'), // YYYY-MM-DD
  term: integer('term').notNull(), // 1, 2, 3
  year: integer('year').notNull(),
  description: text('description'),
  paymentMethod: text('payment_method'), // cash, mpesa, bank, cheque
  referenceNumber: text('reference_number'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  // Sync columns
  syncedAt: bigint('synced_at', { mode: 'number' }),
  syncStatus: text('sync_status').default('synced'),
  version: integer('version').default(1),
});

// ============================================================
// AUDIT LOGS
// ============================================================
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  action: text('action').notNull(), // create, update, delete, login, logout, export, print
  entityType: text('entity_type').notNull(), // student, mark, attendance, etc.
  entityId: text('entity_id'),
  changes: jsonb('changes').$type<Record<string, any>>(),
  ipAddress: text('ip_address'),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  details: text('details'),
  ip: text('ip'),
  userAgent: text('user_agent'),
});

// ============================================================
// REPORT CARDS
// ============================================================
export const reportCards = pgTable('report_cards', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  term: integer('term').notNull(),
  year: integer('year').notNull(),
  marks: jsonb('marks').$type<any[]>(), // Array of marks
  performance: jsonb('performance').$type<{
    classRank?: number;
    totalStudents?: number;
    averageScore?: number;
  }>(),
  generatedAt: bigint('generated_at', { mode: 'number' }).notNull(),
});

// ============================================================
// SETTINGS
// ============================================================
export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().unique().references(() => schools.id, { onDelete: 'cascade' }),
  general: jsonb('general').$type<{
    schoolName: string;
    schoolAddress: string;
    schoolPhone: string;
    schoolEmail: string;
    principalName: string;
    registrationNumber: string;
    motto: string;
    logo?: string;
  }>(),
  academic: jsonb('academic').$type<{
    currentTerm: string;
    academicYear: string;
    termStart: string;
    termEnd: string;
    gradingSystem: 'cbc' | 'cba' | 'traditional';
    assessmentTypes: string[];
  }>(),
  financial: jsonb('financial').$type<{
    currency: string;
    feeStructure: any[];
    paymentMethods: string[];
    lateFeePercentage: number;
    defaultFeeAmount: number;
  }>(),
  system: jsonb('system').$type<{
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireStrongPassword: boolean;
    enableTwoFactor: boolean;
    enableAuditLog: boolean;
    enableAutoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    maintenanceMode: boolean;
  }>(),
  notifications: jsonb('notifications').$type<{
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    feeReminders: boolean;
    attendanceAlerts: boolean;
    gradeAlerts: boolean;
    systemAlerts: boolean;
  }>(),
  security: jsonb('security').$type<{
    allowPasswordChange: boolean;
    sessionTimeout: number;
    ipWhitelist: string[];
    allowedDomains: string[];
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  }>(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ============================================================
// SYNC EVENTS (track sync history)
// ============================================================
export const syncEvents = pgTable('sync_events', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // push, pull, conflict
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  status: text('status').notNull(), // success, failed, pending
  conflictResolution: text('conflict_resolution'), // server_wins, client_wins, merged
  errorMessage: text('error_message'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

// ============================================================
// SCHOOL SYNC STATUS
// ============================================================
export const schoolSyncStatus = pgTable('school_sync_status', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().unique().references(() => schools.id, { onDelete: 'cascade' }),
  lastSyncPush: bigint('last_sync_push', { mode: 'number' }),
  lastSyncPull: bigint('last_sync_pull', { mode: 'number' }),
  isSyncing: boolean('is_syncing').default(false),
  syncStatus: text('sync_status').default('idle'), // idle, syncing, error
  lastError: text('last_error'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================
export type School = typeof schools.$inferSelect;
export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Mark = typeof marks.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ReportCard = typeof reportCards.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type SyncEvent = typeof syncEvents.$inferSelect;
export type SchoolSyncStatus = typeof schoolSyncStatus.$inferSelect;