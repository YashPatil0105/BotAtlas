'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Bot,
  Search,
  Component,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Settings,
  Users,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Bot Registry',
    href: '/dashboard/bots',
    icon: Bot,
  },
  {
    label: 'Server Overview',
    href: '/dashboard/servers',
    icon: Server,
  },
  {
    label: 'Governance Center',
    href: '/dashboard/governance',
    icon: ShieldCheck,
  },
  {
    label: 'Access Management',
    href: '/dashboard/access',
    icon: Users,
  },
  {
    label: 'Reuse Explorer',
    href: '/dashboard/reuse',
    icon: Search,
  },
  {
    label: 'Components',
    href: '/dashboard/components',
    icon: Component,
  },
  {
    label: 'Findings',
    href: '/dashboard/findings',
    icon: AlertTriangle,
  },
];

const ADMIN_NAV_ITEMS = [
  {
    label: 'Config',
    href: '/dashboard/config',
    icon: Settings,
  },
];

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'REVIEWER':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'VIEWER':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-card/80 backdrop-blur-xl border-r border-border/50 transition-all duration-300 ease-in-out z-30',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* ── Logo Section ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/50">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
          <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
          <div className="absolute inset-0 rounded-xl bg-blue-500/5 blur-sm" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-base font-bold tracking-tight text-foreground drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              BotAtlas
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              Automation Intelligence
            </span>
          </div>
        )}
      </div>

      {/* ── Collapse Toggle ──────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-40 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border/50 shadow-md hover:bg-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              {/* Active left border indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-500 rounded-r-full" />
              )}

              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  active
                    ? 'text-blue-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />

              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50">
                  <span className="text-xs font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
        {session?.user && (session.user as any).role === 'ADMIN' && ADMIN_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              {/* Active left border indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-500 rounded-r-full" />
              )}

              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  active
                    ? 'text-blue-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />

              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50">
                  <span className="text-xs font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom User Section ──────────────────────── */}
      <div className="border-t border-border/50 px-3 py-3">
        {session?.user && (
          <div
            className={cn(
              'flex items-center gap-3',
              collapsed ? 'justify-center' : ''
            )}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                {session.user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {session.user.name}
                </p>
                <span
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border',
                    getRoleBadgeColor(session.user.role)
                  )}
                >
                  {session.user.role}
                </span>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Collapsed logout */}
        {collapsed && session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center justify-center w-full mt-2 p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
