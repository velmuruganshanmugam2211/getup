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

        // 1. Task Notifications (Workers get only their own; Super Admin gets all)
        const allTasks = await taskService.getTasks();
        const relevantTasks =
          user.role === 'worker'
            ? allTasks.filter((t: Task) => t.assigneeId === user.id)
            : allTasks;

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

        // 4. Meeting Reminders (Super Admin only or attendees)
        const calendarItems = await calendarService.getItems();
        const meetings = calendarItems.filter(
          (i: CalendarItem) => i.type === 'meeting' && i.date && i.startTime
        );

        for (const m of meetings) {
          try {
            const meetingStart = new Date(`${m.date}T${m.startTime}`).getTime();
            const diffMs = meetingStart - nowTime;
            const diffMins = Math.round(diffMs / (60 * 1000));

            // Meeting starting in 10 minutes
            if (diffMins >= 0 && diffMins <= 10) {
              const key = `mtg-10min-${m.id}`;
              await sendAlert(
                key,
                'meeting_reminder',
                `Meeting in ${diffMins === 0 ? 'less than a minute' : `${diffMins} min`}`,
                `"${m.title}" is starting soon.`,
                '/calendar',
                m.id,
                'warning'
              );
            }

            // Configured reminder offset
            if (m.reminder) {
              const reminderOffsets: Record<MeetingReminder, number> = {
                at_time: 0,
                '10_min': 10,
                '30_min': 30,
                '1_hour': 60,
                '1_day': 1440,
              };
              const offsetMins = reminderOffsets[m.reminder] ?? 0;
              const reminderTargetTime = meetingStart - offsetMins * 60 * 1000;
              if (Math.abs(nowTime - reminderTargetTime) <= 90 * 1000) {
                const key = `mtg-remind-${m.reminder}-${m.id}`;
                await sendAlert(
                  key,
                  'meeting_reminder',
                  'Meeting Reminder',
                  `Upcoming meeting "${m.title}" at ${m.startTime}.`,
                  '/calendar',
                  m.id,
                  'info'
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
