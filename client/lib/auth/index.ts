// lib/auth/auth.ts
import { dbOps } from '@/lib/db';
import { rbac } from '@/lib/rbac';
import type { User } from '@/lib/db/schema';
interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  adminKey: string;
}

class AuthManager {
  private currentUser: User | null = null;
  private currentSchoolId: string | null = null;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private initialized: boolean = false;

  constructor() {
    // Check for existing session on load
    this.restoreSession();
  }

//Initialize the auth system
  async initialize(): Promise<void> {
    try {
      if (this.currentUser) {
        await this.verifyUserStillValid();
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.clearSession();
      this.initialized = true;
    }
  }

//Login
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const { email, password, adminKey } = credentials;

      if (!email || !password || !adminKey) {
        return { success: false, error: 'Please fill in all fields' };
      }

      const allUsers = await dbOps.getAll('users');
      const user = allUsers.find((u: any) => u.email === email) as User | undefined;

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const school = await dbOps.getSchool(user.schoolId);
      if (!school || school.adminKey !== adminKey) {
        return { success: false, error: 'Invalid admin key for this school' };
      }

      const CryptoJS = (await import('crypto-js')).default;
      const HASH_SALT = 'school-mis-pro-2024';
      const hashedInput = CryptoJS.SHA256(password + HASH_SALT).toString();

      if (user.passwordHash !== hashedInput) {
        return { success: false, error: 'Invalid password' };
      }

      if (!user.isActive) {
        return { success: false, error: 'User account is deactivated' };
      }

      if (!rbac.canAccessSystem(user.role)) {
        return { success: false, error: 'You do not have permission to access this system' };
      }

      // Create session
      this.currentUser = user;
      this.currentSchoolId = user.schoolId;
      this.saveSession();

      // Log login
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId: user.schoolId,
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        timestamp: Date.now(),
        details: `User ${user.email} logged in with role: ${user.role}`,
      });

      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      // Log logout
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId: this.currentUser.schoolId,
        userId: this.currentUser.id,
        action: 'logout',
        entityType: 'user',
        entityId: this.currentUser.id,
        timestamp: Date.now(),
        details: `User ${this.currentUser.email} logged out`,
      });
    }

    this.currentUser = null;
    this.currentSchoolId = null;
    this.clearSession();
  }


  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.id || null;
  }

  getCurrentRole(): string | null {
    return this.currentUser?.role || null;
  }

  getCurrentSchoolId(): string | null {
    return this.currentSchoolId;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentUser.isActive !== false;
  }

  getSession(): User | null {
    return this.currentUser;
  }

  hasRole(role: string | string[]): boolean {
    if (!this.currentUser) return false;
    if (Array.isArray(role)) {
      return role.includes(this.currentUser.role);
    }
    return this.currentUser.role === role;
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    return rbac.hasPermission(this.currentUser.role, permission);
  }

  getDashboardPath(): string {
    if (!this.currentUser) return '/login';
    return rbac.getDashboardPath(this.currentUser.role);
  }

  private saveSession(): void {
    if (this.currentUser) {
      const session = {
        user: this.currentUser,
        schoolId: this.currentSchoolId,
        timestamp: Date.now(),
      };
      localStorage.setItem('mis_session', JSON.stringify(session));
    }
  }

  /**
   * Restore session from localStorage
   */
  private restoreSession(): void {
    try {
      const sessionData = localStorage.getItem('mis_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Check if session is expired (30 minutes)
        if (Date.now() - session.timestamp > this.sessionTimeout) {
          this.clearSession();
          return;
        }

        this.currentUser = session.user;
        this.currentSchoolId = session.schoolId;
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.clearSession();
    }
  }
// Verify user still exists in database

  private async verifyUserStillValid(): Promise<void> {
    if (!this.currentUser) return;

    try {
      const user = await dbOps.getUser(this.currentUser.id);
      if (!user || !user.isActive) {
        this.clearSession();
      }
    } catch (error) {
      // If we can't verify, keep session but log error
      console.warn('Could not verify user session:', error);
    }
  }
//Clear session
  private clearSession(): void {
    localStorage.removeItem('mis_session');
    this.currentUser = null;
    this.currentSchoolId = null;
  }

  refreshSession(): void {
    if (this.currentUser) {
      this.saveSession();
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
const auth = new AuthManager();

export { auth };