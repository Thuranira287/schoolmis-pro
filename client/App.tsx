// App.tsx - Update the initialization logic

import "./global.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { dbAdapter } from "@/lib/db/adapter";
import { auth } from "@/lib/auth";
import { dbOps } from "@/lib/db";

// Pages
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Teachers from "./pages/Teachers";
import Marks from "./pages/Marks";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Analytics from "./pages/Analytics";
import AuditLogs from "./pages/AuditLogs";
import Subjects from "./pages/Subjects";
import Settings from "./pages/Settings";
import Attendance from "./pages/Attendance";
import Payments from "./pages/Payments";
import Schools from "./pages/Schools"
import NotFound from "./pages/NotFound";

// Components
import AppShell from "@/components/AppShell";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function AppContent() {
  const [initialized, setInitialized] = useState(false);
  const [hasSchools, setHasSchools] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeApp();
    if ((window as any).electronAPI) {
    console.log('✅ Electron API available');}
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database adapter
      await dbAdapter.initialize();

      // Initialize auth
      await auth.initialize();

      // Check if any schools exist
      const schools = await dbAdapter.getAll("schools");
      setHasSchools(schools.length > 0);

      // Check if user is authenticated
      const user = auth.getCurrentUser();
      setIsAuthenticated(!!user);

      setInitialized(true);
    } catch (error) {
      console.error("Failed to initialize app:", error);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">School MIS Pro</h1>
          <p className="text-gray-600 mt-2">Initializing system...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Setup Route - Only if no schools exist */}
        {!hasSchools ? (
          <>
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            {/* Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Dashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Dashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/schools"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AppShell>
                    <Schools />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'teacher']}>
                  <AppShell>
                    <Students />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/classes"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'teacher']}>
                  <AppShell>
                    <Classes />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teachers"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal']}>
                  <AppShell>
                    <Teachers />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/subjects"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'teacher']}>
                  <AppShell>
                    <Subjects />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/marks"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'teacher', 'student']}>
                  <AppShell>
                    <Marks />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'teacher']}>
                  <AppShell>
                    <Attendance />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/payments"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'accountant']}>
                  <AppShell>
                    <Payments />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'teacher', 'accountant', 'student']}>
                  <AppShell>
                    <Reports />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal', 'teacher']}>
                  <AppShell>
                    <Analytics />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal']}>
                  <AppShell>
                    <Users />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal']}>
                  <AppShell>
                    <AuditLogs />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredRoles={['admin', 'principal']}>
                  <AppShell>
                    <Settings />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route 
            path="/NotFound"
            element= {
              <NotFound />
            }
            />
            {/* Catch all - redirect to login if not authenticated, else dashboard */}
            <Route
              path="*"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;