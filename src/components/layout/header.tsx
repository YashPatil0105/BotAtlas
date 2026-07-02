'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Search,
  Bell,
  ChevronRight,
  Bot,
  AlertTriangle,
  Puzzle,
  Sun,
  Moon,
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
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<'light'|'dark'>('dark');

  const { title, breadcrumbs } = useMemo(() => getPageInfo(pathname), [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch (e) {
        console.error("Search failed:", e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (href: string) => {
    setShowResults(false);
    setSearchQuery('');
    router.push(href);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // poll every 30s
      return () => clearInterval(interval);
    }
  }, [session]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'POST' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      }
      if (notif.link) {
        setShowNotifications(false);
        router.push(notif.link);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  };

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
        <div className="relative group" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search bots, findings..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if(e.target.value) setShowResults(true);
            }}
            onFocus={() => {
              if (searchQuery) setShowResults(true);
            }}
            className={cn(
              'w-64 h-9 pl-9 pr-12 rounded-lg text-sm',
              'bg-background/50 border border-border/50',
              'text-foreground placeholder:text-muted-foreground/60',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
              'transition-all duration-200'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none opacity-60 group-focus-within:opacity-0 transition-opacity">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 bg-muted/50 text-[10px] font-medium font-sans text-muted-foreground">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </div>

          {/* Search Dropdown */}
          {showResults && searchResults && (
            <div className="absolute top-full mt-2 right-0 w-80 max-h-[80vh] overflow-y-auto bg-card border border-border/50 rounded-xl shadow-2xl z-50">
              <div className="p-2 space-y-3">
                {searchResults.bots?.length > 0 && (
                  <div>
                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bots</h3>
                    {searchResults.bots.slice(0, 4).map((b: any) => (
                      <button key={b.id} onClick={() => handleResultClick(`/dashboard/bots/${b.id}`)}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/5 text-sm transition-colors flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-foreground font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{b.botCode}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchResults.findings?.length > 0 && (
                  <div>
                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Findings</h3>
                    {searchResults.findings.slice(0, 3).map((f: any) => (
                      <button key={f.id} onClick={() => handleResultClick(`/dashboard/findings`)}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/5 text-sm transition-colors flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-foreground">{f.observation}</p>
                          <p className="text-xs text-muted-foreground">Bot: {f.bot?.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.components?.length > 0 && (
                  <div>
                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Components</h3>
                    {searchResults.components.slice(0, 3).map((c: any) => (
                      <button key={c.id} onClick={() => handleResultClick(`/dashboard/components/${c.id}`)}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/5 text-sm transition-colors flex items-center gap-2">
                        <Puzzle className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.componentType}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {(!searchResults.bots?.length && !searchResults.findings?.length && !searchResults.components?.length && !searchResults.steps?.length) && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No results found for "{searchQuery}"</div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={toggleNotifications} className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Bell className="w-4 h-4" />
            {notifications.some(n => !n.isRead) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-full mt-2 right-0 w-80 max-h-[80vh] overflow-y-auto bg-card border border-border/50 rounded-xl shadow-2xl z-50">
              <div className="p-3 border-b border-border/50 flex justify-between items-center bg-muted/20">
                <h3 className="text-sm font-semibold">Notifications</h3>
              </div>
              <div className="p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No recent activity</div>
                ) : (
                  notifications.map((n: any) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors border-l-2",
                        n.isRead ? "border-transparent hover:bg-white/5 opacity-70" : "border-blue-500 bg-blue-500/5 hover:bg-blue-500/10"
                      )}
                    >
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <div className="text-[9px] text-muted-foreground mt-2 text-right">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
