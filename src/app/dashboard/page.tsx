'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bot, AlertTriangle, CheckCircle2, Clock, XCircle,
  FileWarning, Users, ShieldAlert, TrendingUp, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardStats {
  totalBots: number;
  statusCounts: Record<string, number>;
  reviewStatusCounts: Record<string, number>;
  criticalityCounts: Record<string, number>;
  recommendationCounts: Record<string, number>;
  openFindings: number;
  criticalFindings: number;
  botsWithoutOwner: number;
  botsWithoutDocs: number;
  topRootCauses: { category: string; _count: number }[];
  topVendorFindings: { vendor: string; count: number }[];
  recentActivity: { id: string; name: string; botCode: string; updatedAt: string; reviewStatus: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e',
  FAILED: '#ef4444',
  INACTIVE: '#f59e0b',
  OBSOLETE: '#6b7280',
  RETIRED: '#8b5cf6',
  UNKNOWN: '#64748b',
};

const REVIEW_COLORS: Record<string, string> = {
  NOT_STARTED: '#64748b',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#22c55e',
  AWAITING_VALIDATION: '#f59e0b',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-popover/90 backdrop-blur-md border border-border px-3 py-2 rounded-lg shadow-xl text-xs">
        <span className="font-semibold text-foreground block">
          {data.name || data.payload?.name}
        </span>
        <span className="text-muted-foreground mt-0.5 block">
          Value: <span className="font-mono text-foreground font-semibold">{data.value}</span>
        </span>
      </div>
    );
  }
  return null;
};

function StatCard({ icon: Icon, label, value, color, subtext }: {
  icon: any; label: string; value: number | string; color: string; subtext?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5 animate-fade-in group">
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

function MiniTable({ title, items, emptyText }: { title: string; items: { label: string; value: number }[]; emptyText: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{item.label.replace(/_/g, ' ')}</span>
              <span className="text-sm font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded-md">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'all' | 'my'>('all');

  useEffect(() => {
    setLoading(true);
    const query = scope === 'my' ? '?scope=my' : '';
    fetch(`/api/dashboard/stats${query}`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [scope]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/80 p-5 h-[104px]" />
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 h-[322px]" />
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 h-[322px]" />
        </div>

        {/* Info Tables Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 h-[200px]" />
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 h-[200px]" />
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 h-[200px]" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground py-12">Failed to load dashboard data.</div>;
  }

  const statusData = Object.entries(stats.statusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '), value, fill: STATUS_COLORS[name] || '#64748b'
  }));

  const reviewData = Object.entries(stats.reviewStatusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '), value, fill: REVIEW_COLORS[name] || '#64748b'
  }));

  const reviewed = stats.reviewStatusCounts['COMPLETED'] || 0;
  const reviewPct = stats.totalBots > 0 ? Math.round((reviewed / stats.totalBots) * 100) : 0;

  const rootCauseData = stats.topRootCauses.map(r => ({
    label: r.category.replace(/_/g, ' '),
    value: r._count
  }));

  const vendorData = stats.topVendorFindings.map(v => ({
    label: v.vendor || 'Unknown',
    value: v.count
  }));
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Scope Toggles for Admins */}
      {userRole === 'ADMIN' && (
        <div className="flex justify-end">
          <div className="inline-flex rounded-xl bg-card border border-border/50 p-1 shadow-sm">
            <button
              onClick={() => setScope('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scope === 'all'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Registry Bots
            </button>
            <button
              onClick={() => setScope('my')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scope === 'my'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Assignments
            </button>
          </div>
        </div>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bot} label="Total Bots" value={stats.totalBots} color="#3b82f6" subtext="In registry" />
        <StatCard icon={CheckCircle2} label="Reviewed" value={`${reviewPct}%`} color="#22c55e" subtext={`${reviewed} of ${stats.totalBots} bots`} />
        <StatCard icon={AlertTriangle} label="Open Findings" value={stats.openFindings} color="#f59e0b" subtext={`${stats.criticalFindings} critical`} />
        <StatCard icon={ShieldAlert} label="Missing Owner" value={stats.botsWithoutOwner} color="#ef4444" subtext="Need assignment" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Bot Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Review Progress</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={reviewData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis type="number" stroke="#666" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#666" fontSize={11} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {reviewData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MiniTable title="Top Root Causes" items={rootCauseData} emptyText="No root causes recorded" />
        <MiniTable title="Vendor-wise Findings" items={vendorData} emptyText="No vendor findings" />

        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {stats.recentActivity.slice(0, 6).map((bot) => (
                <a key={bot.id} href={`/dashboard/bots/${bot.id}`}
                  className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 hover:bg-white/5 rounded px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-primary">{bot.botCode}</span>
                    <span className="text-sm text-foreground truncate">{bot.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    bot.reviewStatus === 'COMPLETED' ? 'bg-green-500/15 text-green-400' :
                    bot.reviewStatus === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-slate-500/15 text-slate-400'
                  }`}>{bot.reviewStatus.replace(/_/g, ' ')}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={FileWarning} label="No Documentation" value={stats.botsWithoutDocs} color="#f97316" />
        <StatCard icon={XCircle} label="Failed Bots" value={stats.statusCounts['FAILED'] || 0} color="#ef4444" />
        <StatCard icon={Clock} label="Not Started" value={stats.reviewStatusCounts['NOT_STARTED'] || 0} color="#64748b" />
        <StatCard icon={Activity} label="Active Bots" value={stats.statusCounts['ACTIVE'] || 0} color="#22c55e" />
      </div>
    </div>
  );
}
