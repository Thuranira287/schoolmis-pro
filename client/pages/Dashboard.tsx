import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Users, BookOpen, BarChart3, CreditCard, UserPlus, ClipboardCheck, FileText, Calendar,GraduationCap, DollarSign, SchoolIcon, UserCog, School } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  pendingPayments: number;
  totalSubjects: number;
  totalMarks: number;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
  description: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    pendingPayments: 0,
    totalSubjects: 0,
    totalMarks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const session = auth.getCurrentUser();
  const schoolId = auth.getCurrentSchoolId();
  const role = auth.getCurrentRole() || '';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      if (!schoolId) throw new Error('School ID not found');

      // Get all data in parallel
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
      
      // Get teachers from users table (role = 'teacher')
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
        pendingPayments,
        totalSubjects: schoolSubjects.length,
        totalMarks: schoolMarks.length,
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Define Quick Actions based on role
  const quickActions: QuickAction[] = [
    {
      label: 'Manage Schools',
      icon: <SchoolIcon className="h-5 w-5" />,
      path: '/schools',
      roles:['admin'],
      description: 'Register new school',
    },
    {
      label: 'Add Student',
      icon: <UserPlus className="h-5 w-5" />,
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

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  // Get filtered actions for current role
  const availableActions = quickActions.filter(
    (action) => action.roles.includes(role) || role === 'admin'
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.firstName || 'User'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          {role === 'admin' && 'Manage your school efficiently with real-time insights'}
          {role === 'principal' && 'Oversee school operations and performance'}
          {role === 'teacher' && 'Track your students and classes'}
          {role === 'accountant' && 'Manage school finances and payments'}
          {role === 'student' && 'View your academic progress'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-gray-600 mt-1">Active students</p>
          </CardContent>
        </Card>

        {/* Total Teachers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <UserCog className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-gray-600 mt-1">Staff members</p>
          </CardContent>
        </Card>

        {/* Total Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <School className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-gray-600 mt-1">Classes available</p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
            <p className="text-xs text-gray-600 mt-1">Subjects offered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMarks}</div>
            <p className="text-xs text-gray-600 mt-1">Marks recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableActions.map((action) => (
            <Card
              key={action.label}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-indigo-300"
              onClick={() => handleQuickAction(action.path)}
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

        {availableActions.length === 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              No quick actions available for your role. Contact an administrator for more permissions.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          This system is <strong>offline-first</strong>. All data is stored locally on your device.
          {navigator.onLine ? ' You are currently online.' : ' You are currently offline.'}
        </AlertDescription>
      </Alert>
    </div>
  );
}