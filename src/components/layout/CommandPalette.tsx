import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  ModalContent,
} from '@/components/ui/Modal';
import { useUiStore } from '@/app/stores/useUiStore';
import { useAuth } from '@/features/auth';
import { clientService } from '@/services';
import { Client } from '@/types';
import {
  Search,
  LayoutDashboard,
  Building2,
  CheckSquare,
  Wallet,
  Users,
  BarChart3,
  Settings,
  UserCheck,
  ArrowRight,
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const { user, switchUser } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      clientService.getClients().then(setClients);
      setQuery('');
    }
  }, [commandPaletteOpen]);

  const navActions = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Navigation' },
    { title: 'Clients Directory', href: '/clients', icon: Building2, group: 'Navigation' },
    { title: 'Task Board', href: '/tasks', icon: CheckSquare, group: 'Navigation' },
    { title: 'Finance & Payments', href: '/finance', icon: Wallet, group: 'Navigation', perm: 'finance.read' },
    { title: 'Team Workload', href: '/team', icon: Users, group: 'Navigation', perm: 'team.read' },
    { title: 'Agency Reports', href: '/reports', icon: BarChart3, group: 'Navigation', perm: 'reports.read' },
    { title: 'Agency Settings', href: '/settings', icon: Settings, group: 'Navigation', perm: 'settings.read' },
  ];

  const handleSelect = (action: () => void) => {
    action();
    setCommandPaletteOpen(false);
  };

  const filteredNav = navActions.filter((n) =>
    n.title.toLowerCase().includes(query.toLowerCase())
  );

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.business.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <ModalContent size="md" variant="center" className="p-0 overflow-hidden gap-0 border-border">
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-surface">
          <Search className="w-5 h-5 text-text-muted mr-3 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search clients, pages..."
            className="w-full bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-text-muted bg-surface-subtle border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40 text-xs">
          {/* Role Switching */}
          <div className="py-1">
            <span className="px-3 py-1 font-semibold text-text-subtle uppercase text-[10px] block">
              Test As Role
            </span>
            <button
              onClick={() => handleSelect(() => switchUser('user-1'))}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-control hover:bg-surface-subtle text-left ${
                user?.role === 'super_admin' ? 'bg-primary-50/60 font-semibold text-primary-700' : 'text-text'
              }`}
            >
              <UserCheck className="w-4 h-4 text-primary-600" />
              <span>Switch to Super Admin (Velmurugan)</span>
            </button>

            <button
              onClick={() => handleSelect(() => switchUser('user-3'))}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-control hover:bg-surface-subtle text-left ${
                user?.role === 'worker' ? 'bg-primary-50/60 font-semibold text-primary-700' : 'text-text'
              }`}
            >
              <UserCheck className="w-4 h-4 text-primary-600" />
              <span>Switch to Worker (Rahul Sharma)</span>
            </button>
          </div>

          {/* Navigation */}
          {filteredNav.length > 0 && (
            <div className="py-1">
              <span className="px-3 py-1 font-semibold text-text-subtle uppercase text-[10px] block">
                Pages
              </span>
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(() => navigate(item.href))}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-control hover:bg-surface-subtle text-text text-left transition-colors"
                  >
                    <Icon className="w-4 h-4 text-text-muted" />
                    <span className="font-medium flex-1">{item.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-subtle" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Clients */}
          {filteredClients.length > 0 && (
            <div className="py-1">
              <span className="px-3 py-1 font-semibold text-text-subtle uppercase text-[10px] block">
                Clients
              </span>
              {filteredClients.slice(0, 5).map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelect(() => navigate(`/clients/${client.id}`))}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-control hover:bg-surface-subtle text-text text-left transition-colors"
                >
                  <Building2 className="w-4 h-4 text-text-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    <p className="text-[11px] text-text-muted truncate">{client.business}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-text-muted">₹{client.monthlyFee.toLocaleString('en-IN')}/mo</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-surface-subtle/50 flex items-center justify-between text-[11px] text-text-muted">
          <span>Navigate with mouse or keyboard</span>
          <span>Getup Agency Control</span>
        </div>
      </ModalContent>
    </Modal>
  );
};
