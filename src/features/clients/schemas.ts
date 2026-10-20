import { z } from 'zod';

export const packageSchema = z.object({
  videosPerMonth: z.number().int().min(0).optional(),
  postersPerMonth: z.number().int().min(0).optional(),
  reelsPerMonth: z.number().int().min(0).optional(),
  storiesPerMonth: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
}).optional();

export const clientFormSchema = z.object({
  name: z.string().min(2, 'Client / Company name is required'),
  business: z.string().min(2, 'Industry / Vertical is required'),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  phone: z.string().min(10, 'Valid phone number is required (min 10 digits)'),
  email: z.string().email('Valid email address is required'),
  status: z.enum(['active', 'paused', 'closed']),
  monthlyFee: z.number().int().min(0, 'Monthly fee must be 0 or positive'),
  onboardedOn: z.string().min(1, 'Onboarding date is required'),
  notes: z.string().optional(),
  package: packageSchema,
});

export type ClientFormData = z.infer<typeof clientFormSchema>;
