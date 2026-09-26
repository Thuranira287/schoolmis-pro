import { useEffect, useState, useMemo } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Edit2, Trash2, Search, Filter, Download, RefreshCw, Users, DollarSign, CreditCard, Wallet, Receipt, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import type { Student, Payment as PaymentType } from '@/lib/db/schema';

// ============================================================
// TYPES
// ============================================================
interface PaymentFormData {
  studentId: string;
  amount: number;
  type: 'tuition' | 'activity' | 'uniform' | 'books' | 'other';
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  paidDate?: string;
  term: number;
  year: number;
  description: string;
  paymentMethod: 'cash' | 'mpesa' | 'bank' | 'cheque';
  referenceNumber?: string;
}

interface PaymentSummary {
  totalCollected: number;
  totalExpected: number;
  pendingPayments: number;
  overduePayments: number;
  collectionRate: number;
  studentsWithBalance: number;
}

// ============================================================
// CONSTANTS
// ============================================================
const PAYMENT_TYPES = [
  { value: 'tuition', label: 'Tuition Fee' },
  { value: 'activity', label: 'Activity Fee' },
  { value: 'uniform', label: 'Uniform Fee' },
  { value: 'books', label: 'Books Fee' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_STATUS = [
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

// ============================================================
// COMPONENT
// ============================================================
export default function Payments() {
  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentType[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<PaymentFormData>({
    studentId: '',
    amount: 0,
    type: 'tuition',
    status: 'pending',
    dueDate: '',
    paidDate: '',
    term: 1,
    year: new Date().getFullYear(),
    description: '',
    paymentMethod: 'cash',
    referenceNumber: '',
  });

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

      const [allStudents, allPayments, allClasses] = await Promise.all([
        dbOps.getAll('students'),
        dbOps.getAll('payments'),
        dbOps.getAll('classes'),
      ]);

      setStudents((allStudents as any[]).filter((s: any) => s.schoolId === schoolId && s.isActive !== false) as Student[]);
      setPayments((allPayments as any[]).filter((p: any) => p.schoolId === schoolId) as PaymentType[]);
      setClasses((allClasses as any[]).filter((c: any) => c.schoolId === schoolId));
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const getStudent = (id: string) => students.find((s) => s.id === id);
  const getStudentName = (id: string) => {
    const student = getStudent(id);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown';
  };
  const getStudentAdmission = (id: string) => {
    const student = getStudent(id);
    return student?.admissionNumber || 'N/A';
  };

  // ============================================================
  // PAYMENT SUMMARY - Fixed to use actual state
  // ============================================================
  const paymentSummary = useMemo((): PaymentSummary => {
    const totalCollected = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const totalExpected = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = payments.filter((p) => p.status === 'pending').length;
    const overduePayments = payments.filter((p) => p.status === 'overdue').length;
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    const studentsWithBalance = new Set(
      payments.filter((p) => p.status === 'pending' || p.status === 'overdue').map((p) => p.studentId)
    ).size;

    return {
      totalCollected,
      totalExpected,
      pendingPayments,
      overduePayments,
      collectionRate,
      studentsWithBalance,
    };
  }, [payments]);

  // ============================================================
  // FILTER PAYMENTS
  // ============================================================
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const student = getStudent(p.studentId);
        return (
          student?.firstName.toLowerCase().includes(term) ||
          student?.lastName.toLowerCase().includes(term) ||
          student?.admissionNumber.toLowerCase().includes(term) ||
          (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term))
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const student = getStudent(p.studentId);
        return student?.classId === classFilter;
      });
    }

    if (dateRange.from) {
      filtered = filtered.filter((p) => p.dueDate >= dateRange.from);
    }
    if (dateRange.to) {
      filtered = filtered.filter((p) => p.dueDate <= dateRange.to);
    }

    return filtered;
  }, [payments, searchTerm, statusFilter, typeFilter, classFilter, dateRange]);

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================
  const resetForm = () => {
    setFormData({
      studentId: '',
      amount: 0,
      type: 'tuition',
      status: 'pending',
      dueDate: '',
      paidDate: '',
      term: 1,
      year: new Date().getFullYear(),
      description: '',
      paymentMethod: 'cash',
      referenceNumber: '',
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

      if (!formData.studentId || !formData.amount || !formData.dueDate) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.amount <= 0) {
        setError('Amount must be greater than 0');
        return;
      }

      const student = getStudent(formData.studentId);
      if (!student) {
        setError('Student not found');
        return;
      }

      const paymentData: any = {
        schoolId,
        studentId: formData.studentId,
        amount: formData.amount,
        type: formData.type,
        status: formData.status,
        dueDate: formData.dueDate,
        term: formData.term,
        year: formData.year,
        description: formData.description || undefined,
        paymentMethod: formData.paymentMethod || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        updatedAt: Date.now(),
      };

      if (formData.status === 'paid') {
        paymentData.paidDate = formData.paidDate || new Date().toISOString().split('T')[0];
      }

      if (editingId) {
        // Update
        const existing = payments.find((p) => p.id === editingId);
        await dbOps.write('payments', { ...existing, ...paymentData });
        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: userId || '',
          action: 'update',
          entityType: 'payment',
          entityId: editingId,
          timestamp: Date.now(),
          details: `Updated payment for ${getStudentName(formData.studentId)}: KES ${formData.amount}`,
        });
        setSuccess('Payment updated successfully');
      } else {
        // Create
        paymentData.id = `pay_${Date.now()}_${Math.random()}`;
        paymentData.createdAt = Date.now();
        await dbOps.write('payments', paymentData);
        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: userId || '',
          action: 'create',
          entityType: 'payment',
          entityId: paymentData.id,
          timestamp: Date.now(),
          details: `Created payment for ${getStudentName(formData.studentId)}: KES ${formData.amount}`,
        });
        setSuccess('Payment created successfully');
      }

      await loadData();
      setDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save payment');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (payment: PaymentType) => {
    setFormData({
      studentId: payment.studentId,
      amount: payment.amount,
      type: payment.type as any,
      status: payment.status as any,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate || '',
      term: payment.term,
      year: payment.year,
      description: payment.description || '',
      paymentMethod: (payment as any).paymentMethod || 'cash',
      referenceNumber: (payment as any).referenceNumber || '',
    });
    setEditingId(payment.id);
    setDialogOpen(true);
  };

  const handleDelete = async (payment: PaymentType) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;

    try {
      if (!schoolId) throw new Error('School ID not found');

      await dbOps.delete('payments', payment.id);

      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'delete',
        entityType: 'payment',
        entityId: payment.id,
        timestamp: Date.now(),
        details: `Deleted payment for ${getStudentName(payment.studentId)}: KES ${payment.amount}`,
      });

      setSuccess('Payment deleted');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete payment');
      console.error(err);
    }
  };

  const handleStatusChange = async (payment: PaymentType, newStatus: string) => {
    try {
      const updated = {
        ...payment,
        status: newStatus as any,
        paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
        updatedAt: Date.now(),
      };
      await dbOps.write('payments', updated);

      await dbOps.createAuditLog({
        id: `log_${Date.now()}_${Math.random()}`,
        schoolId,
        userId: userId || '',
        action: 'update',
        entityType: 'payment',
        entityId: payment.id,
        timestamp: Date.now(),
        details: `Changed payment status to ${newStatus} for ${getStudentName(payment.studentId)}`,
      });

      setSuccess(`Payment marked as ${newStatus}`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update payment status');
      console.error(err);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  // ============================================================
  // EXPORT
  // ============================================================
  const exportPayments = () => {
    let csv = 'Student,Admission,Amount,Type,Status,Due Date,Paid Date,Term,Year,Description,Payment Method,Reference\n';
    for (const payment of filteredPayments) {
      const student = getStudent(payment.studentId);
      csv += `${student?.firstName || ''} ${student?.lastName || ''},`;
      csv += `${student?.admissionNumber || ''},`;
      csv += `${payment.amount},`;
      csv += `${payment.type},`;
      csv += `${payment.status},`;
      csv += `${payment.dueDate},`;
      csv += `${payment.paidDate || ''},`;
      csv += `${payment.term},`;
      csv += `${payment.year},`;
      csv += `${payment.description || ''},`;
      csv += `${(payment as any).paymentMethod || ''},`;
      csv += `${(payment as any).referenceNumber || ''}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderStatusBadge = (status: string) => {
    const config = PAYMENT_STATUS.find((s) => s.value === status);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderTypeBadge = (type: string) => {
    const config = PAYMENT_TYPES.find((t) => t.value === type);
    return <Badge variant="outline">{config?.label || type}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Manage student fee payments and financial records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportPayments}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Student *</Label>
                  <Select value={formData.studentId} onValueChange={(value) => setFormData({ ...formData, studentId: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName} ({student.admissionNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount (KES) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                    placeholder="0.00"
                    min="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Type</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Paid Date</Label>
                    <Input
                      type="date"
                      value={formData.paidDate}
                      onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                      className="mt-1"
                      disabled={formData.status !== 'paid'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Term</Label>
                    <Select value={String(formData.term)} onValueChange={(value) => setFormData({ ...formData, term: parseInt(value) })}>
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
                    <Label>Year</Label>
                    <Select value={String(formData.year)} onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      className="mt-1"
                      placeholder="e.g., M-Pesa Code"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={saving}>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(paymentSummary.totalCollected)}</p>
            <p className="text-xs text-gray-500">Collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{formatCurrency(paymentSummary.totalExpected)}</p>
            <p className="text-xs text-gray-500">Expected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{paymentSummary.pendingPayments}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{paymentSummary.overduePayments}</p>
            <p className="text-xs text-gray-500">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{paymentSummary.collectionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Collection Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{paymentSummary.studentsWithBalance}</p>
            <p className="text-xs text-gray-500">Students with Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or admission..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {PAYMENT_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>From</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>To</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            {filteredPayments.length} {filteredPayments.length === 1 ? 'record' : 'records'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{getStudentName(payment.studentId)}</TableCell>
                    <TableCell className="font-mono text-sm">{getStudentAdmission(payment.studentId)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{renderTypeBadge(payment.type)}</TableCell>
                    <TableCell>{renderStatusBadge(payment.status)}</TableCell>
                    <TableCell>{payment.dueDate}</TableCell>
                    <TableCell>{(payment as any).paymentMethod || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{(payment as any).referenceNumber || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(payment)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                      <DollarSign className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-2">No payments found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}