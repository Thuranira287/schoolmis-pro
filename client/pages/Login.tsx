import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auth } from '@/lib/auth';
import { rbac } from '@/lib/rbac';
import { AlertCircle, Loader2, Eye, EyeOff, Shield, User, School, Key } from 'lucide-react';

// Role display names and icons
const ROLE_INFO = {
  admin: { label: 'Administrator', icon: Shield, color: 'text-purple-600' },
  principal: { label: 'Principal', icon: School, color: 'text-blue-600' },
  teacher: { label: 'Teacher', icon: User, color: 'text-green-600' },
  accountant: { label: 'Accountant', icon: User, color: 'text-amber-600' },
  student: { label: 'Student', icon: User, color: 'text-pink-600' },
};

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [checkingSchools, setCheckingSchools] = useState(true);
  const [hasSchools, setHasSchools] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminKey: '',
  });

  // Check if any schools exist
  useEffect(() => {
    const checkSchools = async () => {
      try {
        const { dbOps } = await import('@/lib/db');
        const schools = await dbOps.getAll('schools');
        setHasSchools(schools && schools.length > 0);
        
        // If no schools, redirect to setup
        if (!schools || schools.length === 0) {
          navigate('/setup');
        }
      } catch (error) {
        console.error('Error checking schools:', error);
      } finally {
        setCheckingSchools(false);
      }
    };
    checkSchools();
  }, [navigate]);

  // Check if user is already logged in
  useEffect(() => {
    const session = auth.getCurrentUser();
    if (session) {
      const dashboardPath = rbac.getDashboardPath(session.role);
      navigate(dashboardPath);
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate admin key
      if (!formData.adminKey.trim()) {
        setError('Please enter your school admin key');
        setLoading(false);
        return;
      }

      const result = await auth.login(formData);

      if (result.success && result.user) {
        const dashboardPath = rbac.getDashboardPath(result.user.role);
        
        // Store user info in session
        sessionStorage.setItem('userRole', result.user.role);
        sessionStorage.setItem('userName', `${result.user.firstName} ${result.user.lastName}`);
        sessionStorage.setItem('userEmail', result.user.email);
        
        navigate(dashboardPath);
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSchools) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          {/* Logo */}
            <img
              src="/School_MIS_Logo.jpg"
              alt="School MIS Pro"
              className="max-auto h-40 w-auto object-contain drop-shadow-lg"
            />
          

          {/* Brand */}
         {/*} <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            School MIS Pro
          </h1>*/}

          <p className="mt-2 text-sm text-gray-600">
            Offline-first Education Management System
          </p>

          {hasSchools && (
            <p className="mt-1.5 text-xs text-gray-500">
              Secure login for staff and students
            </p>
          )}
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Admin Key */}
              <div>
                <Label htmlFor="adminKey" className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4 text-gray-500" />
                  School Admin Key
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="adminKey"
                    name="adminKey"
                    type={showAdminKey ? 'text' : 'password'}
                    placeholder="Enter your school's admin key"
                    value={formData.adminKey}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    className="pr-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminKey(!showAdminKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showAdminKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  The unique key provided during school setup
                </p>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="mt-1 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    className="pr-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Support Info */}
            <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600">
                    <strong>Need help?</strong> Contact your school administrator for login credentials.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    This is a secure offline-first system. All data is encrypted and stored locally.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Works offline • Secure • Built for Kenya 🇰🇪
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Version 1.0.0 • CBC Compliant
          </p>
        </div>
      </div>
    </div>
  );
}