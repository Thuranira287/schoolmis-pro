import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db, dbOps } from '@/lib/db';
import { auth } from '@/lib/auth';
import { 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  School as SchoolIcon, 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Key, 
  Building, 
  Globe, 
  Calendar 
} from 'lucide-react';
import type { School, User } from '@/lib/db/schema';

interface SetupStep {
  id: number;
  label: string;
  completed: boolean;
}

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: School Info
  const [schoolData, setSchoolData] = useState({
    name: '',
    adminKey: '',
    email: '',
    phoneNumber: '',
    address: '',
    country: 'Kenya',
    county: '',
    city: '',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    academicYearStart: new Date().toISOString().split('T')[0],
    academicYearEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  });

  // Step 2: Admin Account
  const [adminData, setAdminData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const steps: SetupStep[] = [
    { id: 1, label: 'School Information', completed: step > 1 },
    { id: 2, label: 'Admin Account', completed: step > 2 },
    { id: 3, label: 'Confirmation', completed: step > 3 },
  ];

  // Get current step label safely
  const getCurrentStepLabel = (): string => {
    const currentStep = steps.find(s => s.id === step);
    return currentStep?.label || 'Step';
  };

  // Check if schools already exist
  useEffect(() => {
    const checkSchools = async () => {
      try {
        await db.initialize();
        const schools = await dbOps.getAll('schools');
        if (schools && schools.length > 0) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error checking schools:', error);
      } finally {
        setChecking(false);
      }
    };
    checkSchools();
  }, [navigate]);

  const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchoolData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminData((prev) => ({ ...prev, [name]: value }));
  };

  const validateSchoolStep = (): boolean => {
    if (!schoolData.name || !schoolData.adminKey || !schoolData.email) {
      setError('Please fill in all required fields');
      return false;
    }
    if (schoolData.adminKey.length < 6) {
      setError('Admin key must be at least 6 characters');
      return false;
    }
    if (!schoolData.county) {
      setError('Please enter your county');
      return false;
    }
    return true;
  };

  const validateAdminStep = (): boolean => {
    if (!adminData.firstName || !adminData.lastName || !adminData.email || !adminData.password) {
      setError('Please fill in all required fields');
      return false;
    }
    if (adminData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (adminData.password !== adminData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');

    if (step === 1 && validateSchoolStep()) {
      setStep(2);
    } else if (step === 2 && validateAdminStep()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(Math.max(1, step - 1));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Initialize database
      await db.initialize();

      // Create school with all required fields
      const schoolId = `school_${Date.now()}`;
      const school: School = {
        id: schoolId,
        name: schoolData.name,
        adminKey: schoolData.adminKey,
        email: schoolData.email,
        phoneNumber: schoolData.phoneNumber || '',
        address: schoolData.address || '',
        country: schoolData.country || 'Kenya',
        county: schoolData.county,
        city: schoolData.city || '',
        currency: schoolData.currency || 'KES',
        timezone: schoolData.timezone || 'Africa/Nairobi',
        academicYearStart: schoolData.academicYearStart || '',
        academicYearEnd: schoolData.academicYearEnd || '',
        registrationNumber: '',
        logo: '',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await dbOps.createSchool(school);

      // Create admin user
      const adminUserId = `user_${Date.now()}`;
      const adminUser: User = {
        id: adminUserId,
        schoolId,
        email: adminData.email,
        passwordHash: '', // Will be hashed by auth system
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: 'admin',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Hash password
      const cryptoJs = (await import('crypto-js')).default;
      const HASH_SALT = 'school-mis-pro-2024';
      adminUser.passwordHash = cryptoJs
        .SHA256(adminData.password + HASH_SALT)
        .toString();

      await dbOps.createUser(adminUser);

      // Create audit log
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: adminUserId,
        action: 'create',
        entityType: 'school',
        entityId: schoolId,
        timestamp: Date.now(),
        details: `School ${schoolData.name} created with admin ${adminData.firstName} ${adminData.lastName}`,
      });

      setSuccess(true);
      setStep(3);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError('Failed to complete setup. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
              <SchoolIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">School MIS Pro Setup</h1>
          <p className="text-gray-600 mt-2">Initialize your school management system</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    s.completed
                      ? 'bg-green-500 text-white'
                      : step === s.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s.completed ? <CheckCircle2 size={20} /> : s.id}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 mx-3 h-1 transition-colors ${
                      s.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{getCurrentStepLabel()}</CardTitle>
            <CardDescription>
              {step === 1 && 'Provide your school information'}
              {step === 2 && 'Create your administrator account'}
              {step === 3 && 'Review and complete setup'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Setup completed successfully! Redirecting to login...
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: School Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    School Name *
                  </Label>
                  <div className="relative mt-1">
                    <SchoolIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Nairobi High School"
                      value={schoolData.name}
                      onChange={handleSchoolChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="adminKey" className="text-sm font-medium">
                    Admin Key (Unique Identifier) *
                  </Label>
                  <div className="relative mt-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="adminKey"
                      name="adminKey"
                      type={showAdminKey ? 'text' : 'password'}
                      placeholder="e.g., NRBI2024SECURE"
                      value={schoolData.adminKey}
                      onChange={handleSchoolChange}
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminKey(!showAdminKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showAdminKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    A secure key to identify your school. Keep it safe!
                  </p>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    School Email *
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="admin@school.com"
                      value={schoolData.email}
                      onChange={handleSchoolChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      placeholder="+254 700 000000"
                      value={schoolData.phoneNumber}
                      onChange={handleSchoolChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="county" className="text-sm font-medium">
                      County *
                    </Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="county"
                        name="county"
                        placeholder="e.g., Nairobi"
                        value={schoolData.county}
                        onChange={handleSchoolChange}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="city" className="text-sm font-medium">
                      City/Town
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="e.g., Nairobi"
                      value={schoolData.city}
                      onChange={handleSchoolChange}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-medium">
                    Address
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="P.O Box 001, Nairobi"
                    value={schoolData.address}
                    onChange={handleSchoolChange}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Admin Account */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name *
                    </Label>
                    <div className="relative mt-1">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        value={adminData.firstName}
                        onChange={handleAdminChange}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      value={adminData.lastName}
                      onChange={handleAdminChange}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="adminEmail" className="text-sm font-medium">
                    Email Address *
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="adminEmail"
                      name="email"
                      type="email"
                      placeholder="admin@school.com"
                      value={adminData.email}
                      onChange={handleAdminChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password *
                  </Label>
                  <div className="relative mt-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={adminData.password}
                      onChange={handleAdminChange}
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password *
                  </Label>
                  <div className="relative mt-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={adminData.confirmPassword}
                      onChange={handleAdminChange}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && !success && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Review Your Information</h3>

                  {/* School Information Section */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <SchoolIcon className="h-4 w-4" />
                      School Information
                    </h4>
                    <div className="space-y-2 pl-6">
                      <div>
                        <p className="text-xs text-gray-500">School Name</p>
                        <p className="font-medium text-gray-900">{schoolData.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">School Email</p>
                        <p className="font-medium text-gray-900">{schoolData.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone Number</p>
                        <p className="font-medium text-gray-900">{schoolData.phoneNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">County</p>
                        <p className="font-medium text-gray-900">{schoolData.county}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">City</p>
                        <p className="font-medium text-gray-900">{schoolData.city || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Admin Key</p>
                        <p className="font-mono text-sm text-gray-900">{schoolData.adminKey}</p>
                      </div>
                    </div>
                  </div>

                  {/* Administrator Information Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Administrator Account
                    </h4>
                    <div className="space-y-2 pl-6">
                      <div>
                        <p className="text-xs text-gray-500">Full Name</p>
                        <p className="font-medium text-gray-900">
                          {adminData.firstName} {adminData.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{adminData.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    You can add more users and schools after completing setup.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Actions */}
            {!success && (
              <div className="flex gap-3 mt-6 justify-end">
                {step > 1 && (
                  <Button variant="outline" onClick={handleBack} disabled={loading}>
                    Back
                  </Button>
                )}

                {step < 3 ? (
                  <Button onClick={handleNext} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}