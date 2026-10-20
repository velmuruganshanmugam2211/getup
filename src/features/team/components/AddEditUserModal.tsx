import React, { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/Button';
import { User, Role } from '@/types';
import { teamService } from '@/services';
import { useToast } from '@/components/feedback/Toast';
import { ShieldAlert, UserCheck, Eye, EyeOff, KeyRound, Wand2, Check } from 'lucide-react';
import { ImageUploadCrop } from '@/components/forms/ImageUploadCrop';

interface AddEditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: User | null;
  onSuccess?: () => void;
}

export const AddEditUserModal: React.FC<AddEditUserModalProps> = ({
  open,
  onOpenChange,
  userToEdit,
  onSuccess,
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<Role>('worker');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState(true);
  const [photo, setPhoto] = useState('');

  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setEmail(userToEdit.email || '');
      setPhone(userToEdit.phone || '');
      setTitle(userToEdit.title || '');
      setRole(userToEdit.role === 'super_admin' ? 'super_admin' : 'worker');
      setUsername(userToEdit.username || userToEdit.email.split('@')[0] || '');
      setPassword('');
      setActive(userToEdit.active !== false && !userToEdit.isFormerMember);
      setPhoto(userToEdit.avatar || '');
      setUsernameError('');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setTitle('');
      setRole('worker');
      setUsername('');
      setPassword('');
      setActive(true);
      setPhoto('');
      setUsernameError('');
    }
  }, [userToEdit, open]);

  // Live username uniqueness validation
  useEffect(() => {
    if (!username.trim()) {
      setUsernameError('');
      return;
    }
    const clean = username.trim().toLowerCase();
    if (clean.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const isUnique = await teamService.checkUsernameUnique(clean, userToEdit?.id);
        if (isCurrent) {
          if (!isUnique) {
            setUsernameError(`Username "@${clean}" is already in use.`);
          } else {
            setUsernameError('');
          }
        }
      } finally {
        if (isCurrent) setIsCheckingUsername(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [username, userToEdit]);

  // Generate strong random password
  const handleGeneratePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
    toast.success('Password Generated', 'Remember to share it securely with the member.');
  };

  // Password strength calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    if (pwd.length < 8) return { label: 'Too short (min 8 chars)', color: 'text-rose-500 bg-rose-500' };
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (hasLetters && hasNumbers && hasSpecial && pwd.length >= 10) {
      return { label: 'Strong password', color: 'text-emerald-600 bg-emerald-500' };
    }
    if ((hasLetters && hasNumbers) || (hasLetters && hasSpecial)) {
      return { label: 'Medium password', color: 'text-amber-500 bg-amber-500' };
    }
    return { label: 'Weak (add numbers/symbols)', color: 'text-rose-500 bg-rose-500' };
  };

  const pwdStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Validation Error', 'Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Validation Error', 'A valid email address is required.');
      return;
    }
    if (!username.trim()) {
      toast.error('Validation Error', 'Username is required.');
      return;
    }
    if (usernameError) {
      toast.error('Validation Error', usernameError);
      return;
    }
    if (!userToEdit && (!password || password.length < 8)) {
      toast.error('Validation Error', 'Password must be at least 8 characters for a new member.');
      return;
    }
    if (userToEdit && password && password.length < 8) {
      toast.error('Validation Error', 'New password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (userToEdit) {
        await teamService.updateUser(userToEdit.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          title: title.trim() || (role === 'super_admin' ? 'Super Admin' : 'Content Creator'),
          role,
          active,
          avatar: photo || undefined,
          password: password.trim() || undefined,
        });
        toast.success('Member Updated', `${name.trim()} was updated successfully.`);
      } else {
        await teamService.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          title: title.trim() || (role === 'super_admin' ? 'Super Admin' : 'Content Creator'),
          role,
          active: true,
          avatar: photo || undefined,
          password: password.trim(),
        });
        toast.success('Member Added', `${name.trim()} has been added with login credentials.`);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error('Operation Failed', err.message || 'Could not save member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>{userToEdit ? 'Edit Team Member' : 'Add Team Member'}</ModalTitle>
          <ModalDescription>
            {userToEdit
              ? 'Modify personal details, login credentials, and permission role.'
              : 'Add a new member with workspace login credentials and role permissions.'}
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 flex-1 overflow-y-auto px-1 flex flex-col">
          {/* Profile Photo Upload */}
          <div className="p-3 rounded-card bg-surface-subtle border border-border">
            <label className="text-xs font-semibold text-text block mb-2">Profile Photo</label>
            <ImageUploadCrop
              name={name || 'New Member'}
              value={photo}
              onChange={setPhoto}
              onRemove={() => setPhoto('')}
              size="lg"
            />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Full Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
              />
            </FormField>

            <FormField label="Job Title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Video Editor"
              />
            </FormField>

            <FormField label="Email Address" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@getup.agency"
                required
              />
            </FormField>

            <FormField label="Phone Number">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </FormField>
          </div>

          {/* Login Credentials Section */}
          <div className="p-3.5 rounded-card border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                <KeyRound className="w-3.5 h-3.5 text-primary-600" />
                <span>Workspace Login Credentials</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGeneratePassword}
                leftIcon={<Wand2 className="w-3 h-3 text-accent" />}
                className="text-[11px] h-7 px-2"
              >
                Generate Password
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Username (Login Handle)"
                required
                error={usernameError}
                hint={isCheckingUsername ? 'Checking availability...' : 'Unique login username'}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">
                    @
                  </span>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="rahul"
                    className="pl-7"
                    required
                  />
                </div>
              </FormField>

              <FormField
                label={userToEdit ? 'Password (leave blank to keep current)' : 'Password (min 8 chars)'}
                required={!userToEdit}
              >
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={userToEdit ? '•••••••• (unchanged)' : 'Minimum 8 characters'}
                    className="pr-9"
                    required={!userToEdit}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {pwdStrength && (
                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    <span className={`inline-block w-2 h-2 rounded-full ${pwdStrength.color}`} />
                    <span className={pwdStrength.color.split(' ')[0]}>{pwdStrength.label}</span>
                  </div>
                )}
              </FormField>
            </div>
          </div>

          {/* Role Selection: Super Admin or Worker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text block">
              Access Role <span className="text-semantic-danger">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('super_admin')}
                className={`p-3 rounded-card text-left border transition-all ${
                  role === 'super_admin'
                    ? 'border-primary-600 bg-primary-50/50 ring-2 ring-primary-600/20'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-bold text-text">Super Admin</span>
                  {role === 'super_admin' && <Check className="w-3.5 h-3.5 text-primary-600 ml-auto" />}
                </div>
                <p className="text-[11px] text-text-muted">
                  Full unrestricted access to all modules, clients, deliverables, finance, team, calendar & settings.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('worker')}
                className={`p-3 rounded-card text-left border transition-all ${
                  role === 'worker'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-text">Worker</span>
                  {role === 'worker' && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                </div>
                <p className="text-[11px] text-text-muted">
                  Sees strictly the Tasks page and their assigned tasks. Zero access to finance or client contracts.
                </p>
              </button>
            </div>
          </div>

          {/* Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-card border border-border bg-surface">
            <div>
              <span className="text-xs font-bold text-text block">Account Active Status</span>
              <span className="text-[11px] text-text-muted">
                Deactivated users are blocked from logging in to the workspace.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <ModalFooter className="mt-auto pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {userToEdit ? 'Save Changes' : 'Create Member'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AddEditUserModal;
