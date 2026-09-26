import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Edit2, Trash2, Users, BookOpen, GraduationCap } from 'lucide-react';
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
import type { Class, User } from '@/lib/db/schema';

// CONSTANTS - Matching Schema
const CLASS_LEVELS = [
  'PP1', 'PP2',
  'Grade1', 'Grade2', 'Grade3', 'Grade4', 'Grade5',
  'Grade6', 'Grade7', 'Grade8', 'Grade9',
  'Grade10', 'Grade11', 'Grade12'
] as const;

const LEVEL_LABELS: Record<string, string> = {
  PP1: 'Pre-Primary 1',
  PP2: 'Pre-Primary 2',
  Grade1: 'Grade 1',
  Grade2: 'Grade 2',
  Grade3: 'Grade 3',
  Grade4: 'Grade 4',
  Grade5: 'Grade 5',
  Grade6: 'Grade 6',
  Grade7: 'Grade 7',
  Grade8: 'Grade 8',
  Grade9: 'Grade 9',
  Grade10: 'Grade 10',
  Grade11: 'Grade 11',
  Grade12: 'Grade 12',
};

const STREAMS = ['A', 'B', 'C', 'D', 'E', 'F'];

const JUNIOR_LEVELS = ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3', 'Grade4', 'Grade5', 'Grade6', 'Grade7', 'Grade8', 'Grade9'];
const SENIOR_LEVELS = ['Grade10', 'Grade11', 'Grade12'];

// COMPONENT
export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    level: 'Grade1' as typeof CLASS_LEVELS[number],
    stream: 'none' as string,
    classTeacherId: 'none' as string,
  });

  const schoolId = auth.getCurrentSchoolId();
  const userId = auth.getCurrentUserId();

  // LOAD DATA
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      const [allClasses, allUsers, allStudents] = await Promise.all([
        dbOps.getAll('classes'),
        dbOps.getAll('users'),
        dbOps.getAll('students'),
      ]);

      setClasses((allClasses as any[]).filter((c: any) => c.schoolId === schoolId) as Class[]);
      setTeachers((allUsers as any[]).filter(
        (u: any) => u.schoolId === schoolId && u.role === 'teacher'
      ) as User[]);
      setStudents((allStudents as any[]).filter((s: any) => s.schoolId === schoolId && s.isActive !== false));
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // HELPERS
  const getLevelLabel = (level: string) => LEVEL_LABELS[level] || level;

  const getLevelType = (level: string): 'junior' | 'senior' => {
    if (JUNIOR_LEVELS.includes(level)) return 'junior';
    if (SENIOR_LEVELS.includes(level)) return 'senior';
    return 'junior';
  };

  const getTeacherName = (teacherId: string) => {
    if (!teacherId || teacherId === 'none') return 'N/A';
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A';
  };

  const getStudentCount = (classId: string) => {
    return students.filter((s) => s.classId === classId).length;
  };

  // FILTER CLASSES
  const filteredClasses = classes.filter(cls => {
    const searchMatch = !searchTerm ||
      cls.name.toLowerCase().includes(searchTerm.toLowerCase());

    const levelType = getLevelType(cls.level);
    const tabMatch = activeTab === 'all' || levelType === activeTab;

    return searchMatch && tabMatch;
  });

  // CRUD OPERATIONS
  const resetForm = () => {
    setFormData({
      name: '',
      level: 'Grade1',
      stream: 'none',
      classTeacherId: 'none',
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');

      if (!formData.level) {
        setError('Please select a level');
        return;
      }

      const className = `${getLevelLabel(formData.level)}${formData.stream && formData.stream !== 'none' ? ` ${formData.stream}` : ''}`;

      if (editingId) {
        const classItem = classes.find((c) => c.id === editingId);
        if (classItem) {
          const updated: Class = {
            ...classItem,
            name: className,
            level: formData.level,
            stream: formData.stream === 'none' ? undefined : formData.stream,
            classTeacherId: formData.classTeacherId === 'none' ? undefined : formData.classTeacherId,
            updatedAt: Date.now(),
          };
          await dbOps.write('classes', updated);

          await dbOps.createAuditLog({
            id: `log_${Date.now()}_${Math.random()}`,
            schoolId,
            userId: userId || '',
            action: 'update',
            entityType: 'class',
            entityId: editingId,
            timestamp: Date.now(),
            details: `Updated class: ${className}`,
          });

          setSuccess('Class updated successfully');
        }
      } else {
        const newClass: Class = {
          id: `class_${Date.now()}_${Math.random()}`,
          schoolId,
          name: className,
          level: formData.level,
          stream: formData.stream === 'none' ? undefined : formData.stream,
          classTeacherId: formData.classTeacherId === 'none' ? undefined : formData.classTeacherId,
          studentCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await dbOps.write('classes', newClass);

        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: userId || '',
          action: 'create',
          entityType: 'class',
          entityId: newClass.id,
          timestamp: Date.now(),
          details: `Created class: ${className}`,
        });

        setSuccess('Class created successfully');
      }

      await loadData();
      setDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save class');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (classItem: Class) => {
    setFormData({
      name: classItem.name,
      level: classItem.level,
      stream: classItem.stream || 'none',
      classTeacherId: classItem.classTeacherId || 'none',
    });
    setEditingId(classItem.id);
    setDialogOpen(true);
  };

  const handleDelete = async (classItem: Class) => {
    const studentCount = getStudentCount(classItem.id);
    if (studentCount > 0) {
      if (!confirm(`Class has ${studentCount} students. Deleting will require reassigning students. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete ${classItem.name}?`)) {
        return;
      }
    }

    try {
      if (!schoolId) throw new Error('School ID not found');

      const classStudents = students.filter((s) => s.classId === classItem.id);
      for (const student of classStudents) {
        student.classId = '';
        student.updatedAt = Date.now();
        await dbOps.updateStudent(student);
      }

      await dbOps.delete('classes', classItem.id);

      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'delete',
        entityType: 'class',
        entityId: classItem.id,
        timestamp: Date.now(),
        details: `Deleted class: ${classItem.name}`,
      });

      setSuccess(`Class "${classItem.name}" deleted`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete class');
      console.error(err);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  // ============================================================
  // STATS
  // ============================================================
  const stats = {
    total: classes.length,
    junior: classes.filter(c => JUNIOR_LEVELS.includes(c.level)).length,
    senior: classes.filter(c => SENIOR_LEVELS.includes(c.level)).length,
    totalStudents: students.length,
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'name' as const,
      label: 'Class Name',
      sortable: true,
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      key: 'level' as const,
      label: 'Level',
      render: (level: string) => (
        <Badge variant={JUNIOR_LEVELS.includes(level) ? 'default' : 'secondary'}>
          {getLevelLabel(level)}
        </Badge>
      ),
    },
    {
      key: 'form' as const,
      label: 'Form',
      render: (form: number) => form > 0 ? `Form ${form}` : '-',
    },
    {
      key: 'stream' as const,
      label: 'Stream',
      render: (stream: string) => stream || '-',
    },
    {
      key: 'classTeacherId' as const,
      label: 'Class Teacher',
      render: (teacherId: string) => getTeacherName(teacherId),
    },
    {
      key: 'id' as const,
      label: 'Students',
      render: (id: string) => (
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {getStudentCount(id)}
        </Badge>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
        <p className="text-gray-600 mt-1">Manage school classes and sections</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Classes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Junior School</p>
                <p className="text-2xl font-bold text-green-600">{stats.junior}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Senior School</p>
                <p className="text-2xl font-bold text-purple-600">{stats.senior}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-amber-600">{stats.totalStudents}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Users className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle>Class Registry</CardTitle>
            <CardDescription>
              {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'}
            </CardDescription>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Class' : 'Add New Class'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="level">Level *</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: typeof CLASS_LEVELS[number]) =>
                      setFormData({ ...formData, level: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PP1">Pre-Primary 1</SelectItem>
                      <SelectItem value="PP2">Pre-Primary 2</SelectItem>
                      <SelectItem value="Grade1">Grade 1</SelectItem>
                      <SelectItem value="Grade2">Grade 2</SelectItem>
                      <SelectItem value="Grade3">Grade 3</SelectItem>
                      <SelectItem value="Grade4">Grade 4</SelectItem>
                      <SelectItem value="Grade5">Grade 5</SelectItem>
                      <SelectItem value="Grade6">Grade 6</SelectItem>
                      <SelectItem value="Grade7">Grade 7</SelectItem>
                      <SelectItem value="Grade8">Grade 8</SelectItem>
                      <SelectItem value="Grade9">Grade 9</SelectItem>
                      <SelectItem value="Grade10">Grade 10</SelectItem>
                      <SelectItem value="Grade11">Grade 11</SelectItem>
                      <SelectItem value="Grade12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/*<div>
                  <Label htmlFor="form">Form</Label>
                  <Select
                    value={String(formData.form)}
                    onValueChange={(value) =>
                      setFormData({ ...formData, form: parseInt(value) || 0 })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">-</SelectItem>
                      <SelectItem value="1">Form 1</SelectItem>
                      <SelectItem value="2">Form 2</SelectItem>
                      <SelectItem value="3">Form 3</SelectItem>
                      <SelectItem value="4">Form 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>*/}

                <div>
                  <Label htmlFor="stream">Stream</Label>
                  <Select
                    value={formData.stream}
                    onValueChange={(value) =>
                      setFormData({ ...formData, stream: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Stream</SelectItem>
                      {STREAMS.map((s) => (
                        <SelectItem key={s} value={s}>
                          Stream {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="classTeacherId">Class Teacher</Label>
                  <Select
                    value={formData.classTeacherId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, classTeacherId: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Teacher Assigned</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Class will be named:</p>
                  <p className="font-medium">
                    {getLevelLabel(formData.level)}
                    {formData.stream && formData.stream !== 'none' ? ` ${formData.stream}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">All ({classes.length})</TabsTrigger>
                <TabsTrigger value="junior">Junior ({stats.junior})</TabsTrigger>
                <TabsTrigger value="senior">Senior ({stats.senior})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/*<DataTable data={filteredClasses} columns={columns} actions={actions} searchable={false} />*/}
        </CardContent>
      </Card>

      {/* CBC Curriculum Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CBC Curriculum Structure</CardTitle>
          <CardDescription>Understanding the Junior and Senior School levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg border-green-200 bg-green-50">
              <h4 className="font-semibold text-green-800">Junior School</h4>
              <p className="text-sm text-gray-600 mt-2">PP1 to Grade 9</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {JUNIOR_LEVELS.map((level) => (
                  <Badge key={level} variant="outline" className="text-xs">
                    {getLevelLabel(level)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg border-purple-200 bg-purple-50">
              <h4 className="font-semibold text-purple-800">Senior School</h4>
              <p className="text-sm text-gray-600 mt-2">Grade 10 to 12</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {SENIOR_LEVELS.map((level) => (
                  <Badge key={level} variant="outline" className="text-xs">
                    {getLevelLabel(level)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}