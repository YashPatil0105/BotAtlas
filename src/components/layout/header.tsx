'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Search,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/bots': 'Bot Registry',
  '/dashboard/components': 'Component Catalog',
  '/dashboard/findings': 'Findings Board',
  '/dashboard/reuse': 'Reuse Explorer',
};

function getPageInfo(pathname: string): { title: string; breadcrumbs: { label: string; href: string }[] } {
  // Exact match
  if (PAGE_TITLES[pathname]) {
    const breadcrumbs = [];
    if (pathname !== '/dashboard') {
      breadcrumbs.push({ label: 'Dashboard', href: '/dashboard' });
    }
    breadcrumbs.push({ label: PAGE_TITLES[pathname], href: pathname });
    return { title: PAGE_TITLES[pathname], breadcrumbs };
  }

  // Bot detail page: /dashboard/bots/[id]
  if (/^\/dashboard\/bots\/.+$/.test(pathname)) {
    return {
      title: 'Bot Review',
      breadcrumbs: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Bot Registry', href: '/dashboard/bots' },
        { label: 'Bot Review', href: pathname },
      ],
    };
  }

  // Component detail page: /dashboard/components/[id]
  if (/^\/dashboard\/components\/.+$/.test(pathname)) {
    return {
      title: 'Component Detail',
      breadcrumbs: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Component Catalog', href: '/dashboard/components' },
        { label: 'Component Detail', href: pathname },
      ],
    };
  }

  // Fallback
  return {
    title: 'Dashboard',
    breadcrumbs: [{ label: 'Dashboard', href: '/dashboard' }],
  };
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  const { title, breadcrumbs } = useMemo(() => getPageInfo(pathname), [pathname]);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-card/50 backdrop-blur-md border-b border-border/50 z-20">
      {/* ── Left: Breadcrumbs & Title ────────────────── */}
      <div className="flex flex-col">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              <span
                className={cn(
                  idx === breadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : 'hover:text-foreground transition-colors cursor-default'
                )}
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </div>
        {/* Page Title */}
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          {title}
        </h1>
      </div>

      {/* ── Right: Search & User ─────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bots, findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-64 h-9 pl-9 pr-4 rounded-lg text-sm',
              'bg-background/50 border border-border/50',
              'text-foreground placeholder:text-muted-foreground/60',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
              'transition-all duration-200'
            )}
          />
        </div>

        {/* Notification Bell */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* User Info */}
        {session?.user && (
          <div className="flex items-center gap-3 pl-4 border-l border-border/50">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">
                {session.user.name}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {session.user.email}
              </span>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
              {session.user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
