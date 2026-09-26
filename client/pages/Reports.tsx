import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Printer, FileText, Users, Award, SchoolIcon, } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Student, School, Mark, Subject, Class } from '@/lib/db/schema';

// ============================================================
// CBC GRADE SYSTEM (CBE Approved)
// ============================================================
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

// ============================================================
// HELPER FUNCTIONS
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

function getGradeBadge(gradeCode: string): JSX.Element {
  return (
    <span className={`px-2 py-1 rounded text-white text-xs font-bold ${getGradeColor(gradeCode)}`}>
      {gradeCode}
    </span>
  );
}

// ============================================================
// TYPES
// ============================================================
interface ReportData {
  school: School | null;
  student: Student;
  class: Class;
  marks: { subject: Subject; mark: Mark; grade: { code: string; points: number; level: string } }[];
  term: number;
  year: number;
}

interface ClassSummaryData {
  school: School | null;
  class: Class;
  term: number;
  year: number;
  students: {
    student: Student;
    marks: Mark[];
    totalMarks: number;
    totalPoints: number;
    average: number;
    averagePoints: number;
    grade: string;
  }[];
}

// ============================================================
// COMPONENT
// ============================================================
export default function Reports() {
  const [school, setSchool] = useState<School | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Student Report Filters
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentTerm, setStudentTerm] = useState('1');
  const [studentYear, setStudentYear] = useState(String(new Date().getFullYear()));

  // Class Summary Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [classTerm, setClassTerm] = useState('1');
  const [classYear, setClassYear] = useState(String(new Date().getFullYear()));

  // Preview state
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [previewSummary, setPreviewSummary] = useState<ClassSummaryData | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'student' | 'class'>('student');

  const schoolId = auth.getCurrentSchoolId();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      const [schoolData, allStudents, allClasses, allSubjects, allMarks] = await Promise.all([
        dbOps.getSchool(schoolId),
        dbOps.getAll('students'),
        dbOps.getAll('classes'),
        dbOps.getAll('subjects'),
        dbOps.getAll('marks'),
      ]);

      setSchool(schoolData || null);
      setStudents((allStudents as any[]).filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Student[]);
      setClasses((allClasses as any[]).filter((c: any) => c.schoolId === schoolId) as Class[]);
      setSubjects((allSubjects as any[]).filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Subject[]);
      setMarks((allMarks as any[]).filter((m: any) => m.schoolId === schoolId) as Mark[]);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // STUDENT REPORT PREVIEW
  // ============================================================
  const previewStudentReport = async () => {
    try {
      setGenerating(true);
      setError('');

      if (!selectedStudent || !school) {
        setError('Please select a student');
        return;
      }

      const student = students.find((s) => s.id === selectedStudent);
      if (!student) {
        setError('Student not found');
        return;
      }

      const studentClass = classes.find((c) => c.id === student.classId);
      if (!studentClass) {
        setError('Class not found');
        return;
      }

      // Get ONLY the selected student's marks
      const studentMarks = marks.filter(
        (m) =>
          m.studentId === selectedStudent &&
          m.term === parseInt(studentTerm) &&
          m.year === parseInt(studentYear)
      );

      if (studentMarks.length === 0) {
        setError('No marks found for this student in the selected term');
        return;
      }

      const marksWithSubjects = studentMarks.map((mark) => {
        const subject = subjects.find((s) => s.id === mark.subjectId);
        const grade = getGrade(mark.marksObtained, subject?.maxMarks || 100);
        return {
          subject: subject || ({} as Subject),
          mark,
          grade,
        };
      });

      const reportData: ReportData = {
        school,
        student,
        class: studentClass,
        marks: marksWithSubjects,
        term: parseInt(studentTerm),
        year: parseInt(studentYear),
      };

      setPreviewData(reportData);
      setPreviewType('student');
      setPreviewDialogOpen(true);
      setSuccess('Student report generated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to generate report');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================
  // CLASS SUMMARY PREVIEW
  // ============================================================
  const previewClassSummary = async () => {
    try {
      setGenerating(true);
      setError('');

      if (!selectedClass || !school) {
        setError('Please select a class');
        return;
      }

      const classData = classes.find((c) => c.id === selectedClass);
      if (!classData) {
        setError('Class not found');
        return;
      }

      // Get ALL students in the selected class
      const classStudents = students.filter((s) => s.classId === selectedClass);

      const studentData = classStudents.map((student) => {
        const studentMarks = marks.filter(
          (m) =>
            m.studentId === student.id &&
            m.term === parseInt(classTerm) &&
            m.year === parseInt(classYear)
        );

        let totalMarks = 0;
        let totalPoints = 0;

        studentMarks.forEach((mark) => {
          const subject = subjects.find((s) => s.id === mark.subjectId);
          const grade = getGrade(mark.marksObtained, subject?.maxMarks || 100);
          totalMarks += mark.marksObtained;
          totalPoints += grade.points;
        });

        const subjectCount = studentMarks.length || 1;
        const average = totalMarks / subjectCount;
        const averagePoints = totalPoints / subjectCount;
        const grade = getGrade(average, 100);

        return {
          student,
          marks: studentMarks,
          totalMarks,
          totalPoints,
          average,
          averagePoints,
          grade: grade.code,
        };
      });

      const validStudents = studentData.filter((s) => s.marks.length > 0);

      if (validStudents.length === 0) {
        setError('No marks found for this class in the selected term');
        return;
      }

      const summaryData: ClassSummaryData = {
        school,
        class: classData,
        term: parseInt(classTerm),
        year: parseInt(classYear),
        students: validStudents,
      };

      setPreviewSummary(summaryData);
      setPreviewType('class');
      setPreviewDialogOpen(true);
      setSuccess('Class summary generated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to generate summary');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // PRINT FUNCTIONS
  const printReport = () => {
    window.print();
  };

  // RENDER
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            Generate student report cards and class summaries with CBC grading
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading} className="flex items-center gap-2">
          <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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

      {/* Tabs */}
      <Tabs defaultValue="student-report" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="student-report">
            <FileText className="h-4 w-4 mr-2" />
            Student Report
          </TabsTrigger>
          <TabsTrigger value="class-summary">
            <Users className="h-4 w-4 mr-2" />
            Class Summary
          </TabsTrigger>
        </TabsList>

        {/* Student Report Tab */}
        <TabsContent value="student-report">
          <Card>
            <CardHeader>
              <CardTitle>Student Report Card</CardTitle>
              <CardDescription>
                Generate a comprehensive report card for an individual student
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="student">Student *</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => {
                        const cls = classes.find((c) => c.id === student.classId);
                        return (
                          <SelectItem key={student.id} value={student.id}>
                            {student.firstName} {student.lastName} ({cls?.name || 'N/A'})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="term">Term</Label>
                  <Select value={studentTerm} onValueChange={setStudentTerm}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Term 1</SelectItem>
                      <SelectItem value="2">Term 2</SelectItem>
                      <SelectItem value="3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select value={studentYear} onValueChange={setStudentYear}>
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

              <Button
                onClick={previewStudentReport}
                disabled={!selectedStudent || generating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Student Report
                  </>
                )}
              </Button>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Generates a report card for the selected student only, showing all subjects
                  with CBC grades, points, and performance levels.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class Summary Tab */}
        <TabsContent value="class-summary">
          <Card>
            <CardHeader>
              <CardTitle>Class Summary Report</CardTitle>
              <CardDescription>
                Generate a comprehensive summary of class performance
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="class">Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a class" />
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
                  <Label htmlFor="term">Term</Label>
                  <Select value={classTerm} onValueChange={setClassTerm}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Term 1</SelectItem>
                      <SelectItem value="2">Term 2</SelectItem>
                      <SelectItem value="3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select value={classYear} onValueChange={setClassYear}>
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

              <Button
                onClick={previewClassSummary}
                disabled={!selectedClass || generating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Generate Class Summary
                  </>
                )}
              </Button>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Generates a summary for all students in the selected class, including
                  average performance, grade distribution, and rankings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================
      PREVIEW DIALOG
      ============================================================ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewType === 'student' ? 'Student Report Card' : 'Class Summary'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4" id="printable-content">
            {/* Student Report Preview */}
            {previewType === 'student' && previewData && (
              <div>
                {/* Header */}
                <div className="bg-primary text-white p-6 rounded-t-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <SchoolIcon className="h-6 w-6" />
                    <h2 className="text-2xl font-bold">{previewData.school?.name || 'School'}</h2>
                  </div>
                  <p className="opacity-80 text-sm">{previewData.school?.address || ''}</p>
                  <p className="opacity-80 text-sm">{previewData.school?.phoneNumber || ''}</p>
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="font-semibold text-lg">
                      {previewData.student.firstName} {previewData.student.lastName}
                    </p>
                    <p className="text-sm opacity-80">
                      {previewData.class.name} - Report Card
                    </p>
                    <p className="text-sm opacity-80">
                      Term {previewData.term} - {previewData.year}
                    </p>
                  </div>
                </div>

                {/* Student Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Student</p>
                    <p className="font-semibold">{previewData.student.firstName} {previewData.student.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Admission #</p>
                    <p className="font-semibold">{previewData.student.admissionNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Class</p>
                    <p className="font-semibold">{previewData.class.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="font-semibold">{previewData.student.gender}</p>
                  </div>
                </div>

                {/* Marks Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-3 text-left text-sm font-semibold">Subject</th>
                        <th className="p-3 text-center text-sm font-semibold">Marks</th>
                        <th className="p-3 text-center text-sm font-semibold">Grade</th>
                        <th className="p-3 text-center text-sm font-semibold">Points</th>
                        <th className="p-3 text-left text-sm font-semibold">Performance Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.marks.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">{item.subject.name || 'Unknown'}</td>
                          <td className="p-3 text-center text-sm">
                            {item.mark.marksObtained}/{item.subject.maxMarks || 100}
                          </td>
                          <td className="p-3 text-center">
                            {getGradeBadge(item.grade.code)}
                          </td>
                          <td className="p-3 text-center font-bold">{item.grade.points}</td>
                          <td className="p-3 text-sm text-gray-600">{item.grade.level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                {(() => {
                  const totalMarks = previewData.marks.reduce((sum, item) => sum + item.mark.marksObtained, 0);
                  const totalPoints = previewData.marks.reduce((sum, item) => sum + item.grade.points, 0);
                  const avgMarks = previewData.marks.length > 0 ? totalMarks / previewData.marks.length : 0;
                  const avgPoints = previewData.marks.length > 0 ? totalPoints / previewData.marks.length : 0;
                  const overallGrade = getGrade(avgMarks, 100);

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg mt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">{totalMarks}</p>
                        <p className="text-xs text-gray-500">Total Marks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">{totalPoints}</p>
                        <p className="text-xs text-gray-500">Total Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-700">{avgMarks.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">Average Marks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {getGradeBadge(overallGrade.code)}
                        </p>
                        <p className="text-xs text-gray-500">Overall Grade</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t text-sm text-gray-500 flex justify-between">
                  <div>
                    <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p><strong>Term:</strong> {previewData.term} | <strong>Year:</strong> {previewData.year}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Class Summary Preview */}
            {previewType === 'class' && previewSummary && (
              <div>
                {/* Header */}
                <div className="bg-primary text-white p-6 rounded-t-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <SchoolIcon className="h-6 w-6" />
                    <h2 className="text-2xl font-bold">{previewSummary.school?.name || 'School'}</h2>
                  </div>
                  <p className="opacity-80 text-sm">{previewSummary.school?.address || ''}</p>
                  <p className="mt-2 font-semibold">
                    {previewSummary.class.name} - Class Summary
                  </p>
                  <p className="text-sm opacity-80">
                    Term {previewSummary.term} - {previewSummary.year}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto text-blue-600" />
                    <p className="text-2xl font-bold text-blue-700">{previewSummary.students.length}</p>
                    <p className="text-xs text-gray-500">Total Students</p>
                  </div>
                  <div className="text-center">
                    <Award className="h-6 w-6 mx-auto text-green-600" />
                    <p className="text-2xl font-bold text-green-700">
                      {previewSummary.students.length > 0
                        ? (previewSummary.students.reduce((sum, s) => sum + s.average, 0) / previewSummary.students.length).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Class Average</p>
                  </div>
                  <div className="text-center">
                    <Award className="h-6 w-6 mx-auto text-purple-600" />
                    <p className="text-2xl font-bold text-purple-700">
                      {previewSummary.students.length > 0
                        ? (previewSummary.students.reduce((sum, s) => sum + s.averagePoints, 0) / previewSummary.students.length).toFixed(1)
                        : 0}
                    </p>
                    <p className="text-xs text-gray-500">Mean Points</p>
                  </div>
                  <div className="text-center">
                    <Award className="h-6 w-6 mx-auto text-amber-600" />
                    <p className="text-2xl font-bold text-amber-700">
                      {previewSummary.students.filter(s =>
                        s.grade.startsWith('EE') || s.grade.startsWith('ME')
                      ).length}
                    </p>
                    <p className="text-xs text-gray-500">Passing (ME+)</p>
                  </div>
                </div>

                {/* Student List */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-3 text-left text-sm font-semibold">#</th>
                        <th className="p-3 text-left text-sm font-semibold">Student</th>
                        <th className="p-3 text-center text-sm font-semibold">Total Marks</th>
                        <th className="p-3 text-center text-sm font-semibold">Avg %</th>
                        <th className="p-3 text-center text-sm font-semibold">Points</th>
                        <th className="p-3 text-center text-sm font-semibold">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewSummary.students
                        .sort((a, b) => b.average - a.average)
                        .map((item, index) => (
                          <tr key={item.student.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">{index + 1}</td>
                            <td className="p-3 text-sm font-medium">
                              {item.student.firstName} {item.student.lastName}
                            </td>
                            <td className="p-3 text-center text-sm">{item.totalMarks}</td>
                            <td className="p-3 text-center text-sm font-semibold">
                              {item.average.toFixed(1)}%
                            </td>
                            <td className="p-3 text-center text-sm">{item.totalPoints}</td>
                            <td className="p-3 text-center">
                              {getGradeBadge(item.grade)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Grade Distribution */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Grade Distribution</h4>
                  <div className="flex flex-wrap gap-2">
                    {['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2'].map((grade) => {
                      const count = previewSummary.students.filter(s => s.grade === grade).length;
                      return (
                        <div key={grade} className="flex items-center gap-1">
                          {getGradeBadge(grade)}
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t text-sm text-gray-500 flex justify-between">
                  <div>
                    <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p><strong>Term:</strong> {previewSummary.term} | <strong>Year:</strong> {previewSummary.year}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={printReport} className="bg-indigo-600 hover:bg-indigo-700">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grade Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CBC Grade Scale (CBE Approved)</CardTitle>
          <CardDescription>Performance levels with corresponding marks and points</CardDescription>
        </CardHeader>
        <CardContent>
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
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> Grades follow the Competency-Based Curriculum (CBC) guidelines
              approved by the Kenya Institute of Curriculum Development (KICD).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}