import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/app/stores/useUiStore';
import { notificationService } from '@/services';
import { useAuth } from '@/features/auth';
import { Notification } from '@/types';
import { Bell, AlertCircle, CheckCircle, CheckSquare, PlusCircle, Calendar, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { useNavigate } from 'react-router-dom';

export const NotificationDrawer: React.FC = () => {
  const { notificationDrawerOpen, setNotificationDrawerOpen } = useUiStore();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (notificationDrawerOpen && user) {
      notificationService.getNotifications(user.id).then(setNotifications);
    }
  }, [notificationDrawerOpen, user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    const updated = await notificationService.getNotifications(user.id);
    setNotifications(updated);
  };

  const handleNotificationClick = async (notif: Notification) => {
    await notificationService.markAsRead(notif.id);
    setNotificationDrawerOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'meeting_reminder':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'task_overdue':
        return <Clock className="w-4 h-4 text-rose-600" />;
      case 'payment_overdue':
        return <AlertCircle className="w-4 h-4 text-semantic-warning" />;
      case 'task_assigned':
        return <CheckSquare className="w-4 h-4 text-primary-600" />;
      case 'deliverable_added':
      case 'client_added':
        return <PlusCircle className="w-4 h-4 text-primary-600" />;
      case 'system':
      default:
        return <Bell className="w-4 h-4 text-semantic-info" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <Drawer open={notificationDrawerOpen} onOpenChange={setNotificationDrawerOpen}>
      <DrawerContent size="sm">
        <DrawerHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DrawerTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-600" />
                Agency Alerts
              </DrawerTitle>
              {unreadCount > 0 && (
                <span className="bg-primary-100 text-primary-700 text-[11px] font-bold px-2 py-0.5 rounded-pill">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-7">
                Mark all read
              </Button>
            )}
          </div>
          <DrawerDescription className="text-xs text-text-muted mt-1">
            Payment alerts, task assignments, and activity updates
          </DrawerDescription>
        </DrawerHeader>

        <div className="divide-y divide-border -mx-5">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-xs">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
              No notifications at this time
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 flex items-start gap-3 hover:bg-surface-subtle cursor-pointer transition-colors ${
                  !notif.readAt ? 'bg-primary-50/40' : ''
                }`}
              >
                <div className="p-2 rounded-full bg-surface border border-border shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${!notif.readAt ? 'font-semibold text-text' : 'text-text-muted'}`}>
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-text-subtle mt-1 block">
                    {formatDateTime(notif.createdAt)}
                  </span>
                </div>
                {!notif.readAt && (
                  <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
