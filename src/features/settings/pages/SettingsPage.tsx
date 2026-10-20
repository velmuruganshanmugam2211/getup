import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  settingsService,
  teamService,
  clientService,
  financeService,
  deliverableService,
} from '@/services';
import { useToast } from '@/components/feedback/Toast';
import { useAuth } from '@/features/auth';
import { AgencySettings, User, MeetingReminder } from '@/types';
import {
  User as UserIcon,
  Building2,
  Users,
  Bell,
  Palette,
  Database,
  Download,
  Upload,
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Edit2,
  UserX,
  Lock,
  FileSpreadsheet,
  FolderUp,
  Undo2,
  CheckCircle2,
  FileText,
  KeyRound,
} from 'lucide-react';
import { AddEditUserModal } from '@/features/team/components/AddEditUserModal';
import { ImageUploadCrop } from '@/components/forms/ImageUploadCrop';
import { exportToCsv } from '@/utils/pdf';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';

type SettingsTab = 'profile' | 'agency' | 'users' | 'notifications' | 'appearance' | 'data';

export const SettingsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('profile');

  // Load Agency Settings
  const { data: settings, isLoading: isSettingsLoading } = useQuery<AgencySettings>({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings(),
  });

  // Load Team Users for Users & Roles tab
  const { data: teamUsers = [] } = useQuery<User[]>({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  // User modal state
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);

  // Profile tab state
  const [profileName, setProfileName] = React.useState('');
  const [profileEmail, setProfileEmail] = React.useState('');
  const [profilePhone, setProfilePhone] = React.useState('');
  const [profilePhoto, setProfilePhoto] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  // Agency tab state
  const [agencyName, setAgencyName] = React.useState('');
  const [agencyLogo, setAgencyLogo] = React.useState('');
  const [agencyAddress, setAgencyAddress] = React.useState('');
  const [gstNumber, setGstNumber] = React.useState('');
  const [currency, setCurrency] = React.useState('INR');
  const [defaultBillingDay, setDefaultBillingDay] = React.useState(1);
  const [financialYearStart, setFinancialYearStart] = React.useState('04-01');

  // Notifications tab state
  const [browserNotifs, setBrowserNotifs] = React.useState(true);
  const [defaultReminder, setDefaultReminder] = React.useState<MeetingReminder>('10_min');
  const [overdueAlerts, setOverdueAlerts] = React.useState(true);
  const [taskDueTime, setTaskDueTime] = React.useState('09:00');

  // Appearance tab state
  const [sidebarCollapsedDefault, setSidebarCollapsedDefault] = React.useState(false);
  const [dateFormat, setDateFormat] = React.useState('dd MMM yyyy');

  // Sync profile state from currentUser
  React.useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
      setProfilePhone(currentUser.phone || '');
      setProfilePhoto(currentUser.avatar || '');
    }
  }, [currentUser]);

  // Sync agency and general settings
  React.useEffect(() => {
    if (settings) {
      setAgencyName(settings.agencyName || 'Getup Media Agency');
      setAgencyLogo(settings.logo || '');
      setAgencyAddress(settings.address || 'Bangalore, Karnataka, India');
      setGstNumber(settings.gstNumber || '29ABCDE1234F1Z5');
      setCurrency(settings.currency || 'INR');
      setDefaultBillingDay(settings.defaultBillingDay || 1);
      setFinancialYearStart(settings.financialYearStart || '04-01');
      setBrowserNotifs(settings.browserNotificationsEnabled !== false);
      setDefaultReminder(settings.defaultMeetingReminder || '10_min');
      setOverdueAlerts(settings.overdueAlertsEnabled !== false);
      setTaskDueTime(settings.taskDueNotificationTime || '09:00');
      setSidebarCollapsedDefault(settings.sidebarCollapsedDefault || false);
      setDateFormat(settings.dateFormat || 'dd MMM yyyy');
    }
  }, [settings]);

  // Handlers for Save actions
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileName.trim()) {
      toast.error('Validation Error', 'Profile name cannot be blank.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Validation Error', 'New passwords do not match.');
      return;
    }

    try {
      await teamService.updateUser(currentUser.id, {
        name: profileName.trim(),
        email: profileEmail.trim(),
        phone: profilePhone.trim() || undefined,
        avatar: profilePhoto.trim() || undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Profile Saved', 'Your user account details were updated successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not update profile.');
    }
  };

  const handleSaveAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName.trim()) {
      toast.error('Validation Error', 'Agency name is required.');
      return;
    }

    try {
      await settingsService.updateSettings({
        agencyName: agencyName.trim(),
        logo: agencyLogo.trim() || undefined,
        address: agencyAddress.trim(),
        gstNumber: gstNumber.trim() || undefined,
        currency,
        defaultBillingDay: Number(defaultBillingDay),
        financialYearStart,
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Agency Settings Saved', 'Brand details, billing cycle, and tax info saved.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save agency settings.');
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsService.updateSettings({
        browserNotificationsEnabled: browserNotifs,
        defaultMeetingReminder: defaultReminder,
        overdueAlertsEnabled: overdueAlerts,
        taskDueNotificationTime: taskDueTime,
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Notification Preferences Saved', 'Alert rules and meeting reminder defaults updated.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save notification preferences.');
    }
  };

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsService.updateSettings({
        sidebarCollapsedDefault,
        dateFormat,
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Appearance Preferences Saved', 'Display defaults and format preferences applied.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save appearance settings.');
    }
  };

  // Data tab state
  const [resetConfirmation, setResetConfirmation] = React.useState('');
  const [isResetting, setIsResetting] = React.useState(false);
  const [includeLoginsInExport, setIncludeLoginsInExport] = React.useState(false);
  const [hasUndoSnapshot, setHasUndoSnapshot] = React.useState(false);

  // File import state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<{
    fileName: string;
    fileSize: string;
    format: 'json' | 'csv_clients' | 'csv_deliverables';
    rawText: string;
    counts: Record<string, number>;
    warnings: string[];
    version?: string;
  } | null>(null);
  const [importMode, setImportMode] = React.useState<'merge' | 'replace'>('merge');
  const [replaceConfirmText, setReplaceConfirmText] = React.useState('');
  const [isImporting, setIsImporting] = React.useState(false);

  React.useEffect(() => {
    setHasUndoSnapshot(settingsService.hasUndoSnapshot());
  }, []);

  const handleExportJson = async () => {
    try {
      const jsonStr = await settingsService.exportData({ includeLogins: includeLoginsInExport });
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GetupAgency_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON Backup Downloaded', `Exported workspace data (${includeLoginsInExport ? 'including' : 'excluding'} credentials).`);
    } catch (err: any) {
      toast.error('Export Failed', err.message || 'Could not export data.');
    }
  };

  const handleExportClientsCsv = async () => {
    try {
      const clients = await clientService.getClients();
      const headers = ['ID', 'Name', 'Business', 'Contact Person', 'Phone', 'Email', 'Status', 'Monthly Fee', 'Onboarded Date'];
      const rows = clients.map((c) => [
        c.id,
        c.name,
        c.business,
        c.contactPerson || '',
        c.phone || '',
        c.email || '',
        c.status,
        c.monthlyFee,
        c.onboardedOn,
      ]);
      exportToCsv(`GetupAgency_Clients_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      toast.success('Clients CSV Downloaded', `Exported ${clients.length} clients.`);
    } catch (err: any) {
      toast.error('Export Failed', err.message || 'Could not export clients CSV.');
    }
  };

  const handleExportDeliverablesCsv = async () => {
    try {
      const deliverables = await deliverableService.getDeliverables();
      const headers = ['ID', 'Client ID', 'Type', 'Title', 'Month', 'Status', 'Date'];
      const rows = deliverables.map((d) => [
        d.id,
        d.clientId,
        d.type,
        d.title,
        d.month,
        d.status,
        d.date,
      ]);
      exportToCsv(`GetupAgency_Deliverables_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      toast.success('Deliverables CSV Downloaded', `Exported ${deliverables.length} deliverables.`);
    } catch (err: any) {
      toast.error('Export Failed', err.message || 'Could not export deliverables CSV.');
    }
  };

  const handleExportPaymentsCsv = async () => {
    try {
      const payments = await financeService.getPayments();
      const headers = ['ID', 'Client ID', 'Month', 'Amount', 'Date', 'Status', 'Mode', 'Notes'];
      const rows = payments.map((p) => [
        p.id,
        p.clientId,
        p.month,
        p.amount,
        p.date,
        p.status,
        p.mode || 'bank_transfer',
        p.notes || '',
      ]);
      exportToCsv(`GetupAgency_Payments_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      toast.success('Payments CSV Downloaded', `Exported ${payments.length} payment records.`);
    } catch (err: any) {
      toast.error('Export Failed', err.message || 'Could not export payments CSV.');
    }
  };

  const handleExportExpensesCsv = async () => {
    try {
      const expenses = await financeService.getExpenses();
      const headers = ['ID', 'Type', 'Category', 'Amount', 'Date', 'Note', 'Paid To', 'Client ID'];
      const rows = expenses.map((e) => [
        e.id,
        e.type,
        e.category,
        e.amount,
        e.date,
        e.note,
        e.paidTo || '',
        e.clientId || '',
      ]);
      exportToCsv(`GetupAgency_Expenses_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      toast.success('Expenses CSV Downloaded', `Exported ${expenses.length} expense records.`);
    } catch (err: any) {
      toast.error('Export Failed', err.message || 'Could not export expenses CSV.');
    }
  };

  const handleProcessFile = (file: File) => {
    const isJson = file.name.endsWith('.json') || file.type === 'application/json';
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';

    if (!isJson && !isCsv) {
      toast.error('Unsupported File', 'Please select a valid .json or .csv backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      if (isJson) {
        try {
          const parsed = JSON.parse(text);
          const counts: Record<string, number> = {
            clients: Array.isArray(parsed.clients) ? parsed.clients.length : 0,
            deliverables: Array.isArray(parsed.deliverables) ? parsed.deliverables.length : 0,
            payments: Array.isArray(parsed.payments) ? parsed.payments.length : 0,
            expenses: Array.isArray(parsed.expenses) ? parsed.expenses.length : 0,
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks.length : 0,
            users: Array.isArray(parsed.users) ? parsed.users.length : 0,
          };
          const warnings: string[] = [];
          if (!parsed.version) warnings.push('Missing file schema version.');
          if (counts.clients === 0 && counts.deliverables === 0) warnings.push('File contains no clients or deliverables.');

          setImportPreview({
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            format: 'json',
            rawText: text,
            counts,
            warnings,
            version: parsed.version || 'Unknown',
          });
          setImportMode('merge');
          setReplaceConfirmText('');
        } catch (err: any) {
          toast.error('Invalid JSON File', 'Could not parse JSON: ' + err.message);
        }
      } else {
        const lines = text.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          toast.error('Empty CSV File', 'CSV must have at least one header row and one data row.');
          return;
        }
        const firstLine = lines[0].toLowerCase();
        const isClientCsv = firstLine.includes('business') || firstLine.includes('monthlyfee') || firstLine.includes('client');
        const count = lines.length - 1;

        setImportPreview({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          format: isClientCsv ? 'csv_clients' : 'csv_deliverables',
          rawText: text,
          counts: isClientCsv ? { clients: count } : { deliverables: count },
          warnings: [],
        });
        setImportMode('merge');
        setReplaceConfirmText('');
      }
    };
    reader.onerror = () => {
      toast.error('Read Failed', 'Could not read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importPreview) return;
    if (importMode === 'replace' && replaceConfirmText !== 'REPLACE') {
      toast.error('Confirmation Mismatch', 'Type REPLACE to confirm wiping current workspace data.');
      return;
    }

    setIsImporting(true);
    try {
      if (importPreview.format === 'json') {
        const res = await settingsService.importData(importPreview.rawText, importMode);
        toast.success(
          'Import Successful',
          `Restored workspace data (${Object.entries(res.importedCounts).map(([k, v]) => `${v} ${k}`).join(', ')}).`
        );
      } else {
        const type = importPreview.format === 'csv_clients' ? 'clients' : 'deliverables';
        const res = await settingsService.importCsv(importPreview.rawText, type, importMode);
        toast.success('CSV Imported', `Imported ${res.importedCounts[type]} records into workspace.`);
      }

      setImportPreview(null);
      setHasUndoSnapshot(true);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error('Import Failed', err.message || 'Could not import file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleUndoImport = async () => {
    try {
      const ok = await settingsService.undoImport();
      if (ok) {
        setHasUndoSnapshot(false);
        queryClient.invalidateQueries();
        toast.success('Import Undone', 'Previous workspace backup restored successfully.');
      } else {
        toast.error('Undo Failed', 'No snapshot available to restore.');
      }
    } catch (err: any) {
      toast.error('Undo Failed', err.message || 'Could not undo import.');
    }
  };

  const handleResetAllData = async () => {
    if (resetConfirmation !== 'RESET GETUP') {
      toast.error('Confirmation Mismatch', 'Please type RESET GETUP exactly to confirm.');
      return;
    }
    setIsResetting(true);
    try {
      await settingsService.resetAllData();
      setResetConfirmation('');
      queryClient.invalidateQueries();
      toast.success('Data Reset', 'All agency workspace records have been restored to initial state.');
      window.location.reload();
    } catch (err: any) {
      toast.error('Reset Failed', err.message || 'Could not reset data.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleUserActive = async (targetUser: User) => {
    try {
      await teamService.updateUser(targetUser.id, { active: !targetUser.active });
      toast.success(
        targetUser.active ? 'User Deactivated' : 'User Activated',
        `${targetUser.name} is now ${targetUser.active ? 'inactive' : 'active'}.`
      );
      queryClient.invalidateQueries({ queryKey: ['team', 'list'] });
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not update user status.');
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" />, desc: 'Personal info & password' },
    { id: 'agency', label: 'Agency', icon: <Building2 className="w-4 h-4" />, desc: 'Brand, GST & billing cycle' },
    { id: 'users', label: 'Users & Roles', icon: <Users className="w-4 h-4" />, desc: 'Super Admin & Worker roles' },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, desc: 'Browser & meeting reminders' },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" />, desc: 'Theme & date display' },
    { id: 'data', label: 'Data Management', icon: <Database className="w-4 h-4" />, desc: 'Backup, CSV & danger zone' },
  ];

  if (isSettingsLoading) {
    return <div className="p-8 text-center text-xs text-text-muted">Loading agency settings...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Settings & Workspace Preferences"
        subtitle="Manage personal credentials, agency brand identity, user access roles, alerts, and system data backups."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Tabs */}
        <div className="lg:col-span-3">
          <Card className="border-border p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control text-left transition-all ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-bold border-l-4 border-primary-600'
                        : 'text-text-muted hover:text-text hover:bg-surface-subtle font-medium'
                    }`}
                  >
                    <div className={isActive ? 'text-primary-600' : 'text-text-muted'}>
                      {tab.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs block leading-tight">{tab.label}</span>
                      <span className="text-[10px] text-text-muted truncate block">{tab.desc}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-9">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <Card className="border-border p-6">
              <CardHeader className="p-0 pb-5 border-b border-border">
                <CardTitle className="text-base font-bold">Personal Profile & Credentials</CardTitle>
                <CardDescription>
                  Update your contact information, profile picture, and access password.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-5">
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="p-3.5 rounded-card bg-surface-subtle border border-border">
                    <label className="text-xs font-semibold text-text block mb-2">Profile Photo</label>
                    <ImageUploadCrop
                      name={profileName || 'Current User'}
                      value={profilePhoto}
                      onChange={setProfilePhoto}
                      onRemove={() => setProfilePhoto('')}
                      size="xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label="Full Name" required>
                      <Input
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Velmurugan"
                        required
                      />
                    </FormField>

                    <FormField label="Email Address" required>
                      <Input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="vel@getupagency.com"
                        required
                      />
                    </FormField>

                    <FormField label="Phone Number">
                      <Input
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </FormField>
                  </div>

                  {/* Change Password Block */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-text-muted" />
                      <h5 className="text-xs font-bold text-text">Change Password</h5>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField label="Current Password">
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </FormField>
                      <FormField label="New Password">
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </FormField>
                      <FormField label="Confirm Password">
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="primary">
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: AGENCY */}
          {activeTab === 'agency' && (
            <Card className="border-border p-6">
              <CardHeader className="p-0 pb-5 border-b border-border">
                <CardTitle className="text-base font-bold">Agency Brand & Billing Settings</CardTitle>
                <CardDescription>
                  Configure company identifiers, tax registration, studio address, and billing cycle defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-5">
                <form onSubmit={handleSaveAgency} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Agency Legal Name" required>
                      <Input
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder="Getup Media Agency"
                        required
                      />
                    </FormField>

                    <FormField label="Agency Logo URL">
                      <Input
                        value={agencyLogo}
                        onChange={(e) => setAgencyLogo(e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                    </FormField>

                    <FormField label="GST / Tax Identification Number">
                      <Input
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="29ABCDE1234F1Z5"
                      />
                    </FormField>

                    <FormField label="Currency Standard" required hint="Stored as integer whole rupees">
                      <Input value="INR (Indian Rupee - ₹)" disabled />
                    </FormField>

                    <FormField
                      label="Default Billing Day of Month"
                      required
                      hint="Day of month when client retainer cycle resets (1-31)"
                    >
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={defaultBillingDay}
                        onChange={(e) => setDefaultBillingDay(Number(e.target.value))}
                        required
                      />
                    </FormField>

                    <FormField label="Financial Year Start" required hint="e.g. April 1st (Indian fiscal year)">
                      <Input
                        value={financialYearStart}
                        onChange={(e) => setFinancialYearStart(e.target.value)}
                        placeholder="04-01"
                      />
                    </FormField>
                  </div>

                  <FormField label="Registered Studio Address" required>
                    <textarea
                      value={agencyAddress}
                      onChange={(e) => setAgencyAddress(e.target.value)}
                      rows={3}
                      className="w-full rounded-control border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                      placeholder="123 Creative Studio St, Koramangala, Bangalore, Karnataka, India - 560034"
                      required
                    />
                  </FormField>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="primary">
                      Save Agency Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: USERS AND ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Role Explanations Banner */}
              <div className="p-4 rounded-card bg-surface border border-border space-y-3">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                  Access Role Permissions Summary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-control bg-primary-50/60 border border-primary-200">
                    <div className="flex items-center gap-1.5 font-bold text-primary-800 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-primary-600" />
                      Super Admin
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Complete agency governance: clients, contracts, payments, expenses, calendar, team members,
                      settings, and high-level reports.
                    </p>
                  </div>

                  <div className="p-3 rounded-control bg-emerald-50/60 border border-emerald-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Worker
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Sees <strong>ONLY the Tasks page</strong> with their assigned deliverables. Zero visibility into
                      contracts, financials, retainers, calendar, or settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Users List Card */}
              <Card className="border-border p-6">
                <CardHeader className="p-0 pb-4 border-b border-border flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Team Workspace Members</CardTitle>
                    <CardDescription>
                      Manage members, roles, and account active statuses.
                    </CardDescription>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setUserToEdit(null);
                      setUserModalOpen(true);
                    }}
                  >
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="divide-y divide-border">
                    {teamUsers.map((u) => {
                      const isSuper = u.role === 'super_admin';
                      return (
                        <div
                          key={u.id}
                          className="py-3 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={u.name} src={u.avatar} size="md" status={u.active ? 'online' : 'offline'} />
                            <div className="min-w-0">
                              <span className="font-bold text-text block truncate">{u.name}</span>
                              <span className="text-[11px] text-text-muted truncate block">{u.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={isSuper ? 'primary' : 'success'}
                              className="font-semibold inline-flex items-center gap-1"
                            >
                              {isSuper ? <ShieldAlert className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              {isSuper ? 'Super Admin' : 'Worker'}
                            </Badge>

                            <Badge variant={u.active ? 'success' : 'slate'} hasDot>
                              {u.active ? 'Active' : 'Inactive'}
                            </Badge>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                setUserToEdit(u);
                                setUserModalOpen(true);
                              }}
                            >
                              <Edit2 className="w-3 h-3 mr-1" /> Edit
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-xs ${
                                u.active ? 'text-semantic-danger hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              onClick={() => handleToggleUserActive(u)}
                            >
                              {u.active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <AddEditUserModal
                open={userModalOpen}
                onOpenChange={setUserModalOpen}
                userToEdit={userToEdit}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['team', 'list'] });
                }}
              />
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Card className="border-border p-6">
              <CardHeader className="p-0 pb-5 border-b border-border">
                <CardTitle className="text-base font-bold">Notification & Alert Preferences</CardTitle>
                <CardDescription>
                  Configure browser push notifications, reminder intervals, and automated overdue banners.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-5">
                <form onSubmit={handleSaveNotifications} className="space-y-5">
                  <div className="space-y-4">
                    {/* Browser Notifications */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-control bg-surface-subtle border border-border">
                      <div>
                        <span className="text-xs font-bold text-text block">Browser Push Notifications</span>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Display OS-level desktop push alerts for meetings starting in 10 minutes and overdue tasks.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={browserNotifs}
                          onChange={(e) => setBrowserNotifs(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                      </label>
                    </div>

                    {/* Default Meeting Reminder Time */}
                    <div className="p-3.5 rounded-control bg-surface-subtle border border-border space-y-2">
                      <span className="text-xs font-bold text-text block">Default Meeting Reminder Notice</span>
                      <p className="text-[11px] text-text-muted">
                        Pre-selected reminder trigger for newly scheduled calendar meetings and client calls.
                      </p>
                      <select
                        value={defaultReminder}
                        onChange={(e) => setDefaultReminder(e.target.value as MeetingReminder)}
                        className="rounded-control border border-border bg-surface px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                      >
                        <option value="at_time">At time of meeting</option>
                        <option value="10_min">10 minutes before</option>
                        <option value="30_min">30 minutes before</option>
                        <option value="1_hour">1 hour before</option>
                        <option value="1_day">1 day before</option>
                      </select>
                    </div>

                    {/* Task Due Today Notification Trigger Time */}
                    <div className="p-3.5 rounded-control bg-surface-subtle border border-border space-y-2">
                      <span className="text-xs font-bold text-text block">Task Due Today Notification Trigger (Morning)</span>
                      <p className="text-[11px] text-text-muted">
                        Time of day when the system scans for and sends daily alerts for tasks due today (default: 09:00 AM).
                      </p>
                      <Input
                        type="time"
                        value={taskDueTime}
                        onChange={(e) => setTaskDueTime(e.target.value)}
                        className="w-36 text-xs"
                      />
                    </div>

                    {/* Overdue Alerts Banner */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-control bg-surface-subtle border border-border">
                      <div>
                        <span className="text-xs font-bold text-text block">Overdue Payment & Task Banners</span>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Highlight red warning banners across dashboard and topbar when retainers or tasks expire.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={overdueAlerts}
                          onChange={(e) => setOverdueAlerts(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Button type="submit" variant="primary">
                      Save Notification Rules
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: APPEARANCE */}
          {activeTab === 'appearance' && (
            <Card className="border-border p-6">
              <CardHeader className="p-0 pb-5 border-b border-border">
                <CardTitle className="text-base font-bold">Appearance & Display Preferences</CardTitle>
                <CardDescription>
                  Configure sidebar collapse behavior, date formats, and branding aesthetics.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-5">
                <form onSubmit={handleSaveAppearance} className="space-y-4">
                  <div className="flex items-start justify-between gap-4 p-3.5 rounded-control bg-surface-subtle border border-border">
                    <div>
                      <span className="text-xs font-bold text-text block">Sidebar Collapsed by Default</span>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Keep sidebar minimized to compact icons on wide displays.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={sidebarCollapsedDefault}
                        onChange={(e) => setSidebarCollapsedDefault(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                    </label>
                  </div>

                  <FormField label="Standard Date Format" required hint="Default: 20 Oct 2026">
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="rounded-control border border-border bg-surface px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                    >
                      <option value="dd MMM yyyy">20 Oct 2026 (Standard Agency Format)</option>
                      <option value="yyyy-MM-dd">2026-10-20 (ISO Standard)</option>
                      <option value="dd/MM/yyyy">20/10/2026 (DD/MM/YYYY)</option>
                    </select>
                  </FormField>

                  <div className="p-3.5 rounded-control bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 font-bold text-text mb-1">
                      <Palette className="w-3.5 h-3.5 text-primary-600" /> Typography & Design
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Active typeface: <strong>Montserrat</strong>. Whole integer Indian Rupee (₹) formatting is
                      applied across all metrics.
                    </p>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Button type="submit" variant="primary">
                      Save Appearance
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: DATA MANAGEMENT */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Undo Snapshot Banner */}
              {hasUndoSnapshot && (
                <div className="p-4 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs block">Automatic Backup Snapshot Ready</span>
                      <span className="text-[11px] text-emerald-700 block">
                        A pre-import restore point is available. Click Undo if you wish to revert to your previous state.
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndoImport}
                    leftIcon={<Undo2 className="w-3.5 h-3.5 text-emerald-700" />}
                    className="border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 text-xs"
                  >
                    Undo Last Import
                  </Button>
                </div>
              )}

              {/* Import Backup File */}
              <Card className="border-border p-6">
                <CardHeader className="p-0 pb-4 border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FolderUp className="w-5 h-5 text-primary-600" />
                    Import Workspace Backup
                  </CardTitle>
                  <CardDescription>
                    Upload a <code>.json</code> database backup or <code>.csv</code> spreadsheet to restore or merge records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-4 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,application/json,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProcessFile(file);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleProcessFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-card p-8 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-primary-600 bg-primary-50/50'
                        : 'border-border hover:border-border-strong hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-text block">
                      Choose backup file or drag & drop here
                    </span>
                    <span className="text-xs text-text-muted block mt-1">
                      Accepts <code>.json</code> (full workspace) and <code>.csv</code> (clients or deliverables)
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Browse Files
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Export Databases Card */}
              <Card className="border-border p-6">
                <CardHeader className="p-0 pb-4 border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary-600" />
                    Export Workspace Data
                  </CardTitle>
                  <CardDescription>
                    Export complete workspace databases for external spreadsheets, accounting, or safekeeping.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-4 space-y-4">
                  {/* Security Checkbox for logins */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs p-2.5 rounded-control bg-surface-subtle border border-border">
                    <input
                      type="checkbox"
                      checked={includeLoginsInExport}
                      onChange={(e) => setIncludeLoginsInExport(e.target.checked)}
                      className="rounded border-border text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-text flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-text-muted" /> Include user login credentials
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Disabled by default for security. Never share export files containing password hashes.
                      </span>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    <Button
                      variant="outline"
                      className="justify-start text-xs h-auto py-2.5 px-3"
                      leftIcon={<FileText className="w-4 h-4 text-primary-600 shrink-0" />}
                      onClick={handleExportJson}
                    >
                      <div className="text-left">
                        <span className="font-bold block">Full JSON Database</span>
                        <span className="text-[10px] text-text-muted block">All records & settings</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="justify-start text-xs h-auto py-2.5 px-3"
                      leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
                      onClick={handleExportClientsCsv}
                    >
                      <div className="text-left">
                        <span className="font-bold block">Clients CSV</span>
                        <span className="text-[10px] text-text-muted block">Client roster & fees</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="justify-start text-xs h-auto py-2.5 px-3"
                      leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
                      onClick={handleExportDeliverablesCsv}
                    >
                      <div className="text-left">
                        <span className="font-bold block">Deliverables CSV</span>
                        <span className="text-[10px] text-text-muted block">Videos, reels, posts</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="justify-start text-xs h-auto py-2.5 px-3"
                      leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
                      onClick={handleExportPaymentsCsv}
                    >
                      <div className="text-left">
                        <span className="font-bold block">Payments CSV</span>
                        <span className="text-[10px] text-text-muted block">Collections & dates</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="justify-start text-xs h-auto py-2.5 px-3"
                      leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
                      onClick={handleExportExpensesCsv}
                    >
                      <div className="text-left">
                        <span className="font-bold block">Expenses CSV</span>
                        <span className="text-[10px] text-text-muted block">Categorized expenses</span>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone: Reset Data */}
              <Card className="border-rose-300 bg-rose-50/20 p-6">
                <CardHeader className="p-0 pb-3">
                  <div className="flex items-center gap-2 text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                    <CardTitle className="text-base font-bold text-rose-700">Danger Zone: Reset All Data</CardTitle>
                  </div>
                  <CardDescription className="text-rose-900/80">
                    Permanently clears all custom clients, tasks, deliverables, and financial records,
                    restoring initial seed accounts. This action is irreversible.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-3 space-y-3">
                  <div className="max-w-md space-y-2">
                    <label className="text-xs font-semibold text-rose-800 block">
                      To confirm, type <strong className="font-mono bg-rose-100 px-1 py-0.5 rounded">RESET GETUP</strong> below:
                    </label>
                    <Input
                      value={resetConfirmation}
                      onChange={(e) => setResetConfirmation(e.target.value)}
                      placeholder="RESET GETUP"
                      className="border-rose-300 focus:ring-rose-500"
                    />
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    disabled={resetConfirmation !== 'RESET GETUP' || isResetting}
                    isLoading={isResetting}
                    onClick={handleResetAllData}
                  >
                    Reset All Data
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Import Schema & Counts Preview Modal */}
          {importPreview && (
            <Modal open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
              <ModalContent size="md">
                <ModalHeader>
                  <ModalTitle className="flex items-center gap-2">
                    <FolderUp className="w-5 h-5 text-primary-600" />
                    Import Backup Preview
                  </ModalTitle>
                  <ModalDescription>
                    Review database records detected in <strong>{importPreview.fileName}</strong> ({importPreview.fileSize}).
                  </ModalDescription>
                </ModalHeader>

                <div className="space-y-4 pt-2 text-xs">
                  {/* Record counts grid */}
                  <div className="p-3 rounded-card bg-surface-subtle border border-border">
                    <span className="font-bold text-text block mb-2">Detected Records:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(importPreview.counts).map(([entity, count]) => (
                        <div key={entity} className="p-2 rounded bg-surface border border-border text-center">
                          <span className="text-[10px] text-text-muted uppercase font-bold block">{entity}</span>
                          <span className="text-base font-bold text-text tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {importPreview.warnings.length > 0 && (
                    <div className="p-3 rounded-control bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                      {importPreview.warnings.map((w, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <span className="font-bold text-text block">Choose Import Strategy:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-card border cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'border-primary-600 bg-primary-50/50'
                            : 'border-border bg-surface'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'merge'}
                            onChange={() => setImportMode('merge')}
                            className="mt-0.5 text-primary-600"
                          />
                          <div>
                            <span className="font-bold text-text block">Merge (Skip Duplicates)</span>
                            <span className="text-[11px] text-text-muted block mt-0.5">
                              Retains current data and only adds missing records. Recommended.
                            </span>
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-card border cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'border-rose-600 bg-rose-50/50'
                            : 'border-border bg-surface'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                            className="mt-0.5 text-rose-600"
                          />
                          <div>
                            <span className="font-bold text-text block">Replace All Data</span>
                            <span className="text-[11px] text-text-muted block mt-0.5">
                              Wipes existing workspace records and substitutes them with this file.
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {importMode === 'replace' && (
                    <div className="p-3 rounded-control bg-rose-50 border border-rose-200 space-y-2">
                      <span className="font-semibold text-rose-800 block text-xs">
                        Type <strong className="font-mono bg-rose-100 px-1 py-0.5 rounded">REPLACE</strong> to confirm overwriting current workspace data:
                      </span>
                      <Input
                        value={replaceConfirmText}
                        onChange={(e) => setReplaceConfirmText(e.target.value)}
                        placeholder="REPLACE"
                        className="border-rose-300"
                      />
                    </div>
                  )}

                  <ModalFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImportPreview(null)}
                      disabled={isImporting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant={importMode === 'replace' ? 'danger' : 'primary'}
                      onClick={handleExecuteImport}
                      disabled={importMode === 'replace' && replaceConfirmText !== 'REPLACE'}
                      isLoading={isImporting}
                    >
                      Confirm & Import
                    </Button>
                  </ModalFooter>
                </div>
              </ModalContent>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
