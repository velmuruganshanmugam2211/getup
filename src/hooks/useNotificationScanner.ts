import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth';
import { useToast } from '@/components/feedback/Toast';
import {
  calendarService,
  taskService,
  financeService,
  notificationService,
  billingCycleService,
  clientService,
  settingsService,
  callService,
} from '@/services';
import { CalendarItem, MeetingReminder, Task, Client, BillingCycle } from '@/types';
import { deriveCycleStatus, getCycleDaysRemaining } from '@/lib/cycleUtils';
import { format, addDays } from 'date-fns';
import { formatINR, formatDate } from '@/lib/format';

const NOTIFIED_STORAGE_KEY = 'getup_notified_alerts';

function getPersistedAlerts(dateStr: string): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    if (data.date === dateStr && Array.isArray(data.keys)) {
      return new Set(data.keys);
    }
    return new Set();
  } catch {
    return new Set();
  }
}

function persistAlert(key: string, dateStr: string) {
  try {
    const current = getPersistedAlerts(dateStr);
    current.add(key);
    localStorage.setItem(
      NOTIFIED_STORAGE_KEY,
      JSON.stringify({ date: dateStr, keys: Array.from(current) })
    );
  } catch {
    // ignore
  }
}

export function useNotificationScanner() {
  const { user } = useAuth();
  const toast = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request browser notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const scanAndAlert = async () => {
      try {
        const now = new Date();
        const nowTime = now.getTime();
        const todayStr = format(now, 'yyyy-MM-dd');
        const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
        const in3DaysStr = format(addDays(now, 3), 'yyyy-MM-dd');

        const persistedKeys = getPersistedAlerts(todayStr);

        const sendAlert = async (
          key: string,
          type: import('@/types').Notification['type'],
          title: string,
          message: string,
          link: string,
          entityId?: string,
          variant: 'info' | 'warning' | 'error' | 'success' = 'info'
        ) => {
          if (persistedKeys.has(key)) return;
          persistedKeys.add(key);
          persistAlert(key, todayStr);

          // 1. Toast
          if (variant === 'warning') toast.warning(title, message);
          else if (variant === 'error') toast.error(title, message);
          else if (variant === 'success') toast.success(title, message);
          else toast.info(title, message);

          // 2. Browser Notification
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification(title, { body: message, icon: '/logo.svg' });
            } catch {
              // ignore
            }
          }

          // 3. Persist to notifications list
          await notificationService.createNotification({
            userId: user.id,
            type,
            title,
            message,
            link,
            entityId,
          });
        };

        // Fetch settings for notification hour
        const settings = await settingsService.getSettings();
        const notifTimeStr = settings.taskDueNotificationTime || '09:00';
        const [targetHour, targetMinute] = notifTimeStr.split(':').map(Number);
        const isPastMorningCheck =
          now.getHours() > targetHour ||
          (now.getHours() === targetHour && now.getMinutes() >= (targetMinute || 0));

        // 1. Task Due Date Notifications: GO ONLY TO ASSIGNEE
        const allTasks = await taskService.getTasks();
        const relevantTasks = allTasks.filter((t: Task) => t.assigneeId === user.id);

        for (const t of relevantTasks) {
          if (t.status === 'done') continue;
          if (!t.dueDate) continue;

          // A. Overdue Tasks
          if (t.dueDate < todayStr) {
            const key = `task-overdue-${t.id}-${todayStr}`;
            await sendAlert(
              key,
              'task_overdue',
              'Task Overdue',
              `"${t.title}" was due on ${formatDate(t.dueDate)}.`,
              '/tasks',
              t.id,
              'warning'
            );
          }

          // B. Task Due Today (Triggered at morning notification hour)
          if (t.dueDate === todayStr && isPastMorningCheck) {
            const key = `task-duetoday-${t.id}-${todayStr}`;
            await sendAlert(
              key,
              'task_due_today',
              'Task Due Today',
              `"${t.title}" is due today.`,
              '/tasks',
              t.id,
              'info'
            );
          }

          // C. Task Due 1 Day Before
          if (t.dueDate === tomorrowStr) {
            const key = `task-duetomorrow-${t.id}-${todayStr}`;
            await sendAlert(
              key,
              'task_due_tomorrow',
              'Task Due Tomorrow',
              `"${t.title}" is due tomorrow (${formatDate(t.dueDate)}).`,
              '/tasks',
              t.id,
              'info'
            );
          }
        }

        // WORKERS MUST NEVER SEE FINANCIALS, BILLING CYCLES, OR RENEWALS
        if (user.role === 'worker') {
          return;
        }

        // 2. Billing Cycle Renewals (Super Admin only)
        const [clients, cycles] = await Promise.all([
          clientService.getClients(),
          billingCycleService.getCycles(),
        ]);

        const activeClients = clients.filter(
          (c: Client) => c.status === 'active'
        );

        for (const client of activeClients) {
          const clientCycles = cycles.filter((c: BillingCycle) => c.clientId === client.id);
          if (clientCycles.length === 0) continue;

          const currentCycle =
            (client.currentCycleId ? clientCycles.find((c) => c.id === client.currentCycleId) : null) ||
            [...clientCycles].sort((a, b) => b.cycleNumber - a.cycleNumber)[0];

          if (!currentCycle) continue;
          const status = deriveCycleStatus(currentCycle, todayStr);
          const daysLeft = getCycleDaysRemaining(currentCycle, todayStr);

          // Expired without renewal
          if (status === 'renewal_pending') {
            const key = `cycle-expired-${currentCycle.id}-${todayStr}`;
            await sendAlert(
              key,
              'cycle_expired',
              'Billing Cycle Renewal Pending',
              `${client.business} Cycle ${currentCycle.cycleNumber} ended on ${formatDate(currentCycle.endDate)}. Please renew plan.`,
              `/clients/${client.id}?renew=true`,
              currentCycle.id,
              'warning'
            );
          } else if (status === 'active') {
            // Ending today
            if (currentCycle.endDate === todayStr) {
              const key = `cycle-ending-today-${currentCycle.id}-${todayStr}`;
              await sendAlert(
                key,
                'cycle_ending',
                'Billing Cycle Ends Today',
                `${client.business} Cycle ${currentCycle.cycleNumber} ends today (${formatDate(currentCycle.endDate)}).`,
                `/clients/${client.id}?renew=true`,
                currentCycle.id,
                'warning'
              );
            }
            // 3 days before
            else if (currentCycle.endDate === in3DaysStr || daysLeft <= 3) {
              const key = `cycle-ending-3d-${currentCycle.id}-${todayStr}`;
              await sendAlert(
                key,
                'cycle_ending',
                'Billing Cycle Ending Soon',
                `${client.business} Cycle ${currentCycle.cycleNumber} ends in ${daysLeft} days (${formatDate(currentCycle.endDate)}).`,
                `/clients/${client.id}?renew=true`,
                currentCycle.id,
                'info'
              );
            }
          }
        }

        // 3. Payments Due and Overdue (Super Admin only)
        const payments = await financeService.getPayments();
        for (const p of payments) {
          if (p.status === 'overdue') {
            const key = `payment-overdue-${p.id}-${todayStr}`;
            await sendAlert(
              key,
              'payment_overdue',
              'Payment Overdue',
              `Payment of ${formatINR(p.amount)} is overdue.`,
              '/finance',
              p.id,
              'error'
            );
          } else if (p.status === 'pending' && p.cycleId) {
            // New cycle pending payment
            const key = `payment-cycle-due-${p.id}-${todayStr}`;
            await sendAlert(
              key,
              'cycle_payment_due',
              'Cycle Retainer Due',
              `Pending retainer of ${formatINR(p.amount)} for billing cycle.`,
              '/finance',
              p.id,
              'info'
            );
          }
        }

        // 4. Prospect Follow-ups (Super Admin only)
        const followUpTimeStr = settings.followUpNotificationTime || '09:00';
        const [fuHour, fuMinute] = followUpTimeStr.split(':').map(Number);
        const isPastFollowUpCheck =
          now.getHours() > fuHour ||
          (now.getHours() === fuHour && now.getMinutes() >= (fuMinute || 0));

        const [allLeads, allCalls] = await Promise.all([
          callService.getLeads(),
          callService.getCallLogs(),
        ]);
        const leadMap = new Map(allLeads.map((l) => [l.id, l]));

        for (const call of allCalls) {
          if (!call.followUpDate || call.followUpDone) continue;
          const lead = leadMap.get(call.leadId);
          const leadName = lead?.businessName || 'Prospect';

          // Overdue follow-up
          if (call.followUpDate < todayStr) {
            const key = `fu-overdue-${call.id}-${todayStr}`;
            await sendAlert(
              key,
              'follow_up_overdue',
              'Follow-up Overdue',
              `Follow-up callback with "${leadName}" was due on ${formatDate(call.followUpDate)}.`,
              '/calls',
              call.id,
              'warning'
            );
          }

          // Follow-up due today
          if (call.followUpDate === todayStr && isPastFollowUpCheck) {
            const key = `fu-duetoday-${call.id}-${todayStr}`;
            await sendAlert(
              key,
              'follow_up_due',
              'Follow-up Due Today',
              `Follow-up callback with "${leadName}" is due today${call.followUpTime ? ` at ${call.followUpTime}` : ''}.`,
              '/calls',
              call.id,
              'info'
            );
          }
        }

        // 5. Meeting Reminders (2 days before, 1 day before, and at user's chosen offsets, plus on the day)
        const calendarItems = await calendarService.getItems();
        const meetings = calendarItems.filter(
          (i: CalendarItem) => i.type === 'meeting' && i.date && i.startTime
        );
        const in2DaysStr = format(addDays(now, 2), 'yyyy-MM-dd');

        for (const m of meetings) {
          try {
            const meetingStart = new Date(`${m.date}T${m.startTime}`).getTime();
            const diffMs = meetingStart - nowTime;
            const diffMins = Math.round(diffMs / (60 * 1000));

            const activeReminders = new Set<MeetingReminder>(m.reminders || []);
            if (m.reminder) activeReminders.add(m.reminder);

            // A. 2 Days Before: if meeting is in 2 days (e.g. today is 21 Oct, meeting is 23 Oct)
            if (m.date === in2DaysStr && activeReminders.has('2_days')) {
              const key = `mtg-remind-2days-${m.id}-${todayStr}`;
              await sendAlert(
                key,
                'meeting_reminder',
                'Meeting in 2 Days',
                `Upcoming meeting "${m.title}" is scheduled in 2 days on ${formatDate(m.date)} at ${m.startTime}.`,
                '/calendar',
                m.id,
                'info'
              );
            }

            // B. 1 Day Before: if meeting is tomorrow (e.g. today is 22 Oct, meeting is 23 Oct)
            if (m.date === tomorrowStr && activeReminders.has('1_day')) {
              const key = `mtg-remind-1day-${m.id}-${todayStr}`;
              await sendAlert(
                key,
                'meeting_reminder',
                'Meeting Tomorrow',
                `Upcoming meeting "${m.title}" is tomorrow at ${m.startTime}.`,
                '/calendar',
                m.id,
                'info'
              );
            }

            // C. On the day of meeting
            if (m.date === todayStr) {
              // 1 hour before
              if (activeReminders.has('1_hour') && diffMins > 10 && diffMins <= 60) {
                const key = `mtg-remind-1hour-${m.id}-${todayStr}`;
                await sendAlert(
                  key,
                  'meeting_reminder',
                  'Meeting in 1 Hour',
                  `"${m.title}" starts in 1 hour at ${m.startTime}.`,
                  '/calendar',
                  m.id,
                  'info'
                );
              }

              // 30 min before
              if (activeReminders.has('30_min') && diffMins > 10 && diffMins <= 30) {
                const key = `mtg-remind-30min-${m.id}-${todayStr}`;
                await sendAlert(
                  key,
                  'meeting_reminder',
                  'Meeting in 30 Minutes',
                  `"${m.title}" starts in 30 minutes at ${m.startTime}.`,
                  '/calendar',
                  m.id,
                  'info'
                );
              }

              // Starting soon (within 10 minutes)
              if (diffMins >= 0 && diffMins <= 10) {
                const key = `mtg-10min-${m.id}-${todayStr}`;
                await sendAlert(
                  key,
                  'meeting_reminder',
                  `Meeting in ${diffMins === 0 ? 'less than a minute' : `${diffMins} min`}`,
                  `"${m.title}" is starting soon at ${m.startTime}.`,
                  '/calendar',
                  m.id,
                  'warning'
                );
              }
            }
          } catch {
            // Ignore date parse error
          }
        }
      } catch (err) {
        console.error('Notification scanner error:', err);
      }
    };

    // Run initial scan on mount
    scanAndAlert();

    // Scan every 60 seconds
    intervalRef.current = setInterval(scanAndAlert, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, toast]);
}

export default useNotificationScanner;
