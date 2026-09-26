/**
 * PostgreSQL Schema for School MIS Cloud Sync
 * 
 * This file defines the PostgreSQL schema used for cloud synchronization.
 * When ready to implement cloud features, use this schema with:
 * - pg (for PostgreSQL)
 * - drizzle-orm/pg
 * 
 * Installation when needed:
 * pnpm add pg
 * pnpm add -D @types/pg
 */

/**
 * Cloud Sync Strategy:
 * 
 * 1. LOCAL → CLOUD (Push)
 *    - User edits data locally (IndexedDB/SQLite)
 *    - Changes tracked with timestamps and version numbers
 *    - On sync trigger: send changes to PostgreSQL
 *    - Update local sync_status and last_sync_timestamp
 * 
 * 2. CLOUD → LOCAL (Pull)
 *    - User goes online or manually triggers sync
 *    - Fetch all records modified since last_sync_timestamp
 *    - Merge with local data (conflict resolution)
 *    - Update local cache with server data
 * 
 * 3. CONFLICT RESOLUTION
 *    - Server wins by default (authoritative source)
 *    - User can choose to keep local version
 *    - Audit log tracks all conflicts and resolutions
 */

/**
 * PostgreSQL Connection Setup (pseudo-code for future implementation)
 * 
 * import { drizzle } from 'drizzle-orm/node-postgres';
 * import { Pool } from 'pg';
 * 
 * const pool = new Pool({
 *   host: process.env.DB_HOST,
 *   port: process.env.DB_PORT,
 *   database: process.env.DB_NAME,
 *   user: process.env.DB_USER,
 *   password: process.env.DB_PASSWORD,
 *   ssl: { rejectUnauthorized: false }
 * });
 * 
 * export const db = drizzle(pool, { schema });
 */

/**
 * PostgreSQL Table Definitions
 * 
 * Note: Identical to SQLite/IndexedDB structure but with additional
 * cloud-specific columns for sync coordination
 */

export const PostgreSQLSchema = `
-- Schools
CREATE TABLE schools (
  id TEXT PRIMARY KEY,
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
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending', -- pending, syncing, synced, conflict
  version INTEGER DEFAULT 1,
  
  CONSTRAINT schools_pkey PRIMARY KEY (id)
);

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  password_hash TEXT,
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_school_key UNIQUE (email, school_id)
);

-- Students
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT,
  class_id TEXT NOT NULL,
  stream TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_admission_key UNIQUE (admission_number, school_id)
);

-- Classes
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  form INTEGER,
  class_teacher_id TEXT NOT NULL REFERENCES users(id),
  student_count INTEGER DEFAULT 0,
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);

-- Subjects
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

-- Marks
CREATE TABLE marks (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  teacher_id TEXT NOT NULL REFERENCES users(id),
  marks REAL,
  term INTEGER,
  academic_year INTEGER,
  remarks TEXT,
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  
  CONSTRAINT marks_pkey PRIMARY KEY (id)
);

-- Attendance
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  attendance_date BIGINT NOT NULL,
  status TEXT NOT NULL,
  remarks TEXT,
  recorded_by TEXT REFERENCES users(id),
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  
  CONSTRAINT attendance_pkey PRIMARY KEY (id)
);

-- Payments
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  due_date BIGINT,
  paid_date BIGINT,
  status TEXT NOT NULL,
  payment_method TEXT,
  reference TEXT,
  
  -- Sync columns
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  changes TEXT,
  timestamp BIGINT NOT NULL,
  
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- Sync Events (track sync history)
CREATE TABLE sync_events (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  event_type TEXT NOT NULL, -- 'push', 'pull', 'conflict'
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'pending'
  conflict_resolution TEXT, -- 'server_wins', 'client_wins', 'merged'
  error_message TEXT,
  created_at BIGINT NOT NULL,
  
  CONSTRAINT sync_events_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_subjects_school_id ON subjects(school_id);
CREATE INDEX idx_marks_student_id ON marks(student_id);
CREATE INDEX idx_marks_class_id ON marks(class_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_sync_events_school_id ON sync_events(school_id);
CREATE INDEX idx_sync_events_created_at ON sync_events(created_at);

-- Sync status tracking per school
CREATE TABLE school_sync_status (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL UNIQUE REFERENCES schools(id),
  last_sync_push BIGINT,
  last_sync_pull BIGINT,
  is_syncing BOOLEAN DEFAULT false,
  sync_status TEXT DEFAULT 'idle', -- idle, syncing, error
  last_error TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  
  CONSTRAINT school_sync_status_pkey PRIMARY KEY (id)
);
`;

export default PostgreSQLSchema;
