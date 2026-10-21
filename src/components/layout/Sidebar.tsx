import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/config/nav';
import { useAuth } from '@/features/auth';
import { hasPermission } from '@/lib/permissions';
import { useUiStore } from '@/app/stores/useUiStore';
import { cn } from '@/lib/cn';
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Calendar,
  Wallet,
  Users,
  PhoneCall,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Calendar,
  Wallet,
  Users,
  PhoneCall,
  BarChart3,
  Settings,
};

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUiStore();

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (user?.role === 'worker') {
      return item.href === '/tasks';
    }
    if (!item.requiredPermission) return true;
    return hasPermission(user?.role, item.requiredPermission);
  });

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-surface border-r border-border select-none">
      {/* Brand header */}
      <div className="h-16 flex items-center px-4 border-b border-border justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src="/logo.svg" alt="Getup Logo" className="w-8 h-8 rounded-control shrink-0 shadow-sm" />
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-150">
              <span className="font-bold text-sm text-text leading-tight tracking-tight truncate">
                Getup Management
              </span>
              <span className="text-[11px] text-primary-600 font-medium tracking-wide truncate">
                Control Panel
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden text-text-muted hover:text-text p-1 rounded-control"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav items list */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive =
            item.href === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.href);

          const linkContent = (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-control text-xs font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm'
                  : 'text-text-muted hover:bg-surface-subtle hover:text-text',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary-600 rounded-r-pill" />
              )}
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-primary-600' : 'text-text-muted group-hover:text-text'
                )}
              />
              {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
              {!sidebarCollapsed && item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-pill">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );

          if (sidebarCollapsed) {
            return (
              <Tooltip key={item.href} content={item.title} side="right">
                {linkContent}
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Footer & collapse toggle button */}
      <div className="p-3 border-t border-border hidden md:flex items-center justify-between">
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-[11px] font-semibold text-text truncate">{user?.name}</span>
            <span className="text-[10px] text-text-muted capitalize truncate">{user?.role?.replace('_', ' ')}</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'p-1.5 rounded-control text-text-muted hover:text-text hover:bg-surface-subtle transition-colors',
            sidebarCollapsed && 'mx-auto'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:block shrink-0 transition-all duration-200 ease-in-out h-screen sticky top-0 z-30',
          sidebarCollapsed ? 'w-[72px]' : 'w-[248px]'
        )}
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Sidebar Sheet Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-[248px] h-full shadow-modal z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
};
