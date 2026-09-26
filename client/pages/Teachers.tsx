import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User } from '@/lib/db/schema';

// ============================================================
// TYPES
// ============================================================
interface TeacherFormData {
  firstName: string;
  lastName: string;
  email: string;
  tscNumber: string;
  phone: string;
  qualification: string;
  specialization: string;
}

// Extended User type with teacher-specific fields
interface TeacherUser extends User {
  tscNumber?: string;
  qualification?: string;
  specialization?: string;
}

// ============================================================
// COMPONENT
// ============================================================
export default function Teachers() {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TeacherFormData>({
    firstName: '',
    lastName: '',
    email: '',
    tscNumber: '',
    phone: '',
    qualification: '',
    specialization: '',
  });

  const schoolId = auth.getCurrentSchoolId();
  const userId = auth.getCurrentUserId();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      // Get all teachers for this school
      const allUsers = (await dbOps.getAll('users')) as any[];
      const schoolTeachers = allUsers
        .filter((u: any) => u.schoolId === schoolId && u.role === 'teacher')
        .map((u: any) => {
          // Parse teacher-specific fields from the user object
          // These fields are stored in the user object but not in the main User type
          return {
            ...u,
            tscNumber: u.tscNumber || '',
            qualification: u.qualification || '',
            specialization: u.specialization || '',
          } as TeacherUser;
        });
      setTeachers(schoolTeachers);
    } catch (err) {
      setError('Failed to load teachers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      tscNumber: '',
      phone: '',
      qualification: '',
      specialization: '',
    });
    setEditingId(null);
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');

      // Validation
      if (!formData.firstName || !formData.lastName || !formData.email) {
        setError('Please fill in all required fields (First Name, Last Name, Email)');
        return;
      }

      // Check if email already exists for a different user
      const allUsers = (await dbOps.getAll('users')) as any[];
      const existingUser = allUsers.find(
        (u: any) => u.email === formData.email && u.id !== editingId
      );
      if (existingUser) {
        setError('Email already in use');
        return;
      }

      // Check if TSC number already exists for a different user
      if (formData.tscNumber) {
        const existingTSC = allUsers.find(
          (u: any) => u.tscNumber === formData.tscNumber && u.id !== editingId
        );
        if (existingTSC) {
          setError('TSC Number already in use');
          return;
        }
      }

      if (editingId) {
        // Update existing teacher
        const teacher = teachers.find((t) => t.id === editingId);
        if (teacher) {
          const updated: any = {
            ...teacher,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phoneNumber: formData.phone || undefined,
            tscNumber: formData.tscNumber || undefined,
            qualification: formData.qualification || undefined,
            specialization: formData.specialization || undefined,
            updatedAt: Date.now(),
          };

          await dbOps.updateUser(updated);

          // Log audit
          await dbOps.createAuditLog({
            id: `log_${Date.now()}_${Math.random()}`,
            schoolId,
            userId: userId || '',
            action: 'update',
            entityType: 'teacher',
            entityId: editingId,
            timestamp: Date.now(),
            details: `Updated teacher: ${formData.firstName} ${formData.lastName}`,
          });

          setSuccess('Teacher updated successfully');
        }
      } else {
        // Create new teacher
        const newTeacher: any = {
          id: `user_${Date.now()}_${Math.random()}`,
          schoolId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phone || undefined,
          tscNumber: formData.tscNumber || undefined,
          qualification: formData.qualification || undefined,
          specialization: formData.specialization || undefined,
          role: 'teacher',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await dbOps.createUser(newTeacher);

        // Log audit
        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: userId || '',
          action: 'create',
          entityType: 'teacher',
          entityId: newTeacher.id,
          timestamp: Date.now(),
          details: `Created teacher: ${formData.firstName} ${formData.lastName}`,
        });

        setSuccess('Teacher created successfully');
      }

      await loadTeachers();
      setDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save teacher');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (teacher: TeacherUser) => {
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      tscNumber: teacher.tscNumber || '',
      phone: teacher.phoneNumber || '',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
    });
    setEditingId(teacher.id);
    setDialogOpen(true);
  };

  const handleDelete = async (teacher: TeacherUser) => {
    if (!confirm(`Are you sure you want to delete ${teacher.firstName} ${teacher.lastName}?`)) {
      return;
    }

    try {
      if (!schoolId) throw new Error('School ID not found');

      // Check if teacher has classes assigned
      const allClasses = (await dbOps.getAll('classes')) as any[];
      const assignedClasses = allClasses.filter(
        (c: any) => c.classTeacherId === teacher.id
      );

      if (assignedClasses.length > 0) {
        if (!confirm(`Teacher is assigned to ${assignedClasses.length} class(es). Remove them from these classes first?`)) {
          return;
        }
        // Remove teacher from classes
        for (const cls of assignedClasses) {
          cls.classTeacherId = undefined;
          await dbOps.write('classes', cls);
        }
      }

      // Mark as inactive instead of deleting
      teacher.isActive = false;
      teacher.updatedAt = Date.now();
      await dbOps.updateUser(teacher);

      // Log audit
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'delete',
        entityType: 'teacher',
        entityId: teacher.id,
        timestamp: Date.now(),
        details: `Deleted teacher: ${teacher.firstName} ${teacher.lastName}`,
      });

      setSuccess(`Teacher "${teacher.firstName} ${teacher.lastName}" deleted`);
      await loadTeachers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete teacher');
      console.error(err);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading teachers...</p>
        </div>
      </div>
    );
  }

  // Define columns with proper typing
  const columns = [
    {
      key: 'firstName' as keyof TeacherUser,
      label: 'First Name',
      sortable: true,
    },
    {
      key: 'lastName' as keyof TeacherUser,
      label: 'Last Name',
      sortable: true,
    },
    {
      key: 'tscNumber' as keyof TeacherUser,
      label: 'TSC Number',
      render: (tscNumber: string) => tscNumber || 'N/A',
    },
    {
      key: 'email' as keyof TeacherUser,
      label: 'Email',
      sortable: true,
    },
    {
      key: 'phoneNumber' as keyof TeacherUser,
      label: 'Phone',
      render: (phone: string) => phone || 'N/A',
    },
    {
      key: 'qualification' as keyof TeacherUser,
      label: 'Qualification',
      render: (qualification: string) => qualification || 'N/A',
    },
    {
      key: 'specialization' as keyof TeacherUser,
      label: 'Specialization',
      render: (specialization: string) => specialization || 'N/A',
    },
    {
      key: 'isActive' as keyof TeacherUser,
      label: 'Status',
      render: (isActive: boolean) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const activeTeachers = teachers.filter((t) => t.isActive);

  const actions = [
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
        <p className="text-gray-600 mt-1">Manage school teachers and staff</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Teachers</p>
                <p className="text-2xl font-bold">{teachers.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Teachers</p>
                <p className="text-2xl font-bold text-green-600">{activeTeachers.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With TSC Number</p>
                <p className="text-2xl font-bold text-amber-600">
                  {teachers.filter(t => t.tscNumber).length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Badge className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Specializations</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(teachers.filter(t => t.specialization).map(t => t.specialization)).size}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle>Teacher Registry</CardTitle>
            <CardDescription>
              {activeTeachers.length} {activeTeachers.length === 1 ? 'teacher' : 'teachers'} active
            </CardDescription>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit Teacher' : 'Add New Teacher'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tscNumber">TSC Number</Label>
                  <Input
                    id="tscNumber"
                    placeholder="TSC-2024-001"
                    value={formData.tscNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, tscNumber: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+254 712 345 678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input
                      id="qualification"
                      placeholder="B.Ed, M.Ed, PhD"
                      value={formData.qualification}
                      onChange={(e) =>
                        setFormData({ ...formData, qualification: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      placeholder="Mathematics, English, Science"
                      value={formData.specialization}
                      onChange={(e) =>
                        setFormData({ ...formData, specialization: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
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
        </CardHeader>

        <CardContent>
          <DataTable
            data={activeTeachers}
            columns={columns}
            actions={actions}
            searchable={true}
            searchFields={['firstName', 'lastName', 'email', 'tscNumber', 'qualification', 'specialization']}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Import missing icons
import { Users, CheckCircle, Badge, BookOpen } from 'lucide-react';