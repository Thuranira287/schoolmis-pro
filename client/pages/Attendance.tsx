import { useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2, Plus, Edit2, Trash2, Search, Filter, Calendar, Clock, UserCheck, UserX, Download, RefreshCw, Users, CheckCircle, XCircle, AlertTriangle, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import type { Student, Class, User, Attendance as AttendanceType } from '@/lib/db/schema';

// TYPES
interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  timeIn?: string;
  timeOut?: string;
  remark?: string;
  recordedBy: string;
  recordedByName: string;
}

interface TeacherAttendanceRecord {
  id: string;
  userId: string;
  teacherName: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  status: 'present' | 'absent' | 'late';
  hoursWorked?: number;
  remark?: string;
}

interface ExtendedAttendance extends AttendanceType {
  type?: 'student' | 'teacher';
  clockIn?: string;
  clockOut?: string;
  hoursWorked?: number;
  teacherName?: string;
  timeIn?: string;
  timeOut?: string;
  recrdedBy?: string;
}

// CONSTANTS
const ATTENDANCE_STATUS = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-800' },
];

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-800 border-green-200',
  absent: 'bg-red-100 text-red-800 border-red-200',
  late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  excused: 'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  present: <CheckCircle className="h-4 w-4 text-green-600" />,
  absent: <XCircle className="h-4 w-4 text-red-600" />,
  late: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  excused: <CheckCircle className="h-4 w-4 text-blue-600" />,
};

// COMPONENT
export default function Attendance() {
  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<ExtendedAttendance[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('students');

  // Student Attendance Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Teacher Attendance Filters
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherStatus, setTeacherStatus] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [bulkAttendance, setBulkAttendance] = useState<Record<string, string>>({});

  // Teacher Clock In/Out
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');

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

      const [allStudents, allClasses, allUsers, allAttendance] = await Promise.all([
        dbOps.getAll('students'),
        dbOps.getAll('classes'),
        dbOps.getAll('users'),
        dbOps.getAll('attendance'),
      ]);

      setStudents((allStudents as any[]).filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Student[]);
      setClasses((allClasses as any[]).filter((c: any) => c.schoolId === schoolId) as Class[]);
      setTeachers((allUsers as any[]).filter((u: any) => u.schoolId === schoolId && u.role === 'teacher') as User[]);
      
      // Filter attendance records and add type
      const filteredAttendance = (allAttendance as any[])
        .filter((a: any) => a.schoolId === schoolId)
        .map((a: any) => ({
          ...a,
          type: a.type || 'student',
        }));
      setAttendanceRecords(filteredAttendance);

      // Load teacher attendance
      const teacherRecords = filteredAttendance
        .filter((a: any) => a.type === 'teacher')
        .map((a: any) => ({
          ...a,
          teacherName: a.teacherName || 'Unknown',
          clockIn: a.clockIn || '',
          clockOut: a.clockOut || '',
          hoursWorked: a.hoursWorked || 0,
        }));
      setTeacherAttendance(teacherRecords);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // STUDENT ATTENDANCE
  const getClassStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => s.classId === selectedClass);
  }, [students, selectedClass]);

  const getFilteredStudents = useMemo(() => {
    let filtered = getClassStudents;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.firstName.toLowerCase().includes(term) ||
          s.lastName.toLowerCase().includes(term) ||
          s.admissionNumber.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [getClassStudents, searchTerm]);

  const getAttendanceForDate = useCallback(
    (studentId: string) => {
      return attendanceRecords.find(
        (a) =>
          a.studentId === studentId &&
          a.date === selectedDate &&
          a.type !== 'teacher'
      );
    },
    [attendanceRecords, selectedDate]
  );

  const handleBulkAttendanceChange = (studentId: string, status: string) => {
    setBulkAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveBulkAttendance = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');
      if (!selectedClass) {
        setError('Please select a class');
        return;
      }

      const classStudents = getClassStudents;
      let saved = 0;
      let updated = 0;

      for (const student of classStudents) {
        const status = bulkAttendance[student.id] || 'present';
        const existing = getAttendanceForDate(student.id);

        const attendanceData: any = {
          schoolId,
          studentId: student.id,
          classId: selectedClass,
          date: selectedDate,
          status,
          recordedBy: userId || '',
          type: 'student',
          updatedAt: Date.now(),
        };

        if (existing) {
          await dbOps.write('attendance', { ...existing, ...attendanceData });
          updated++;
        } else {
          attendanceData.id = `att_${Date.now()}_${Math.random()}`;
          attendanceData.createdAt = Date.now();
          await dbOps.write('attendance', attendanceData);
          saved++;
        }
      }

      // Log audit
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'update',
        entityType: 'attendance',
        entityId: `class_${selectedClass}_date_${selectedDate}`,
        timestamp: Date.now(),
        details: `Bulk attendance saved: ${saved} new, ${updated} updated for ${classStudents.length} students`,
      });

      setSuccess(`Attendance saved successfully (${saved} new, ${updated} updated)`);
      await loadData();
      setBulkAttendance({});
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save attendance');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSingleAttendance = async (studentId: string, status: string) => {
    try {
      if (!schoolId) throw new Error('School ID not found');
      if (!selectedClass) throw new Error('No class selected');

      const existing = getAttendanceForDate(studentId);
      const attendanceData: any = {
        schoolId,
        studentId,
        classId: selectedClass,
        date: selectedDate,
        status,
        recordedBy: userId || '',
        type: 'student',
        updatedAt: Date.now(),
      };

      if (existing) {
        await dbOps.write('attendance', { ...existing, ...attendanceData });
      } else {
        attendanceData.id = `att_${Date.now()}_${Math.random()}`;
        attendanceData.createdAt = Date.now();
        await dbOps.write('attendance', attendanceData);
      }

      await loadData();
      setSuccess(`Attendance marked as ${status}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to mark attendance');
      console.error(err);
    }
  };

  // TEACHER ATTENDANCE (Clock In/Out)
  const handleClockIn = async () => {
    try {
      setClockInLoading(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');
      if (!selectedTeacher) {
        setError('Please select a teacher');
        return;
      }

      const teacher = teachers.find((t) => t.id === selectedTeacher);
      if (!teacher) {
        setError('Teacher not found');
        return;
      }

      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);

      // Check if teacher already clocked in today
      const existing = teacherAttendance.find(
        (t) => t.userId === selectedTeacher && t.date === teacherDate
      );

      if (existing && existing.clockIn) {
        setError('Teacher already clocked in today');
        return;
      }

      const attendanceData: any = {
        id: `att_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: selectedTeacher,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        date: teacherDate,
        clockIn: timeStr,
        status: 'present',
        type: 'teacher',
        recordedBy: userId || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await dbOps.write('attendance', attendanceData);

      // Log audit
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'create',
        entityType: 'teacher_attendance',
        entityId: selectedTeacher,
        timestamp: Date.now(),
        details: `Teacher ${teacher.firstName} ${teacher.lastName} clocked in at ${timeStr}`,
      });

      setSuccess(`Teacher clocked in at ${timeStr}`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to clock in');
      console.error(err);
    } finally {
      setClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClockOutLoading(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');
      if (!selectedTeacher) {
        setError('Please select a teacher');
        return;
      }

      const teacher = teachers.find((t) => t.id === selectedTeacher);
      if (!teacher) {
        setError('Teacher not found');
        return;
      }

      const existing = teacherAttendance.find(
        (t) => t.userId === selectedTeacher && t.date === teacherDate
      );

      if (!existing || !existing.clockIn) {
        setError('Teacher has not clocked in today');
        return;
      }

      if (existing.clockOut) {
        setError('Teacher already clocked out');
        return;
      }

      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);

      // Calculate hours worked
      const clockInTime = new Date(`${teacherDate}T${existing.clockIn}`);
      const clockOutTime = new Date(`${teacherDate}T${timeStr}`);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const updatedData: any = {
        ...existing,
        clockOut: timeStr,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        updatedAt: Date.now(),
      };

      await dbOps.write('attendance', updatedData);

      // Log audit
      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'update',
        entityType: 'teacher_attendance',
        entityId: selectedTeacher,
        timestamp: Date.now(),
        details: `Teacher ${teacher.firstName} ${teacher.lastName} clocked out at ${timeStr} (${hoursWorked.toFixed(2)} hours)`,
      });

      setSuccess(`Teacher clocked out at ${timeStr} (${hoursWorked.toFixed(2)} hours)`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to clock out');
      console.error(err);
    } finally {
      setClockOutLoading(false);
    }
  };

  // EXPORT
  const exportAttendance = () => {
    let csv = 'Student,Admission,Class,Date,Status,Time In,Time Out,Remark\n';
    const records = attendanceRecords.filter(
      (a) => a.date === selectedDate && a.type !== 'teacher'
    );

    for (const record of records) {
      const student = students.find((s) => s.id === record.studentId);
      const cls = classes.find((c) => c.id === record.classId);
      csv += `${student?.firstName || ''} ${student?.lastName || ''},`;
      csv += `${student?.admissionNumber || ''},`;
      csv += `${cls?.name || ''},`;
      csv += `${record.date},`;
      csv += `${record.status},`;
      csv += `${(record as any).timeIn || ''},`;
      csv += `${(record as any).timeOut || ''},`;
      csv += `${record.remark || ''}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // RENDER HELPERS
  const renderStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    const icon = STATUS_ICONS[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getAttendanceStats = () => {
    const records = attendanceRecords.filter(
      (a) => a.date === selectedDate && a.type !== 'teacher'
    );
    const total = records.length || 1;
    const present = records.filter((a) => a.status === 'present').length;
    const absent = records.filter((a) => a.status === 'absent').length;
    const late = records.filter((a) => a.status === 'late').length;
    const excused = records.filter((a) => a.status === 'excused').length;
    return {
      total,
      present,
      absent,
      late,
      excused,
      rate: Math.round((present / total) * 100),
    };
  };

  // RENDER
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading attendance...</p>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-1">
            Manage student attendance and teacher clock in/out
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportAttendance}>
            <Download className="h-4 w-4 mr-2" />
            Export
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <Clock className="h-4 w-4 mr-2" />
            Teachers (Clock In/Out)
          </TabsTrigger>
        </TabsList>

        {/* STUDENT ATTENDANCE TAB */}
        <TabsContent value="students" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
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
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {ATTENDANCE_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {selectedClass && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button onClick={handleSaveBulkAttendance} disabled={saving} className="bg-green-600 hover:bg-green-700">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Attendance
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setBulkAttendance({})}>
                    Reset
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          {selectedClass && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                  <p className="text-xs text-gray-500">Present</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                  <p className="text-xs text-gray-500">Absent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                  <p className="text-xs text-gray-500">Late</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.rate}%</p>
                  <p className="text-xs text-gray-500">Attendance Rate</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance</CardTitle>
              <CardDescription>
                {selectedClass
                  ? `${getFilteredStudents.length} students in class`
                  : 'Select a class to view attendance'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedClass ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="mt-2">Select a class to manage attendance</p>
                </div>
              ) : getFilteredStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No students in this class</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Admission #</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Time In</TableHead>
                        <TableHead className="text-center">Time Out</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredStudents.map((student, index) => {
                        const existing = getAttendanceForDate(student.id);
                        const status = bulkAttendance[student.id] || existing?.status || 'present';

                        return (
                          <TableRow key={student.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-mono text-sm">{student.admissionNumber}</TableCell>
                            <TableCell>
                              {student.firstName} {student.lastName}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={status}
                                onValueChange={(value) => handleBulkAttendanceChange(student.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTENDANCE_STATUS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {(existing as any)?.timeIn || '-'}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {(existing as any)?.timeOut || '-'}
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Remark..."
                                defaultValue={(existing as any)?.remark || ''}
                                className="text-sm"
                                onBlur={async (e) => {
                                  const remark = e.target.value;
                                  if (existing) {
                                    await dbOps.write('attendance', { ...existing, remark });
                                  }
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEACHER ATTENDANCE TAB (Clock In/Out) */}
        <TabsContent value="teachers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Clock In/Out</CardTitle>
              <CardDescription>
                Manage teacher attendance and working hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Teacher *</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={teacherDate}
                    onChange={(e) => setTeacherDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={teacherStatus} onValueChange={setTeacherStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleClockIn}
                  disabled={!selectedTeacher || clockInLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {clockInLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Clock In
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={!selectedTeacher || clockOutLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {clockOutLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Clock Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle>Teacher Attendance Records</CardTitle>
              <CardDescription>
                {teacherAttendance.filter((t) => t.date === teacherDate).length} records today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Clock In</TableHead>
                      <TableHead className="text-center">Clock Out</TableHead>
                      <TableHead className="text-center">Hours</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherAttendance
                      .filter((t) => t.date === teacherDate)
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.teacherName}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell className="text-center font-mono">
                            {record.clockIn || '-'}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {record.clockOut || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {record.hoursWorked ? `${record.hoursWorked.toFixed(2)}h` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderStatusBadge(record.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    {teacherAttendance.filter((t) => t.date === teacherDate).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No teacher attendance records for this date
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}