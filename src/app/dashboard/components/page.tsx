'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Plus, Search, Filter, X, Eye, Component as ComponentIcon,
  Package, Code2, GitBranch, CheckCircle2, AlertTriangle,
  Archive, Layers
} from 'lucide-react';

interface ComponentRecord {
  id: string;
  componentCode: string;
  name: string;
  componentType: string;
  description: string | null;
  canonicalSignature: string | null;
  sourceBotId: string | null;
  sourceLocation: string | null;
  owner: string | null;
  version: string;
  status: string;
  securityReviewed: boolean;
  usageCount: number;
  tags: string[];
  knownLimitations: string | null;
  createdAt: string;
  updatedAt: string;
  sourceBot: {
    id: string;
    name: string;
    botCode: string;
  } | null;
  _count: {
    stepMaps: number;
  };
}

const STATUS_CONFIG: Record<string, { style: string; icon: any; label: string }> = {
  CANDIDATE: {
    style: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: AlertTriangle,
    label: 'Candidate',
  },
  APPROVED: {
    style: 'bg-green-500/15 text-green-400 border-green-500/30',
    icon: CheckCircle2,
    label: 'Approved',
  },
  NEEDS_REFACTOR: {
    style: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: Code2,
    label: 'Needs Refactor',
  },
  DEPRECATED: {
    style: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: Archive,
    label: 'Deprecated',
  },
};

const COMPONENT_TYPES = [
  'Login Module', 'File Handler', 'Data Extractor', 'SFTP Transfer',
  'Email Notifier', 'Error Handler', 'Retry Mechanism', 'Data Transformer',
  'API Connector', 'Report Generator', 'Validation Module', 'Browser Automation',
  'Database Connector', 'Queue Handler', 'Scheduler', 'Other'
];

export default function ComponentCatalogPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const [components, setComponents] = useState<ComponentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newComponent, setNewComponent] = useState({
    name: '',
    componentType: 'Other',
    description: '',
    owner: '',
    status: 'CANDIDATE',
    tags: '',
    knownLimitations: '',
  });

  // Discovery & Tab states
  const [activeMainTab, setActiveMainTab] = useState<'catalog' | 'discovery'>('catalog');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const fetchComponents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/components?${params}`)
      .then(r => r.json())
      .then(data => {
        setComponents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, statusFilter]);

  const fetchCandidates = useCallback(() => {
    setCandidatesLoading(true);
    fetch('/api/components/discover')
      .then(r => r.json())
      .then(data => {
        setCandidates(data.candidates || []);
        setCandidatesLoading(false);
      })
      .catch(() => setCandidatesLoading(false));
  }, []);

  const approveCandidate = async (candidate: any) => {
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate.name,
          componentType: candidate.componentType,
          description: `Automatically discovered reusable component from ${candidate.distinctBotsCount} bots.`,
          canonicalSignature: candidate.canonicalSignature,
          status: 'APPROVED',
          tags: ['auto-discovered'],
        }),
      });

      if (res.ok) {
        const component = await res.json();
        const stepIds = candidate.associatedSteps.map((s: any) => s.stepId);
        await fetch('/api/components/map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            componentId: component.id,
            stepIds,
            matchType: 'EXACT',
          }),
        });
        fetchCandidates();
        fetchComponents();
      }
    } catch (err) {
      console.error('Failed to approve candidate', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchComponents, 300);
    return () => clearTimeout(timer);
  }, [fetchComponents]);

  useEffect(() => {
    if (activeMainTab === 'discovery') {
      fetchCandidates();
    }
  }, [activeMainTab, fetchCandidates]);

  const handleCreateComponent = async () => {
    if (!newComponent.name.trim() || !newComponent.componentType.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newComponent,
          tags: newComponent.tags ? newComponent.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      });
      if (res.ok) {
        setShowNewComponent(false);
        setNewComponent({
          name: '', componentType: 'Other', description: '', owner: '',
          status: 'CANDIDATE', tags: '', knownLimitations: '',
        });
        fetchComponents();
      }
    } finally { setSaving(false); }
  };

  const deleteComponent = async (id: string) => {
    if (!confirm('Delete this component?')) return;
    await fetch(`/api/components/${id}`, { method: 'DELETE' });
    setExpandedId(null);
    setDetailData(null);
    fetchComponents();
  };

  const loadDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/components/${id}`);
      const data = await res.json();
      setDetailData(data);
    } finally { setDetailLoading(false); }
  };

  const statusCounts = {
    total: components.length,
    approved: components.filter(c => c.status === 'APPROVED').length,
    candidate: components.filter(c => c.status === 'CANDIDATE').length,
    needsRefactor: components.filter(c => c.status === 'NEEDS_REFACTOR').length,
    deprecated: components.filter(c => c.status === 'DEPRECATED').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Components</p>
              <p className="text-3xl font-bold mt-1.5 tracking-tight text-foreground">{statusCounts.total}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-transparent group-hover:h-1 transition-all" />
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Approved</p>
              <p className="text-3xl font-bold mt-1.5 tracking-tight text-green-400">{statusCounts.approved}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-transparent group-hover:h-1 transition-all" />
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Candidates</p>
              <p className="text-3xl font-bold mt-1.5 tracking-tight text-amber-400">{statusCounts.candidate}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-transparent group-hover:h-1 transition-all" />
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur p-5 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Needs Refactor</p>
              <p className="text-3xl font-bold mt-1.5 tracking-tight text-orange-400">{statusCounts.needsRefactor}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-500/10">
              <Code2 className="h-5 w-5 text-orange-400" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-transparent group-hover:h-1 transition-all" />
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 border-b border-border/50 mb-4">
        <button
          onClick={() => setActiveMainTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
            activeMainTab === 'catalog'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5'
          }`}
        >
          <Layers className="h-4 w-4" /> Component Catalog
        </button>
        <button
          onClick={() => setActiveMainTab('discovery')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
            activeMainTab === 'discovery'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5'
          }`}
        >
          <Package className="h-4 w-4" /> Auto-Discovery Candidates
          {candidates.length > 0 && (
            <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {candidates.filter(c => !c.isRegistered).length}
            </span>
          )}
        </button>
      </div>

      {activeMainTab === 'catalog' ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder="Search components..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card/80 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-card/80 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
        {userRole !== 'VIEWER' && (
          <button onClick={() => setShowNewComponent(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> New Component
          </button>
        )}
      </div>

      {/* New Component Modal */}
      {showNewComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewComponent(false)}>
          <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> New Reusable Component
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Component Name *</label>
                <input type="text" value={newComponent.name} onChange={e => setNewComponent(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g., SFTP File Transfer Module" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Type *</label>
                  <select value={newComponent.componentType} onChange={e => setNewComponent(p => ({ ...p, componentType: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {COMPONENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <select value={newComponent.status} onChange={e => setNewComponent(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea value={newComponent.description} onChange={e => setNewComponent(p => ({ ...p, description: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="What does this component do?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Owner</label>
                  <input type="text" value={newComponent.owner} onChange={e => setNewComponent(p => ({ ...p, owner: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated)</label>
                  <input type="text" value={newComponent.tags} onChange={e => setNewComponent(p => ({ ...p, tags: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="sftp, file-transfer, banking" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Known Limitations</label>
                <input type="text" value={newComponent.knownLimitations} onChange={e => setNewComponent(p => ({ ...p, knownLimitations: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g., Max file size 100MB" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewComponent(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleCreateComponent} disabled={saving || !newComponent.name.trim() || !newComponent.componentType.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                {saving ? 'Creating...' : 'Create Component'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading components...</p>
          </div>
        </div>
      ) : components.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border/50">
          <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No components found</p>
          {userRole !== 'VIEWER' && (
            <button onClick={() => setShowNewComponent(true)} className="text-sm text-primary hover:underline mt-2">Create your first component</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {components.map((comp) => {
            const cfg = STATUS_CONFIG[comp.status] || STATUS_CONFIG.CANDIDATE;
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === comp.id;

            return (
              <div key={comp.id} className={`rounded-xl border bg-card/80 backdrop-blur transition-all duration-200 ${
                isExpanded ? 'border-primary/40 shadow-lg shadow-primary/5 col-span-1 md:col-span-2 xl:col-span-3' : 'border-border/50 hover:border-border hover:shadow-md'
              }`}>
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary font-medium">{comp.componentCode}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.style}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>
                    {comp.securityReviewed && (
                      <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-medium rounded-md">SEC ✓</span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-foreground mb-1">{comp.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{comp.description || 'No description'}</p>

                  {/* Meta Row */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Code2 className="h-3 w-3" /> {comp.componentType}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> v{comp.version}
                    </span>
                    {comp._count.stepMaps > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-3 w-3" /> {comp._count.stepMaps} mappings
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {comp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {comp.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-md">{tag}</span>
                      ))}
                      {comp.tags.length > 4 && (
                        <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-md">+{comp.tags.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Source Bot */}
                  {comp.sourceBot && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">Source: </span>
                      <Link href={`/dashboard/bots/${comp.sourceBot.id}`}
                        className="text-xs text-primary hover:underline">
                        {comp.sourceBot.botCode} — {comp.sourceBot.name}
                      </Link>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                    <button onClick={() => loadDetail(comp.id)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {isExpanded ? 'Collapse' : 'Details'}
                    </button>
                    {userRole !== 'VIEWER' && (
                      <button onClick={() => deleteComponent(comp.id)}
                        className="text-xs text-destructive/60 hover:text-destructive transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border/30 p-5 animate-fade-in bg-background/30">
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : detailData ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">Details</h4>
                          {detailData.description && (
                            <div>
                              <span className="text-xs text-muted-foreground">Description</span>
                              <p className="text-sm mt-0.5">{detailData.description}</p>
                            </div>
                          )}
                          {detailData.owner && (
                            <div>
                              <span className="text-xs text-muted-foreground">Owner</span>
                              <p className="text-sm mt-0.5">{detailData.owner}</p>
                            </div>
                          )}
                          {detailData.canonicalSignature && (
                            <div>
                              <span className="text-xs text-muted-foreground">Canonical Signature</span>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5 bg-muted/30 px-2 py-1 rounded">{detailData.canonicalSignature}</p>
                            </div>
                          )}
                          {detailData.knownLimitations && (
                            <div>
                              <span className="text-xs text-muted-foreground">Known Limitations</span>
                              <p className="text-sm mt-0.5 text-amber-400">{detailData.knownLimitations}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">
                            Step Mappings ({detailData.stepMaps?.length || 0})
                          </h4>
                          {(!detailData.stepMaps || detailData.stepMaps.length === 0) ? (
                            <p className="text-xs text-muted-foreground">No step mappings yet</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {detailData.stepMaps.map((map: any) => (
                                <div key={map.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                                  <span className="text-xs font-mono text-primary">{map.step?.bot?.botCode || '—'}</span>
                                  <span className="text-xs text-foreground truncate flex-1">{map.step?.description || 'Unknown step'}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{map.matchType}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      ) : (
        /* DISCOVERY VIEW */
        <div className="space-y-4 animate-fade-in">
          {candidatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border/50 bg-card/30">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No candidate reusable components discovered yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Make sure you have uploaded bots with process steps.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {candidates.map((cand, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-card/80 p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-md">
                          {cand.componentType}
                        </span>
                        <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">
                          Used in {cand.usageCount} steps
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-md">
                          Across {cand.distinctBotsCount} bots
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{cand.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono mt-1 select-all bg-muted/30 px-2 py-1 rounded inline-block">
                        Signature: {cand.canonicalSignature}
                      </p>
                    </div>

                    <div>
                      {cand.isRegistered ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Registered ({cand.registeredCode})
                        </span>
                      ) : userRole === 'VIEWER' ? (
                        <span className="text-xs text-muted-foreground italic">Not Registered</span>
                      ) : (
                        <button
                          onClick={() => approveCandidate(cand)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
                        >
                          <Plus className="h-3.5 w-3.5" /> Approve Component
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Associated Steps */}
                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Discovered in standard process steps:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cand.associatedSteps.map((step: any, sIdx: number) => (
                        <div key={sIdx} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/40 border border-border/20">
                          <span className="font-mono text-primary flex-shrink-0">{step.botCode}</span>
                          <span className="truncate flex-1 text-foreground" title={step.description}>{step.description}</span>
                          <span className="text-[10px] text-muted-foreground italic flex-shrink-0">{step.botName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
