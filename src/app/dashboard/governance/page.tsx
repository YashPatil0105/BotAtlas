'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ShieldAlert, ShieldCheck, Check, X, AlertTriangle, Info,
  Server, Bot, Layers, Send, HelpCircle, History, Clock 
} from 'lucide-react';

interface BotOption {
  id: string;
  botCode: string;
  name: string;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ServerOption {
  id: string;
  name: string;
  maxBotCapacity: number;
  activeBotsCount: number;
  sessions?: { id: string; sessionName: string; status?: string }[];
}

interface CheckedRuleDetail {
  pass: boolean;
  detail: string;
}

interface CheckedRules {
  replicationLimit: CheckedRuleDetail;
  serverCapacity: CheckedRuleDetail;
  namingStandard: CheckedRuleDetail;
}

interface RequestDetail {
  id: string;
  botId: string;
  targetServerId: string;
  targetSessionName: string;
  developerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approverId: string | null;
  checkedRules: CheckedRules | string;
  failedRuleFlagged: string | null;
  notes: string | null;
  createdAt: string;
  bot: {
    botCode: string;
    name: string;
    criticality: string;
  };
  server: {
    name: string;
  };
  developer: {
    name: string;
    email: string;
  };
  approver?: {
    name: string;
  } | null;
}

export default function GovernanceCenterPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const isReviewerOrAdmin = userRole === 'ADMIN' || userRole === 'REVIEWER';

  const [requestMode, setRequestMode] = useState(false);

  useEffect(() => {
    if (userRole !== 'ADMIN') {
      setRequestMode(true);
    } else {
      setRequestMode(false);
    }
  }, [userRole]);

  const [bots, setBots] = useState<BotOption[]>([]);
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [requests, setRequests] = useState<RequestDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedBotId, setSelectedBotId] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [sessionName, setSessionName] = useState('Session 1');
  const [scheduleMode, setScheduleMode] = useState('manual');
  const [schedule, setSchedule] = useState('');
  const [notes, setNotes] = useState('Justification: Deploying this bot to PAM session to execute monthly automation reconciliations.');
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string; action?: { text: string; link: string } } | null>(null);

  // Resolution states
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingAction, setResolvingAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const fetchBotsAndServers = async () => {
    try {
      const [botsRes, serversRes] = await Promise.all([
        fetch('/api/bots?limit=100'),
        fetch('/api/servers')
      ]);
      const botsData = await botsRes.json();
      const serversData = await serversRes.json();

      const loadedBots = botsData.bots || botsData || [];
      const loadedServers = serversData || [];

      setBots(loadedBots);
      setServers(loadedServers);

      // Pre-select first options if available to populate demo data
      if (loadedBots.length > 0) {
        setSelectedBotId(loadedBots[0].id);
      }
      if (loadedServers.length > 0) {
        setSelectedServerId(loadedServers[0].id);
        const serverSessions = loadedServers[0].sessions || [];
        if (serverSessions.length > 0) {
          setSessionName(serverSessions[0].sessionName);
        } else {
          setSessionName('');
        }
      }
    } catch (e) {
      console.error('Error fetching dropdown choices:', e);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/governance/requests');
      const data = await res.json();
      setRequests(data || []);
    } catch (e) {
      console.error('Error fetching governance requests:', e);
    }
  };

  // Intelligent Suggestion Logic
  const suggestedServerId = useMemo(() => {
    if (!servers || servers.length === 0) return null;
    
    // Sort servers by utilization (active / max)
    const sorted = [...servers].sort((a, b) => {
      const aUtil = a.maxBotCapacity > 0 ? (a.activeBotsCount / a.maxBotCapacity) : 1;
      const bUtil = b.maxBotCapacity > 0 ? (b.activeBotsCount / b.maxBotCapacity) : 1;
      return aUtil - bUtil; // Lowest utilization first
    });
    
    return sorted[0]?.id || null;
  }, [servers, selectedBotId]);

  // Auto-select suggested server when bot changes
  useEffect(() => {
    if (suggestedServerId && (!selectedServerId || servers.find(s => s.id === suggestedServerId))) {
      setSelectedServerId(suggestedServerId);
      const srv = servers.find(s => s.id === suggestedServerId);
      if (srv && srv.sessions && srv.sessions.length > 0) {
        // Find a FREE session if possible, else the first one
        const freeSession = srv.sessions.find(s => s.status === 'FREE');
        setSessionName(freeSession ? freeSession.sessionName : srv.sessions[0].sessionName);
      }
    }
  }, [selectedBotId, suggestedServerId]);

  // Sync schedule text box
  useEffect(() => {
    if (scheduleMode === 'manual') setSchedule('');
    else if (scheduleMode === 'hourly') setSchedule('0 * * * *');
    else if (scheduleMode === 'daily') setSchedule('0 0 * * *');
    else if (scheduleMode === 'weekly') setSchedule('0 0 * * 0');
  }, [scheduleMode]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchBotsAndServers(), fetchRequests()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId || !selectedServerId || !sessionName) return;

    setSubmitting(true);
    setSubmitFeedback(null);

    try {
      const finalNotes = schedule ? `[SCHEDULE: ${schedule}] ${notes}` : notes;
      const res = await fetch('/api/governance/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: selectedBotId,
          targetServerId: selectedServerId,
          targetSessionName: sessionName,
          notes: finalNotes,
        })
      });

      const data = await res.json();

      if (data.success) {
        if (data.status === 'APPROVED') {
          setSubmitFeedback({
            type: 'success',
            message: 'Auto-approved! Bot metadata successfully matches standards and complies with replication capacities. Deployed immediately.'
          });
        } else {
          setSubmitFeedback({
            type: 'warning',
            message: `Re-routed for Review: The requested deployment failed automated checks (${data.request.failedRuleFlagged?.replace(/_/g, ' ')}). Routed to Reviewer inbox.`
          });
        }
        // Reset form
        setSelectedBotId('');
        setSelectedServerId('');
        setSessionName('Session 1');
        setNotes('');
        fetchRequests();
      } else {
        const isDocsError = data.error?.includes('documents must be uploaded first');
        setSubmitFeedback({ 
          type: 'error', 
          message: data.error || 'Failed to submit deployment request.',
          ...(isDocsError && { action: { text: 'Go to Document Upload', link: `/dashboard/bots/${selectedBotId}` } })
        });
      }
    } catch (err: any) {
      setSubmitFeedback({ type: 'error', message: err.message || 'Server error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (reqId: string, action: 'APPROVE' | 'REJECT') => {
    setResolvingId(reqId);
    setResolvingAction(action);
  };

  const submitResolve = async (reqId: string) => {
    if (!resolvingAction) return;

    try {
      const res = await fetch(`/api/governance/requests/${reqId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: resolvingAction,
          notes: resolutionNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setResolvingId(null);
        setResolutionNotes('');
        setResolvingAction(null);
        fetchRequests();
      } else {
        alert(data.error || 'Failed to resolve request');
      }
    } catch (e) {
      console.error(e);
      alert('Network error resolving request');
    }
  };

  const getRuleDetails = (rules: CheckedRules | string) => {
    if (typeof rules === 'string') {
      try {
        return JSON.parse(rules) as CheckedRules;
      } catch {
        return null;
      }
    }
    return rules;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-card rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[400px] bg-card rounded-xl border border-border/50 lg:col-span-1" />
          <div className="h-[600px] bg-card rounded-xl border border-border/50 lg:col-span-2" />
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
            Deployment Governance Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit bot deployments, evaluate replication caps, and manage manual override approvals.
          </p>
        </div>
        {userRole === 'ADMIN' && (
          <button
            onClick={() => setRequestMode(!requestMode)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-card border border-border hover:bg-white/5 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            {requestMode ? 'View Approvals Inbox' : 'Direct Deployment'}
          </button>
        )}
      </div>

      {/* ── Layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Config Policy Info */}
        {requestMode && (
          <div className="lg:col-span-1 space-y-6">
          {/* Submit Deployment Form */}
          <div className="rounded-xl border border-border/50 bg-card/85 backdrop-blur p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
              <Send className="h-4 w-4 text-primary" />
              {userRole === 'ADMIN' ? 'Direct Deployment (Admin)' : 'Request Deployment'}
            </h3>

            <form onSubmit={handleDeploySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Select Bot to Deploy
                </label>
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Bot --</option>
                  {bots.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.botCode}] {b.name} ({b.criticality})
                    </option>
                  ))}
                </select>
                {(() => {
                  const selectedBot = bots.find(b => b.id === selectedBotId);
                  if (!selectedBot) return null;
                  let limit = 1;
                  if (selectedBot.criticality === 'CRITICAL') limit = 3;
                  else if (selectedBot.criticality === 'HIGH') limit = 2;
                  return (
                    <div className="text-[10px] bg-primary/10 text-primary px-2 py-1.5 rounded mt-2 border border-primary/20">
                      <span className="font-semibold">Replication Rule:</span> This {selectedBot.criticality} bot can be deployed to a maximum of {limit} server(s).
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Target Server
                </label>
                <select
                  value={selectedServerId}
                  onChange={(e) => {
                    setSelectedServerId(e.target.value);
                    const selectedSrv = servers.find(s => s.id === e.target.value);
                    if (selectedSrv && selectedSrv.sessions && selectedSrv.sessions.length > 0) {
                      setSessionName(selectedSrv.sessions[0].sessionName);
                    } else {
                      setSessionName('');
                    }
                  }}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Server --</option>
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Capacity: {s.activeBotsCount}/{s.maxBotCapacity}) {s.id === suggestedServerId ? '⭐ Recommended' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Target Session ID / Account
                </label>
                <select
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="" disabled>-- Choose Session --</option>
                  {(() => {
                    const srv = servers.find(s => s.id === selectedServerId);
                    if (!srv || !srv.sessions || srv.sessions.length === 0) {
                      return <option value="" disabled>No sessions on this server</option>;
                    }
                    // Sort sessions so FREE ones are at the top (recommended)
                    const sortedSessions = [...srv.sessions].sort((a, b) => {
                      if (a.status === 'FREE' && b.status !== 'FREE') return -1;
                      if (a.status !== 'FREE' && b.status === 'FREE') return 1;
                      return 0;
                    });
                    
                    return sortedSessions.map((sess) => (
                      <option key={sess.id} value={sess.sessionName}>
                        {sess.sessionName} {sess.status === 'FREE' ? '⭐ Recommended (Free)' : `(${sess.status})`}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Run Schedule Frequency
                </label>
                <select
                  value={scheduleMode}
                  onChange={(e) => setScheduleMode(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary mb-2"
                >
                  <option value="manual">Manual / API Trigger</option>
                  <option value="hourly">Hourly (0 * * * *)</option>
                  <option value="daily">Daily at Midnight (0 0 * * *)</option>
                  <option value="weekly">Weekly on Sunday (0 0 * * 0)</option>
                  <option value="custom">Custom Cron Expression</option>
                </select>
                
                {scheduleMode === 'custom' && (
                  <input
                    type="text"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="e.g. 0 0 * * *"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary mb-4"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Deployment Justification / Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Explain why this bot is being deployed to this server/session..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {submitFeedback && (
                <div className={`p-3.5 rounded-lg border text-xs leading-relaxed flex gap-2.5 items-start ${
                  submitFeedback.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' :
                  submitFeedback.type === 'warning' ? 'border-amber-500/20 bg-amber-500/5 text-amber-300' :
                  'border-red-500/20 bg-red-500/5 text-red-300'
                }`}>
                  {submitFeedback.type === 'success' && <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                  {submitFeedback.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                  {submitFeedback.type === 'error' && <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0" />}
                  <div>
                    <p>{submitFeedback.message}</p>
                    {submitFeedback.action && (
                      <Link href={submitFeedback.action.link} className="inline-block mt-1.5 underline underline-offset-2 font-semibold text-red-300 hover:text-red-200 transition-colors">
                        {submitFeedback.action.text} &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm py-2 px-4 rounded-lg shadow transition-colors disabled:opacity-50"
              >
                {submitting ? 'Running Governance Checks...' : 'Submit to Governance'}
              </button>
            </form>
          </div>

          {/* Replication Policy Box */}
          <div className="rounded-xl border border-border/50 bg-card/85 backdrop-blur p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3 mb-3">
              <Layers className="h-4 w-4 text-indigo-400" />
              Replication Policies
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              To minimize configuration drift and security overheads, bots are capped on how many servers they can reside on based on their Criticality Tier.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                <span className="text-xs font-semibold text-red-400">Tier 1: CRITICAL</span>
                <span className="text-xs font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-foreground">
                  Max 3 Approved Servers
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                <span className="text-xs font-semibold text-amber-400">Tier 2: HIGH</span>
                <span className="text-xs font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-foreground">
                  Max 2 Approved Servers
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 last:border-b-0">
                <span className="text-xs font-semibold text-blue-400">Tier 3: MEDIUM / LOW</span>
                <span className="text-xs font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-foreground">
                  Max 1 Approved Server
                </span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg text-[11px] text-muted-foreground flex gap-2 items-start">
              <Info className="h-4.5 w-4.5 text-slate-400 flex-shrink-0" />
              <p>Deployments exceeding these caps bypass auto-approval and are routed to manual review requiring justification.</p>
            </div>
          </div>
        </div>
        )}

        {/* Right Column: Approvals Inbox & History */}
        <div className={requestMode ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
          <div className="rounded-xl border border-border/50 bg-card/85 backdrop-blur p-5 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center border-b border-border/30 pb-3 mb-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" />
                Governance Requests Inbox
              </h3>
              {isReviewerOrAdmin && requests.some(r => r.status === 'PENDING') && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedRequests.length > 0 && selectedRequests.length === requests.filter(r => r.status === 'PENDING').length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRequests(requests.filter(r => r.status === 'PENDING').map(r => r.id));
                        } else {
                          setSelectedRequests([]);
                        }
                      }}
                    />
                    Select All
                  </label>
                  <button
                    disabled={selectedRequests.length === 0}
                    onClick={async () => {
                      const reqsToApprove = requests.filter(r => r.status === 'PENDING' && selectedRequests.includes(r.id));
                      if (reqsToApprove.length === 0) return;
                      if (window.confirm(`Are you sure you want to approve ${reqsToApprove.length} selected requests?`)) {
                        try {
                          for (const req of reqsToApprove) {
                            await fetch(`/api/governance/requests/${req.id}/resolve`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'APPROVE', notes: 'Bulk approved by reviewer.' })
                            });
                          }
                          setSelectedRequests([]);
                          fetchRequests();
                        } catch (e) {
                          alert("Error during bulk approval.");
                        }
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/20 rounded-md text-xs font-semibold transition-all"
                  >
                    Bulk Approve Selected
                  </button>
                </div>
              )}
            </div>

            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground flex-1">
                <HelpCircle className="h-10 w-10 stroke-1 mb-2 text-slate-600" />
                <p className="text-sm">No deployment requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                {requests.map((req) => {
                  const rules = getRuleDetails(req.checkedRules);
                  const isPending = req.status === 'PENDING';

                  return (
                    <div 
                      key={req.id} 
                      className={`rounded-lg border p-4 transition-all hover:bg-white/[0.01] ${
                        req.status === 'APPROVED' ? 'border-emerald-500/10 bg-emerald-500/[0.01]' :
                        req.status === 'REJECTED' ? 'border-red-500/10 bg-red-500/[0.01]' :
                        'border-amber-500/20 bg-amber-500/[0.02]'
                      }`}
                    >
                      {/* Submitter & Server info */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-border/30 pb-3">
                        <div className="flex items-start gap-3">
                          {isPending && isReviewerOrAdmin && (
                            <input 
                              type="checkbox" 
                              checked={selectedRequests.includes(req.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRequests(prev => [...prev, req.id]);
                                } else {
                                  setSelectedRequests(prev => prev.filter(id => id !== req.id));
                                }
                              }}
                              className="mt-1"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-primary font-bold">{req.bot?.botCode || 'UNKNOWN'}</span>
                            <span className="text-sm font-semibold text-foreground">{req.bot?.name || 'Deleted Bot'}</span>
                            {req.bot && (
                              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                req.bot.criticality === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                req.bot.criticality === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {req.bot.criticality}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            Deploying to <span className="font-semibold text-foreground">{req.server?.name || 'Deleted Server'}</span>, session <span className="font-semibold text-foreground">{req.targetSessionName}</span>
                          </p>
                        </div>
                        </div>

                        {/* Status Label */}
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          req.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400' :
                          req.status === 'REJECTED' ? 'bg-red-500/15 text-red-400' :
                          'bg-amber-500/15 text-amber-400 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Checked rules checklist details */}
                      {rules && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3.5 bg-muted/40 p-3 rounded-lg border border-border/30">
                          {/* Rule 1: Replication Cap */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {rules.replicationLimit.pass ? (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                              )}
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Replication Limit
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {rules.replicationLimit.detail}
                            </p>
                          </div>

                          {/* Rule 2: Server Capacity */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {rules.serverCapacity.pass ? (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                              )}
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Server Capacity
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {rules.serverCapacity.detail}
                            </p>
                          </div>

                          {/* Rule 3: Naming Standard */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {rules.namingStandard.pass ? (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                              )}
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Naming Standards
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {rules.namingStandard.detail}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Developer metadata */}
                      <div className="flex justify-between items-center text-xs text-muted-foreground mt-3">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">Requested by:</span>
                          <span>{req.developer?.name || 'Unknown User'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-xs bg-white/[0.01] border-l border-primary/30 p-2 rounded mt-3 text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Justification:</strong> {req.notes}
                        </p>
                      )}

                      {/* Approval/Rejection details */}
                      {req.approver && (
                        <div className="bg-muted/30 border border-border rounded-md px-3 py-2 mt-3.5 flex justify-between items-center text-xs text-muted-foreground">
                          <div>
                            <strong className="text-foreground">Reviewer Decision:</strong> {req.status === 'APPROVED' ? 'Approved Override' : 'Rejected'}
                          </div>
                          <div>
                            Reviewed by: <span className="font-semibold text-foreground">{req.approver.name}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Panel for REVIEWER / ADMIN */}
                      {isPending && isReviewerOrAdmin && (
                        <div className="mt-4 pt-3.5 border-t border-border/30 flex flex-col gap-3">
                          {resolvingId === req.id ? (
                            <div className="space-y-3 bg-muted/30 p-3 rounded border border-border/50">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Review Decision Notes / Comments
                              </label>
                              <textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                rows={2}
                                required
                                placeholder={`Enter reasoning for ${resolvingAction?.toLowerCase()}ing this request...`}
                                className="w-full bg-background border border-border rounded p-2 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setResolvingId(null)}
                                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => submitResolve(req.id)}
                                  className={`px-3 py-1 rounded text-xs font-semibold shadow transition-colors ${
                                    resolvingAction === 'APPROVE' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                                  }`}
                                >
                                  Confirm {resolvingAction === 'APPROVE' ? 'Approve Override' : 'Reject'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleResolve(req.id, 'REJECT')}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-md transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject Request
                              </button>
                              <button
                                onClick={() => handleResolve(req.id, 'APPROVE')}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve Override
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
