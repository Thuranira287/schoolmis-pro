import { integer, text, real, sqliteTable } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';


// Schools
export const schools = sqliteTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  registrationNumber: text('registration_number').unique(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  county: text('county'),
  country: text('country'),
  logo: text('logo'),
  currency: text('currency').default('KES'),
  timezone: text('timezone').default('Africa/Nairobi'),
  academicYearStart: integer('academic_year_start'),
  academicYearEnd: integer('academic_year_end'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  email: text('email').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull(), // admin, principal, teacher, student, parent
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Students
export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  admissionNumber: text('admission_number').notNull(),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'), // M, F
  classId: text('class_id').notNull(),
  stream: text('stream'),
  parentEmail: text('parent_email'),
  parentPhone: text('parent_phone'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Teachers
export const teachers = sqliteTable('teachers', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  userId: text('user_id').notNull(),
  employeeNumber: text('employee_number').notNull(),
  qualification: text('qualification'),
  specialization: text('specialization'),
  joinDate: integer('join_date'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Classes
export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(),
  level: text('level').notNull(), // junior, senior
  form: integer('form'), // 1, 2, 3, 4
  classTeacherId: text('class_teacher_id').notNull(),
  studentCount: integer('student_count').default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Subjects
export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Marks
export const marks = sqliteTable('marks', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  teacherId: text('teacher_id').notNull(),
  marks: real('marks'),
  term: integer('term'), // 1, 2, 3
  academicYear: integer('academic_year'),
  remarks: text('remarks'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Attendance
export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  classId: text('class_id').notNull(),
  attendanceDate: integer('attendance_date').notNull(),
  status: text('status').notNull(), // present, absent, late, excused
  remarks: text('remarks'),
  recordedBy: text('recorded_by'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Payments
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  dueDate: integer('due_date'),
  paidDate: integer('paid_date'),
  status: text('status').notNull(), // pending, paid, overdue
  paymentMethod: text('payment_method'),
  reference: text('reference'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(), // create, read, update, delete
  entityType: text('entity_type').notNull(), // student, class, mark, etc
  entityId: text('entity_id'),
  changes: text('changes'), // JSON string of what changed
  timestamp: integer('timestamp').notNull(),
});

//Type exports for TypeScript
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
