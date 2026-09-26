/**
 * School MIS Pro - IndexedDB Schema
 * Multi-tenant, offline-first database design for Kenyan CBC education system
 */

export interface School {
  id: string;
  name: string;
  adminKey: string;
  registrationNumber?: string;
  logo?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  country: string;
  county: string;
  city?: string;
  currency: string; // KES
  timezone: string; // Africa/Nairobi
  academicYearStart: string; // YYYY-MM-DD
  academicYearEnd: string;   // YYYY-MM-DD
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  schoolId: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role: Role;
  tscNumber?: string;
  specialization?: string;
  qualification?: string;
  phoneNumber?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  subjects?: string[];  // Array of subject IDs
  pathway?: 'stem' | 'social' | 'mixed' | 'undefined';
  dateOfBirth?: string;
  gender?: "M" | "F";
  classId: string;
  stream?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  admissionDate?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId: string;
  employeeNumber?: string;
  department?: string;
  tscNumber?: string;
  specialization?: string;
  qualification?: string;
  isActive: boolean;
  subjects: string[];
  classes: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Class {
  id: string;
  schoolId: string;
  name: string;
  level:
    | "PP1"
    | "PP2"
    | "Grade1"
    | "Grade2"
    | "Grade3"
    | "Grade4"
    | "Grade5"
    | "Grade6"
    | "Grade7"
    | "Grade8"
    | "Grade9"
    | "Grade10"
    | "Grade11"
    | "Grade12";
  stream?: string;
  classTeacherId?: string;
  studentCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  classLevel?: | 'junior' | 'senior';
  maxMarks: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Mark {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  marksObtained: number;
  grade: Grade; // EE, ME, AE, BE
  remarks?: string;
  term: number;
  year: number;
  academicYear: string;
  createdAt: number;
  updatedAt: number;
}

export interface Attendance {
  id: string;
  schoolId: string;
  studentId?: string;
  userId?: string;
  classId?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  type?: 'student' | 'teacher';
  clockIn?: string; 
  clockOut?: string;
  hoursWorked?: number;
  teacherName?: string;
  timeIn?: string; 
  timeOut?: string;
  remark?: string;
  recordedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  schoolId: string;
  studentId: string;
  amount: number;
  type: 'tuition' | 'activity' | 'uniform' | 'books' | 'other';
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string; // YYYY-MM-DD
  paidDate?: string;
  term: number;
  year: number;
  description?: string;
  paymentMethod?: 'cash' | 'mpesa' | 'bank' | 'cheque';
  referenceNumber?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLog {
  id: string;
  schoolId: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'print';
  entityType: string; // 'student', 'mark', 'attendance', etc.
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  timestamp: number;
  details?: string;
  ip?: string;
  userAgent?: string;
}

export interface ReportCard {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  term: number;
  year: number;
  marks: Mark[];
  performance?: {
    classRank?: number;
    totalStudents?: number;
    averageScore?: number;
  };
  generatedAt: number;
}

export interface SchoolSettings {
  id: string;
  schoolId: string;
  gradingSystem:| 'CBC' | '8-4-4';
  currentTerm: number;
  currentYear: number;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  id: string;
  schoolId: string;
  general: {
    schoolName: string;
    schoolAddress: string;
    schoolPhone: string;
    schoolEmail: string;
    principalName: string;
    registrationNumber: string;
    motto: string;
    logo?: string;
  };
  academic: {
    currentTerm: string;
    academicYear: string;
    termStart: string;
    termEnd: string;
    gradingSystem: 'cbc' | 'cba' | 'traditional';
    assessmentTypes: string[];
  };
  financial: {
    currency: string;
    feeStructure: FeeStructure[];
    paymentMethods: string[];
    lateFeePercentage: number;
    defaultFeeAmount: number;
  };
  system: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireStrongPassword: boolean;
    enableTwoFactor: boolean;
    enableAuditLog: boolean;
    enableAutoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    maintenanceMode: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    feeReminders: boolean;
    attendanceAlerts: boolean;
    gradeAlerts: boolean;
    systemAlerts: boolean;
  };
  security: {
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
  };
  updatedAt: number;
}

export interface FeeStructure {
  id: string;
  className: string;
  termFee: number;
  registrationFee: number;
  activityFee: number;
  otherFees: { name: string; amount: number }[];
}

export type Grade = 'EE' | 'ME' | 'AE' | 'BE';
export type Role = 'admin' | 'teacher' | 'principal' | 'accountant' | 'student';

/**
 * IndexedDB Store Configuration
 * Define all stores, their key paths, and indexes
 */
export const DB_STORES = {
  schools: {
    keyPath: 'id',
    indexes: [
      { name: 'adminKey', keyPath: 'adminKey', unique: true },
    ],
  },
  users: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'email', keyPath: ['schoolId', 'email'], unique: true },
      { name: 'role', keyPath: ['schoolId', 'role'] },
    ],
  },
  students: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'classId', keyPath: 'classId' },
      { name: 'admissionNumber', keyPath: ['schoolId', 'admissionNumber'], unique: true },
    ],
  },
  teachers: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'userId', keyPath: 'userId', unique: true },
    ],
  },
  classes: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'level', keyPath: ['schoolId', 'level'] },
    ],
  },
  subjects: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'level', keyPath: ['schoolId', 'level'] },
    ],
  },
  marks: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'studentId', keyPath: 'studentId' },
      { name: 'classId', keyPath: 'classId' },
      { name: 'subjectId', keyPath: 'subjectId' },
      { name: 'term', keyPath: ['term', 'year'] },
    ],
  },
  attendance: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'studentId', keyPath: 'studentId' },
      { name: 'date', keyPath: 'date' },
      { name: 'classId', keyPath: 'classId' },
    ],
  },
  payments: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'studentId', keyPath: 'studentId' },
      { name: 'status', keyPath: ['schoolId', 'status'] },
      { name: 'term', keyPath: ['term', 'year'] },
    ],
  },
  auditLogs: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'userId', keyPath: 'userId' },
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'action', keyPath: 'action' },
    ],
  },
  reportCards: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      { name: 'studentId', keyPath: 'studentId' },
      { name: 'term', keyPath: ['term', 'year'] },
    ],
  },
    settings: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId', unique: true }
    ]
  }
} as const;

export const DB_NAME = 'SchoolMISPro';
export const DB_VERSION = 4;
