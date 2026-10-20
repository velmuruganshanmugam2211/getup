import React from 'react';
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
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/features/auth';
import { teamService } from '@/services';
import { useToast } from '@/components/feedback/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [avatar, setAvatar] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error('Validation Error', 'Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Validation Error', 'A valid email address is required.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Validation Error', 'New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await teamService.updateUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        avatar: avatar.trim() || undefined,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries();
      toast.success('Profile Saved', 'Your user account details were updated successfully.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>My Profile</ModalTitle>
          <ModalDescription>
            Update personal contact info, photo, and account credentials.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 flex-1 flex flex-col">
          <div className="flex items-center gap-3 pb-1">
            <Avatar name={name || 'User'} src={avatar} size="lg" status="online" />
            <div>
              <span className="text-xs font-bold text-text block">{name || 'User'}</span>
              <span className="text-[11px] text-text-muted">{email}</span>
              <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-primary-100 text-primary-700">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Worker'}
              </span>
            </div>
          </div>

          <FormField label="Full Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </FormField>

          <FormField label="Email Address" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahul@getupagency.com"
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Phone Number">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </FormField>

            <FormField label="Photo URL">
              <Input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
              />
            </FormField>
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text">
              <Lock className="w-3.5 h-3.5 text-text-muted" /> Change Password
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current"
              />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm"
              />
            </div>
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
              Save Profile
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default UserProfileModal;
