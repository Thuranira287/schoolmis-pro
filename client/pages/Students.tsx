import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Edit2, Trash2, GraduationCap, BookOpen, Atom, Users, TrendingUp, Filter, Search, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Student, Class, Subject } from '@/lib/db/schema';

// CBC SUBJECT CATEGORIES
// Core subjects (compulsory for all students)
const CORE_SUBJECTS = [
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

// STEM subjects
const STEM_SUBJECTS = [
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

// Social Sciences subjects
const SOCIAL_SCIENCES_SUBJECTS = [
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

// Subject categories with their pathways
const SUBJECT_PATHWAYS: Record<string, 'stem' | 'social' | 'core'> = {};

// Populate STEM subjects
STEM_SUBJECTS.forEach(subj => {
  SUBJECT_PATHWAYS[subj] = 'stem';
});

// Populate Social Sciences subjects
SOCIAL_SCIENCES_SUBJECTS.forEach(subj => {
  SUBJECT_PATHWAYS[subj] = 'social';
});

// Core subjects are taken by everyone
CORE_SUBJECTS.forEach(subj => {
  SUBJECT_PATHWAYS[subj] = 'core';
});

// ============================================================
// PATHWAY INFO
// ============================================================
const PATHWAY_INFO = {
  stem: {
    label: 'STEM',
    icon: <Atom className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800',
    description: 'Science, Technology, Engineering, and Mathematics'
  },
  social: {
    label: 'Social Sciences',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800',
    description: 'Humanities, Languages, and Business Studies'
  },
  mixed: {
    label: 'Mixed Pathway',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-800',
    description: 'Combination of STEM and Social Sciences'
  },
  undefined: {
    label: 'Not Categorized',
    icon: <BookOpen className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-600',
    description: 'Select subjects to determine pathway'
  }
};

// COMPONENT
export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [pathwayFilter, setPathwayFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    admissionNumber: '',
    dateOfBirth: '',
    gender: 'M' as 'M' | 'F',
    classId: '',
    stream: '',
    parentEmail: '',
    parentPhone: '',
    subjects: [] as string[],
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

      // Load all data in parallel with proper type assertions
      const [allStudents, allClasses, allSubjects] = await Promise.all([
        dbOps.getAll('students'),
        dbOps.getAll('classes'),
        dbOps.getAll('subjects'),
      ]);

      // Filter by school with proper type assertions
      setStudents((allStudents as any[])
        .filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Student[]);
      setClasses((allClasses as any[])
        .filter((c: any) => c.schoolId === schoolId) as Class[]);
      setSubjects((allSubjects as any[])
        .filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Subject[]);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // HELPER FUNCTIONS
  const determinePathway = (subjectIds: string[]): 'stem' | 'social' | 'mixed' | 'undefined' => {
    if (!subjectIds || subjectIds.length === 0) return 'undefined';

    const subjectNames = subjectIds
      .map(id => {
        const subject = subjects.find((s: Subject) => s.id === id);
        return subject?.name;
      })
      .filter(Boolean) as string[];

    if (subjectNames.length === 0) return 'undefined';

    let hasSTEM = false;
    let hasSocial = false;

    for (const name of subjectNames) {
      const pathway = SUBJECT_PATHWAYS[name];
      if (pathway === 'stem') hasSTEM = true;
      if (pathway === 'social') hasSocial = true;
    }

    if (hasSTEM && hasSocial) return 'mixed';
    if (hasSTEM) return 'stem';
    if (hasSocial) return 'social';
    return 'undefined';
  };

  const getPathwayInfo = (subjectIds: string[]) => {
    const pathway = determinePathway(subjectIds);
    return PATHWAY_INFO[pathway] || PATHWAY_INFO.undefined;
  };

  // FILTER STUDENTS
  const filteredStudents = students.filter((student: Student) => {
    // Search filter
    const searchMatch = !searchTerm || 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());

    // Class filter
    const classMatch = classFilter === 'all' || student.classId === classFilter;

    // Pathway filter
    const pathway = determinePathway(student.subjects || []);
    const pathwayMatch = pathwayFilter === 'all' || pathway === pathwayFilter;

    return searchMatch && classMatch && pathwayMatch;
  });

  // FORM HANDLERS
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      admissionNumber: '',
      dateOfBirth: '',
      gender: 'M',
      classId: '',
      stream: '',
      parentEmail: '',
      parentPhone: '',
      subjects: [],
    });
    setEditingId(null);
  };

  const toggleSubject = (subjectId: string) => {
    setFormData(prev => {
      const currentSubjects = prev.subjects || [];
      if (currentSubjects.includes(subjectId)) {
        return { ...prev, subjects: currentSubjects.filter(id => id !== subjectId) };
      } else {
        return { ...prev, subjects: [...currentSubjects, subjectId] };
      }
    });
  };

  // CRUD OPERATIONS
  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');

      // Validation
      if (!formData.firstName || !formData.lastName || !formData.admissionNumber || !formData.classId) {
        setError('Please fill in all required fields');
        return;
      }

      // Check duplicate admission number
      const duplicate = students.find(
        (s: Student) => s.admissionNumber === formData.admissionNumber && s.id !== editingId
      );
      if (duplicate) {
        setError('Admission number already exists');
        return;
      }

      // Determine pathway based on selected subjects
      const pathway = determinePathway(formData.subjects);

      // Prepare student data
      const studentData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        admissionNumber: formData.admissionNumber.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        classId: formData.classId,
        stream: formData.stream.trim(),
        parentEmail: formData.parentEmail.trim(),
        parentPhone: formData.parentPhone.trim(),
        subjects: formData.subjects,
        pathway: pathway,
        isActive: true,
      };

      if (editingId) {
        // Update existing student
        const student = students.find((s: Student) => s.id === editingId);
        if (student) {
          const updated: Student = {
            ...student,
            ...studentData,
            updatedAt: Date.now(),
          };
          await dbOps.updateStudent(updated);

          // Log audit
          await dbOps.createAuditLog({
            id: `log_${Date.now()}_${Math.random()}`,
            schoolId,
            userId: userId || '',
            action: 'update',
            entityType: 'student',
            entityId: editingId,
            timestamp: Date.now(),
            details: `Updated student: ${formData.firstName} ${formData.lastName}, Pathway: ${pathway}`
          });

          setSuccess('Student updated successfully');
        }
      } else {
        // Create new student
        const newStudent: Student = {
          id: `student_${Date.now()}_${Math.random()}`,
          schoolId,
          ...studentData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await dbOps.createStudent(newStudent);

        // Log audit
        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: userId || '',
          action: 'create',
          entityType: 'student',
          entityId: newStudent.id,
          timestamp: Date.now(),
          details: `Created student: ${formData.firstName} ${formData.lastName}, Pathway: ${pathway}`
        });

        setSuccess('Student added successfully');
      }

      await loadData();
      setDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save student');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student: Student) => {
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNumber: student.admissionNumber,
      dateOfBirth: student.dateOfBirth || '',
      gender: student.gender || 'M',
      classId: student.classId,
      stream: student.stream || '',
      parentEmail: student.parentEmail || '',
      parentPhone: student.parentPhone || '',
      subjects: student.subjects || [],
    });
    setEditingId(student.id);
    setDialogOpen(true);
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}?`)) {
      return;
    }

    try {
      if (!schoolId) throw new Error('School ID not found');

      // Check if student has marks
      const allMarks = (await dbOps.getAll('marks')) as any[];
      const studentMarks = allMarks.filter((m: any) => m.studentId === student.id);
      
      if (studentMarks.length > 0) {
        if (!confirm(`Student has ${studentMarks.length} marks recorded. Deleting will remove these marks. Continue?`)) {
          return;
        }
        // Delete related marks
        for (const mark of studentMarks) {
          await dbOps.delete('marks', mark.id);
        }
      }

      // Mark as inactive instead of deleting
      student.isActive = false;
      student.updatedAt = Date.now();
      await dbOps.updateStudent(student);

      // Log audit
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'delete',
        entityType: 'student',
        entityId: student.id,
        timestamp: Date.now(),
        details: `Deleted student: ${student.firstName} ${student.lastName}`
      });

      setSuccess(`Student "${student.firstName} ${student.lastName}" deleted`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete student');
      console.error(err);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setClassFilter('all');
    setPathwayFilter('all');
  };

  // PATHWAY STATS
  const pathwayStats = () => {
    const stats = { stem: 0, social: 0, mixed: 0, undefined: 0 };
    students.forEach((student: Student) => {
      const pathway = student.pathway || 'undefined';
      if (pathway in stats) {
        stats[pathway as keyof typeof stats]++;
      }
    });
    return stats;
  };

  const stats = pathwayStats();

  // RENDER
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'admissionNumber' as const,
      label: 'Admission #',
      sortable: true,
      width: '120px',
      render: (value: string) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      ),
    },
    {
      key: 'firstName' as const,
      label: 'First Name',
      sortable: true,
    },
    {
      key: 'lastName' as const,
      label: 'Last Name',
      sortable: true,
    },
    {
      key: 'classId' as const,
      label: 'Class',
      sortable: true,
      render: (classId: string) => {
        const cls = classes.find((c: Class) => c.id === classId);
        return <Badge variant="outline">{cls?.name || 'N/A'}</Badge>;
      },
    },
    {
      key: 'pathway' as const,
      label: 'Pathway',
      render: (pathway: string, student: Student) => {
        const info = getPathwayInfo(student.subjects || []);
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
              {info.icon}
              {info.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'subjects' as const,
      label: 'Subjects',
      render: (subjects: string[]) => {
        const count = subjects?.length || 0;
        // Calculate core count properly
        let coreCount = 0;
        subjects?.forEach((id: string) => {
          const subject = subjects.find((s: Subject) => s.id === id);
          if (subject && CORE_SUBJECTS.includes(subject.name)) {
            coreCount++;
          }
        });
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{count} total</span>
            <Badge variant="secondary" className="text-xs">
              {coreCount} core
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'gender' as const,
      label: 'Gender',
      render: (gender: string) => (
        <span className="text-sm">{gender === 'M' ? 'Male' : 'Female'}</span>
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
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <p className="text-gray-600 mt-1">
          Manage student information, enrollment, and pathway selection for CBC curriculum
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="animate-in fade-in-50 duration-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800 animate-in fade-in-50 duration-300">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Pathway Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
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
                <p className="text-sm text-gray-500">STEM Pathway</p>
                <p className="text-2xl font-bold text-blue-600">{stats.stem}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Atom className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Social Sciences</p>
                <p className="text-2xl font-bold text-purple-600">{stats.social}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mixed/Undefined</p>
                <p className="text-2xl font-bold text-amber-600">{stats.mixed + stats.undefined}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle>Student Registry</CardTitle>
            <CardDescription>
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} enrolled
              {students.length !== filteredStudents.length && ` (${students.length} total)`}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Student' : 'Add New Student'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Personal Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        className="mt-1"
                        placeholder="e.g., John"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="mt-1"
                        placeholder="e.g., Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="admissionNumber">Admission Number *</Label>
                    <Input
                      id="admissionNumber"
                      value={formData.admissionNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, admissionNumber: e.target.value })
                      }
                      className="mt-1"
                      placeholder="e.g., ADM-2025-001"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="classId">Class *</Label>
                      <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls: Class) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={formData.gender} onValueChange={(value: 'M' | 'F') => setFormData({ ...formData, gender: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="stream">Stream/Section</Label>
                    <Input
                      id="stream"
                      placeholder="e.g., A, B, C"
                      value={formData.stream}
                      onChange={(e) =>
                        setFormData({ ...formData, stream: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parentEmail">Parent Email</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, parentEmail: e.target.value })
                        }
                        className="mt-1"
                        placeholder="parent@email.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="parentPhone">Parent Phone</Label>
                      <Input
                        id="parentPhone"
                        value={formData.parentPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, parentPhone: e.target.value })
                        }
                        className="mt-1"
                        placeholder="+254 7XX XXX XXX"
                      />
                    </div>
                  </div>

                  {/* Subject Selection */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Subject Selection</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          {formData.subjects?.length || 0} selected
                        </Badge>
                        {formData.subjects && formData.subjects.length > 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${getPathwayInfo(formData.subjects).color}`}>
                            {getPathwayInfo(formData.subjects).label}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-3">
                      Select the subjects this student is taking. Core subjects are automatically selected and cannot be removed.
                    </p>

                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                      {subjects.map((subject: Subject) => {
                        const isSelected = formData.subjects?.includes(subject.id) || false;
                        const pathway = SUBJECT_PATHWAYS[subject.name] || 'core';
                        const isCore = pathway === 'core';
                        const colorClass = isCore 
                          ? 'border-green-200 bg-green-50' 
                          : pathway === 'stem'
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-purple-200 bg-purple-50';

                        return (
                          <div
                            key={subject.id}
                            className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${colorClass} ${
                              isSelected ? 'ring-2 ring-indigo-500' : 'hover:bg-gray-50'
                            } ${isCore ? 'opacity-75' : ''}`}
                            onClick={() => toggleSubject(subject.id)}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${subject.name}`}
                              checked={isSelected}
                              onChange={() => toggleSubject(subject.id)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                              disabled={isCore}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium">{subject.name}</span>
                              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                isCore 
                                  ? 'bg-green-200 text-green-800'
                                  : pathway === 'stem'
                                  ? 'bg-blue-200 text-blue-800'
                                  : pathway === 'social'
                                  ? 'bg-purple-200 text-purple-800'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {isCore ? 'Core' : pathway === 'stem' ? 'STEM' : 'Social'}
                              </span>
                            </div>
                            {isCore && (
                              <span className="text-xs text-green-600 font-medium">Required</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {formData.subjects && formData.subjects.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium">Pathway: </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPathwayInfo(formData.subjects).color}`}>
                            {getPathwayInfo(formData.subjects).label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getPathwayInfo(formData.subjects).description}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
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
          </div>
        </CardHeader>

        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls: Class) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pathwayFilter} onValueChange={setPathwayFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Pathways" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pathways</SelectItem>
                <SelectItem value="stem">STEM</SelectItem>
                <SelectItem value="social">Social Sciences</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="undefined">Not Categorized</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || classFilter !== 'all' || pathwayFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="px-2">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <DataTable
            data={filteredStudents}
            columns={columns}
            actions={actions}
            searchable={false}
          />
        </CardContent>
      </Card>

      {/* CBC Subject Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CBC Subject Categories</CardTitle>
          <CardDescription>Understanding the subject categories and pathways</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg border-green-200 bg-green-50">
              <h4 className="font-semibold text-green-800 flex items-center gap-2">
                <Badge className="bg-green-600">Core</Badge>
                Compulsory Subjects
              </h4>
              <p className="text-sm text-gray-600 mt-2">
                All students must take these subjects regardless of their pathway.
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {CORE_SUBJECTS.slice(0, 5).map((subj) => (
                  <Badge key={subj} variant="outline" className="text-xs">
                    {subj}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">
                  +{CORE_SUBJECTS.length - 5} more
                </Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg border-blue-200 bg-blue-50">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                <Badge className="bg-blue-600">STEM</Badge>
                Science & Technology
              </h4>
              <p className="text-sm text-gray-600 mt-2">
                For students pursuing careers in science, engineering, and technology.
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {STEM_SUBJECTS.slice(0, 5).map((subj) => (
                  <Badge key={subj} variant="outline" className="text-xs">
                    {subj}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">
                  +{STEM_SUBJECTS.length - 5} more
                </Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg border-purple-200 bg-purple-50">
              <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                <Badge className="bg-purple-600">Social Sciences</Badge>
                Humanities & Business
              </h4>
              <p className="text-sm text-gray-600 mt-2">
                For students pursuing careers in humanities, business, and social sciences.
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {SOCIAL_SCIENCES_SUBJECTS.slice(0, 5).map((subj) => (
                  <Badge key={subj} variant="outline" className="text-xs">
                    {subj}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">
                  +{SOCIAL_SCIENCES_SUBJECTS.length - 5} more
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> Students are automatically assigned to a pathway based on their subject selection.
              Core subjects are compulsory for all students.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}