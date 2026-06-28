'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Search, Filter, X, Eye,
  ShieldAlert, Clock, CheckCircle2, AlertCircle,
  BarChart3, ArrowUpDown
} from 'lucide-react';

interface FindingRecord {
  id: string;
  botId: string;
  category: string;
  observation: string;
  evidence: string | null;
  impact: string | null;
  recommendation: string | null;
  priority: string;
  status: string;
  owner: string | null;
  dueDate: string | null;
  createdAt: string;
  bot: {
    id: string;
    name: string;
    botCode: string;
    vendor: string | null;
    department: string | null;
  };
}

interface FindingStats {
  total: number;
  open: number;
  inProgress: number;
  blocked: number;
  closed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  LOW: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  BLOCKED: 'bg-red-500/15 text-red-400 border-red-500/30',
  CLOSED: 'bg-green-500/15 text-green-400 border-green-500/30',
};

const CATEGORY_COLORS: Record<string, string> = {
  BUSINESS_LOGIC: '#3b82f6',
  ARCHITECTURE: '#8b5cf6',
  PERFORMANCE: '#f59e0b',
  MAINTAINABILITY: '#06b6d4',
  ERROR_HANDLING: '#ef4444',
  SECURITY: '#dc2626',
  GOVERNANCE: '#6366f1',
  DOCUMENTATION: '#14b8a6',
  DEPENDENCY: '#f97316',
  DATA: '#22c55e',
  SCHEDULING: '#64748b',
};

const FINDING_CATEGORIES = [
  'BUSINESS_LOGIC', 'ARCHITECTURE', 'PERFORMANCE', 'MAINTAINABILITY',
  'ERROR_HANDLING', 'SECURITY', 'GOVERNANCE', 'DOCUMENTATION',
  'DEPENDENCY', 'DATA', 'SCHEDULING'
];

function StatCard({ icon: Icon, label, value, color, subtext }: {
  icon: any; label: string; value: number | string; color: string; subtext?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1.5 tracking-tight" style={{ color }}>{value}</p>
          {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </div>
        <div className="p-2.5 rounded-lg transition-colors" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 transition-all group-hover:h-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </div>
  );
}

function CategoryBar({ data }: { data: CategoryBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Findings by Category
      </h3>
      <div className="space-y-2.5">
        {data.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          const color = CATEGORY_COLORS[item.category] || '#64748b';
          return (
            <div key={item.category} className="group/bar">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground group-hover/bar:text-foreground transition-colors">
                  {item.category.replace(/_/g, ' ')}
                </span>
                <span className="font-medium text-foreground">{item.count}</span>
              </div>
              <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FindingsBoardPage() {
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [stats, setStats] = useState<FindingStats | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFindings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

    fetch(`/api/findings?${params}`)
      .then(r => r.json())
      .then(data => {
        setFindings(data.findings || []);
        setStats(data.stats || null);
        setCategoryBreakdown(data.categoryBreakdown || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchFindings, 300);
    return () => clearTimeout(timer);
  }, [fetchFindings]);

  const updateFindingStatus = async (findingId: string, botId: string, newStatus: string) => {
    await fetch(`/api/bots/${botId}/findings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId, status: newStatus }),
    });
    fetchFindings();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={AlertTriangle} label="Total Findings" value={stats.total} color="#f59e0b" subtext={`${stats.open + stats.inProgress + stats.blocked} active`} />
          <StatCard icon={ShieldAlert} label="Critical" value={stats.critical} color="#ef4444" subtext={`${stats.high} high priority`} />
          <StatCard icon={Clock} label="Open" value={stats.open} color="#f59e0b" subtext={`${stats.inProgress} in progress`} />
          <StatCard icon={CheckCircle2} label="Closed" value={stats.closed} color="#22c55e" subtext={`${stats.blocked} blocked`} />
        </div>
      )}

      {/* Category Breakdown + Toolbar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" placeholder="Search findings by observation..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-card/80 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card/80 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <Filter className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur animate-fade-in">
              <select value={filters.status}
                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 bg-background border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Status: All</option>
                {['OPEN', 'IN_PROGRESS', 'BLOCKED', 'CLOSED'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select value={filters.category}
                onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 bg-background border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Category: All</option>
                {FINDING_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select value={filters.priority}
                onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 bg-background border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Priority: All</option>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Category Breakdown Sidebar */}
        <CategoryBar data={categoryBreakdown} />
      </div>

      {/* Findings Table */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['Category', 'Observation', 'Bot', 'Priority', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading findings...
                  </div>
                </td></tr>
              ) : findings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No findings match your criteria</p>
                  </div>
                </td></tr>
              ) : findings.map((finding) => (
                <tr key={finding.id} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[finding.category] || '#64748b'}15`,
                        color: CATEGORY_COLORS[finding.category] || '#64748b',
                      }}
                    >
                      {finding.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-sm">
                    <button
                      onClick={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
                      className="text-sm text-foreground hover:text-primary transition-colors text-left"
                    >
                      <span className={expandedId === finding.id ? '' : 'line-clamp-2'}>
                        {finding.observation}
                      </span>
                    </button>
                    {expandedId === finding.id && finding.impact && (
                      <p className="text-xs text-muted-foreground mt-1.5 animate-fade-in">
                        <span className="font-medium text-foreground/70">Impact:</span> {finding.impact}
                      </p>
                    )}
                    {expandedId === finding.id && finding.recommendation && (
                      <p className="text-xs text-muted-foreground mt-1 animate-fade-in">
                        <span className="font-medium text-foreground/70">Recommendation:</span> {finding.recommendation}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/bots/${finding.bot.id}`}
                      className="flex flex-col gap-0.5 hover:text-primary transition-colors"
                    >
                      <span className="font-mono text-xs text-primary">{finding.bot.botCode}</span>
                      <span className="text-sm text-foreground truncate max-w-[140px]">{finding.bot.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_STYLES[finding.priority] || ''}`}>
                      {finding.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={finding.status}
                      onChange={e => updateFindingStatus(finding.id, finding.botId, e.target.value)}
                      className={`text-xs font-medium rounded-md px-2 py-1 border-0 focus:outline-none cursor-pointer ${
                        finding.status === 'CLOSED' ? 'bg-green-500/15 text-green-400' :
                        finding.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-400' :
                        finding.status === 'BLOCKED' ? 'bg-red-500/15 text-red-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {['OPEN', 'IN_PROGRESS', 'BLOCKED', 'CLOSED'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/bots/${finding.bot.id}`}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/10 transition-all"
                      title="View Bot"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {findings.length > 0 && (
          <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            Showing {findings.length} findings
          </div>
        )}
      </div>
    </div>
  );
}
