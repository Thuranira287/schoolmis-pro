import { Navigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { rbac } from '@/lib/rbac';
import type { Role } from '@/lib/db/schema';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
  requiredPermission?: string;
}

export default function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermission,
}: ProtectedRouteProps) {
  const session = auth.getCurrentUser();

  // Not authenticated
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(session.role)) {
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You do not have permission to access this page. 
              This area is restricted to users with the following roles:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {requiredRoles.map((role) => (
                <span key={role} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {rbac.getRoleDisplayName(role)}
                </span>
              ))}
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    const hasPermission = rbac.hasPermission(session.role, requiredPermission);
    if (!hasPermission) {
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⛔</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Permission Denied</h1>
            <p className="text-gray-600 mb-4">
              You do not have the required permission: <strong>{requiredPermission}</strong>
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}