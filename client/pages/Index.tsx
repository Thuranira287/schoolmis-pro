import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { rbac } from '@/lib/rbac';
import { Loader2, Users, BookOpen, GraduationCap, ClipboardCheck, Calendar, DollarSign, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Role } from '@/lib/db/schema';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  pendingPayments: number;
  totalMarks: number;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: Role[];
  description: string;
}

export default function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    pendingPayments: 0,
    totalMarks: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const session = auth.getCurrentUser();
  const role = auth.getCurrentRole() as Role | null;
  const schoolId = auth.getCurrentSchoolId();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!session) {
      navigate('/login');
      return;
    }

    loadDashboardStats();
  }, [session, navigate]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!schoolId) {
        throw new Error('School ID not found');
      }

      // Import dbOps dynamically to avoid circular dependencies
      const { dbOps } = await import('@/lib/db');

      // Load all data in parallel
      const [allStudents, allUsers, allClasses, allSubjects, allPayments, allMarks] = await Promise.all([
        dbOps.getAll('students'),
        dbOps.getAll('users'),
        dbOps.getAll('classes'),
        dbOps.getAll('subjects'),
        dbOps.getAll('payments'),
        dbOps.getAll('marks'),
      ]);

      // Filter by school
      const schoolStudents = (allStudents as any[])
        .filter((s: any) => s.schoolId === schoolId && s.isActive !== false);
      
      const schoolTeachers = (allUsers as any[])
        .filter((u: any) => u.schoolId === schoolId && u.role === 'teacher' && u.isActive !== false);
      
      const schoolClasses = (allClasses as any[])
        .filter((c: any) => c.schoolId === schoolId);
      
      const schoolSubjects = (allSubjects as any[])
        .filter((s: any) => s.schoolId === schoolId && s.isActive !== false);
      
      const schoolPayments = (allPayments as any[])
        .filter((p: any) => p.schoolId === schoolId);
      
      const schoolMarks = (allMarks as any[])
        .filter((m: any) => m.schoolId === schoolId);

      const pendingPayments = schoolPayments.filter((p: any) => p.status === 'pending').length;

      setStats({
        totalStudents: schoolStudents.length,
        totalTeachers: schoolTeachers.length,
        totalClasses: schoolClasses.length,
        totalSubjects: schoolSubjects.length,
        pendingPayments,
        totalMarks: schoolMarks.length,
      });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Loading Dashboard...</h2>
          <p className="text-gray-500 mt-2">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  // login redirect
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      label: 'Add Student',
      icon: <Users className="h-5 w-5" />,
      path: '/students',
      roles: ['admin', 'principal'],
      description: 'Register a new student',
    },
    {
      label: 'Enter Marks',
      icon: <ClipboardCheck className="h-5 w-5" />,
      path: '/marks',
      roles: ['admin', 'principal', 'teacher'],
      description: 'Record student performance',
    },
    {
      label: 'Take Attendance',
      icon: <Calendar className="h-5 w-5" />,
      path: '/attendance',
      roles: ['admin', 'principal', 'teacher'],
      description: 'Mark student attendance',
    },
    {
      label: 'Generate Reports',
      icon: <FileText className="h-5 w-5" />,
      path: '/reports',
      roles: ['admin', 'principal', 'teacher', 'accountant'],
      description: 'Create report cards',
    },
    {
      label: 'Record Payment',
      icon: <DollarSign className="h-5 w-5" />,
      path: '/payments',
      roles: ['admin', 'principal', 'accountant'],
      description: 'Record fee payments',
    },
    {
      label: 'Manage Classes',
      icon: <GraduationCap className="h-5 w-5" />,
      path: '/classes',
      roles: ['admin', 'principal'],
      description: 'Manage classes and streams',
    },
  ];

  // Get filtered actions for current role
  const availableActions = role ? quickActions.filter(
    (action) => action.roles.includes(role) || role === 'admin'
  ) : [];

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17) timeGreeting = 'Good evening';

    const roleGreetings: Record<Role, string> = {
      admin: 'Manage your school efficiently with real-time insights',
      principal: 'Oversee school operations and performance',
      teacher: 'Track your students and classes',
      accountant: 'Manage school finances and payments',
      student: 'View your academic progress',
    };

    return {
      time: timeGreeting,
      message: role ? roleGreetings[role] || 'Welcome to School MIS Pro' : 'Welcome to School MIS Pro',
    };
  };

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting.time}, {session.firstName}! 👋
            </h1>
            <p className="text-indigo-100 mt-1">{greeting.message}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30"
              onClick={() => navigate('/reports')}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-gray-500 mt-1">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Teachers</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-gray-500 mt-1">Staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Classes</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-gray-500 mt-1">Classes available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
            <p className="text-xs text-gray-500 mt-1">Subjects offered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Marks</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMarks}</div>
            <p className="text-xs text-gray-500 mt-1">Marks recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {availableActions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableActions.map((action) => (
              <Card
                key={action.label}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-indigo-300 hover:scale-[1.02]"
                onClick={() => navigate(action.path)}
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    {action.icon}
                  </div>
                  <CardTitle className="text-base">{action.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div>
            <p className="text-sm text-blue-800">
              <strong>Offline-First Mode:</strong> All data is stored locally on your device.
              {navigator.onLine ? (
                <span className="text-green-600"> Online</span>
              ) : (
                <span className="text-amber-600"> Offline</span>
              )}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Changes will sync automatically when internet is available.
            </p>
          </div>
        </div>
      </Alert>

      {/* School Info Footer */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
        <p>School MIS Pro v1.0.0 • CBC Compliant • Built for Kenya 🇰🇪</p>
        <p className="mt-1">
          {schoolId && `School ID: ${schoolId}`}
          {role && ` • Role: ${rbac.getRoleDisplayName(role)}`}
        </p>
      </div>
    </div>
  );
}