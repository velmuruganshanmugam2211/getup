import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { useToast } from '@/components/feedback/Toast';
import { useUpdateLead } from '../hooks/useCalls';
import { Lead } from '@/types';
import { Building2 } from 'lucide-react';

export interface EditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  open,
  onOpenChange,
  lead,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateLeadMutation = useUpdateLead();
  const toast = useToast();

  useEffect(() => {
    if (open && lead) {
      setBusinessName(lead.businessName || '');
      setContactPerson(lead.contactPerson || '');
      setPhone(lead.phone || '');
      setEmail(lead.email || '');
      setSource(lead.source || '');
      setNotes(lead.notes || '');
      setErrors({});
    }
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    const err: Record<string, string> = {};
    if (!businessName.trim()) err['businessName'] = 'Business / Brand name is required';
    if (!contactPerson.trim()) err['contactPerson'] = 'Contact person name is required';
    if (!phone.trim()) err['phone'] = 'Phone number is required';

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    try {
      await updateLeadMutation.mutateAsync({
        id: lead.id,
        data: {
          businessName: businessName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          source: source.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success('Lead Updated', 'Lead contact information saved.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update lead profile.');
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md" variant="center">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 text-base font-bold">
            <Building2 className="w-5 h-5 text-primary-600" />
            Edit Prospect Lead
          </ModalTitle>
          <ModalDescription className="text-xs text-text-muted">
            Update business details, point of contact, and background notes.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Business / Brand Name" required error={errors.businessName}>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Contact Person" required error={errors.contactPerson}>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Phone Number" required error={errors.phone}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Email Address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </FormField>
          </div>

          <FormField label="Lead Acquisition Source">
            <Input
              placeholder="e.g. Inbound DM, Meta Ad, Referral"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Lead Notes / Background">
            <Textarea
              rows={3}
              placeholder="Background notes about client business, goals, and history"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <ModalFooter className="px-0 pt-2 pb-0 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateLeadMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={updateLeadMutation.isPending}>
              {updateLeadMutation.isPending ? 'Saving...' : 'Save Lead'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
