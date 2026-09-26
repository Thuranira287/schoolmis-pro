import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { rbac } from '@/lib/rbac';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Edit2, Trash2, SchoolIcon, Users, Building, MapPin, Phone, Mail, Globe, Calendar, Eye, UserCog, GraduationCap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { School, User, Student } from '@/lib/db/schema';

interface SchoolFormData {
  name: string;
  adminKey: string;
  registrationNumber: string;
  email: string;
  phoneNumber: string;
  address: string;
  country: string;
  county: string;
  city: string;
  currency: string;
  timezone: string;
  academicYearStart: string;
  academicYearEnd: string;
  isActive: boolean;
}

interface SchoolStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
}

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingSchool, setViewingSchool] = useState<School | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const currentUser = auth.getCurrentUser();
  const currentRole = auth.getCurrentRole();

  // Only admin can access this page
  if (currentRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-2">Only administrators can manage schools</p>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState<SchoolFormData>({
    name: '',
    adminKey: '',
    registrationNumber: '',
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
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [allSchools, allUsers, allStudents] = await Promise.all([
        dbOps.getAll('schools'),
        dbOps.getAll('users'),
        dbOps.getAll('students'),
      ]);

      setSchools(allSchools as School[]);
      setUsers(allUsers as User[]);
      setStudents(allStudents as Student[]);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSchoolStats = (schoolId: string): SchoolStats => {
    const schoolUsers = users.filter((u: any) => u.schoolId === schoolId);
    const schoolStudents = students.filter((s: any) => s.schoolId === schoolId);
    const schoolTeachers = schoolUsers.filter((u: any) => u.role === 'teacher');
    
    return {
      totalUsers: schoolUsers.length,
      totalStudents: schoolStudents.length,
      totalTeachers: schoolTeachers.length,
    };
  };

  const resetForm = () => {
    setFormData({
      name: '',
      adminKey: '',
      registrationNumber: '',
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
      isActive: true,
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validation
      if (!formData.name || !formData.adminKey || !formData.email || !formData.county) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.adminKey.length < 6) {
        setError('Admin key must be at least 6 characters');
        return;
      }

      // Check duplicate admin key
      const duplicate = schools.find(
        (s: School) => s.adminKey === formData.adminKey && s.id !== editingId
      );
      if (duplicate) {
        setError('Admin key already exists');
        return;
      }

      const schoolData = {
        name: formData.name.trim(),
        adminKey: formData.adminKey.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        country: formData.country || 'Kenya',
        county: formData.county.trim(),
        city: formData.city.trim(),
        currency: formData.currency || 'KES',
        timezone: formData.timezone || 'Africa/Nairobi',
        academicYearStart: formData.academicYearStart,
        academicYearEnd: formData.academicYearEnd,
        isActive: formData.isActive,
        updatedAt: Date.now(),
      };

      if (editingId) {
        // Update existing school
        const school = schools.find((s: School) => s.id === editingId);
        if (school) {
          const updated: School = {
            ...school,
            ...schoolData,
            updatedAt: Date.now(),
          };
          await dbOps.write('schools', updated);
          setSuccess('School updated successfully');
        }
      } else {
        // Create new school
        const newSchool: School = {
          id: `school_${Date.now()}`,
          ...schoolData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await dbOps.write('schools', newSchool);
        setSuccess('School created successfully');
      }

      await loadData();
      setDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save school');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (school: School) => {
    setFormData({
      name: school.name,
      adminKey: school.adminKey,
      registrationNumber: school.registrationNumber || '',
      email: school.email || '',
      phoneNumber: school.phoneNumber || '',
      address: school.address || '',
      country: school.country || 'Kenya',
      county: school.county || '',
      city: school.city || '',
      currency: school.currency || 'KES',
      timezone: school.timezone || 'Africa/Nairobi',
      academicYearStart: school.academicYearStart || new Date().toISOString().split('T')[0],
      academicYearEnd: school.academicYearEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      isActive: school.isActive !== false,
    });
    setEditingId(school.id);
    setDialogOpen(true);
  };

  const handleDelete = async (school: School) => {
    if (!confirm(`Are you sure you want to delete ${school.name}? This will also delete all associated data.`)) {
      return;
    }

    try {
      // Check if school has users
      const schoolUsers = users.filter((u: any) => u.schoolId === school.id);
      
      if (schoolUsers.length > 0) {
        if (!confirm(`School has ${schoolUsers.length} users. Deleting will remove all users. Continue?`)) {
          return;
        }
        // Delete all users for this school
        for (const user of schoolUsers) {
          await dbOps.delete('users', user.id);
        }
      }

      // Check if school has students
      const schoolStudents = students.filter((s: any) => s.schoolId === school.id);
      if (schoolStudents.length > 0) {
        for (const student of schoolStudents) {
          await dbOps.delete('students', student.id);
        }
      }

      // Delete the school
      await dbOps.delete('schools', school.id);
      setSuccess(`School "${school.name}" deleted successfully`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete school');
      console.error(err);
    }
  };

  const handleView = (school: School) => {
    setViewingSchool(school);
    setViewDialogOpen(true);
  };

  // Filter schools based on active tab
  const filteredSchools = schools.filter((school) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return school.isActive !== false;
    if (activeTab === 'inactive') return school.isActive === false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading schools...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'name' as const,
      label: 'School Name',
      sortable: true,
      width: '200px',
      render: (name: string, school: School) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <SchoolIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <div className="font-medium text-sm">{name}</div>
            {school.registrationNumber && (
              <div className="text-xs text-gray-400">Reg: {school.registrationNumber}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'adminKey' as const,
      label: 'Admin Key',
      width: '120px',
      render: (adminKey: string) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
          {adminKey}
        </span>
      ),
    },
    {
      key: 'email' as const,
      label: 'Email',
      width: '160px',
      render: (email: string) => (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <span className="text-sm truncate max-w-[120px]">{email || '-'}</span>
        </div>
      ),
    },
    {
      key: 'county' as const,
      label: 'County',
      width: '100px',
      render: (county: string) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <span className="text-sm">{county || '-'}</span>
        </div>
      ),
    },
    {
      key: 'isActive' as const,
      label: 'Status',
      width: '100px',
      render: (isActive: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
          isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isActive !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'id' as const,
      label: 'Users',
      width: '100px',
      render: (id: string) => {
        const stats = getSchoolStats(id);
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              {stats.totalUsers}
            </Badge>
          </div>
        );
      },
    },
  ];

  const actions = [
    {
      label: 'View',
      icon: <Eye className="h-4 w-4" />,
      onClick: handleView,
    },
    {
      label: 'Edit',
      icon: <Edit2 className="h-4 w-4" />,
      onClick: handleEdit,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive' as const,
    },
  ];

  const activeCount = schools.filter(s => s.isActive !== false).length;
  const inactiveCount = schools.filter(s => s.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schools</h1>
          <p className="text-gray-600 mt-1">Manage all onboarded schools in the system</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setDialogOpen(true);
        }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Add School
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Schools</p>
                <p className="text-2xl font-bold">{schools.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <SchoolIcon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Schools</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Building className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Inactive Schools</p>
                <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <Building className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter((u: any) => schools.some((s: School) => s.id === u.schoolId)).length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schools Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>School Registry</CardTitle>
          <CardDescription>
            {filteredSchools.length} {filteredSchools.length === 1 ? 'school' : 'schools'} onboarded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All ({schools.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({inactiveCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          <DataTable
            data={filteredSchools}
            columns={columns}
            actions={actions}
            searchable={true}
            searchFields={['name', 'adminKey', 'email', 'county']}
          />
        </CardContent>
      </Card>

      {/* Add/Edit School Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit School' : 'Add New School'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">School Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Nairobi High School"
                />
              </div>
              <div>
                <Label htmlFor="adminKey">Admin Key *</Label>
                <Input
                  id="adminKey"
                  value={formData.adminKey}
                  onChange={(e) => setFormData({ ...formData, adminKey: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., NRBI2024SECURE"
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier, min 6 characters</p>
              </div>
            </div>

            <div>
              <Label htmlFor="email">School Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1"
                placeholder="admin@school.com"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="mt-1"
                placeholder="+254 700 000000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., SCH-001"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1"
                  placeholder="P.O Box 001, Nairobi"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="county">County *</Label>
                <Input
                  id="county"
                  value={formData.county}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Nairobi"
                />
              </div>
              <div>
                <Label htmlFor="city">City/Town</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Nairobi"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Rwanda">Rwanda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="academicYearStart">Academic Year Start</Label>
                <Input
                  id="academicYearStart"
                  type="date"
                  value={formData.academicYearStart}
                  onChange={(e) => setFormData({ ...formData, academicYearStart: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="academicYearEnd">Academic Year End</Label>
                <Input
                  id="academicYearEnd"
                  type="date"
                  value={formData.academicYearEnd}
                  onChange={(e) => setFormData({ ...formData, academicYearEnd: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                aria-label='isActive'
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer text-sm">
                Active
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View School Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5" />
              School Details
            </DialogTitle>
          </DialogHeader>

          {viewingSchool && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</p>
                  <p className="text-sm font-semibold mt-0.5">{viewingSchool.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Key</p>
                  <p className="text-sm font-mono mt-0.5">{viewingSchool.adminKey}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                  <p className="text-sm mt-0.5">{viewingSchool.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                  <p className="text-sm mt-0.5">{viewingSchool.phoneNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">County</p>
                  <p className="text-sm mt-0.5">{viewingSchool.county || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">City</p>
                  <p className="text-sm mt-0.5">{viewingSchool.city || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</p>
                  <p className="text-sm mt-0.5">{viewingSchool.registrationNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</p>
                  <p className="text-sm mt-0.5">{viewingSchool.currency || 'KES'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                  <p className="text-sm mt-0.5">{viewingSchool.address || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</p>
                  <p className="text-sm mt-0.5">
                    {viewingSchool.academicYearStart} - {viewingSchool.academicYearEnd}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium mt-0.5 inline-block ${
                    viewingSchool.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingSchool.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* School Stats */}
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">School Statistics</p>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-sm font-bold">
                      {getSchoolStats(viewingSchool.id).totalUsers}
                    </p>
                    <p className="text-xs text-gray-500">Total Users</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <GraduationCap className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-bold">
                      {getSchoolStats(viewingSchool.id).totalStudents}
                    </p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <UserCog className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-sm font-bold">
                      {getSchoolStats(viewingSchool.id).totalTeachers}
                    </p>
                    <p className="text-xs text-gray-500">Teachers</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamps</p>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <p className="text-xs text-gray-400">Created</p>
                    <p className="text-sm">{new Date(viewingSchool.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Last Updated</p>
                    <p className="text-sm">{new Date(viewingSchool.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}