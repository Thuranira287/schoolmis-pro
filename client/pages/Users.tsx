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
import { AlertCircle, Loader2, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
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
interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  tscNumber: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'teacher' | 'principal' | 'accountant' | 'student';
  specialization: string;
  qualification: string;
  phone: string;
}

// ============================================================
// COMPONENT
// ============================================================
export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    tscNumber: '',
    password: '',
    confirmPassword: '',
    role: 'teacher',
    specialization: '',
    qualification: '',
    phone: '',
  });

  const schoolId = auth.getCurrentSchoolId();
  const currentUserRole = auth.getCurrentRole();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      const allUsers = (await dbOps.getAll('users')) as any[];
      const schoolUsers = allUsers
        .filter((u: any) => u.schoolId === schoolId)
        .map((u: any) => u as User);
      setUsers(schoolUsers);
    } catch (err) {
      setError('Failed to load users');
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
      password: '',
      confirmPassword: '',
      role: 'teacher',
      specialization: '',
      qualification: '',
      phone: '',
    });
    setEditingId(null);
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');

      // Validation
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
        setError('Please fill in all required fields');
        return;
      }

      // Check authorization
      if (!rbac.canManageUserRole(currentUserRole as any, formData.role as any)) {
        setError('You do not have permission to manage this role');
        return;
      }

      if (editingId) {
        // Update user
        const user = users.find((u) => u.id === editingId);
        if (user) {
          const updated: User = {
            ...user,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            role: formData.role,
            phoneNumber: formData.phone,
            updatedAt: Date.now(),
          };

          await dbOps.updateUser(updated);

          // Log audit
          await dbOps.createAuditLog({
            id: `log_${Date.now()}_${Math.random()}`,
            schoolId,
            userId: auth.getCurrentUserId() || '',
            action: 'update',
            entityType: 'user',
            entityId: editingId,
            timestamp: Date.now(),
            details: `Updated user: ${formData.firstName} ${formData.lastName}`,
          });

          setSuccess('User updated successfully');
        }
      } else {
        // Create new user
        if (!formData.password || formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        // Check if email already exists
        const existing = await dbOps.getUserByEmail(schoolId, formData.email);
        if (existing) {
          setError('Email already in use');
          return;
        }

        // Hash password
        const CryptoJS = (await import('crypto-js')).default;
        const HASH_SALT = 'school-mis-pro-2024';
        const passwordHash = CryptoJS.SHA256(formData.password + HASH_SALT).toString();

        const newUser: User = {
          id: `user_${Date.now()}_${Math.random()}`,
          schoolId,
          email: formData.email,
          passwordHash,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          phoneNumber: formData.phone,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await dbOps.createUser(newUser);

        // Log audit
        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: auth.getCurrentUserId() || '',
          action: 'create',
          entityType: 'user',
          entityId: newUser.id,
          timestamp: Date.now(),
          details: `Created user: ${formData.firstName} ${formData.lastName}`,
        });

        setSuccess('User created successfully');
      }

      await loadUsers();
      setDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save user');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    // Check if current user can manage this role
    if (!rbac.canManageUserRole(currentUserRole as any, user.role as any)) {
      setError('You do not have permission to edit this user');
      return;
    }

    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      tscNumber: (user as any).tscNumber || '',
      password: '',
      confirmPassword: '',
      role: user.role,
      phone: user.phoneNumber || '',
      qualification: (user as any).qualification || '',
      specialization: (user as any).specialization || '',
    });
    setEditingId(user.id);
    setDialogOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!rbac.canManageUserRole(currentUserRole as any, user.role as any)) {
      setError('You do not have permission to delete this user');
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      try {
        if (!schoolId) throw new Error('School ID not found');

        // Mark as inactive
        user.isActive = false;
        user.updatedAt = Date.now();
        await dbOps.updateUser(user);

        // Log audit
        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: auth.getCurrentUserId() || '',
          action: 'delete',
          entityType: 'user',
          entityId: user.id,
          timestamp: Date.now(),
          details: `Deleted user: ${user.firstName} ${user.lastName}`,
        });

        await loadUsers();
        setSuccess(`User "${user.firstName} ${user.lastName}" deleted`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to delete user');
        console.error(err);
      }
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const getRoleDisplayName = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrator',
      teacher: 'Teacher',
      principal: 'Principal',
      accountant: 'Accountant',
      student: 'Student',
    };
    return roles[role] || role;
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.isActive);

  // Define columns with proper typing
  const columns = [
    {
      key: 'email' as keyof User,
      label: 'Email',
      sortable: true,
    },
    {
      key: 'firstName' as keyof User,
      label: 'First Name',
      sortable: true,
    },
    {
      key: 'lastName' as keyof User,
      label: 'Last Name',
      sortable: true,
    },
    {
      key: 'role' as keyof User,
      label: 'Role',
      render: (role: string) => getRoleDisplayName(role),
    },
    {
      key: 'phoneNumber' as keyof User,
      label: 'Phone Number',
    },
    {
      key: 'isActive' as keyof User,
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

  // Role options based on current user role
  const availableRoles = currentUserRole === 'admin' 
    ? ['teacher', 'principal', 'accountant', 'student']
    : ['teacher', 'accountant', 'student'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600 mt-1">Manage school staff and user accounts</p>
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
            <CardTitle>User Registry</CardTitle>
            <CardDescription>
              {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} active
            </CardDescription>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit User' : 'Add New User'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1"
                    disabled={!!editingId}
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleDisplayName(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>

                {!editingId && (
                  <>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Min 8 characters</p>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
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
            data={activeUsers}
            columns={columns}
            actions={actions}
            searchable={true}
            searchFields={['firstName', 'lastName', 'email', 'role']}
          />
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Role Permissions:</strong> Teachers can edit students and enter marks. 
          Principals can manage teachers. Only Admins can manage principals.
        </AlertDescription>
      </Alert>
    </div>
  );
}