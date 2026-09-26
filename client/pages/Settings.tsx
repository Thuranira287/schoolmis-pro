import { useEffect, useState, useRef } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Edit2, Trash2, Save, RefreshCw, Download, Upload, Shield, Bell, Key, Eye, EyeOff, School, BookOpen, Database, Settings as SettingsIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Settings, FeeStructure, AuditLog } from '@/lib/db/schema';

// TYPES
interface BackupInfo {
  lastBackup: string;
  size: string;
  records: number;
  status: 'success' | 'failed' | 'pending';
}

// CONSTANTS
const TERMS = [1, 2, 3];

const GRADING_SYSTEMS = [
  { value: 'cbc', label: 'CBC (Competency-Based Curriculum)' },
  { value: 'cba', label: 'CBA (Competency-Based Assessment)' },
  { value: 'traditional', label: 'Traditional' },
] as const;

const CURRENCIES = [
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
] as const;

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank', 'Cheque'] as const;

const BACKUP_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

const ASSESSMENT_TYPES = ['Formative 1', 'Formative 2', 'Summative', 'End of Term'] as const;

// COMPONENT
export default function Settings() {
  // Loading states
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  const schoolId = auth.getCurrentSchoolId();
  const userId = auth.getCurrentUserId();

  // Default settings 
  const currentYear = new Date().getFullYear().toString();
  
  const defaultSettings: Settings = {
    id: '',
    schoolId: '',
    general: {
      schoolName: '',
      schoolAddress: '',
      schoolPhone: '',
      schoolEmail: '',
      principalName: '',
      registrationNumber: '',
      motto: '',
      logo: ''
    },
    academic: {
      currentTerm: `Term 1, ${currentYear}`,
      academicYear: currentYear,
      termStart: '',
      termEnd: '',
      gradingSystem: 'cbc',
      assessmentTypes: [...ASSESSMENT_TYPES]
    },
    financial: {
      currency: 'KES',
      feeStructure: [],
      paymentMethods: ['Cash', 'M-Pesa', 'Bank', 'Cheque'],
      lateFeePercentage: 10,
      defaultFeeAmount: 15000
    },
    system: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      requireStrongPassword: true,
      enableTwoFactor: false,
      enableAuditLog: true,
      enableAutoBackup: true,
      backupFrequency: 'daily',
      maintenanceMode: false
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      feeReminders: true,
      attendanceAlerts: true,
      gradeAlerts: false,
      systemAlerts: true
    },
    security: {
      allowPasswordChange: true,
      sessionTimeout: 30,
      ipWhitelist: [],
      allowedDomains: [],
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    },
    updatedAt: Date.now()
  };

  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [feeFormData, setFeeFormData] = useState<Partial<FeeStructure>>({
    className: '',
    termFee: 0,
    registrationFee: 0,
    activityFee: 0,
    otherFees: []
  });

  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // LOAD DATA

  useEffect(() => {
    loadSettings();
    loadBackupInfo();
  }, []);

  const loadSettings = async () => {
  try {
    setLoadingSettings(true);
    setError('');

    if (!schoolId) throw new Error('School ID not found');

    console.log('Loading settings for school:', schoolId);

    // Get all settings from the database
    const allSettings = await dbOps.getAll<Settings>('settings');
    console.log('All settings from DB:', allSettings);
    
    const schoolSettings = allSettings.find((s) => s.schoolId === schoolId);
    
    if (schoolSettings) {
      console.log('Found settings:', schoolSettings);
      setSettings(schoolSettings);
    } else {
      console.log('No settings found, using defaults');
      // Default settings
    }
  } catch (err) {
    console.error('Error loading settings:', err);
    setError('Failed to load settings');
  } finally {
    setLoadingSettings(false);
  }
};

  const loadBackupInfo = async () => {
    try {
      const backupData = localStorage.getItem('backupInfo');
      if (backupData) {
        setBackupInfo(JSON.parse(backupData));
      }
    } catch (error) {
      console.error('Error loading backup info:', error);
    }
  };

  // SAVE SETTINGS
  const validateSettings = (): boolean => {
    if (!settings.general.schoolName.trim()) {
      setError('School name is required');
      return false;
    }
    if (settings.general.schoolPhone && !/^[\d+\s-()]{8,15}$/.test(settings.general.schoolPhone)) {
      setError('Please enter a valid phone number');
      return false;
    }
    if (settings.general.schoolEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.general.schoolEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
  if (!validateSettings()) return;

  try {
    setSavingSettings(true);
    setError('');
    setSuccess('');

    if (!schoolId) throw new Error('School ID not found');

    const settingsDoc: Settings = {
      id: `settings_${schoolId}`, 
      schoolId,
      general: settings.general,
      academic: settings.academic,
      financial: settings.financial,
      system: settings.system,
      notifications: settings.notifications,
      security: settings.security,
      updatedAt: Date.now()
    };

    // Check if settings already exist
    const existing = await dbOps.getAll<Settings>('settings');
    const existingSettings = existing.find((s) => s.schoolId === schoolId);
    
    if (existingSettings) {
      const updatedDoc = {
        ...settingsDoc,
        id: existingSettings.id,
      };
      await dbOps.write('settings', updatedDoc);
    } else {
      await dbOps.write('settings', settingsDoc);
    }

    // Log audit
    await dbOps.createAuditLog({
      id: `log_${Date.now()}_${Math.random()}`,
      schoolId,
      userId: userId || '',
      action: 'update',
      entityType: 'settings',
      entityId: 'school_settings',
      timestamp: Date.now(),
      details: 'Settings updated',
    });

    setSuccess('Settings saved successfully');
    setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
    setError('Failed to save settings');
    console.error(err);
  } finally {
    setSavingSettings(false);
  }
};

  // CHANGE HANDLERS
  const handleGeneralChange = (key: keyof Settings['general'], value: string) => {
    setSettings(prev => ({
      ...prev,
      general: { ...prev.general, [key]: value }
    }));
  };

  const handleAcademicChange = <K extends keyof Settings['academic']>(key: K, value: Settings['academic'][K]) => {
    setSettings(prev => ({
      ...prev,
      academic: { ...prev.academic, [key]: value }
    }));
  };

  const handleFinancialChange = <K extends keyof Settings['financial']>(key: K, value: Settings['financial'][K]) => {
    setSettings(prev => ({
      ...prev,
      financial: { ...prev.financial, [key]: value }
    }));
  };

  const handleSystemChange = <K extends keyof Settings['system']>(key: K, value: Settings['system'][K]) => {
    setSettings(prev => ({
      ...prev,
      system: { ...prev.system, [key]: value }
    }));
  };

  const handleNotificationChange = <K extends keyof Settings['notifications']>(key: K, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const handleSecurityChange = <K extends keyof Settings['security']>(key: K, value: Settings['security'][K]) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }));
  };

  // FEE STRUCTURE
  const handleAddFee = () => {
    setEditingFee(null);
    setFeeFormData({
      className: '',
      termFee: 0,
      registrationFee: 0,
      activityFee: 0,
      otherFees: []
    });
    setFeeModalOpen(true);
  };

  const handleEditFee = (fee: FeeStructure) => {
    setEditingFee(fee);
    setFeeFormData(fee);
    setFeeModalOpen(true);
  };

  const handleDeleteFee = (feeId: string, className: string) => {
    setDeleteTarget({ id: feeId, name: className });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteFee = () => {
    if (!deleteTarget) return;
    
    setSettings(prev => ({
      ...prev,
      financial: {
        ...prev.financial,
        feeStructure: prev.financial.feeStructure.filter(f => f.id !== deleteTarget.id)
      }
    }));
    setSuccess('Fee structure deleted');
    setTimeout(() => setSuccess(''), 3000);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleSaveFee = () => {
    if (!feeFormData.className || !feeFormData.termFee) {
      setError('Class name and term fee are required');
      return;
    }

    const feeData: FeeStructure = {
      id: editingFee?.id || `fee_${Date.now()}_${Math.random()}`,
      className: feeFormData.className,
      termFee: feeFormData.termFee || 0,
      registrationFee: feeFormData.registrationFee || 0,
      activityFee: feeFormData.activityFee || 0,
      otherFees: feeFormData.otherFees || []
    };

    let updatedFees: FeeStructure[];
    if (editingFee) {
      updatedFees = settings.financial.feeStructure.map(f => 
        f.id === editingFee.id ? feeData : f
      );
    } else {
      updatedFees = [...settings.financial.feeStructure, feeData];
    }

    setSettings(prev => ({
      ...prev,
      financial: { ...prev.financial, feeStructure: updatedFees }
    }));

    setFeeModalOpen(false);
    setSuccess(editingFee ? 'Fee structure updated' : 'Fee structure added');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddOtherFee = () => {
    const name = window.prompt('Enter fee name:');
    if (!name) return;
    const amount = window.prompt('Enter amount:');
    if (!amount) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Invalid amount');
      return;
    }

    setFeeFormData(prev => ({
      ...prev,
      otherFees: [...(prev.otherFees || []), { name, amount: numAmount }]
    }));
  };

  const handleRemoveOtherFee = (index: number) => {
    setFeeFormData(prev => ({
      ...prev,
      otherFees: prev.otherFees?.filter((_, i) => i !== index) || []
    }));
  };

  // ============================================================
  // BACKUP
  // ============================================================
  const handleBackup = async () => {
    try {
      setBackingUp(true);
      setError('');

      if (!schoolId) throw new Error('School ID not found');

      // Get all data from the database
      const stores = ['schools', 'users', 'students', 'teachers', 'classes', 'subjects', 'marks', 'attendance', 'payments', 'auditLogs', 'settings', 'reportCards'];
      const data: Record<string, any> = {};
      
      for (const store of stores) {
        const allData = await dbOps.getAll(store);
        data[store] = allData.filter((item: any) => item.schoolId === schoolId);
      }
      
      // Add metadata
      data._meta = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        schoolId,
        records: Object.values(data).reduce((sum, arr) => sum + (arr?.length || 0), 0)
      };
      
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Update backup info
      const info: BackupInfo = {
        lastBackup: new Date().toISOString(),
        size: `${(blob.size / 1024).toFixed(2)} KB`,
        records: data._meta.records,
        status: 'success'
      };
      setBackupInfo(info);
      localStorage.setItem('backupInfo', JSON.stringify(info));
      
      setSuccess('Backup created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create backup');
      console.error(err);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Restoring will replace all current data. Continue?')) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setRestoring(true);
        setError('');

        if (!schoolId) throw new Error('School ID not found');

        const data = JSON.parse(e.target?.result as string);
        
        // Validate backup data
        if (!data._meta || !data._meta.version) {
          throw new Error('Invalid backup file');
        }

        const stores = ['schools', 'users', 'students', 'teachers', 'classes', 'subjects', 'marks', 'attendance', 'payments', 'auditLogs', 'settings', 'reportCards'];
        
        for (const store of stores) {
          if (data[store]) {
            // Clear existing data for this school
            const existing = await dbOps.getAll(store);
            const schoolItems = existing.filter((item: any) => item.schoolId === schoolId);
            for (const item of schoolItems) {
              if (item && typeof item === 'object' && 'id' in item) {
                await dbOps.delete(store, (item as any).id);
              }
            }
            // Import new data
            for (const item of data[store]) {
              await dbOps.write(store, item);
            }
          }
        }
        
        setSuccess('Data restored successfully');
        loadSettings();
        event.target.value = '';
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to restore data: ' + (err as Error).message);
        console.error(err);
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  // PASSWORD CHANGE
  const hashPassword = async (password: string): Promise<string> => {
    // Using Web Crypto API for secure hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleChangePassword = async () => {
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (changePasswordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setChangingPassword(true);
      setError('');
      setSuccess('');

      if (!schoolId) throw new Error('School ID not found');

      // Get current user
      const user = await dbOps.getUser(userId || '');
      if (user) {
        // Verify current password
        const currentHash = await hashPassword(changePasswordData.currentPassword);
        if (user.passwordHash !== currentHash) {
          setError('Current password is incorrect');
          return;
        }

        // Hash the new password
        const hashedPassword = await hashPassword(changePasswordData.newPassword);
        
        // Update user with new password hash
        const updatedUser = {
          ...user,
          passwordHash: hashedPassword,
          updatedAt: Date.now()
        };
        
        await dbOps.updateUser(updatedUser);
        
        // Log audit
        await dbOps.createAuditLog({
          id: `log_${Date.now()}_${Math.random()}`,
          schoolId,
          userId: userId || '',
          action: 'update',
          entityType: 'user',
          entityId: userId || '',
          timestamp: Date.now(),
          details: 'Password changed'
        });

        setSuccess('Password changed successfully');
        setPasswordModalOpen(false);
        setChangePasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to change password');
      console.error(err);
    } finally {
      setChangingPassword(false);
    }
  };

  // RENDER
  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Generate term options dynamically
  const academicYear = Number(settings.academic.academicYear) || new Date().getFullYear();
  const termOptions = TERMS.map(term => `Term ${term}, ${academicYear}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your school system settings</p>
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadSettings} disabled={loadingSettings || savingSettings}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingSettings ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button onClick={handleSave} disabled={savingSettings || loadingSettings} className="bg-indigo-600 hover:bg-indigo-700">
          {savingSettings ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">
            <School className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="academic">
            <BookOpen className="h-4 w-4 mr-2" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="financial">
            <Database className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Download className="h-4 w-4 mr-2" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
        </TabsList>

       {/*GENERAL SETTINGS */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Update your school's basic information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input
                    id="schoolName"
                    value={settings.general.schoolName}
                    onChange={(e) => handleGeneralChange('schoolName', e.target.value)}
                    className="mt-1"
                    placeholder="e.g., Demo Primary School"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={settings.general.registrationNumber}
                    onChange={(e) => handleGeneralChange('registrationNumber', e.target.value)}
                    className="mt-1"
                    placeholder="e.g., SCH-001"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="schoolAddress">School Address</Label>
                <Input
                  id="schoolAddress"
                  value={settings.general.schoolAddress}
                  onChange={(e) => handleGeneralChange('schoolAddress', e.target.value)}
                  className="mt-1"
                  placeholder="e.g., P.O Box 001, Nairobi"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolPhone">Phone Number</Label>
                  <Input
                    id="schoolPhone"
                    value={settings.general.schoolPhone}
                    onChange={(e) => handleGeneralChange('schoolPhone', e.target.value)}
                    className="mt-1"
                    placeholder="e.g., +254 722 000 000"
                  />
                </div>
                <div>
                  <Label htmlFor="schoolEmail">Email Address</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={settings.general.schoolEmail}
                    onChange={(e) => handleGeneralChange('schoolEmail', e.target.value)}
                    className="mt-1"
                    placeholder="school@email.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="motto">School Motto</Label>
                <Input
                  id="motto"
                  value={settings.general.motto}
                  onChange={(e) => handleGeneralChange('motto', e.target.value)}
                  className="mt-1"
                  placeholder="e.g., Strive for Excellence"
                />
              </div>

              <div>
                <Label htmlFor="principalName">Principal's Name</Label>
                <Input
                  id="principalName"
                  value={settings.general.principalName}
                  onChange={(e) => handleGeneralChange('principalName', e.target.value)}
                  className="mt-1"
                  placeholder="Principal's full name"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACADEMIC SETTINGS */}
        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <CardTitle>Academic Settings</CardTitle>
              <CardDescription>
                Configure academic terms, grading system, and assessment types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentTerm">Current Term</Label>
                  <Select
                    value={settings.academic.currentTerm}
                    onValueChange={(value) => handleAcademicChange('currentTerm', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {termOptions.map((term) => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Input
                    id="academicYear"
                    value={settings.academic.academicYear}
                    onChange={(e) => handleAcademicChange('academicYear', e.target.value)}
                    className="mt-1"
                    placeholder="e.g., 2025"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="termStart">Term Start Date</Label>
                  <Input
                    id="termStart"
                    type="date"
                    value={settings.academic.termStart}
                    onChange={(e) => handleAcademicChange('termStart', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="termEnd">Term End Date</Label>
                  <Input
                    id="termEnd"
                    type="date"
                    value={settings.academic.termEnd}
                    onChange={(e) => handleAcademicChange('termEnd', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gradingSystem">Grading System</Label>
                <Select
                  value={settings.academic.gradingSystem}
                  onValueChange={(value: 'cbc' | 'cba' | 'traditional') => 
                    handleAcademicChange('gradingSystem', value)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADING_SYSTEMS.map((system) => (
                      <SelectItem key={system.value} value={system.value}>
                        {system.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assessment Types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.academic.assessmentTypes.map((type, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                      {type}
                      <button
                        className="ml-1 text-gray-500 hover:text-red-500"
                        onClick={() => {
                          const newTypes = settings.academic.assessmentTypes.filter((_, i) => i !== index);
                          handleAcademicChange('assessmentTypes', newTypes);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const name = window.prompt('Enter assessment type name:');
                      if (name) {
                        handleAcademicChange('assessmentTypes', [...settings.academic.assessmentTypes, name]);
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            FINANCIAL SETTINGS
            ============================================================ */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>
                Configure currency, payment methods, and fee structures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.financial.currency}
                    onValueChange={(value) => handleFinancialChange('currency', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="defaultFeeAmount">Default Fee Amount</Label>
                  <Input
                    id="defaultFeeAmount"
                    type="number"
                    value={settings.financial.defaultFeeAmount}
                    onChange={(e) => handleFinancialChange('defaultFeeAmount', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                    placeholder="15000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lateFeePercentage">Late Fee Penalty (%)</Label>
                <Input
                  id="lateFeePercentage"
                  type="number"
                  value={settings.financial.lateFeePercentage}
                  onChange={(e) => handleFinancialChange('lateFeePercentage', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  placeholder="10"
                />
              </div>

              <div>
                <Label>Payment Methods</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.financial.paymentMethods.map((method, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                      {method}
                      <button
                        className="ml-1 text-gray-500 hover:text-red-500"
                        onClick={() => {
                          const newMethods = settings.financial.paymentMethods.filter((_, i) => i !== index);
                          handleFinancialChange('paymentMethods', newMethods);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const name = window.prompt('Enter payment method:');
                      if (name) {
                        handleFinancialChange('paymentMethods', [...settings.financial.paymentMethods, name]);
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Fee Structure</h4>
                  <Button size="sm" onClick={handleAddFee}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Fee Structure
                  </Button>
                </div>

                {settings.financial.feeStructure.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No fee structures configured</p>
                    <p className="text-sm">Add fee structures for different classes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settings.financial.feeStructure.map((fee) => (
                      <div key={fee.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{fee.className}</h5>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditFee(fee)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteFee(fee.id, fee.className)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-gray-500">Term Fee:</span>
                            <span className="ml-1 font-medium">KES {fee.termFee.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Registration:</span>
                            <span className="ml-1 font-medium">KES {fee.registrationFee.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Activity Fee:</span>
                            <span className="ml-1 font-medium">KES {fee.activityFee.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Other Fees:</span>
                            <span className="ml-1 font-medium">
                              {fee.otherFees?.length || 0} items
                            </span>
                          </div>
                        </div>
                        {fee.otherFees && fee.otherFees.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {fee.otherFees.map((of, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {of.name}: KES {of.amount.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            NOTIFICATIONS
            ============================================================ */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure notification preferences and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email updates</p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">Browser push notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('pushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Fee Reminders</p>
                    <p className="text-sm text-gray-500">Send fee payment reminders</p>
                  </div>
                  <Switch
                    checked={settings.notifications.feeReminders}
                    onCheckedChange={(checked) => handleNotificationChange('feeReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Attendance Alerts</p>
                    <p className="text-sm text-gray-500">Notify about absences</p>
                  </div>
                  <Switch
                    checked={settings.notifications.attendanceAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('attendanceAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Grade Alerts</p>
                    <p className="text-sm text-gray-500">Notify about grade changes</p>
                  </div>
                  <Switch
                    checked={settings.notifications.gradeAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('gradeAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">System Alerts</p>
                    <p className="text-sm text-gray-500">System maintenance updates</p>
                  </div>
                  <Switch
                    checked={settings.notifications.systemAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('systemAlerts', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            SECURITY
            ============================================================ */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value) || 30)}
                    className="mt-1"
                    min="5"
                    max="120"
                  />
                </div>
                <div>
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={settings.system.maxLoginAttempts}
                    onChange={(e) => handleSystemChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
                    className="mt-1"
                    min="3"
                    max="10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Require Strong Passwords</p>
                    <p className="text-sm text-gray-500">Minimum 8 chars with mixed case, numbers, special chars</p>
                  </div>
                  <Switch
                    checked={settings.system.requireStrongPassword}
                    onCheckedChange={(checked) => handleSystemChange('requireStrongPassword', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">Extra security layer for admin accounts</p>
                  </div>
                  <Switch
                    checked={settings.system.enableTwoFactor}
                    onCheckedChange={(checked) => handleSystemChange('enableTwoFactor', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Enable Audit Log</p>
                    <p className="text-sm text-gray-500">Log all user actions for security</p>
                  </div>
                  <Switch
                    checked={settings.system.enableAuditLog}
                    onCheckedChange={(checked) => handleSystemChange('enableAuditLog', checked)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ipWhitelist">IP Whitelist (one per line)</Label>
                <Textarea
                  id="ipWhitelist"
                  className="mt-1 font-mono"
                  rows={3}
                  value={settings.security.ipWhitelist.join('\n')}
                  onChange={(e) => handleSecurityChange('ipWhitelist', e.target.value.split('\n').filter(Boolean))}
                  placeholder="192.168.1.1&#10;10.0.0.1"
                />
              </div>

              <div>
                <Label htmlFor="allowedDomains">Allowed Domains (one per line)</Label>
                <Textarea
                  id="allowedDomains"
                  className="mt-1 font-mono"
                  rows={3}
                  value={settings.security.allowedDomains.join('\n')}
                  onChange={(e) => handleSecurityChange('allowedDomains', e.target.value.split('\n').filter(Boolean))}
                  placeholder="school.ke&#10;education.go.ke"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Change Password</h4>
                <Button onClick={() => setPasswordModalOpen(true)}>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            BACKUP
            ============================================================ */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>
                Backup your school data and restore from backups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {backupInfo && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Last Backup</p>
                    <p className="font-medium">{new Date(backupInfo.lastBackup).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Backup Size</p>
                    <p className="font-medium">{backupInfo.size}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Records</p>
                    <p className="font-medium">{backupInfo.records}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      backupInfo.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {backupInfo.status}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Create Backup
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Export all school data as a JSON backup file
                  </p>
                  <Button className="mt-3" onClick={handleBackup} disabled={backingUp || restoring}>
                    {backingUp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Backup
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Restore Backup
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Restore data from a JSON backup file
                  </p>
                  <div className="mt-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      aria-label="Restore Backup File"
                      onChange={handleRestore}
                      disabled={backingUp || restoring}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto Backup</h4>
                    <p className="text-sm text-gray-500">Automatically backup data periodically</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select
                      value={settings.system.backupFrequency}
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                        handleSystemChange('backupFrequency', value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKUP_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Switch
                      checked={settings.system.enableAutoBackup}
                      onCheckedChange={(checked) => handleSystemChange('enableAutoBackup', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            SYSTEM
            ============================================================ */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Manage system configuration and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Put the system in maintenance mode</p>
                </div>
                <Switch
                  checked={settings.system.maintenanceMode}
                  onCheckedChange={(checked) => handleSystemChange('maintenanceMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Allow Password Change</p>
                  <p className="text-sm text-gray-500">Allow users to change their passwords</p>
                </div>
                <Switch
                  checked={settings.security.allowPasswordChange}
                  onCheckedChange={(checked) => handleSecurityChange('allowPasswordChange', checked)}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">System Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">Version</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">Database</span>
                    <span>IndexedDB</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">Storage Used</span>
                    <span>{backupInfo?.size || '0 KB'}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">Last Updated</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-600">Danger Zone</h4>
                    <p className="text-sm text-gray-500">Reset all data and settings to default</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (window.confirm('WARNING: This will delete all data. Are you sure?')) {
                        setError('System reset initiated');
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================
          FEE STRUCTURE MODAL
          ============================================================ */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFee ? 'Edit Fee Structure' : 'Add Fee Structure'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="feeClassName">Class Name *</Label>
              <Input
                id="feeClassName"
                value={feeFormData.className}
                onChange={(e) => setFeeFormData({ ...feeFormData, className: e.target.value })}
                className="mt-1"
                placeholder="e.g., Grade 4"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="termFee">Term Fee *</Label>
                <Input
                  id="termFee"
                  type="number"
                  value={feeFormData.termFee}
                  onChange={(e) => setFeeFormData({ ...feeFormData, termFee: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                  placeholder="15000"
                />
              </div>
              <div>
                <Label htmlFor="registrationFee">Registration Fee</Label>
                <Input
                  id="registrationFee"
                  type="number"
                  value={feeFormData.registrationFee}
                  onChange={(e) => setFeeFormData({ ...feeFormData, registrationFee: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                  placeholder="5000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="activityFee">Activity Fee</Label>
              <Input
                id="activityFee"
                type="number"
                value={feeFormData.activityFee}
                onChange={(e) => setFeeFormData({ ...feeFormData, activityFee: parseFloat(e.target.value) || 0 })}
                className="mt-1"
                placeholder="2000"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Other Fees</Label>
                <Button variant="outline" size="sm" onClick={handleAddOtherFee}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Fee
                </Button>
              </div>
              {feeFormData.otherFees && feeFormData.otherFees.length > 0 ? (
                <div className="space-y-2">
                  {feeFormData.otherFees.map((fee, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{fee.name}: KES {fee.amount.toLocaleString()}</span>
                      <Button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveOtherFee(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No additional fees</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFeeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFee} className="bg-indigo-600 hover:bg-indigo-700">
              {editingFee ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          CHANGE PASSWORD MODAL
          ============================================================ */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="currentPassword">Current Password *</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={changePasswordData.currentPassword}
                  onChange={(e) => setChangePasswordData({ ...changePasswordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={changePasswordData.newPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                className="mt-1"
                placeholder="Enter new password"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with mixed case, numbers, and special characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password *</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={changePasswordData.confirmPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmPassword: e.target.value })}
                className="mt-1"
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="bg-indigo-600 hover:bg-indigo-700">
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          DELETE CONFIRMATION DIALOG
          ============================================================ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the fee structure for "{deleteTarget?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFee} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}