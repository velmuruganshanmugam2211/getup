import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useUiStore } from '@/app/stores/useUiStore';
import { Avatar } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { notificationService } from '@/services';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    setMobileSidebarOpen,
    setCommandPaletteOpen,
    setNotificationDrawerOpen,
  } = useUiStore();

  const [unreadCount, setUnreadCount] = useState(0);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      notificationService.getNotifications(user.id).then((notifs) => {
        setUnreadCount(notifs.filter((n) => !n.readAt).length);
      });
    }
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Derive current screen title from pathname
  const getScreenTitle = () => {
    const p = location.pathname;
    if (p.startsWith('/clients/') && p.length > 9) return 'Client Profile';
    if (p.startsWith('/clients')) return 'Clients Directory';
    if (p.startsWith('/tasks')) return 'Task Board';
    if (p.startsWith('/calendar')) return 'Agency Calendar';
    if (p.startsWith('/finance')) return 'Agency Finance';
    if (p.startsWith('/team')) return 'Agency Team';
    if (p.startsWith('/reports')) return 'Monthly Reports';
    if (p.startsWith('/settings')) return 'Agency Settings';
    return 'Dashboard Overview';
  };

  return (
    <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Mobile hamburger & screen title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden p-2 -ml-2 rounded-control text-text-muted hover:text-text hover:bg-surface-subtle"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-bold text-sm sm:text-base text-text tracking-tight">
            {getScreenTitle()}
          </span>
          <span className="hidden lg:inline-flex items-center text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-0.5 rounded-pill capitalize">
            {user?.role === 'super_admin' ? 'Super Admin' : 'Worker'}
          </span>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Global Search Cmd+K Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted bg-surface-subtle hover:bg-slate-100 border border-border rounded-control transition-colors duration-150"
          aria-label="Search"
        >
          <Search className="w-3.5 h-3.5 text-text-subtle" />
          <span>Quick search...</span>
          <kbd className="text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border font-mono text-text-subtle">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationDrawerOpen(true)}
            className="relative p-2 rounded-control text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
            aria-label="Open notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-semantic-danger ring-2 ring-surface animate-pulse" />
            )}
          </button>
        </div>

        {/* User Profile Dropdown & Role Quick-Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-control hover:bg-surface-subtle transition-colors outline-none focus:ring-2 focus:ring-primary-600">
              <Avatar
                name={user?.name || 'User'}
                src={user?.avatar}
                size="sm"
                status="online"
              />
              <span className="hidden md:inline-block text-xs font-semibold text-text max-w-[120px] truncate">
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2  border-border">
              <p className="text-xs font-bold text-text truncate">{user?.name}</p>
              <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
              <div className="mt-1">
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-primary-100 text-primary-700">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Worker'}
                </span>
              </div>
            </div>

            {/* <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
              <UserIcon className="w-3.5 h-3.5 mr-2 text-primary-600" />
              <span>My Profile</span>
            </DropdownMenuItem> */}

            {/* <DropdownMenuSeparator /> */}

            {/* <DropdownMenuLabel>Switch Role (Instant Test)</DropdownMenuLabel> */}
            {/* <DropdownMenuItem
              onClick={async () => {
                await switchUser('user-1');
              }}
              className={user?.role === 'super_admin' ? 'font-bold text-primary-700' : ''}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-primary-600 mr-2" />
              <span>Super Admin (Velmurugan)</span>
            </DropdownMenuItem> */}
            {/* <DropdownMenuItem
              onClick={async () => {
                await switchUser('user-3');
                navigate('/tasks');
              }}
              className={user?.role === 'worker' ? 'font-bold text-primary-700' : ''}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 mr-2" />
              <span>Worker (Rahul Sharma)</span>
            </DropdownMenuItem> */}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} destructive>
              <LogOut className="w-3.5 h-3.5 mr-2" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      </div>
    </header>
  );
};
