import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { grading } from '@/lib/grades/grading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Users, BarChart3, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Student, Mark, Class, Subject } from '@/lib/db/schema';

interface PerformanceMetrics {
  totalStudents: number;
  averagePercentage: number;
  excellentCount: number;
  masteryCount: number;
  approachingCount: number;
  belowCount: number;
}

interface GradeDistributionItem {
  name: string;
  value: number;
  percentage: number;
}

interface ClassPerformanceItem {
  name: string;
  percentage: number;
  average: number;
}

interface TopPerformer {
  name: string;
  percentage: number;
  marks: number;
  admissionNo: string;
}

export default function Analytics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalStudents: 0,
    averagePercentage: 0,
    excellentCount: 0,
    masteryCount: 0,
    approachingCount: 0,
    belowCount: 0,
  });
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistributionItem[]>([]);
  const [performanceByClass, setPerformanceByClass] = useState<ClassPerformanceItem[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const schoolId = auth.getCurrentSchoolId();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      // Load all data with proper type assertions
      const [allStudents, allMarks, allClasses, allSubjects] = await Promise.all([
        dbOps.getAll('students'),
        dbOps.getAll('marks'),
        dbOps.getAll('classes'),
        dbOps.getAll('subjects'),
      ]);

      // Type assert the data
      const schoolStudents = (allStudents as any[])
        .filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Student[];
      const schoolMarks = (allMarks as any[])
        .filter((m: any) => m.schoolId === schoolId) as Mark[];
      const schoolClasses = (allClasses as any[])
        .filter((c: any) => c.schoolId === schoolId) as Class[];
      const schoolSubjects = (allSubjects as any[])
        .filter((s: any) => s.schoolId === schoolId) as Subject[];

      // Calculate overall metrics
      if (schoolMarks.length > 0) {
        let totalMarks = 0;
        let totalMaxMarks = 0;
        const gradeCounts = { EE: 0, ME: 0, AE: 0, BE: 0 };

        schoolMarks.forEach((mark: Mark) => {
          const subject = schoolSubjects.find((s: Subject) => s.id === mark.subjectId);
          if (subject) {
            totalMarks += mark.marksObtained;
            totalMaxMarks += subject.maxMarks || 100;
            if (mark.grade) {
              gradeCounts[mark.grade as keyof typeof gradeCounts] = (gradeCounts[mark.grade as keyof typeof gradeCounts] || 0) + 1;
            }
          }
        });

        const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

        setMetrics({
          totalStudents: schoolStudents.length,
          averagePercentage: Math.round(averagePercentage * 100) / 100,
          excellentCount: gradeCounts.EE,
          masteryCount: gradeCounts.ME,
          approachingCount: gradeCounts.AE,
          belowCount: gradeCounts.BE,
        });

        // Grade distribution for pie chart
        const total = Object.values(gradeCounts).reduce((a, b) => a + b, 0);
        setGradeDistribution([
          {
            name: 'Excellent (EE)',
            value: gradeCounts.EE,
            percentage: total > 0 ? Math.round((gradeCounts.EE / total) * 100) : 0,
          },
          {
            name: 'Mastery (ME)',
            value: gradeCounts.ME,
            percentage: total > 0 ? Math.round((gradeCounts.ME / total) * 100) : 0,
          },
          {
            name: 'Approaching (AE)',
            value: gradeCounts.AE,
            percentage: total > 0 ? Math.round((gradeCounts.AE / total) * 100) : 0,
          },
          {
            name: 'Below Expected (BE)',
            value: gradeCounts.BE,
            percentage: total > 0 ? Math.round((gradeCounts.BE / total) * 100) : 0,
          },
        ]);
      }

      // Performance by class
      const classPerformance: Record<string, { totalMarks: number; totalMax: number; count: number }> = {};
      schoolMarks.forEach((mark: Mark) => {
        if (!classPerformance[mark.classId]) {
          classPerformance[mark.classId] = { totalMarks: 0, totalMax: 0, count: 0 };
        }
        const subject = schoolSubjects.find((s: Subject) => s.id === mark.subjectId);
        if (subject) {
          classPerformance[mark.classId].totalMarks += mark.marksObtained;
          classPerformance[mark.classId].totalMax += subject.maxMarks || 100;
          classPerformance[mark.classId].count++;
        }
      });

      const classData: ClassPerformanceItem[] = Object.entries(classPerformance).map(([classId, data]) => {
        const classObj = schoolClasses.find((c: Class) => c.id === classId);
        const percentage = data.totalMax > 0 ? (data.totalMarks / data.totalMax) * 100 : 0;
        return {
          name: classObj?.name || 'Unknown',
          percentage: Math.round(percentage * 100) / 100,
          average: Math.round(data.totalMarks / data.count),
        };
      });
      setPerformanceByClass(classData);

      // Top performers
      const studentPerformance: Record<string, { totalMarks: number; totalMax: number; count: number }> = {};
      schoolMarks.forEach((mark: Mark) => {
        if (!studentPerformance[mark.studentId]) {
          studentPerformance[mark.studentId] = { totalMarks: 0, totalMax: 0, count: 0 };
        }
        const subject = schoolSubjects.find((s: Subject) => s.id === mark.subjectId);
        if (subject) {
          studentPerformance[mark.studentId].totalMarks += mark.marksObtained;
          studentPerformance[mark.studentId].totalMax += subject.maxMarks || 100;
          studentPerformance[mark.studentId].count++;
        }
      });

      const topStudents: TopPerformer[] = Object.entries(studentPerformance)
        .map(([studentId, data]) => {
          const student = schoolStudents.find((s: Student) => s.id === studentId);
          const percentage = data.totalMax > 0 ? (data.totalMarks / data.totalMax) * 100 : 0;
          return {
            name: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
            percentage: Math.round(percentage * 100) / 100,
            marks: Math.round(data.totalMarks),
            admissionNo: student?.admissionNumber || 'N/A',
          };
        })
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);
      setTopPerformers(topStudents);
    } catch (err) {
      setError('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
        <p className="text-gray-600 mt-1">Performance trends and academic analytics</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
            <p className="text-xs text-gray-600 mt-1">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">School Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averagePercentage}%</div>
            <p className="text-xs text-gray-600 mt-1">Across all marks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excellent (EE)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.excellentCount}</div>
            <p className="text-xs text-gray-600 mt-1">Grades above 80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk (BE)</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.belowCount}</div>
            <p className="text-xs text-gray-600 mt-1">Below 50%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        {gradeDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Breakdown of all marks by CBC grade</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Performance by Class */}
        {performanceByClass.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance by Class</CardTitle>
              <CardDescription>Average marks percentage per class</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceByClass}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="percentage" fill="#3b82f6" name="Percentage" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Performers</CardTitle>
            <CardDescription>Students with highest overall performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-600">Admission: {student.admissionNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{student.percentage}%</p>
                    <p className="text-xs text-gray-600">{student.marks} total marks</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {gradeDistribution.length === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            No marks data available yet. Enter student marks to see analytics.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}