import { useEffect, useState, useMemo, useCallback } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Download, RefreshCw, Activity, Search, Filter, X, User as UserIcon, FileText, Calendar, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AuditLog, User } from '@/lib/db/schema';

// CONSTANTS
const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
  login: 'bg-purple-100 text-purple-800 border-purple-200',
  logout: 'bg-gray-100 text-gray-800 border-gray-200',
  export: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  print: 'bg-amber-100 text-amber-800 border-amber-200',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Login',
  logout: 'Logout',
  export: 'Export',
  print: 'Print',
};

const ENTITY_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  class: 'Class',
  subject: 'Subject',
  mark: 'Mark',
  attendance: 'Attendance',
  payment: 'Payment',
  user: 'User',
  settings: 'Settings',
  report: 'Report',
  auditLog: 'Audit Log',
  school: 'School',
  system: 'System',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  student: <UserIcon className="h-3 w-3" />,
  teacher: <UserIcon className="h-3 w-3" />,
  class: <Shield className="h-3 w-3" />,
  subject: <FileText className="h-3 w-3" />,
  mark: <FileText className="h-3 w-3" />,
  attendance: <Calendar className="h-3 w-3" />,
  payment: <FileText className="h-3 w-3" />,
  user: <UserIcon className="h-3 w-3" />,
  settings: <FileText className="h-3 w-3" />,
  report: <FileText className="h-3 w-3" />,
  system: <Activity className="h-3 w-3" />,
};

// COMPONENT
export default function AuditLogs() {
  // Data state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialog state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const schoolId = auth.getCurrentSchoolId();

  // LOAD DATA
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!schoolId) {
        setError('School ID not found. Please login again.');
        setLoading(false);
        return;
      }

      // Load audit logs
      let allLogs = [];
      try {
        allLogs = await dbOps.getAll('auditLogs') as any[];
      } catch (err) {
        console.warn('Could not fetch from auditLogs:', err);
        allLogs = [];
      }

      // Filter by school and sort
      const schoolLogs = allLogs
        .filter((l: any) => l.schoolId === schoolId)
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      
      setLogs(schoolLogs);
      setFilteredLogs(schoolLogs);

      // Load users for display
      try {
        const allUsers = await dbOps.getAll('users') as any[];
        const schoolUsers = allUsers.filter((u: any) => u.schoolId === schoolId);
        setUsers(schoolUsers);
      } catch (err) {
        console.warn('Could not load users:', err);
        setUsers([]);
      }

      if (schoolLogs.length === 0) {
        setError('No audit logs found. Logs will appear as you perform actions.');
      } else {
        setSuccess(`Loaded ${schoolLogs.length} audit logs`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // FILTER
  const applyFilters = useCallback(() => {
    let filtered = logs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((log) => {
        const user = users.find((u) => u.id === log.userId);
        const userName = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : '';
        return (
          log.action?.toLowerCase().includes(term) ||
          log.entityType?.toLowerCase().includes(term) ||
          userName.includes(term) ||
          (log.details && log.details.toLowerCase().includes(term))
        );
      });
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (entityFilter !== 'all') {
      filtered = filtered.filter((log) => log.entityType === entityFilter);
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter((log) => log.userId === userFilter);
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter((log) => (log.timestamp || 0) >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      filtered = filtered.filter((log) => (log.timestamp || 0) <= end);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, entityFilter, userFilter, startDate, endDate, users]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setEntityFilter('all');
    setUserFilter('all');
    setStartDate('');
    setEndDate('');
    setShowFilters(false);
  };

  const hasActiveFilters = () => {
    return (
      searchTerm !== '' ||
      actionFilter !== 'all' ||
      entityFilter !== 'all' ||
      userFilter !== 'all' ||
      startDate !== '' ||
      endDate !== ''
    );
  };

  // HELPERS
  const getUserName = (userId: string) => {
    if (!userId) return 'System';
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  const getActionBadge = (action: string) => {
    const color = ACTION_COLORS[action] || 'bg-gray-100 text-gray-800';
    const label = ACTION_LABELS[action] || action.charAt(0).toUpperCase() + action.slice(1);
    return (
      <Badge variant="outline" className={`${color} border-0 font-medium text-xs whitespace-nowrap px-2 py-0.5`}>
        {label}
      </Badge>
    );
  };

  const getEntityLabel = (entityType: string) => {
    return ENTITY_LABELS[entityType] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
  };

  const getEntityIcon = (entityType: string) => {
    return ENTITY_ICONS[entityType] || <FileText className="h-3 w-3" />;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateShort = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // EXPORT
  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No logs to export');
      return;
    }

    const headers = ['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'];
    const rows = filteredLogs.map((log) => [
      formatDate(log.timestamp),
      getUserName(log.userId),
      log.action || 'unknown',
      log.entityType || 'unknown',
      log.entityId || '-',
      log.details || '-',
      log.ip || log.ipAddress || '-',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setSuccess('Audit logs exported successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // STATS
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const logins = filteredLogs.filter((l) => l.action === 'login').length;
    const dataChanges = filteredLogs.filter((l) => ['create', 'update', 'delete'].includes(l.action || '')).length;
    const exports = filteredLogs.filter((l) => ['export', 'print'].includes(l.action || '')).length;
    const uniqueUsers = new Set(filteredLogs.map((l) => l.userId)).size;
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = filteredLogs.filter((l) => {
      const logDate = l.timestamp ? new Date(l.timestamp).toISOString().split('T')[0] : '';
      return logDate === today;
    }).length;

    return { total, logins, dataChanges, exports, uniqueUsers, todayLogs };
  }, [filteredLogs]);

  // UNIQUE VALUES FOR FILTERS
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return Array.from(actions).filter(Boolean);
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    const entities = new Set(logs.map((l) => l.entityType));
    return Array.from(entities).filter(Boolean);
  }, [logs]);

  const uniqueUsersList = useMemo(() => {
    const userIds = new Set(logs.map((l) => l.userId));
    return Array.from(userIds).filter(Boolean);
  }, [logs]);

  // RENDER
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  // Columns
  const columns = [
    {
      key: 'timestamp' as const,
      label: 'Date & Time',
      sortable: true,
      width: '140px',
      render: (timestamp: number) => (
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium whitespace-nowrap">{formatDate(timestamp)}</span>
          <span className="text-[10px] text-gray-400">{formatDateShort(timestamp)}</span>
        </div>
      ),
    },
    {
      key: 'userId' as const,
      label: 'User',
      sortable: true,
      width: '160px',
      render: (userId: string) => (
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-semibold text-[10px]">
              {getUserName(userId).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs font-medium truncate max-w-[100px]">{getUserName(userId)}</span>
            {userId && (
              <span className="text-[10px] text-gray-400 font-mono truncate">
                {userId.substring(0, 8)}...
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'action' as const,
      label: 'Action',
      sortable: true,
      width: '100px',
      render: (action: string) => getActionBadge(action),
    },
    {
      key: 'entityType' as const,
      label: 'Entity',
      sortable: true,
      width: '100px',
      render: (entityType: string) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-gray-400 flex-shrink-0">{getEntityIcon(entityType)}</span>
          <span className="text-xs text-gray-700 truncate max-w-[70px]">{getEntityLabel(entityType)}</span>
        </div>
      ),
    },
    {
      key: 'details' as const,
      label: 'Details',
      width: 'auto',
      render: (details: string) => (
        <div className="min-w-[120px] max-w-[250px]">
          <p className="text-xs text-gray-500 truncate" title={details || ''}>
            {details || '-'}
          </p>
        </div>
      ),
    },
  ];

  const actions = [
    {
      label: 'View Details',
      icon: <FileText className="h-3.5 w-3.5" />,
      onClick: (log: AuditLog) => {
        setSelectedLog(log);
        setDetailDialogOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-600">System activity and user actions tracking</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" onClick={loadData} className="gap-1.5 h-8 text-xs" size="sm">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            onClick={exportCSV}
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            size="sm"
            disabled={filteredLogs.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 h-8 text-xs"
            size="sm"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters() && (
              <Badge variant="default" className="ml-0.5 bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                {[actionFilter, entityFilter, userFilter].filter((f) => f !== 'all').length +
                  (searchTerm ? 1 : 0) +
                  (startDate ? 1 : 0) +
                  (endDate ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant={error.includes('No audit logs') ? 'default' : 'destructive'} className="py-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800 py-2 text-sm">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Compact Filters */}
      {showFilters && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 h-7 text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <Label className="text-[10px] font-medium text-gray-500">Search</Label>
                <div className="relative mt-0.5">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-6 h-7 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-medium text-gray-500">Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-7 mt-0.5 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action} className="text-xs">
                        {ACTION_LABELS[action] || action.charAt(0).toUpperCase() + action.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-medium text-gray-500">Entity</Label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="h-7 mt-0.5 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Entities</SelectItem>
                    {uniqueEntities.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {getEntityLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-medium text-gray-500">User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-7 mt-0.5 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Users</SelectItem>
                    {uniqueUsersList.map((userId) => (
                      <SelectItem key={userId} value={userId} className="text-xs">
                        {getUserName(userId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-medium text-gray-500">From</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 mt-0.5 text-xs"
                />
              </div>

              <div>
                <Label className="text-[10px] font-medium text-gray-500">To</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-7 mt-0.5 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Stats Cards */}
      {filteredLogs.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 text-center">
              <p className="text-lg font-bold text-blue-600">{stats.total}</p>
              <p className="text-[10px] text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 text-center">
              <p className="text-lg font-bold text-purple-600">{stats.logins}</p>
              <p className="text-[10px] text-gray-500">Logins</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 text-center">
              <p className="text-lg font-bold text-amber-600">{stats.dataChanges}</p>
              <p className="text-[10px] text-gray-500">Changes</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 text-center">
              <p className="text-lg font-bold text-green-600">{stats.exports}</p>
              <p className="text-[10px] text-gray-500">Exports</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 text-center">
              <p className="text-lg font-bold text-indigo-600">{stats.uniqueUsers}</p>
              <p className="text-[10px] text-gray-500">Users</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 text-center">
              <p className="text-lg font-bold text-emerald-600">{stats.todayLogs}</p>
              <p className="text-[10px] text-gray-500">Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
              <CardDescription className="text-xs">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
                {logs.length !== filteredLogs.length && ` (${logs.length} total)`}
              </CardDescription>
            </div>
            {hasActiveFilters() && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 h-7 text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-300 mb-3">
                <Activity className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-base font-semibold text-gray-700">No audit logs found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                {logs.length === 0 
                  ? 'Logs will appear as users perform actions in the system.' 
                  : 'Try adjusting your filters to see more results.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                data={filteredLogs}
                columns={columns}
                actions={actions}
                searchable={false}
                pageSize={20}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 py-2">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-xs">
          <strong>📋 Audit Trail</strong> Tracks all system activities including login/logout, 
          data creation, modification, deletion, and report generation.
        </AlertDescription>
      </Alert>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Detailed information about this audit event
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Date & Time</p>
                  <p className="text-sm mt-0.5">{formatDate(selectedLog.timestamp)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">User</p>
                  <p className="text-sm mt-0.5">{getUserName(selectedLog.userId)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Action</p>
                  <div className="mt-0.5">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Entity Type</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-gray-400">{getEntityIcon(selectedLog.entityType)}</span>
                    <span className="text-sm">{getEntityLabel(selectedLog.entityType)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Entity ID</p>
                  <p className="text-sm font-mono mt-0.5 break-all">{selectedLog.entityId || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">IP Address</p>
                  <p className="text-sm font-mono mt-0.5">{selectedLog.ip || selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Details</p>
                <div className="mt-0.5 p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedLog.details || 'No details available'}</p>
                </div>
              </div>

              {selectedLog.changes && (
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Changes</p>
                  <div className="mt-0.5 p-2 bg-gray-50 rounded-lg font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog.changes, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}