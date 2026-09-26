// components/Sidebar.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  ClipboardCheck, 
  Calendar, 
  DollarSign, 
  FileText, 
  Settings, 
  UserCog, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Home,
  User,
  School,
  Award,
  CreditCard,
  FileBarChart,
  Shield,
  ChevronDown,
  ChevronRight,
  SchoolIcon,
  UserPlus
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { rbac } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher', 'accountant', 'student'],
  },
    {
    label: 'Schools',
    path: '/schools',
    icon: <School className="h-4 w-4" />,
    roles: ['admin'],
  },
  {
    label: 'Students',
    path: '/students',
    icon: <Users className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher'],
  },
  {
    label: 'Teachers',
    path: '/teachers',
    icon: <UserCog className="h-4 w-4" />,
    roles: ['admin', 'principal'],
  },
  {
    label: 'Classes',
    path: '/classes',
    icon: <School className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher'],
  },
  {
    label: 'Subjects',
    path: '/subjects',
    icon: <BookOpen className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher'],
  },
  {
    label: 'Marks',
    path: '/marks',
    icon: <ClipboardCheck className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher', 'student'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher'],
  },
  {
    label: 'Payments',
    path: '/payments',
    icon: <DollarSign className="h-4 w-4" />,
    roles: ['admin', 'principal', 'accountant'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <FileText className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher', 'accountant', 'student'],
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['admin', 'principal', 'teacher'],
  },
  {
    label: 'Users',
    path: '/users',
    icon: <UserPlus className="h-4 w-4" />,
    roles: ['admin', 'principal'],
  },
  {
    label: 'Audit Logs',
    path: '/audit',
    icon: <Shield className="h-4 w-4" />,
    roles: ['admin', 'principal'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['admin', 'principal'],
  },
];

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ className, isMobile, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user) {
      setUserRole(user.role);
      setUserName(`${user.firstName} ${user.lastName}`);
      setUserEmail(user.email);
    }
  }, []);

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onClose) onClose();
  };

  const getMenuItems = () => {
    if (!userRole) return [];
    return NAV_ITEMS.filter(item => item.roles.includes(userRole));
  };

  const menuItems = getMenuItems();

  return (
    <aside className={cn(
      "flex h-full w-64 flex-col bg-white border-r border-gray-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 px-4 py-4">
          <img
            src="/School_MIS_Logo.jpg"
            alt="School MIS Pro"
            className="h-10 w-10 rounded-xl object-cover shadow-md ring-white/10"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">MIS Pro</p>
            <p className="text-xs text-slate-400">School Management</p>
          </div>
          {/*<div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <span className="font-semibold text-gray-900">School MIS Pro</span>*/}
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-indigo-600 font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            {userRole && (
              <p className="text-xs text-indigo-600 font-medium capitalize">{userRole}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span className={cn(
                  "flex-shrink-0",
                  isActive ? "text-indigo-600" : "text-gray-400"
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}