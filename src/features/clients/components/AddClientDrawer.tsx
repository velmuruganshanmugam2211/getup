import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { useCreateClient, useUpdateClient } from '../hooks/useClients';
import { useToast } from '@/components/feedback/Toast';
import { Client, ClientStatus } from '@/types';
import { Building2, Package, Sparkles } from 'lucide-react';

export interface AddClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  initialLead?: {
    id?: string;
    businessName?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  } | null;
  onClientCreated?: (newClient: Client) => void;
}

export const AddClientDrawer: React.FC<AddClientDrawerProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  initialLead,
  onClientCreated,
}) => {
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<ClientStatus | ''>('');
  const [monthlyFee, setMonthlyFee] = useState<number | null>(null);
  const [onboardedOn, setOnboardedOn] = useState('');
  const [notes, setNotes] = useState('');

  // Package deliverables toggle chips and quantities - all start unselected & empty
  const [activeTypes, setActiveTypes] = useState<{
    videos: boolean;
    posts: boolean;
    reels: boolean;
    stories: boolean;
  }>({
    videos: false,
    posts: false,
    reels: false,
    stories: false,
  });
  const [typeQuantities, setTypeQuantities] = useState<{
    videos: number | '';
    posts: number | '';
    reels: number | '';
    stories: number | '';
  }>({
    videos: '',
    posts: '',
    reels: '',
    stories: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (clientToEdit) {
      setName(clientToEdit.name || '');
      setBusiness(clientToEdit.business || '');
      setContactPerson(clientToEdit.contactPerson || '');
      setPhone(clientToEdit.phone || '');
      setEmail(clientToEdit.email || '');
      setStatus(clientToEdit.status || '');
      setMonthlyFee(clientToEdit.monthlyFee ?? null);
      setOnboardedOn(clientToEdit.onboardedOn || '');
      setNotes(clientToEdit.notes || '');
      if (clientToEdit.package) {
        const pkg = clientToEdit.package;
        const hasV = (pkg.videosPerMonth ?? 0) > 0;
        const hasP = (pkg.postersPerMonth ?? 0) > 0;
        const hasR = (pkg.reelsPerMonth ?? 0) > 0;
        const hasS = (pkg.storiesPerMonth ?? 0) > 0;
        setActiveTypes({
          videos: hasV,
          posts: hasP,
          reels: hasR,
          stories: hasS,
        });
        setTypeQuantities({
          videos: pkg.videosPerMonth ?? '',
          posts: pkg.postersPerMonth ?? '',
          reels: pkg.reelsPerMonth ?? '',
          stories: pkg.storiesPerMonth ?? '',
        });
      } else {
        setActiveTypes({ videos: false, posts: false, reels: false, stories: false });
        setTypeQuantities({ videos: '', posts: '', reels: '', stories: '' });
      }
    } else {
      // Create mode starts COMPLETELY EMPTY, unless explicitly converting from a Lead (allowed exception)
      setName(initialLead?.businessName || '');
      setBusiness('');
      setContactPerson(initialLead?.contactPerson || '');
      setPhone(initialLead?.phone || '');
      setEmail(initialLead?.email || '');
      setStatus('');
      setMonthlyFee(null);
      setOnboardedOn('');
      setNotes('');
      setActiveTypes({ videos: false, posts: false, reels: false, stories: false });
      setTypeQuantities({ videos: '', posts: '', reels: '', stories: '' });
    }
    setFormErrors({});
  }, [clientToEdit, isOpen, initialLead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errMap: Record<string, string> = {};
    if (!name.trim()) errMap['name'] = 'Client / Company name is required';
    if (!business.trim()) errMap['business'] = 'Industry / Vertical is required';
    if (!contactPerson.trim()) errMap['contactPerson'] = 'Contact person name is required';
    if (!phone.trim()) errMap['phone'] = 'Phone number is required';
    if (!email.trim() || !email.includes('@')) errMap['email'] = 'Valid email address is required';
    if (!status) errMap['status'] = 'Please select account status';
    if (monthlyFee === null || monthlyFee === undefined || monthlyFee <= 0) {
      errMap['monthlyFee'] = 'Monthly retainer fee is required (must be > 0)';
    }
    if (!onboardedOn) errMap['onboardedOn'] = 'Onboarding date is required';

    if (activeTypes.videos && (!typeQuantities.videos || Number(typeQuantities.videos) <= 0)) {
      errMap['videos'] = 'Enter quantity';
    }
    if (activeTypes.posts && (!typeQuantities.posts || Number(typeQuantities.posts) <= 0)) {
      errMap['posts'] = 'Enter quantity';
    }
    if (activeTypes.reels && (!typeQuantities.reels || Number(typeQuantities.reels) <= 0)) {
      errMap['reels'] = 'Enter quantity';
    }
    if (activeTypes.stories && (!typeQuantities.stories || Number(typeQuantities.stories) <= 0)) {
      errMap['stories'] = 'Enter quantity';
    }

    if (Object.keys(errMap).length > 0) {
      setFormErrors(errMap);
      error('Validation Error', 'Please complete all required fields.');
      return;
    }

    const packageData: Record<string, any> = {
      startDate: onboardedOn,
    };
    if (activeTypes.videos && Number(typeQuantities.videos) > 0) {
      packageData.videosPerMonth = Number(typeQuantities.videos);
    }
    if (activeTypes.posts && Number(typeQuantities.posts) > 0) {
      packageData.postersPerMonth = Number(typeQuantities.posts);
    }
    if (activeTypes.reels && Number(typeQuantities.reels) > 0) {
      packageData.reelsPerMonth = Number(typeQuantities.reels);
    }
    if (activeTypes.stories && Number(typeQuantities.stories) > 0) {
      packageData.storiesPerMonth = Number(typeQuantities.stories);
    }

    const formData = {
      name: name.trim(),
      business: business.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      status: status as ClientStatus,
      monthlyFee: Number(monthlyFee),
      onboardedOn,
      notes: notes.trim(),
      package: packageData,
    };

    try {
      if (clientToEdit) {
        await updateClientMutation.mutateAsync({
          id: clientToEdit.id,
          data: {
            ...formData,
            package: {
              id: clientToEdit.package?.id || `pkg-${Date.now()}`,
              clientId: clientToEdit.id,
              videosPerMonth: formData.package.videosPerMonth,
              postersPerMonth: formData.package.postersPerMonth,
              reelsPerMonth: formData.package.reelsPerMonth,
              storiesPerMonth: formData.package.storiesPerMonth,
              startDate: formData.package.startDate,
            },
          },
        });
        success('Client Updated', `${formData.name} details were successfully saved.`);
      } else {
        const tempClientId = `client-${Date.now()}`;
        const created = await createClientMutation.mutateAsync({
          ...formData,
          package: {
            id: `pkg-${Date.now()}`,
            clientId: tempClientId,
            videosPerMonth: formData.package.videosPerMonth,
            postersPerMonth: formData.package.postersPerMonth,
            reelsPerMonth: formData.package.reelsPerMonth,
            storiesPerMonth: formData.package.storiesPerMonth,
            startDate: formData.package.startDate,
          },
        });
        success('Client Onboarded', `${formData.name} has been added to agency records.`);
        onClientCreated?.(created);
      }

      onClose();
    } catch {
      error('Operation Failed', 'Could not save client. Please try again.');
    }
  };

  const isSubmitting = createClientMutation.isPending || updateClientMutation.isPending;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent size="lg">
        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col h-full">
          <DrawerHeader className="border-b border-border pb-4">
            <DrawerTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="w-5 h-5 text-primary-600" />
              {clientToEdit ? 'Edit Client Profile' : 'Onboard New Agency Client'}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-text-muted">
              {clientToEdit
                ? 'Update company profile, contact details, monthly retainer fee, and package.'
                : 'Enter client details, monthly fee contract, and monthly deliverable commitments.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Section 1: Business Profile */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                Company Profile & Industry
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Business / Client Name"
                  required
                  error={formErrors['name']}
                >
                  <Input
                    placeholder="e.g. Aura Luxe Salon"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formErrors['name']) setFormErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    autoFocus
                  />
                </FormField>

                <FormField
                  label="Vertical / Industry"
                  required
                  error={formErrors['business']}
                >
                  <Input
                    placeholder="e.g. Beauty & Wellness, SaaS, Hospitality"
                    value={business}
                    onChange={(e) => {
                      setBusiness(e.target.value);
                      if (formErrors['business']) setFormErrors((prev) => ({ ...prev, business: '' }));
                    }}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  label="Contact Person"
                  required
                  error={formErrors['contactPerson']}
                >
                  <Input
                    placeholder="e.g. Kavya Menon"
                    value={contactPerson}
                    onChange={(e) => {
                      setContactPerson(e.target.value);
                      if (formErrors['contactPerson']) setFormErrors((prev) => ({ ...prev, contactPerson: '' }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Phone Number"
                  required
                  error={formErrors['phone']}
                >
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (formErrors['phone']) setFormErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Email Address"
                  required
                  error={formErrors['email']}
                >
                  <Input
                    type="email"
                    placeholder="e.g. contact@auraluxe.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors['email']) setFormErrors((prev) => ({ ...prev, email: '' }));
                    }}
                  />
                </FormField>
              </div>
            </div>

            {/* Section 2: Contract & Commercials */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                <Building2 className="w-3.5 h-3.5 text-primary-600" />
                Contract & Commercials
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  label="Monthly Retainer Fee"
                  required
                  hint="Agreed monthly retainer"
                  error={formErrors['monthlyFee']}
                >
                  <MoneyInput
                    value={monthlyFee}
                    onChange={(val) => {
                      setMonthlyFee(val);
                      if (formErrors['monthlyFee']) setFormErrors((prev) => ({ ...prev, monthlyFee: '' }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Account Status"
                  required
                  error={formErrors['status']}
                >
                  <Select
                    value={status}
                    placeholder="Select account status..."
                    onChange={(e) => {
                      setStatus(e.target.value as ClientStatus);
                      if (formErrors['status']) setFormErrors((prev) => ({ ...prev, status: '' }));
                    }}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'paused', label: 'Paused' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                  />
                </FormField>

                <FormField
                  label="Onboarding Date"
                  required
                  error={formErrors['onboardedOn']}
                >
                  <Input
                    type="date"
                    value={onboardedOn}
                    onChange={(e) => {
                      setOnboardedOn(e.target.value);
                      if (formErrors['onboardedOn']) setFormErrors((prev) => ({ ...prev, onboardedOn: '' }));
                    }}
                  />
                </FormField>
              </div>
            </div>

            {/* Section 3: Monthly Deliverables Package */}
            <div className="space-y-4 bg-primary-50/40 p-4 rounded-card border border-primary-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-primary-800 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-primary-600" />
                    Monthly Deliverables Package
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Select deliverable types to include in this client contract. Only active types will be tracked.
                  </p>
                </div>
              </div>

              {/* 4 Toggle Chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'videos', label: 'Videos' },
                  { key: 'posts', label: 'Posts' },
                  { key: 'reels', label: 'Reels' },
                  { key: 'stories', label: 'Stories' },
                ].map(({ key, label }) => {
                  const isActive = activeTypes[key as keyof typeof activeTypes];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setActiveTypes((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof activeTypes],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-pill text-xs font-semibold border transition-all ${
                        isActive
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-surface text-text-muted border-border hover:border-primary-300 hover:text-text'
                      }`}
                    >
                      {isActive ? `✓ ${label}` : `+ ${label}`}
                    </button>
                  );
                })}
              </div>

              {/* Number Inputs for Active Types */}
              {!Object.values(activeTypes).some(Boolean) ? (
                <div className="p-3 bg-surface/60 rounded-control border border-dashed border-border text-center text-xs text-text-muted">
                  No package set (no deliverables will be tracked)
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {activeTypes.videos && (
                    <div className="bg-surface p-3 rounded-control border border-primary-200 shadow-xs animate-in fade-in-50">
                      <label className="text-[11px] font-semibold text-text block mb-1">Videos / mo</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Count"
                        value={typeQuantities.videos === '' ? '' : typeQuantities.videos}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setTypeQuantities((prev) => ({
                            ...prev,
                            videos: isNaN(val as number) ? '' : val,
                          }));
                          if (formErrors['videos']) setFormErrors((prev) => ({ ...prev, videos: '' }));
                        }}
                        className="h-8 text-center font-bold tabular-nums"
                      />
                      {formErrors['videos'] && (
                        <p className="text-[10px] text-semantic-danger font-medium mt-1">{formErrors['videos']}</p>
                      )}
                    </div>
                  )}

                  {activeTypes.posts && (
                    <div className="bg-surface p-3 rounded-control border border-primary-200 shadow-xs animate-in fade-in-50">
                      <label className="text-[11px] font-semibold text-text block mb-1">Posts / mo</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Count"
                        value={typeQuantities.posts === '' ? '' : typeQuantities.posts}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setTypeQuantities((prev) => ({
                            ...prev,
                            posts: isNaN(val as number) ? '' : val,
                          }));
                          if (formErrors['posts']) setFormErrors((prev) => ({ ...prev, posts: '' }));
                        }}
                        className="h-8 text-center font-bold tabular-nums"
                      />
                      {formErrors['posts'] && (
                        <p className="text-[10px] text-semantic-danger font-medium mt-1">{formErrors['posts']}</p>
                      )}
                    </div>
                  )}

                  {activeTypes.reels && (
                    <div className="bg-surface p-3 rounded-control border border-primary-200 shadow-xs animate-in fade-in-50">
                      <label className="text-[11px] font-semibold text-text block mb-1">Reels / mo</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Count"
                        value={typeQuantities.reels === '' ? '' : typeQuantities.reels}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setTypeQuantities((prev) => ({
                            ...prev,
                            reels: isNaN(val as number) ? '' : val,
                          }));
                          if (formErrors['reels']) setFormErrors((prev) => ({ ...prev, reels: '' }));
                        }}
                        className="h-8 text-center font-bold tabular-nums"
                      />
                      {formErrors['reels'] && (
                        <p className="text-[10px] text-semantic-danger font-medium mt-1">{formErrors['reels']}</p>
                      )}
                    </div>
                  )}

                  {activeTypes.stories && (
                    <div className="bg-surface p-3 rounded-control border border-primary-200 shadow-xs animate-in fade-in-50">
                      <label className="text-[11px] font-semibold text-text block mb-1">Stories / mo</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Count"
                        value={typeQuantities.stories === '' ? '' : typeQuantities.stories}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setTypeQuantities((prev) => ({
                            ...prev,
                            stories: isNaN(val as number) ? '' : val,
                          }));
                          if (formErrors['stories']) setFormErrors((prev) => ({ ...prev, stories: '' }));
                        }}
                        className="h-8 text-center font-bold tabular-nums"
                      />
                      {formErrors['stories'] && (
                        <p className="text-[10px] text-semantic-danger font-medium mt-1">{formErrors['stories']}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Notes & Strategy */}
            <FormField label="Strategy Notes & Requirements" hint="Optional creative notes, guidelines, or brand voice">
              <Textarea
                rows={3}
                placeholder="e.g. Tone is luxury minimalist. Target audience 24-40. Focus on weekly transformations."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>

          <DrawerFooter className="border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {clientToEdit ? 'Save Changes' : 'Onboard Client'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
