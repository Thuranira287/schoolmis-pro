import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Edit2, Trash2, BookOpen, Search, Filter, Power, Award, Database, GraduationCap } from 'lucide-react';
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
import type { Subject } from '@/lib/db/schema';

// ============================================================
// CONSTANTS - Matching Schema
// ============================================================
const SUBJECT_CATEGORIES = [
  { value: 'Core', label: 'Core Subjects', color: '#3b82f6' },
  { value: 'Languages', label: 'Languages', color: '#8b5cf6' },
  { value: 'Sciences', label: 'Sciences', color: '#22c55e' },
  { value: 'Humanities', label: 'Humanities', color: '#f59e0b' },
  { value: 'Technical', label: 'Technical Studies', color: '#ef4444' },
  { value: 'Creative Arts', label: 'Creative Arts', color: '#ec4899' },
  { value: 'Physical Education', label: 'Physical Education', color: '#14b8a6' },
  { value: 'Religious Education', label: 'Religious Education', color: '#f97316' },
];

// CBC Core Subjects (9 compulsory subjects)
const CBC_CORE_SUBJECTS = [
  'English',
  'Kiswahili',
  'Mathematics',
  'Social Studies',
  'CRE',
  'Integrated Science',
  'Agriculture/Nutrition',
  'Free Technical',
  'Creative Arts'
];

// STEM Subjects
const CBC_STEM_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Studies',
  'General Science',
  'Home Science',
  'Aviation Technology',
  'Building Construction',
  'Electricity',
  'Metalwork',
  'Power Mechanics',
  'Woodwork',
  'Advanced Mathematics'
];

// Social Sciences Subjects
const CBC_SOCIAL_SCIENCES_SUBJECTS = [
  'History and Citizenship',
  'Geography',
  'Business Studies',
  'Religious Education',
  'Literature in English',
  'Indigenous Languages',
  'Kenya Sign Language',
  'French',
  'German',
  'Mandarin',
  'Arabic'
];

// Default subjects for quick import
const DEFAULT_SUBJECTS = [
  // Core Subjects
  { name: 'English', code: 'ENG', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'Kiswahili', code: 'KIS', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'Mathematics', code: 'MAT', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'Social Studies', code: 'SST', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'CRE', code: 'CRE', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'Integrated Science', code: 'SCI', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'Agriculture/Nutrition', code: 'AGR', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'Free Technical', code: 'FRE', category: 'Core', maxMarks: 100, isCore: true },
  { name: 'Creative Arts', code: 'CAS', category: 'Core', maxMarks: 100, isCore: true },

  // STEM
  { name: 'Physics', code: 'PHY', category: 'Sciences', maxMarks: 100, isCore: false },
  { name: 'Chemistry', code: 'CHE', category: 'Sciences', maxMarks: 100, isCore: false },
  { name: 'Biology', code: 'BIO', category: 'Sciences', maxMarks: 100, isCore: false },
  { name: 'Computer Studies', code: 'CMP', category: 'Technical', maxMarks: 100, isCore: false },
  { name: 'Home Science', code: 'HOM', category: 'Technical', maxMarks: 100, isCore: false },

  // Humanities
  { name: 'History and Citizenship', code: 'HIS', category: 'Humanities', maxMarks: 100, isCore: false },
  { name: 'Geography', code: 'GEO', category: 'Humanities', maxMarks: 100, isCore: false },
  { name: 'Business Studies', code: 'BUS', category: 'Humanities', maxMarks: 100, isCore: false },

  // Languages
  { name: 'French', code: 'FRN', category: 'Languages', maxMarks: 100, isCore: false },
  { name: 'German', code: 'GER', category: 'Languages', maxMarks: 100, isCore: false },
  { name: 'Literature in English', code: 'LIT', category: 'Languages', maxMarks: 100, isCore: false },

  // Creative Arts & PE
  { name: 'Music', code: 'MUS', category: 'Creative Arts', maxMarks: 100, isCore: false },
  { name: 'Physical Education', code: 'PE', category: 'Physical Education', maxMarks: 100, isCore: false },
];

// ============================================================
// COMPONENT
// ============================================================
export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [importing, setImporting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    description: '',
    classLevel: '' as '' | 'junior' | 'senior',
    maxMarks: 100,
    isActive: true,
  });

  const schoolId = auth.getCurrentSchoolId();
  const userId = auth.getCurrentUserId();

  // ============================================================
  // LOAD DATA
  // ============================================================
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      const allSubjects = await dbOps.getAll('subjects') as Subject[];
      const schoolSubjects = allSubjects.filter((s) => s.schoolId === schoolId);
      setSubjects(schoolSubjects);
    } catch (err) {
      setError('Failed to load subjects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const getCategoryColor = (category: string): string => {
    const found = SUBJECT_CATEGORIES.find(c => c.value === category);
    return found?.color || '#6b7280';
  };

  const getCategoryLabel = (category: string): string => {
    const found = SUBJECT_CATEGORIES.find(c => c.value === category);
    return found?.label || category;
  };

  const isCoreSubject = (name: string): boolean => {
    return CBC_CORE_SUBJECTS.includes(name);
  };

  const getSubjectStats = () => {
    const total = subjects.length;
    const active = subjects.filter(s => s.isActive !== false).length;
    const core = subjects.filter(s => isCoreSubject(s.name)).length;
    const categories = new Set(subjects.map(s => s.category)).size;
    return { total, active, core, categories };
  };

  // ============================================================
  // FILTER
  // ============================================================
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = !searchTerm ||
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || subject.category === categoryFilter;

    const isCore = isCoreSubject(subject.name);
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'core' && isCore) ||
      (activeTab === 'elective' && !isCore);

    return matchesSearch && matchesCategory && matchesTab;
  });

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: '',
      description: '',
      classLevel: '',
      maxMarks: 100,
      isActive: true,
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

      if (!formData.name.trim() || !formData.code.trim() || !formData.category) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.maxMarks <= 0 || formData.maxMarks > 1000) {
        setError('Maximum marks must be between 1 and 1000');
        return;
      }

      const existingSubject = subjects.find(
        (s) => s.code === formData.code.toUpperCase() && s.id !== editingId
      );
      if (existingSubject) {
        setError(`Subject code "${formData.code}" already exists`);
        return;
      }

      if (editingId) {
        const subject = subjects.find((s) => s.id === editingId);
        if (subject) {
          const updated: Subject = {
            ...subject,
            name: formData.name.trim(),
            code: formData.code.toUpperCase(),
            category: formData.category,
            description: formData.description || '',
            classLevel: formData.classLevel || undefined,
            maxMarks: formData.maxMarks,
            isActive: formData.isActive,
            updatedAt: Date.now()
          };
          await dbOps.write('subjects', updated);

          await dbOps.createAuditLog({
            id: `log_${Date.now()}_${Math.random()}`,
            schoolId,
            userId: userId || '',
            action: 'update',
            entityType: 'subject',
            entityId: editingId,
            timestamp: Date.now(),
            details: `Updated subject: ${formData.name}`,
          });

          setSuccess('Subject updated successfully');
        }
      } else {
        const newSubject: Subject = {
          id: `subj_${Date.now()}_${Math.random()}`,
          schoolId,
          name: formData.name.trim(),
          code: formData.code.toUpperCase(),
          category: formData.category,
          description: formData.description || '',
          classLevel: formData.classLevel || undefined,
          maxMarks: formData.maxMarks,
          isActive: formData.isActive,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await dbOps.write('subjects', newSubject);

        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: userId || '',
          action: 'create',
          entityType: 'subject',
          entityId: newSubject.id,
          timestamp: Date.now(),
          details: `Created subject: ${formData.name}`,
        });

        setSuccess('Subject added successfully');
      }

      await loadSubjects();
      setDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save subject');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    setFormData({
      name: subject.name,
      code: subject.code,
      category: subject.category,
      description: subject.description || '',
      classLevel: subject.classLevel || '',
      maxMarks: subject.maxMarks || 100,
      isActive: subject.isActive !== false,
    });
    setEditingId(subject.id);
    setDialogOpen(true);
  };

  const handleDelete = async (subject: Subject) => {
    const isCore = isCoreSubject(subject.name);
    if (isCore) {
      if (!confirm(`"${subject.name}" is a core subject. Deleting it may affect student records. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete "${subject.name}"?`)) {
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      const allMarks = await dbOps.getAll('marks') as any[];
      const subjectMarks = allMarks.filter((m) => m.subjectId === subject.id);

      if (subjectMarks.length > 0) {
        if (!confirm(`Subject has ${subjectMarks.length} marks recorded. Deleting will remove these marks. Continue?`)) {
          setLoading(false);
          return;
        }
        for (const mark of subjectMarks) {
          await dbOps.delete('marks', mark.id);
        }
      }

      await dbOps.delete('subjects', subject.id);

      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'delete',
        entityType: 'subject',
        entityId: subject.id,
        timestamp: Date.now(),
        details: `Deleted subject: ${subject.name}`,
      });

      setSuccess(`Subject "${subject.name}" deleted`);
      await loadSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete subject');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (subject: Subject) => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      const updated: Subject = {
        ...subject,
        isActive: !subject.isActive,
        updatedAt: Date.now()
      };
      await dbOps.write('subjects', updated);

      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'update',
        entityType: 'subject',
        entityId: subject.id,
        timestamp: Date.now(),
        details: `${subject.isActive ? 'Deactivated' : 'Activated'} subject: ${subject.name}`,
      });

      setSuccess(`Subject "${subject.name}" ${updated.isActive ? 'activated' : 'deactivated'}`);
      await loadSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update subject status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportDefaultSubjects = async () => {
    if (!confirm(`This will import ${DEFAULT_SUBJECTS.length} default CBC subjects. Continue?`)) {
      return;
    }

    try {
      setImporting(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');

      let imported = 0;
      let skipped = 0;
      const existingCodes = new Set(subjects.map(s => s.code));

      for (const defaultSubj of DEFAULT_SUBJECTS) {
        if (existingCodes.has(defaultSubj.code)) {
          skipped++;
          continue;
        }

        const newSubject: Subject = {
          id: `subj_${Date.now()}_${Math.random()}`,
          schoolId,
          name: defaultSubj.name,
          code: defaultSubj.code,
          category: defaultSubj.category,
          description: '',
          classLevel: undefined,
          maxMarks: defaultSubj.maxMarks || 100,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await dbOps.write('subjects', newSubject);
        imported++;
      }

      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'create',
        entityType: 'subject',
        entityId: 'bulk_import',
        timestamp: Date.now(),
        details: `Imported ${imported} default subjects, ${skipped} skipped`,
      });

      setSuccess(`Imported ${imported} subjects${skipped > 0 ? `, ${skipped} skipped` : ''}`);
      await loadSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to import subjects');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setActiveTab('all');
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  const stats = getSubjectStats();

  const columns = [
    {
      key: 'code' as const,
      label: 'Code',
      width: '100px',
      render: (code: string) => (
        <span className="font-mono font-medium text-sm bg-gray-100 px-2 py-1 rounded">{code}</span>
      ),
    },
    {
      key: 'name' as const,
      label: 'Subject Name',
      render: (name: string, subject: Subject) => {
        const isCore = isCoreSubject(name);
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: getCategoryColor(subject.category) }}
            >
              {subject.code.substring(0, 2)}
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {name}
                {isCore && <Badge className="bg-green-600 text-xs">Core</Badge>}
              </div>
              {subject.description && (
                <div className="text-xs text-gray-500">{subject.description}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'category' as const,
      label: 'Category',
      render: (category: string) => (
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: getCategoryColor(category) + '20',
            color: getCategoryColor(category)
          }}
        >
          {getCategoryLabel(category)}
        </span>
      ),
    },
    {
      key: 'classLevel' as const,
      label: 'Class Level',
      render: (level: string | undefined) => {
        if (!level) return <span className="text-gray-400 text-xs">All Levels</span>;
        const labels: Record<string, string> = {
          junior: 'Junior (Grade 7-9)',
          senior: 'Senior (Grade 10-12)'
        };
        return <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">{labels[level] || level}</span>;
      },
    },
    {
      key: 'maxMarks' as const,
      label: 'Max Marks',
      render: (maxMarks: number) => (
        <div className="flex items-center gap-1">
          <Award className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{maxMarks || 100}</span>
        </div>
      ),
    },
    {
      key: 'isActive' as const,
      label: 'Status',
      render: (isActive: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isActive !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const actions = [
    {
      label: 'Toggle Status',
      icon: <Power className="h-4 w-4" />,
      onClick: handleToggleStatus,
      variant: 'outline' as const,
    },
    {
      label: 'Edit',
      icon: <Edit2 className="h-4 w-4" />,
      onClick: handleEdit,
      variant: 'outline' as const,
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
        <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
        <p className="text-gray-600 mt-1">Manage school subjects and curriculum</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Subjects</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Core Subjects</p>
                <p className="text-2xl font-bold text-green-600">{stats.core}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <GraduationCap className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Subjects</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Categories</p>
                <p className="text-2xl font-bold text-purple-600">{stats.categories}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Filter className="w-6 h-6 text-purple-500" />
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
            <CardTitle>Subject Registry</CardTitle>
            <CardDescription>
              {filteredSubjects.length} {filteredSubjects.length === 1 ? 'subject' : 'subjects'}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImportDefaultSubjects} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Import Default
            </Button>

            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Subject Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Subject Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="font-mono"
                        placeholder="e.g., MAT"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="classLevel">Class Level</Label>
                      <Select
                        value={formData.classLevel}
                        onValueChange={(value: '' | 'junior' | 'senior') =>
                          setFormData({ ...formData, classLevel: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Levels</SelectItem>
                          <SelectItem value="junior">Junior (Grade 7-9)</SelectItem>
                          <SelectItem value="senior">Senior (Grade 10-12)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="maxMarks">Maximum Marks *</Label>
                      <Input
                        id="maxMarks"
                        type="number"
                        min={1}
                        max={1000}
                        value={formData.maxMarks}
                        onChange={(e) => setFormData({ ...formData, maxMarks: parseInt(e.target.value) || 100 })}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        aria-label='active'
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                      />
                      <Label htmlFor="isActive" className="cursor-pointer text-sm">Active</Label>
                    </div>

                    {isCoreSubject(formData.name) && (
                      <Badge className="bg-green-600">Core Subject (Auto-detected)</Badge>
                    )}
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
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {SUBJECT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="core">Core ({stats.core})</TabsTrigger>
                <TabsTrigger value="elective">Elective ({stats.total - stats.core})</TabsTrigger>
              </TabsList>
            </Tabs>
            {(searchTerm || categoryFilter !== 'all' || activeTab !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
            )}
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">
                {subjects.length === 0 ? 'No subjects found. Import default subjects or add one.' : 'No subjects match your filters.'}
              </p>
              {subjects.length === 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleImportDefaultSubjects}>
                  <Plus className="h-4 w-4 mr-2" />
                  Import Default Subjects
                </Button>
              )}
            </div>
          ) : (
            <DataTable data={filteredSubjects} columns={columns} actions={actions} searchable={false} />
          )}
        </CardContent>
      </Card>

      {/* Quick Add */}
      {subjects.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Add Subjects</CardTitle>
            <CardDescription>Click on a subject to add it quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SUBJECTS.slice(0, 8).map((subject) => {
                const exists = subjects.some(s => s.code === subject.code);
                return (
                  <Button
                    key={subject.code}
                    variant={exists ? 'outline' : subject.isCore ? 'default' : 'outline'}
                    size="sm"
                    disabled={exists}
                    className={subject.isCore && !exists ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={async () => {
                      if (exists) return;
                      const newSubject: Subject = {
                        id: `subj_${Date.now()}_${Math.random()}`,
                        schoolId: schoolId || '',
                        name: subject.name,
                        code: subject.code,
                        category: subject.category,
                        description: '',
                        classLevel: undefined,
                        maxMarks: subject.maxMarks || 100,
                        isActive: true,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                      };
                      await dbOps.write('subjects', newSubject);
                      await loadSubjects();
                      setSuccess(`Added "${subject.name}"`);
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                  >
                    {exists ? '✓' : subject.isCore ? '⭐' : '+'} {subject.name}
                    {subject.isCore && <span className="text-xs ml-1 opacity-70">(Core)</span>}
                  </Button>
                );
              })}
              <span className="text-sm text-gray-400 flex items-center">and {DEFAULT_SUBJECTS.length - 8} more...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUBJECT_CATEGORIES.map((cat) => (
              <div key={cat.value} className="flex items-center gap-2 p-2 border rounded-lg">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                <span className="text-sm font-medium">{cat.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <strong>Core Subjects:</strong> {CBC_CORE_SUBJECTS.join(', ')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}