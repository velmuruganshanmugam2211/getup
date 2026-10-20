import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-display/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { teamService, taskService, authService } from '@/services';
import { User, Task } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import {
  UserPlus,
  Mail,
  Phone,
  Edit2,
  UserX,
  UserCheck,
  KeyRound,
  Trash2,
  Download,
  AlertTriangle,
  Wand2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AddEditUserModal } from '../components/AddEditUserModal';
import { useToast } from '@/components/feedback/Toast';
import { formatDateTime, formatDate } from '@/lib/format';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { createPdfDoc, addHeader, addTable, savePdf, exportToCsv } from '@/utils/pdf';

export const TeamPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Reset password modal state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Delete modal state
  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [reassignUserId, setReassignUserId] = useState<string>('');
  const [deleteActionChoice, setDeleteActionChoice] = useState<'reassign' | 'former'>('reassign');
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: () => taskService.getTasks(),
  });

  const { data: currentUser } = useQuery<User | null>({
    queryKey: ['auth', 'currentUser'],
    queryFn: () => authService.getCurrentUser(),
  });

  const handleToggleActive = async (user: User) => {
    try {
      await teamService.updateUser(user.id, { active: !user.active });
      toast.success(
        user.active ? 'Member Deactivated' : 'Member Activated',
        `${user.name} is now ${user.active ? 'inactive' : 'active'}.`
      );
      queryClient.invalidateQueries({ queryKey: ['team', 'list'] });
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not update user status.');
    }
  };

  const handleOpenResetPassword = (user: User) => {
    setResetModalUser(user);
    setNewPassword('');
    setShowNewPassword(false);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setShowNewPassword(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (!newPassword || newPassword.length < 8) {
      toast.error('Validation Error', 'Password must be at least 8 characters.');
      return;
    }

    setIsResetting(true);
    try {
      await teamService.updateUser(resetModalUser.id, { password: newPassword });
      toast.success('Password Reset', `Updated password for ${resetModalUser.name}.`);
      setResetModalUser(null);
    } catch (err: any) {
      toast.error('Reset Failed', err.message || 'Could not update password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Cannot Delete Account', 'You cannot delete your own account.');
      return;
    }

    if (user.role === 'super_admin') {
      const activeSuperAdmins = users.filter((u) => u.role === 'super_admin' && u.active && !u.isFormerMember && u.id !== user.id);
      if (activeSuperAdmins.length === 0) {
        toast.error('Cannot Delete Admin', 'You cannot delete the last active Super Admin. Promote another member first.');
        return;
      }
    }

    const otherUsers = users.filter((u) => u.id !== user.id && u.active && !u.isFormerMember);
    setReassignUserId(otherUsers[0]?.id || '');
    setDeleteModalUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;

    setIsDeleting(true);
    try {
      if (deleteActionChoice === 'reassign' && reassignUserId) {
        await teamService.deleteUser(deleteModalUser.id, {
          reassignToUserId: reassignUserId,
          keepAsFormerMember: false,
        });
        toast.success('Member Deleted', `Tasks reassigned and ${deleteModalUser.name} removed.`);
      } else {
        await teamService.deleteUser(deleteModalUser.id, {
          keepAsFormerMember: true,
        });
        toast.success('Member Archived', `${deleteModalUser.name} has been archived as Former Member to protect work history.`);
      }

      setDeleteModalUser(null);
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not remove member.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    try {
      const doc = await createPdfDoc({
        title: 'Agency Team Roster',
        generatedBy: currentUser?.name || 'Super Admin',
        period: formatDate(new Date().toISOString()),
      });

      const startY = addHeader(doc, {
        title: 'Agency Team & Role Permissions',
        period: formatDate(new Date().toISOString()),
        generatedBy: currentUser?.name || 'Super Admin',
      });

      const columns = [
        { header: 'Name', dataKey: 'name' },
        { header: 'Username', dataKey: 'username' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Job Title', dataKey: 'title' },
        { header: 'Role', dataKey: 'role' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Last Login', dataKey: 'lastLogin' },
      ];

      const rows = users.map((u) => [
        u.name,
        `@${u.username || u.email.split('@')[0]}`,
        u.email,
        u.title || '—',
        u.role === 'super_admin' ? 'Super Admin' : 'Worker',
        u.isFormerMember ? 'Former' : u.active ? 'Active' : 'Inactive',
        u.lastLogin ? formatDate(u.lastLogin) : 'Never',
      ]);

      addTable(doc, startY, columns, rows, {
        emptyText: 'No team members registered.',
      });

      savePdf(doc, `GetupAgency_Team-Roster_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF Downloaded', 'Team roster downloaded successfully.');
    } catch (err: any) {
      toast.error('Export Error', err.message || 'Could not export team PDF.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Username', 'Email', 'Phone', 'Job Title', 'Role', 'Status', 'Last Login'];
    const rows = users.map((u) => [
      u.name,
      `@${u.username || u.email.split('@')[0]}`,
      u.email,
      u.phone || '',
      u.title || '',
      u.role === 'super_admin' ? 'Super Admin' : 'Worker',
      u.isFormerMember ? 'Former Member' : u.active ? 'Active' : 'Inactive',
      u.lastLogin ? formatDate(u.lastLogin) : 'Never',
    ]);
    exportToCsv(`GetupAgency_Team-Roster_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    toast.success('CSV Downloaded', 'Team members exported to CSV.');
  };

  // Table columns definition
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'Team Member',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar
              name={user.name}
              src={user.avatar}
              size="md"
              status={user.active && !user.isFormerMember ? 'online' : 'offline'}
            />
            <div>
              <span className="font-bold text-text block leading-snug">{user.name}</span>
              <span className="text-[11px] text-text-muted flex items-center gap-1">
                <span>@{user.username || user.email.split('@')[0]}</span>
                {user.isFormerMember && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-600 font-bold">
                    Former
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Job Title & Contact',
      cell: ({ row }) => (
        <div>
          <span className="text-xs font-semibold text-text block">{row.original.title || 'Creator'}</span>
          <span className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
            <Mail className="w-3 h-3 text-text-subtle shrink-0" />
            {row.original.email}
          </span>
          {row.original.phone && (
            <span className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-text-subtle shrink-0" />
              {row.original.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role & Access',
      cell: (info) => {
        const role = info.getValue() as string;
        const isSuperAdmin = role === 'super_admin';
        return (
          <Badge
            variant={isSuperAdmin ? 'primary' : 'success'}
            className="font-bold capitalize inline-flex items-center gap-1"
          >
            {/* {isSuperAdmin ? <ShieldAlert className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />} */}
            {isSuperAdmin ? 'Superadmin' : 'Worker'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => {
        const user = row.original;
        if (user.isFormerMember) {
          return (
            <Badge variant="slate" hasDot>
              Former Member
            </Badge>
          );
        }
        return (
          <Badge variant={user.active ? 'success' : 'slate'} hasDot>
            {user.active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'tasksCount',
      header: 'Tasks Assigned',
      cell: ({ row }) => {
        const count = tasks.filter((t) => t.assigneeId === row.original.id && t.status !== 'done').length;
        return (
          <div className="text-xs">
            <span className="font-bold text-text tabular-nums">{count}</span>
            <span className="text-text-muted text-[11px] ml-1">open</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => {
        const ll = row.original.lastLogin;
        return (
          <div className="text-xs text-text-muted">
            {ll ? formatDateTime(ll) : 'Never'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUser?.id;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUserToEdit(user);
                setModalOpen(true);
              }}
              className="h-7 px-2 text-xs"
              title="Edit member details"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenResetPassword(user)}
              className="h-7 px-2 text-xs text-text-muted hover:text-text"
              title="Reset password"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1 text-primary-600" /> Key
            </Button>

            {!isSelf && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleActive(user)}
                className={`h-7 px-2 text-xs ${
                  user.active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                }`}
                title={user.active ? 'Deactivate member login' : 'Activate member login'}
              >
                {user.active ? (
                  <UserX className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
              </Button>
            )}

            {!isSelf && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDelete(user)}
                className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Delete member"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Agency Team & Roles"
        subtitle="Manage agency team members, workspace logins, role permission boundaries, and profile photos."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setUserToEdit(null);
                setModalOpen(true);
              }}
            >
              Add Member
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Filter team members by name..."
        emptyTitle="No team members found"
      />

      <AddEditUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userToEdit={userToEdit}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['team', 'list'] });
        }}
      />

      {/* Reset Password Modal */}
      {resetModalUser && (
        <Modal open={!!resetModalUser} onOpenChange={(open) => !open && setResetModalUser(null)}>
          <ModalContent size="sm">
            <ModalHeader>
              <ModalTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary-600" />
                Reset Password for {resetModalUser.name}
              </ModalTitle>
              <ModalDescription>
                Set a new workspace login password for @{resetModalUser.username || resetModalUser.email.split('@')[0]}.
              </ModalDescription>
            </ModalHeader>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4 pt-2">
              <FormField label="New Password (min 8 characters)" required>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateRandomPassword}
                leftIcon={<Wand2 className="w-3.5 h-3.5 text-accent" />}
                className="text-xs"
              >
                Generate Secure Password
              </Button>

              <ModalFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetModalUser(null)}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isResetting}>
                  Save New Password
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      )}

      {/* Delete Member Confirmation Modal */}
      {deleteModalUser && (
        <Modal open={!!deleteModalUser} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
          <ModalContent size="md">
            <ModalHeader>
              <ModalTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Delete Member: {deleteModalUser.name}
              </ModalTitle>
              <ModalDescription>
                Choose how to handle tasks and records associated with @{deleteModalUser.username || deleteModalUser.email.split('@')[0]}.
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-4 pt-2 text-xs">
              <p className="text-text-muted">
                To prevent broken audit logs and orphaned deliverables, select an option:
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-card border border-border cursor-pointer hover:bg-surface-subtle">
                  <input
                    type="radio"
                    name="deleteChoice"
                    checked={deleteActionChoice === 'reassign'}
                    onChange={() => setDeleteActionChoice('reassign')}
                    className="mt-0.5 text-primary-600"
                  />
                  <div className="space-y-2 flex-1">
                    <span className="font-bold text-text block">Reassign open tasks to another active member</span>
                    <span className="text-text-muted block text-[11px]">
                      All open tasks assigned to {deleteModalUser.name} will be transferred before removal.
                    </span>
                    {deleteActionChoice === 'reassign' && (
                      <select
                        value={reassignUserId}
                        onChange={(e) => setReassignUserId(e.target.value)}
                        className="w-full text-xs p-2 rounded-control border border-border bg-surface text-text mt-1"
                      >
                        {users
                          .filter((u) => u.id !== deleteModalUser.id && u.active && !u.isFormerMember)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role === 'super_admin' ? 'Super Admin' : 'Worker'})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-card border border-border cursor-pointer hover:bg-surface-subtle">
                  <input
                    type="radio"
                    name="deleteChoice"
                    checked={deleteActionChoice === 'former'}
                    onChange={() => setDeleteActionChoice('former')}
                    className="mt-0.5 text-primary-600"
                  />
                  <div>
                    <span className="font-bold text-text block">Keep history (mark as Former Member)</span>
                    <span className="text-text-muted block text-[11px]">
                      Deactivates user, blocks login, and preserves all completed deliverables and historical task logs under their name.
                    </span>
                  </div>
                </label>
              </div>

              <ModalFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteModalUser(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleConfirmDelete}
                  isLoading={isDeleting}
                >
                  Confirm Delete / Archive
                </Button>
              </ModalFooter>
            </div>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
};
