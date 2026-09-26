import { useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Save, RefreshCw, Filter, X, Calculator, BarChart3, Users, Award, Download, GraduationCap } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Class, Subject, Student, Mark } from '@/lib/db/schema';

// TYPES
interface MarksGridItem {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  marks: number;
  gradeCode: string;
  gradeLevel: string;
  points: number;
  maxMarks: number;
  percentage: number;
}

interface FilterState {
  classId: string;
  subjectId: string;
  term: number;
  year: number;
}

// CBC GRADE SYSTEM
const CBC_GRADE_SYSTEM = [
  { code: 'EE1', min: 90, max: 99, points: 8.0, level: 'Exceeding Expectations' },
  { code: 'EE2', min: 75, max: 89, points: 7.0, level: 'Exceeding Expectations' },
  { code: 'ME1', min: 58, max: 74, points: 6.0, level: 'Meeting Expectations' },
  { code: 'ME2', min: 41, max: 57, points: 5.0, level: 'Meeting Expectations' },
  { code: 'AE1', min: 31, max: 40, points: 4.0, level: 'Approaching Expectations' },
  { code: 'AE2', min: 21, max: 30, points: 3.0, level: 'Approaching Expectations' },
  { code: 'BE1', min: 11, max: 20, points: 2.0, level: 'Below Expectations' },
  { code: 'BE2', min: 1, max: 10, points: 1.0, level: 'Below Expectations' },
];

const GRADE_COLORS: Record<string, string> = {
  EE1: 'bg-emerald-700',
  EE2: 'bg-emerald-500',
  ME1: 'bg-blue-600',
  ME2: 'bg-blue-400',
  AE1: 'bg-yellow-500',
  AE2: 'bg-yellow-300',
  BE1: 'bg-red-500',
  BE2: 'bg-red-300',
};

const GRADE_LABELS: Record<string, string> = {
  EE1: 'Exceeding Expectations 1',
  EE2: 'Exceeding Expectations 2',
  ME1: 'Meeting Expectations 1',
  ME2: 'Meeting Expectations 2',
  AE1: 'Approaching Expectations 1',
  AE2: 'Approaching Expectations 2',
  BE1: 'Below Expectations 1',
  BE2: 'Below Expectations 2',
};

const TERMS = [
  { value: 1, label: 'Term 1' },
  { value: 2, label: 'Term 2' },
  { value: 3, label: 'Term 3' },
];

// ============================================================
// GRADE HELPER FUNCTIONS
// ============================================================
function getGrade(marks: number, maxMarks: number = 100): { code: string; points: number; level: string } {
  const percentage = (marks / maxMarks) * 100;

  for (const grade of CBC_GRADE_SYSTEM) {
    if (percentage >= grade.min && percentage <= grade.max) {
      return { code: grade.code, points: grade.points, level: grade.level };
    }
  }

  return { code: 'BE2', points: 0, level: 'Below Expectations' };
}

function getGradeColor(gradeCode: string): string {
  return GRADE_COLORS[gradeCode] || 'bg-gray-500';
}

// ============================================================
// COMPONENT
// ============================================================
export default function Marks() {
  // Data state
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('enter');

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    classId: '',
    subjectId: '',
    term: 1,
    year: new Date().getFullYear(),
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marksData, setMarksData] = useState<Record<string, number>>({});
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);

  const schoolId = auth.getCurrentSchoolId();
  const userId = auth.getCurrentUserId();

  // ============================================================
  // LOAD DATA
  // ============================================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      const [allClasses, allSubjects, allStudents, allMarks] = await Promise.all([
        dbOps.getAll('classes'),
        dbOps.getAll('subjects'),
        dbOps.getAll('students'),
        dbOps.getAll('marks'),
      ]);

      setClasses(allClasses.filter((c: any) => c.schoolId === schoolId) as Class[]);
      setSubjects(allSubjects.filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Subject[]);
      setStudents(allStudents.filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Student[]);
      setMarks(allMarks.filter((m: any) => m.schoolId === schoolId) as Mark[]);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FILTERED DATA
  // ============================================================
  const filteredStudents = useMemo(() => {
    if (!filters.classId) return [];
    return students.filter((s) => s.classId === filters.classId);
  }, [students, filters.classId]);

  const studentsForSubject = useMemo(() => {
    if (!filters.subjectId) return filteredStudents;
    return filteredStudents.filter((student) => {
      const studentSubjects = student.subjects || [];
      return studentSubjects.includes(filters.subjectId);
    });
  }, [filteredStudents, filters.subjectId]);

  const filteredSubjects = useMemo(() => {
    if (!filters.classId) return subjects;
    const selectedClass = classes.find((c) => c.id === filters.classId);
    if (!selectedClass) return subjects;
    // Map class level to subject classLevel
    const classLevel = selectedClass.level.startsWith('Grade') && parseInt(selectedClass.level.replace('Grade', '')) >= 10
      ? 'senior'
      : 'junior';
    return subjects.filter((s) => !s.classLevel || s.classLevel === classLevel);
  }, [subjects, filters.classId, classes]);

  const selectedSubject = useMemo(() => {
    return subjects.find((s) => s.id === filters.subjectId);
  }, [subjects, filters.subjectId]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === filters.classId);
  }, [classes, filters.classId]);

  const existingMarks = useMemo(() => {
    return marks.filter(
      (m) =>
        m.classId === filters.classId &&
        m.subjectId === filters.subjectId &&
        m.term === filters.term &&
        m.year === filters.year
    );
  }, [marks, filters]);

  // ============================================================
  // MARKS GRID
  // ============================================================
  const getMarksGrid = useCallback((): MarksGridItem[] => {
    if (!filters.classId || !filters.subjectId || !selectedSubject) return [];

    const targetStudents = studentsForSubject;

    return targetStudents.map((student) => {
      const existingMark = existingMarks.find((m) => m.studentId === student.id);
      const marksValue = marksData[student.id] ?? existingMark?.marksObtained ?? 0;
      const grade = getGrade(marksValue, selectedSubject.maxMarks);

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        marks: marksValue,
        gradeCode: grade.code,
        gradeLevel: grade.level,
        points: grade.points,
        maxMarks: selectedSubject.maxMarks,
        percentage: Math.round((marksValue / selectedSubject.maxMarks) * 100),
      };
    });
  }, [studentsForSubject, existingMarks, marksData, selectedSubject, filters]);

  // ============================================================
  // CLASS SUMMARY
  // ============================================================
  const getClassSummary = useCallback(() => {
    const grid = getMarksGrid();
    if (grid.length === 0) return null;

    const totalStudents = grid.length;
    const totalMarks = grid.reduce((sum, item) => sum + item.marks, 0);
    const mean = Math.round(totalMarks / totalStudents);

    const gradeCounts: Record<string, number> = {};
    grid.forEach((item) => {
      gradeCounts[item.gradeCode] = (gradeCounts[item.gradeCode] || 0) + 1;
    });

    const totalPoints = grid.reduce((sum, item) => sum + item.points, 0);
    const meanPoints = totalPoints / totalStudents;

    const distribution = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade,
      count,
      percentage: Math.round((count / totalStudents) * 100),
      level: GRADE_LABELS[grade] || grade,
    }));

    const sorted = [...grid].sort((a, b) => b.points - a.points);
    const topPerformers = sorted.slice(0, 5).map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    const passCount = grid.filter((item) =>
      item.gradeCode.startsWith('ME') || item.gradeCode.startsWith('EE')
    ).length;
    const passRate = Math.round((passCount / totalStudents) * 100);

    return {
      totalStudents,
      mean,
      meanPoints,
      distribution,
      topPerformers,
      passRate,
      totalPoints,
    };
  }, [getMarksGrid]);

  // LOAD MARKS
  const loadMarksForSelection = useCallback(async () => {
    if (!filters.classId || !filters.subjectId) return;

    setIsLoadingMarks(true);
    try {
      const data: Record<string, number> = {};
      existingMarks.forEach((m) => {
        data[m.studentId] = m.marksObtained;
      });
      setMarksData(data);
      setSuccess('Marks loaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to load marks');
      console.error(err);
    } finally {
      setIsLoadingMarks(false);
    }
  }, [filters, existingMarks]);

  // SAVE MARKS
  const handleSaveMarks = async () => {
    if (!filters.classId || !filters.subjectId) {
      setError('Please select class and subject');
      return;
    }
    if (!selectedSubject) {
      setError('Subject not found');
      return;
    }
    if (!userId) {
      setError('User not found');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');

      let savedCount = 0;
      let updatedCount = 0;
      const targetStudents = studentsForSubject;

      for (const student of targetStudents) {
        const markValue = marksData[student.id];
        if (markValue === undefined || isNaN(markValue)) continue;

        if (markValue < 0 || markValue > selectedSubject.maxMarks) {
          setError(`Invalid marks for ${student.firstName}: Must be between 0 and ${selectedSubject.maxMarks}`);
          return;
        }

        const grade = getGrade(markValue, selectedSubject.maxMarks);

        const existingMark = existingMarks.find((m) => m.studentId === student.id);

        if (existingMark) {
          const updatedMark: Mark = {
            ...existingMark,
            marksObtained: markValue,
            grade: grade.code as any,
            updatedAt: Date.now(),
          };
          await dbOps.write('marks', updatedMark);
          updatedCount++;
        } else {
          const newMark: Mark = {
            id: `mark_${Date.now()}_${Math.random()}`,
            schoolId,
            studentId: student.id,
            classId: filters.classId,
            subjectId: filters.subjectId,
            teacherId: userId,
            marksObtained: markValue,
            grade: grade.code as any,
            term: filters.term,
            year: filters.year,
            academicYear: String(filters.year),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await dbOps.write('marks', newMark);
          savedCount++;
        }
      }

      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'update',
        entityType: 'marks',
        entityId: `class_${filters.classId}_subject_${filters.subjectId}`,
        timestamp: Date.now(),
        details: `Saved ${savedCount} new marks, updated ${updatedCount} existing marks for ${selectedSubject.name}`,
      });

      await loadData();
      setSuccess(`Saved ${savedCount + updatedCount} marks successfully`);
      setDialogOpen(false);
      setMarksData({});
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save marks');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // EXPORT
  // ============================================================
  const exportClassSummary = () => {
    const summary = getClassSummary();
    if (!summary) return;

    let csv = 'Student,Admission,Marks,Grade,Points,Percentage\n';
    const grid = getMarksGrid();
    grid.forEach((item) => {
      csv += `${item.studentName},${item.admissionNumber},${item.marks},${item.gradeCode},${item.points},${item.percentage}%\n`;
    });

    csv += `\n\nSummary\n`;
    csv += `Total Students,${summary.totalStudents}\n`;
    csv += `Class Mean,${summary.mean}%\n`;
    csv += `Mean Points,${summary.meanPoints.toFixed(1)}\n`;
    csv += `Pass Rate,${summary.passRate}%\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class_summary_${selectedClass?.name}_${selectedSubject?.name}_term${filters.term}_${filters.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setMarksData({});
  };

  const handleMarksChange = (studentId: string, value: string) => {
    const numValue = parseFloat(value);
    setMarksData((prev) => ({
      ...prev,
      [studentId]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setMarksData({});
    } else {
      loadMarksForSelection();
    }
  };

  const handleClearFilters = () => {
    setFilters({
      classId: '',
      subjectId: '',
      term: 1,
      year: new Date().getFullYear(),
    });
    setMarksData({});
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderGradeBadge = (gradeCode: string) => {
    const color = getGradeColor(gradeCode);
    return (
      <span className={`px-2 py-1 rounded text-white text-xs font-bold ${color}`} title={GRADE_LABELS[gradeCode]}>
        {gradeCode}
      </span>
    );
  };

  const renderGradeLegend = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CBC_GRADE_SYSTEM.map((grade) => (
          <div key={grade.code} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getGradeColor(grade.code)}`} />
            <div>
              <span className="text-sm font-bold">{grade.code}</span>
              <span className="text-xs text-gray-500 ml-1">({grade.min}-{grade.max}%)</span>
              <div className="text-xs text-gray-400">{grade.level}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading marks...</p>
        </div>
      </div>
    );
  }

  const marksGrid = getMarksGrid();
  const classSummary = getClassSummary();
  const enrolledCount = studentsForSubject.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
          <p className="text-gray-600 mt-1">
            Enter marks with CBC grading · {CBC_GRADE_SYSTEM.length} grade levels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleClearFilters} variant="outline" size="sm">
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        </div>
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class & Subject</CardTitle>
          <CardDescription>Choose the class and subject to manage marks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Class *</Label>
              <Select
                value={filters.classId}
                onValueChange={(value) => handleFilterChange('classId', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject *</Label>
              <Select
                value={filters.subjectId}
                onValueChange={(value) => handleFilterChange('subjectId', value)}
                disabled={!filters.classId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((subj) => (
                    <SelectItem key={subj.id} value={subj.id}>
                      {subj.name} ({subj.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Term</Label>
              <Select
                value={String(filters.term)}
                onValueChange={(value) => handleFilterChange('term', parseInt(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((term) => (
                    <SelectItem key={term.value} value={String(term.value)}>
                      {term.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Year</Label>
              <Select
                value={String(filters.year)}
                onValueChange={(value) => handleFilterChange('year', parseInt(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear(), new Date().getFullYear() - 1].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filters.classId && filters.subjectId && (
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button
                onClick={loadMarksForSelection}
                variant="outline"
                disabled={isLoadingMarks}
              >
                {isLoadingMarks ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4 mr-2" />
                    Load Marks
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-500 flex items-center ml-2">
                {enrolledCount} students enrolled
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marks Display */}
      {filters.classId && filters.subjectId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div>
              <CardTitle>
                {selectedClass?.name} - {selectedSubject?.name}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  Max: {selectedSubject?.maxMarks || 100} marks
                </span>
              </CardTitle>
              <CardDescription>
                {enrolledCount} students · {existingMarks.length} marks recorded
              </CardDescription>
            </div>

            <div className="flex gap-2">
              {classSummary && (
                <Button variant="outline" size="sm" onClick={exportClassSummary}>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              )}
              <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Enter Marks
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-5xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>
                      Enter Marks for {enrolledCount} Students
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        {selectedSubject?.name} - {selectedClass?.name}
                      </span>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white">
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Admission #</TableHead>
                            <TableHead className="w-24">
                              Marks ({selectedSubject?.maxMarks || 100})
                            </TableHead>
                            <TableHead className="w-20 text-center">Grade</TableHead>
                            <TableHead className="w-16 text-center">Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {marksGrid.map((item, index) => (
                            <TableRow key={item.studentId}>
                              <TableCell className="text-sm text-gray-500">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {item.studentName}
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.admissionNumber}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max={selectedSubject?.maxMarks || 100}
                                  value={item.marks || ''}
                                  onChange={(e) => handleMarksChange(item.studentId, e.target.value)}
                                  className="w-full text-sm"
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {renderGradeBadge(item.gradeCode)}
                              </TableCell>
                              <TableCell className="text-center font-bold">
                                {item.points}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveMarks} disabled={saving} className="bg-green-600 hover:bg-green-700">
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save All Marks
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="enter">Enter Marks</TabsTrigger>
                <TabsTrigger value="view">View Marks</TabsTrigger>
                <TabsTrigger value="summary">Class Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="enter" className="mt-4">
                {marksGrid.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No students enrolled in this subject</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Admission #</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="text-right">Marks</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-center">Points</TableHead>
                          <TableHead className="text-center">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marksGrid.map((item, index) => (
                          <TableRow key={item.studentId} className="hover:bg-gray-50">
                            <TableCell className="text-sm text-gray-500">{index + 1}</TableCell>
                            <TableCell className="text-sm font-medium">{item.admissionNumber}</TableCell>
                            <TableCell className="text-sm">{item.studentName}</TableCell>
                            <TableCell className="text-right font-medium">{item.marks}/{item.maxMarks}</TableCell>
                            <TableCell className="text-center">{renderGradeBadge(item.gradeCode)}</TableCell>
                            <TableCell className="text-center font-bold">{item.points}</TableCell>
                            <TableCell className="text-center text-sm">{item.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="view" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Admission #</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-right">Marks</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Points</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Performance Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marksGrid.map((item, index) => (
                        <TableRow key={item.studentId} className="hover:bg-gray-50">
                          <TableCell className="text-sm text-gray-500">{index + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{item.admissionNumber}</TableCell>
                          <TableCell className="text-sm">{item.studentName}</TableCell>
                          <TableCell className="text-right font-medium">{item.marks}/{item.maxMarks}</TableCell>
                          <TableCell className="text-center">{renderGradeBadge(item.gradeCode)}</TableCell>
                          <TableCell className="text-center font-bold">{item.points}</TableCell>
                          <TableCell className="text-center text-sm">{item.percentage}%</TableCell>
                          <TableCell className="text-center text-sm text-gray-600">{item.gradeLevel}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="mt-4">
                {classSummary ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Users className="h-5 w-5 mx-auto text-blue-600" />
                          <p className="text-2xl font-bold text-blue-600">{classSummary.totalStudents}</p>
                          <p className="text-sm text-gray-500">Total Students</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Calculator className="h-5 w-5 mx-auto text-green-600" />
                          <p className="text-2xl font-bold text-green-600">{classSummary.mean}%</p>
                          <p className="text-sm text-gray-500">Class Mean</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Award className="h-5 w-5 mx-auto text-amber-600" />
                          <p className="text-2xl font-bold text-amber-600">{classSummary.meanPoints.toFixed(1)}</p>
                          <p className="text-sm text-gray-500">Mean Points</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <BarChart3 className="h-5 w-5 mx-auto text-purple-600" />
                          <p className="text-2xl font-bold text-purple-600">{classSummary.passRate}%</p>
                          <p className="text-sm text-gray-500">Pass Rate (ME+)</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Grade Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {classSummary.distribution.map(({ grade, count, percentage, level }) => (
                            <div key={grade}>
                              <div className="flex justify-between text-sm">
                                <span>
                                  <span className={`px-1 rounded ${getGradeColor(grade)} text-white text-xs`}>
                                    {grade}
                                  </span>
                                  <span className="ml-2">{level}</span>
                                </span>
                                <span>{count} students ({percentage}%)</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${getGradeColor(grade)} transition-all duration-500`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Performers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Position</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead className="text-right">Marks</TableHead>
                              <TableHead className="text-center">Grade</TableHead>
                              <TableHead className="text-center">Points</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classSummary.topPerformers.map((item) => (
                              <TableRow key={item.studentId}>
                                <TableCell className="font-bold text-center">{item.position}</TableCell>
                                <TableCell>{item.studentName}</TableCell>
                                <TableCell className="text-right">{item.marks}/{item.maxMarks}</TableCell>
                                <TableCell className="text-center">{renderGradeBadge(item.gradeCode)}</TableCell>
                                <TableCell className="text-center font-bold text-indigo-600">{item.points}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No data available for summary</p>
                    <p className="text-sm text-gray-400 mt-1">Enter marks first to see the summary</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Grade Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CBC Grade Scale (CBE Approved)</CardTitle>
          <CardDescription>Performance levels with corresponding marks and points</CardDescription>
        </CardHeader>
        <CardContent>
          {renderGradeLegend()}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> Grades follow the Competency-Based Curriculum (CBC) guidelines approved by KICD.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}