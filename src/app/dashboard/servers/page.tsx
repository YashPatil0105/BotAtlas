'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Server, User, Play, CheckCircle2, Clock, ShieldAlert, 
  Activity, RefreshCw, Layers, ArrowUpRight, Check, AlertCircle,
  Plus, Edit, Trash2, Settings, ShieldCheck, X, Bot as BotIcon
} from 'lucide-react';

interface RunningBot {
  id: string;
  botCode: string;
  name: string;
}

interface Session {
  id: string;
  serverId: string;
  sessionName: string;
  pamUserId: string;
  status: 'FREE' | 'BUSY' | 'OFFLINE';
  currentBotId: string | null;
  lastCheckInAt: string;
  lastReleasedAt: string | null;
  runningBot: RunningBot | null;
  deployedBots?: any[];
}

interface ServerData {
  id: string;
  name: string;
  ipAddress: string | null;
  maxBotCapacity: number;
  activeBotsCount: number;
  isActive: boolean;
  sessions: Session[];
  deployedBots?: any[];
}

interface LogEntry {
  id: string;
  botId: string;
  userId: string;
  serverId: string | null;
  sessionName: string | null;
  action: 'SUGGEST_REQUESTED' | 'CHECKOUT' | 'CHECKIN' | 'QUEUE_ENTER' | 'QUEUE_LEAVE_TIMEOUT' | 'ACCESS_DENIED';
  timestamp: string;
  details: string | null;
  bot: {
    botCode: string;
    name: string;
  };
  user: {
    name: string;
    email: string;
  };
}

export default function ServerOverviewPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const isAdmin = userRole === 'ADMIN';

  const [servers, setServers] = useState<ServerData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'monitor' | 'admin'>('monitor');

  // Server CRUD Form states
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerData | null>(null);
  const [serverName, setServerName] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [serverCapacity, setServerCapacity] = useState(10);
  const [serverIsActive, setServerIsActive] = useState(true);

  // Session CRUD Form states
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [targetServerIdForSession, setTargetServerIdForSession] = useState('');
  const [sessionNameInput, setSessionNameInput] = useState('');
  const [pamUserIdInput, setPamUserIdInput] = useState('');
  const [sessionStatusInput, setSessionStatusInput] = useState<'FREE' | 'BUSY' | 'OFFLINE'>('FREE');

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingServer ? `/api/servers/${editingServer.id}` : '/api/servers';
    const method = editingServer ? 'PUT' : 'POST';
    const body = {
      name: serverName,
      ipAddress: serverIp || null,
      maxBotCapacity: Number(serverCapacity),
      isActive: serverIsActive
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && (data.success || data.server)) {
        setServerModalOpen(false);
        setEditingServer(null);
        setServerName('');
        setServerIp('');
        setServerCapacity(10);
        setServerIsActive(true);
        fetchData();
      } else {
        alert(data.error || 'Failed to save server');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving server');
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this server? This will also delete all sessions and deployments mapped to this server.')) return;
    try {
      const res = await fetch(`/api/servers/${serverId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to delete server');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting server');
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingSession ? `/api/sessions/${editingSession.id}` : '/api/sessions';
    const method = editingSession ? 'PUT' : 'POST';
    const body: any = {
      sessionName: sessionNameInput,
      pamUserId: pamUserIdInput,
      status: sessionStatusInput
    };
    if (!editingSession) {
      body.serverId = targetServerIdForSession;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && (data.success || data.session)) {
        setSessionModalOpen(false);
        setEditingSession(null);
        setSessionNameInput('');
        setPamUserIdInput('');
        setSessionStatusInput('FREE');
        fetchData();
      } else {
        alert(data.error || 'Failed to save session');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to delete session');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting session');
    }
  };

  const openAddServer = () => {
    setEditingServer(null);
    setServerName('');
    setServerIp('');
    setServerCapacity(10);
    setServerIsActive(true);
    setServerModalOpen(true);
  };

  const openEditServer = (s: ServerData) => {
    setEditingServer(s);
    setServerName(s.name);
    setServerIp(s.ipAddress || '');
    setServerCapacity(s.maxBotCapacity);
    setServerIsActive(s.isActive);
    setServerModalOpen(true);
  };

  const openAddSession = (serverId: string) => {
    setEditingSession(null);
    setTargetServerIdForSession(serverId);
    setSessionNameInput('Session 1');
    setPamUserIdInput('');
    setSessionStatusInput('FREE');
    setSessionModalOpen(true);
  };

  const openEditSession = (s: Session) => {
    setEditingSession(s);
    setSessionNameInput(s.sessionName);
    setPamUserIdInput(s.pamUserId);
    setSessionStatusInput(s.status);
    setSessionModalOpen(true);
  };

  const fetchData = async () => {
    try {
      const [serversRes, logsRes] = await Promise.all([
        fetch('/api/servers'),
        fetch('/api/execution/activity')
      ]);
      const serversData = await serversRes.json();
      const logsData = await logsRes.json();

      setServers(serversData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching server overview data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 10 seconds for real-time status updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Helper to calculate statistics
  const totalServers = servers.length;
  const totalSessions = servers.reduce((acc, s) => acc + s.sessions.length, 0);
  const busySessions = servers.reduce(
    (acc, s) => acc + s.sessions.filter(sess => sess.status === 'BUSY').length, 0
  );
  const freeSessions = totalSessions - busySessions;

  const getLogIcon = (action: string) => {
    switch (action) {
      case 'CHECKOUT':
        return <Play className="h-3.5 w-3.5 text-amber-400" />;
      case 'CHECKIN':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case 'QUEUE_ENTER':
        return <Clock className="h-3.5 w-3.5 text-blue-400" />;
      case 'ACCESS_DENIED':
        return <ShieldAlert className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-cyan-400" />;
    }
  };

  const getLogColorClass = (action: string) => {
    switch (action) {
      case 'CHECKOUT':
        return 'border-amber-500/20 bg-amber-500/5 text-amber-300';
      case 'CHECKIN':
        return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300';
      case 'QUEUE_ENTER':
        return 'border-blue-500/20 bg-blue-500/5 text-blue-300';
      case 'ACCESS_DENIED':
        return 'border-red-500/20 bg-red-500/5 text-red-300';
      default:
        return 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-card rounded-md" />
          <div className="h-10 w-24 bg-card rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-xl border border-border/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-card rounded-xl border border-border/50" />
            ))}
          </div>
          <div className="h-[500px] bg-card rounded-xl border border-border/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Server & Session Status
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor live PAM sessions, active bot workloads, and execution histories.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-card border border-border hover:bg-white/5 disabled:opacity-50 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Sync Live'}
        </button>
      </div>

      {/* ── View Toggle Tabs (Admins Only) ────────────────── */}
      {isAdmin && (
        <div className="flex border-b border-border/30 gap-2 pb-px">
          <button
            onClick={() => setActiveView('monitor')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeView === 'monitor'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-4 w-4 inline-block mr-1.5 align-text-bottom" />
            Live Monitor
          </button>
          <button
            onClick={() => setActiveView('admin')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeView === 'admin'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4 inline-block mr-1.5 align-text-bottom" />
            Admin Console
          </button>
        </div>
      )}

      {activeView === 'monitor' ? (
        <div className="space-y-6">
          {/* ── KPI Cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur p-5 transition-all hover:border-border hover:shadow-lg group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">PAM Servers</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight text-blue-400">{totalServers}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <Server className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-transparent" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur p-5 transition-all hover:border-border hover:shadow-lg group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Sessions</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight text-indigo-400">{totalSessions}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Layers className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur p-5 transition-all hover:border-border hover:shadow-lg group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Busy Sessions</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight text-amber-400">{busySessions}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-transparent" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur p-5 transition-all hover:border-border hover:shadow-lg group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Idle/Free Sessions</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight text-emerald-400">{freeSessions}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent" />
            </div>
          </div>

          {/* ── Main Monitoring Grid ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Server Status Cards */}
            <div className="lg:col-span-2 space-y-6">
              {servers.length === 0 ? (
                <div className="rounded-xl border border-border/50 bg-card/85 p-12 text-center text-muted-foreground">
                  <Server className="h-10 w-10 mx-auto stroke-1 text-slate-600 mb-2" />
                  <p className="text-sm font-semibold">No servers registered.</p>
                  {isAdmin && (
                    <button
                      onClick={() => setActiveView('admin')}
                      className="mt-3 text-xs text-primary font-bold hover:underline"
                    >
                      Go to Admin Console to add servers.
                    </button>
                  )}
                </div>
              ) : (
                servers.map((server) => {
                  const capacityPercentage = Math.round((server.activeBotsCount / server.maxBotCapacity) * 100);

                  return (
                    <div 
                      key={server.id} 
                      className="rounded-xl border border-border/50 bg-card/85 backdrop-blur p-5 shadow-sm space-y-4"
                    >
                      {/* Server Summary Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <Server className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                              {server.name}
                              {server.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md">
                                  Offline
                                </span>
                              )}
                            </h3>
                            {server.ipAddress && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">{server.ipAddress}</p>
                            )}
                          </div>
                        </div>

                        {/* Governance Capacity Bar */}
                        <div className="flex flex-col items-end gap-1 min-w-[150px]">
                          <div className="flex justify-between w-full text-xs">
                            <span className="text-muted-foreground">Governance Capacity</span>
                            <span className="font-medium text-foreground">
                              {server.activeBotsCount} / {server.maxBotCapacity} Bots
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                capacityPercentage >= 90 ? 'bg-red-500' :
                                capacityPercentage >= 75 ? 'bg-amber-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${capacityPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Sessions Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {server.sessions.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic col-span-2 py-2">No active sessions configured.</p>
                        ) : (
                          server.sessions.map((session) => (
                            <div 
                              key={session.id} 
                              className={`relative overflow-hidden rounded-lg border p-4 transition-all ${
                                session.status === 'FREE' ? 'border-emerald-500/15 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04]' :
                                session.status === 'BUSY' ? 'border-amber-500/15 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]' :
                                'border-border/30 bg-muted/20'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{session.sessionName}</p>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                    <User className="h-3 w-3" />
                                    <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[11px]">{session.pamUserId}</span>
                                  </div>
                                </div>

                                {/* Status badge with glowing ring */}
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${
                                    session.status === 'FREE' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' :
                                    session.status === 'BUSY' ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]' :
                                    'bg-slate-500'
                                  }`} />
                                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                                    session.status === 'FREE' ? 'text-emerald-400' :
                                    session.status === 'BUSY' ? 'text-amber-400' :
                                    'text-slate-400'
                                  }`}>
                                    {session.status}
                                  </span>
                                </div>
                              </div>

                              {/* Display bot executing on this session */}
                              {session.status === 'BUSY' && session.runningBot && (
                                <div className="mt-3.5 pt-3.5 border-t border-border/40 flex flex-col gap-1.5">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                    Active Workload
                                  </span>
                                  <div className="flex items-center justify-between gap-2 bg-amber-500/5 border border-amber-500/10 rounded px-2.5 py-1.5">
                                    <div className="min-w-0">
                                      <span className="text-xs font-mono text-amber-400 font-semibold block">
                                        {session.runningBot.botCode}
                                      </span>
                                      <span className="text-xs text-foreground truncate block font-medium">
                                        {session.runningBot.name}
                                      </span>
                                    </div>
                                    <span className="flex-shrink-0 flex items-center justify-center p-1 rounded-md bg-amber-500/10 text-amber-400 animate-pulse">
                                      <Activity className="h-3.5 w-3.5" />
                                    </span>
                                  </div>
                                </div>
                              )}



                              {/* Last check in info */}
                              <p className="text-[10px] text-muted-foreground mt-3 text-right">
                                Last Active: {session.lastCheckInAt ? new Date(session.lastCheckInAt).toLocaleTimeString() : 'N/A'}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Display server-level mapped workloads */}
                      {server.deployedBots && server.deployedBots.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                              All Mapped Workloads
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                              {server.deployedBots.length} Bots
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {server.deployedBots.map((b: any, idx: number) => (
                              <div key={`${b.id}-${idx}`} className="flex items-center gap-2.5 bg-slate-500/5 hover:bg-slate-500/10 transition-colors border border-slate-500/15 rounded-lg px-3 py-2">
                                <span className="flex-shrink-0 flex items-center justify-center p-1.5 rounded-md bg-primary/10 text-primary">
                                  <BotIcon className="h-3.5 w-3.5" />
                                </span>
                                <div className="min-w-0 flex flex-col justify-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-slate-400 font-semibold leading-none">
                                      {b.botCode}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/70 bg-black/20 px-1 py-0.5 rounded leading-none">
                                      {b.sessionName}
                                    </span>
                                  </div>
                                  <span className="text-xs text-foreground font-medium truncate mt-1 leading-none" title={b.name}>
                                    {b.name}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Live Execution Log Activity Feed */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-border/50 bg-card/85 backdrop-blur p-5 shadow-sm h-full flex flex-col">
                <div className="border-b border-border/30 pb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                    Live Activity Feed
                  </h3>
                  <span className="inline-flex rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Last 50 Runs
                  </span>
                </div>

                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground flex-1">
                    <AlertCircle className="h-8 w-8 stroke-1 mb-2" />
                    <p className="text-sm">No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4 overflow-y-auto max-h-[620px] pr-1 pl-3 flex-1">
                    {logs.map((log) => (
                      <div key={log.id} className="relative pl-6 pb-4 border-l border-border/30 last:border-0 group">
                        {/* Circle icon marker */}
                        <div className={`absolute -left-3 top-0.5 flex items-center justify-center h-6 w-6 rounded-full border shadow-sm ${getLogColorClass(log.action)}`}>
                          {getLogIcon(log.action)}
                        </div>

                        {/* Timeline Event Details */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>

                          <div className="bg-muted/30 border border-border/40 rounded-md p-2 mt-1 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-mono text-primary font-semibold">
                                {log.bot?.botCode || 'BOT'}
                              </span>
                              <span className="text-xs text-foreground truncate max-w-[150px] font-medium">
                                {log.bot?.name || 'Unknown Bot'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {log.details}
                            </p>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                              <User className="h-2.5 w-2.5 text-slate-500" />
                              <span>{log.user?.name || 'System'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Admin Infrastructure CRUD Console ───────────────── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Infrastructure Configuration</h2>
            <button
              onClick={openAddServer}
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs py-2 px-3.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add PAM Server
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {servers.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/85 p-12 text-center text-muted-foreground">
                <Server className="h-10 w-10 mx-auto stroke-1 text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No servers configured in the system.</p>
                <button
                  onClick={openAddServer}
                  className="mt-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-1.5 px-3 rounded"
                >
                  Create Your First Server
                </button>
              </div>
            ) : (
              servers.map((server) => (
                <div key={server.id} className="rounded-xl border border-border/50 bg-card/85 p-5 shadow-sm space-y-4">
                  {/* Server Row Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/30 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        {server.name}
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
                          server.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {server.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{server.ipAddress || 'No IP address configured'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditServer(server)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                        title="Edit Server"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openAddSession(server.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add Session
                      </button>
                      <button
                        onClick={() => handleDeleteServer(server.id)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                        title="Delete Server"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Server Session List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Pools</h4>
                    {server.sessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-2">No active sessions configured on this server.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-border/30 bg-muted/20">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border/30 text-muted-foreground font-semibold">
                              <th className="p-2.5">Session / Account Name</th>
                              <th className="p-2.5">PAM User Login</th>
                              <th className="p-2.5">Current Status</th>
                              <th className="p-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20 text-foreground">
                            {server.sessions.map((session) => (
                              <tr key={session.id} className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-2.5 font-semibold">{session.sessionName}</td>
                                <td className="p-2.5 font-mono">{session.pamUserId}</td>
                                <td className="p-2.5">
                                  <span className={`inline-flex items-center gap-1.5 font-semibold text-[10px] uppercase ${
                                    session.status === 'FREE' ? 'text-emerald-400' :
                                    session.status === 'BUSY' ? 'text-amber-400' :
                                    'text-slate-400'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      session.status === 'FREE' ? 'bg-emerald-500 animate-pulse' :
                                      session.status === 'BUSY' ? 'bg-amber-500 animate-pulse' :
                                      'bg-slate-500'
                                    }`} />
                                    {session.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right space-x-1.5">
                                  <button
                                    onClick={() => openEditSession(session)}
                                    className="inline-flex items-center justify-center p-1 rounded hover:bg-white/5 text-slate-400 hover:text-foreground transition-colors cursor-pointer"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="inline-flex items-center justify-center p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Server Modal ────────────────────────────────────────── */}
      {serverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingServer ? 'Edit PAM Server' : 'Add New PAM Server'}
              </h3>
              <button
                onClick={() => setServerModalOpen(false)}
                className="p-1 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveServer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Server Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server 7"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  IP Address / Hostname
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.10.17"
                  value={serverIp}
                  onChange={(e) => setServerIp(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Max Bot Capacity *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={serverCapacity}
                  onChange={(e) => setServerCapacity(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="serverActive"
                  checked={serverIsActive}
                  onChange={(e) => setServerIsActive(e.target.checked)}
                  className="rounded bg-background border-border text-primary focus:ring-0 h-4 w-4"
                />
                <label htmlFor="serverActive" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer">
                  Server is Online / Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
                <button
                  type="button"
                  onClick={() => setServerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-white/5 transition-colors font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Session Modal ───────────────────────────────────────── */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingSession ? 'Edit PAM Session' : 'Add PAM Session'}
              </h3>
              <button
                onClick={() => setSessionModalOpen(false)}
                className="p-1 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Session / Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session 3"
                  value={sessionNameInput}
                  onChange={(e) => setSessionNameInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  PAM User Login / ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PAM_USR_3A"
                  value={pamUserIdInput}
                  onChange={(e) => setPamUserIdInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Initial Status
                </label>
                <select
                  value={sessionStatusInput}
                  onChange={(e) => setSessionStatusInput(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary border-slate-700"
                >
                  <option value="FREE">FREE (Idle)</option>
                  <option value="BUSY">BUSY (Running)</option>
                  <option value="OFFLINE">OFFLINE (Disabled)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-white/5 transition-colors font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
