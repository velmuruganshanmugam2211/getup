import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callService } from '@/services';
import { Lead, CallLog, LeadStage } from '@/types';

export const callKeys = {
  all: ['calls'] as const,
  leads: (filters?: { search?: string; stage?: LeadStage }) => ['calls', 'leads', filters] as const,
  logs: (filters?: { leadId?: string; date?: string; startDate?: string; endDate?: string }) =>
    ['calls', 'logs', filters] as const,
};

export function useLeads(filters?: { search?: string; stage?: LeadStage }) {
  return useQuery<Lead[]>({
    queryKey: callKeys.leads(filters),
    queryFn: () => callService.getLeads(filters),
  });
}

export function useCallLogs(filters?: { leadId?: string; date?: string; startDate?: string; endDate?: string }) {
  return useQuery<CallLog[]>({
    queryKey: callKeys.logs(filters),
    queryFn: () => callService.getCallLogs(filters),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'stage'> & { stage?: LeadStage }) =>
      callService.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => callService.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callService.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
    },
  });
}

export function useCreateCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CallLog, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) =>
      callService.createCallLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CallLog> }) => callService.updateCallLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callService.deleteCallLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRescheduleFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      callLogId,
      newDate,
      newTime,
      newNote,
    }: {
      callLogId: string;
      newDate: string;
      newTime?: string;
      newNote?: string;
    }) =>
      callService.updateCallLog(callLogId, {
        followUpDate: newDate,
        followUpTime: newTime,
        followUpNote: newNote,
        followUpDone: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
    },
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (callLogId: string) => callService.markFollowUpDone(callLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, clientId }: { leadId: string; clientId: string }) =>
      callService.updateLead(leadId, {
        stage: 'Converted',
        convertedClientId: clientId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.all });
    },
  });
}
