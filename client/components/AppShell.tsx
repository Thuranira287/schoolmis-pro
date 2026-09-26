import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { rbac } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, Settings, User, ChevronDown, Home, Users, BookOpen, GraduationCap, ClipboardCheck, Calendar, DollarSign, FileText, BarChart3, UserCog, Shield } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Map of icon names to components
const iconMap: Record<string, any> = {
  Home: Home,
  Users: Users,
  BookOpen: BookOpen,
  GraduationCap: GraduationCap,
  ClipboardCheck: ClipboardCheck,
  Calendar: Calendar,
  DollarSign: DollarSign,
  FileText: FileText,
  BarChart3: BarChart3,
  UserCog: UserCog,
  Shield: Shield,
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const session = auth.getCurrentUser();
  const role = auth.getCurrentRole() as any;

  if (!session) {
    navigate('/login');
    return null;
  }

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
  };

  const menuItems = rbac.getMenuItems(role);

  // Check if user has access to settings
  const canAccessSettings = rbac.hasPermission(role, 'view_settings') || role === 'admin' || role === 'principal';

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
            <span className="text-sm font-bold">S</span>
          </div>
          <h1 className="text-lg font-bold">MIS Pro</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item: { label: string; path: string; icon?: string }) => {
          const Icon = iconMap[item.icon || ''] || Home;
          const isActive = window.location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-400 mb-2">Logged in as</div>
        <div className="text-sm font-medium truncate">
          {session.firstName} {session.lastName}
        </div>
        <div className="text-xs text-slate-400 truncate">{session.email}</div>
        <div className="text-xs text-indigo-400 mt-1">{rbac.getRoleDisplayName(role)}</div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex items-center justify-between px-4 h-16">
        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Title */}
        <div className="flex items-center gap-3">
          <img
          src='/School_MIS_Logo.jpg'
          alt='School MIS Pro'
          className="h-11 w-11 rounded-x1 object-cover shadow-sm"
          />
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">School MIS Pro</h2>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-indigo-600" />
              </div>
              <ChevronDown size={16} />
            </Button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                {/* User Info in Dropdown */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="font-medium text-sm text-slate-900">
                    {session.firstName} {session.lastName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{session.email}</div>
                  <div className="text-xs text-indigo-600 mt-0.5 capitalize">{role}</div>
                </div>

                {/* Profile */}
                <Button
                  onClick={() => {
                    navigate('/profile');
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left rounded-none"
                >
                  <User size={16} />
                  My Profile
                </Button>

                {/* Settings - admin and principal */}
                {canAccessSettings && (
                  <Button
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left rounded-none border-t border-slate-100"
                  >
                    <Settings size={16} />
                    System Settings
                  </Button>
                )}

                {/* Logout */}
                <Button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left rounded-none border-t border-slate-200"
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop Only */}
        <aside className="hidden md:block w-64 border-r border-slate-200 overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}