// lib/rbac/rbac.ts

import type { Role } from '@/lib/db/schema';
import { LayoutDashboard, Users, GraduationCap, School, UserCog, FileText, BookOpen, } from 'lucide-react';

interface RoleDefinition {
  name: string;
  label: string;
  description: string;
  permissions: string[];
  dashboardPath: string;
  priority: number;
}

const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  admin: {
    name: 'admin',
    label: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      'view_dashboard',
      'view_students',
      'manage_students',
      'delete_students',
      'view_teachers',
      'manage_teachers',
      'delete_teachers',
      'view_classes',
      'manage_classes',
      'delete_classes',
      'view_subjects',
      'manage_subjects',
      'delete_subjects',
      'view_marks',
      'manage_marks',
      'delete_marks',
      'view_attendance',
      'manage_attendance',
      'view_payments',
      'manage_payments',
      'delete_payments',
      'view_reports',
      'generate_reports',
      'view_users',
      'manage_users',
      'delete_users',
      'view_settings',
      'manage_settings',
      'view_audit_logs',
      'manage_system',
    ],
    dashboardPath: '/dashboard',
    priority: 100,
  },
  principal: {
    name: 'principal',
    label: 'Principal',
    description: 'School leadership with management permissions',
    permissions: [
      'view_dashboard',
      'view_students',
      'manage_students',
      'view_teachers',
      'manage_teachers',
      'view_classes',
      'manage_classes',
      'view_subjects',
      'view_marks',
      'manage_marks',
      'view_attendance',
      'manage_attendance',
      'view_payments',
      'view_reports',
      'generate_reports',
      'view_settings',
    ],
    dashboardPath: '/dashboard',
    priority: 80,
  },
  teacher: {
    name: 'teacher',
    label: 'Teacher',
    description: 'Teaching staff with classroom management permissions',
    permissions: [
      'view_dashboard',
      'view_students',
      'view_classes',
      'view_subjects',
      'view_marks',
      'manage_marks',
      'view_attendance',
      'manage_attendance',
      'view_reports',
      'generate_reports',
    ],
    dashboardPath: '/dashboard',
    priority: 60,
  },
  accountant: {
    name: 'accountant',
    label: 'Accountant',
    description: 'Financial management with payment permissions',
    permissions: [
      'view_dashboard',
      'view_students',
      'view_classes',
      'view_payments',
      'manage_payments',
      'view_reports',
      'generate_reports',
      'view_settings',
    ],
    dashboardPath: '/dashboard',
    priority: 50,
  },
  student: {
    name: 'student',
    label: 'Student',
    description: 'Limited access to personal information and results',
    permissions: [
      'view_dashboard',
      'view_marks',
      'view_reports',
    ],
    dashboardPath: '/dashboard',
    priority: 10,
  },
};

// Permission definitions with descriptions
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  view_dashboard: 'View dashboard',
  view_students: 'View student information',
  manage_students: 'Add and edit students',
  delete_students: 'Delete students',
  view_teachers: 'View teacher information',
  manage_teachers: 'Add and edit teachers',
  delete_teachers: 'Delete teachers',
  view_classes: 'View class information',
  manage_classes: 'Add and edit classes',
  delete_classes: 'Delete classes',
  view_subjects: 'View subject information',
  manage_subjects: 'Add and edit subjects',
  delete_subjects: 'Delete subjects',
  view_marks: 'View student marks',
  manage_marks: 'Add and edit marks',
  delete_marks: 'Delete marks',
  view_attendance: 'View attendance records',
  manage_attendance: 'Add and edit attendance',
  view_payments: 'View payment records',
  manage_payments: 'Add and edit payments',
  delete_payments: 'Delete payments',
  view_reports: 'View reports',
  generate_reports: 'Generate reports',
  view_users: 'View user accounts',
  manage_users: 'Add and edit users',
  delete_users: 'Delete users',
  view_settings: 'View settings',
  manage_settings: 'Modify settings',
  view_audit_logs: 'View audit logs',
  manage_system: 'System management',
};

class RBACManager {
  /**
   * Get role definition
   */
  getRoleDefinition(role: Role): RoleDefinition | null {
    return ROLE_DEFINITIONS[role] || null;
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: Role): string {
    return ROLE_DEFINITIONS[role]?.label || role;
  }

  /**
   * Get role permissions
   */
  getRolePermissions(role: Role): string[] {
    return ROLE_DEFINITIONS[role]?.permissions || [];
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: Role, permission: string): boolean {
    const permissions = this.getRolePermissions(role);
    return permissions.includes(permission);
  }

  /**
   * Check if a role can access the system
   */
  canAccessSystem(role: Role): boolean {
    return role in ROLE_DEFINITIONS;
  }

  /**
   * Get dashboard path for a role
   */
  getDashboardPath(role: Role): string {
    return ROLE_DEFINITIONS[role]?.dashboardPath || '/dashboard';
  }

  /**
   * Get all available roles
   */
  getAvailableRoles(): Role[] {
    const roles: Role[] = [];
    for (const key in ROLE_DEFINITIONS) {
      roles.push(key as Role);
    }
    return roles;
  }

  /**
   * Get roles that a user can manage (based on their role)
   */
  getManageableRoles(userRole: Role): Role[] {
    const userPriority = ROLE_DEFINITIONS[userRole]?.priority || 0;
    const roles: Role[] = [];
    for (const key in ROLE_DEFINITIONS) {
      const role = key as Role;
      if (ROLE_DEFINITIONS[role].priority < userPriority) {
        roles.push(role);
      }
    }
    return roles;
  }

  /**
   * Check if a user can manage a specific role
   */
  canManageUserRole(userRole: Role, targetRole: Role): boolean {
    const userPriority = ROLE_DEFINITIONS[userRole]?.priority || 0;
    const targetPriority = ROLE_DEFINITIONS[targetRole]?.priority || 0;
    return userPriority > targetPriority;
  }

  /**
   * Get all permissions with descriptions
   */
  getAllPermissions(): Record<string, string> {
    return PERMISSION_DESCRIPTIONS;
  }

  /**
   * Get menu items for a role
   */
  getMenuItems(role: Role): Array<{ label: string; path: string; icon?: string }> {
    const menuMap: Record<Role, Array<{ label: string; path: string; icon?: string }>> = {
      admin: [
        { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard'},
        { label: 'Students', path: '/students', icon: 'Users' },
        { label: 'Teachers', path: '/teachers', icon: 'UsersCog' },
        { label: 'Classes', path: '/classes', icon: 'School' },
        { label: 'Subjects', path: '/subjects', icon: 'BookOpen' },
        { label: 'Marks', path: '/marks', icon: 'ClipboardCheck' },
        { label: 'Attendance', path: '/attendance', icon: 'Calender' },
        { label: 'Payments', path: '/payments', icon: 'DollarSign' },
        { label: 'Reports', path: '/reports', icon: 'FileText' },
        { label: 'Users', path: '/users', icon: 'Users' },
        { label: 'Settings', path: '/settings', icon: '⚙️' },
        { label: 'Audit Logs', path: '/audit-logs', icon: '📋' },
        { label: 'Schools', path: '/schools', icon: '🏫' }, 
      ],
      principal: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Students', path: '/students', icon: '👨‍🎓' },
        { label: 'Teachers', path: '/teachers', icon: '👨‍🏫' },
        { label: 'Classes', path: '/classes', icon: '🏫' },
        { label: 'Subjects', path: '/subjects', icon: '📖' },
        { label: 'Marks', path: '/marks', icon: '📝' },
        { label: 'Attendance', path: '/attendance', icon: '✅' },
        { label: 'Payments', path: '/payments', icon: '💰' },
        { label: 'Reports', path: '/reports', icon: '📄' },
        { label: 'Settings', path: '/settings', icon: '⚙️' },
      ],
      teacher: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Students', path: '/students', icon: '👨‍🎓' },
        { label: 'Classes', path: '/classes', icon: '🏫' },
        { label: 'Subjects', path: '/subjects', icon: '📖' },
        { label: 'Marks', path: '/marks', icon: '📝' },
        { label: 'Attendance', path: '/attendance', icon: '✅' },
        { label: 'Reports', path: '/reports', icon: '📄' },
      ],
      accountant: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Students', path: '/students', icon: '👨‍🎓' },
        { label: 'Payments', path: '/payments', icon: '💰' },
        { label: 'Reports', path: '/reports', icon: '📄' },
      ],
      student: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Marks', path: '/marks', icon: '📝' },
        { label: 'Reports', path: '/reports', icon: '📄' },
      ],
    };

    return menuMap[role] || [];
  }

//Check if user has access to a page
  canAccessPage(role: Role, pagePath: string): boolean {
    const menuItems = this.getMenuItems(role);
    return menuItems.some((item) => item.path === pagePath);
  }

//Get role info (for display purposes)
  getRoleInfo(role: Role): { label: string; description: string; permissions: string[] } {
    const def = ROLE_DEFINITIONS[role];
    if (!def) {
      return { label: role, description: 'Unknown role', permissions: [] };
    }
    return {
      label: def.label,
      description: def.description,
      permissions: def.permissions,
    };
  }

//Get role priority
  getRolePriority(role: Role): number {
    return ROLE_DEFINITIONS[role]?.priority || 0;
  }
}

// Singleton instance
const rbac = new RBACManager();

export { rbac };