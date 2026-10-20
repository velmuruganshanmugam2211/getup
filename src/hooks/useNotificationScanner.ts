import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth';
import { useToast } from '@/components/feedback/Toast';
import { calendarService, taskService, financeService, notificationService } from '@/services';
import { CalendarItem, MeetingReminder, Payment } from '@/types';

// Track alerted items in this session to prevent spamming duplicate toasts/notifications
const notifiedItemsSet = new Set<string>();

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
        const todayStr = now.toISOString().split('T')[0];

        // 1. Check Meetings (Super Admin only or attendees)
        if (user.role === 'super_admin') {
          const calendarItems = await calendarService.getItems();
          const meetings = calendarItems.filter((i: CalendarItem) => i.type === 'meeting' && i.date && i.startTime);

          for (const m of meetings) {
            try {
              const meetingStart = new Date(`${m.date}T${m.startTime}`).getTime();
              const diffMs = meetingStart - nowTime;
              const diffMins = Math.round(diffMs / (60 * 1000));

              // Meeting starting in 10 minutes (between 0 and 10 mins away)
              if (diffMins >= 0 && diffMins <= 10) {
                const key = `mtg-10min-${m.id}`;
                if (!notifiedItemsSet.has(key)) {
                  notifiedItemsSet.add(key);
                  const title = `Meeting in ${diffMins === 0 ? 'less than a minute' : `${diffMins} min`}`;
                  const msg = `"${m.title}" is starting soon.`;

                  toast.warning(title, msg);
                  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, { body: msg, icon: '/logo.svg' });
                  }
                  await notificationService.createNotification({
                    userId: user.id,
                    type: 'meeting_reminder',
                    title,
                    message: msg,
                    link: '/calendar',
                    entityId: m.id,
                  });
                }
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
                // If within a 3-minute window of reminder time
                if (Math.abs(nowTime - reminderTargetTime) <= 90 * 1000) {
                  const key = `mtg-remind-${m.reminder}-${m.id}`;
                  if (!notifiedItemsSet.has(key)) {
                    notifiedItemsSet.add(key);
                    const title = 'Meeting Reminder';
                    const msg = `Upcoming meeting "${m.title}" at ${m.startTime}.`;

                    toast.info(title, msg);
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                      new Notification(title, { body: msg, icon: '/logo.svg' });
                    }
                    await notificationService.createNotification({
                      userId: user.id,
                      type: 'meeting_reminder',
                      title,
                      message: msg,
                      link: '/calendar',
                      entityId: m.id,
                    });
                  }
                }
              }
            } catch {
              // Ignore date parse errors for invalid format
            }
          }
        }

        // 2. Check Overdue Tasks
        const tasks = await taskService.getTasks();
        const overdueTasks = tasks.filter(
          (t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr
        );

        for (const t of overdueTasks) {
          const key = `task-overdue-${t.id}-${todayStr}`;
          if (!notifiedItemsSet.has(key)) {
            notifiedItemsSet.add(key);
            const title = 'Task Overdue';
            const msg = `"${t.title}" was due on ${t.dueDate}.`;

            toast.warning(title, msg);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(title, { body: msg, icon: '/logo.svg' });
            }
            await notificationService.createNotification({
              userId: user.id,
              type: 'task_overdue',
              title,
              message: msg,
              link: '/tasks',
              entityId: t.id,
            });
          }
        }

        // 3. Check Overdue Payments (Super Admin only)
        if (user.role === 'super_admin') {
          const payments = await financeService.getPayments();
          const overduePayments = payments.filter(
            (p: Payment) => p.status === 'overdue'
          );

          for (const p of overduePayments) {
            const key = `payment-overdue-${p.id}-${todayStr}`;
            if (!notifiedItemsSet.has(key)) {
              notifiedItemsSet.add(key);
              const title = 'Payment Overdue';
              const msg = `Payment of ₹${p.amount?.toLocaleString('en-IN')} is overdue.`;

              toast.error(title, msg);
              await notificationService.createNotification({
                userId: user.id,
                type: 'payment_overdue',
                title,
                message: msg,
                link: '/finance',
                entityId: p.id,
              });
            }
          }
        }
      } catch (err) {
        console.error('Notification scanner error:', err);
      }
    };

    // Run initial scan
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
