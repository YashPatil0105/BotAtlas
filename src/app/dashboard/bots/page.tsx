'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Filter, Upload, MoreHorizontal,
  ArrowUpDown, Bot as BotIcon, Eye
} from 'lucide-react';

interface BotRecord {
  id: string;
  botCode: string;
  name: string;
  vendor: string | null;
  department: string | null;
  technology: string;
  currentStatus: string;
  reviewStatus: string;
  criticality: string;
  businessOwner: string | null;
  updatedAt: string;
  _count: { steps: number; findings: number; dependencies: number };
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/30',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
  INACTIVE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  OBSOLETE: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  RETIRED: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  UNKNOWN: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const REVIEW_STYLES: Record<string, string> = {
  NOT_STARTED: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  COMPLETED: 'bg-green-500/15 text-green-400 border-green-500/30',
  AWAITING_VALIDATION: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const CRITICALITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  MEDIUM: 'bg-blue-500/15 text-blue-400',
  LOW: 'bg-slate-500/15 text-slate-400',
};

export default function BotRegistryPage() {
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    currentStatus: '',
    reviewStatus: '',
    vendor: '',
    criticality: '',
    department: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showNewBot, setShowNewBot] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', vendor: '', technology: 'PAD', department: '', currentStatus: 'UNKNOWN', criticality: 'MEDIUM' });
  const [saving, setSaving] = useState(false);

  // File import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<{ importedBots: number; importedSteps: number } | null>(null);

  const fetchBots = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

    fetch(`/api/bots?${params}`)
      .then(r => r.json())
      .then(data => {
        setBots(data.bots || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchBots, 300);
    return () => clearTimeout(timer);
  }, [fetchBots]);

  const handleCreateBot = async () => {
    if (!newBot.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBot),
      });
      if (res.ok) {
        setShowNewBot(false);
        setNewBot({ name: '', vendor: '', technology: 'PAD', department: '', currentStatus: 'UNKNOWN', criticality: 'MEDIUM' });
        fetchBots();
      }
    } finally { setSaving(false); }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/bots/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({
          importedBots: data.importedBots || 0,
          importedSteps: data.importedSteps || 0,
        });
        setImportFile(null);
        fetchBots();
      } else {
        setImportError(data.error || 'Failed to import file');
      }
    } catch {
      setImportError('An unexpected error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder="Search bots by name or code..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card/80 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card/80 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'}`}>
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground border border-border/50 rounded-lg text-sm font-medium hover:bg-white/5 transition-all">
            <Upload className="h-4 w-4" /> Import Excel/JSON
          </button>
          <button onClick={() => setShowNewBot(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Add Bot
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur animate-fade-in">
          {[
            { key: 'currentStatus', label: 'Status', options: ['ACTIVE','FAILED','INACTIVE','OBSOLETE','RETIRED','UNKNOWN'] },
            { key: 'reviewStatus', label: 'Review', options: ['NOT_STARTED','IN_PROGRESS','COMPLETED','AWAITING_VALIDATION'] },
            { key: 'criticality', label: 'Criticality', options: ['CRITICAL','HIGH','MEDIUM','LOW'] },
            { key: 'vendor', label: 'Vendor', options: ['TCS','Wipro','Infosys','Accenture'] },
            { key: 'department', label: 'Department', options: ['Operations','Finance','Compliance','Treasury','Procurement','Retail Banking','Customer Service'] },
          ].map(f => (
            <select key={f.key} value={(filters as any)[f.key]}
              onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="px-3 py-2 bg-background border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">{f.label}: All</option>
              {f.options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
          ))}
        </div>
      )}

      {/* New Bot Modal */}
      {showNewBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewBot(false)}>
          <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Add New Bot</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bot Name *</label>
                <input type="text" value={newBot.name} onChange={e => setNewBot(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g., NPCI Reconciliation Bot" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendor</label>
                  <input type="text" value={newBot.vendor} onChange={e => setNewBot(p => ({ ...p, vendor: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                  <input type="text" value={newBot.department} onChange={e => setNewBot(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Technology</label>
                  <select value={newBot.technology} onChange={e => setNewBot(p => ({ ...p, technology: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="PAD">Power Automate Desktop</option>
                    <option value="POWER_AUTOMATE_CLOUD">Power Automate Cloud</option>
                    <option value="UI_PATH">UiPath</option>
                    <option value="BLUE_PRISM">Blue Prism</option>
                    <option value="AUTOMATION_ANYWHERE">Automation Anywhere</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <select value={newBot.currentStatus} onChange={e => setNewBot(p => ({ ...p, currentStatus: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {['UNKNOWN','ACTIVE','FAILED','INACTIVE','OBSOLETE'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewBot(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleCreateBot} disabled={saving || !newBot.name.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                {saving ? 'Creating...' : 'Create Bot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)}>
          <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Import Bots (Excel/JSON)</h2>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center justify-center bg-background/30 hover:bg-background/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground text-center">
                  Drag and drop or click to upload<br />
                  <strong className="text-primary font-medium">.xlsx, .xls, or .json</strong> files
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.json"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="mt-4 text-xs text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              {importFile && (
                <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg truncate">
                  Selected: <span className="text-foreground font-semibold">{importFile.name}</span>
                </div>
              )}

              {importError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                  {importError}
                </div>
              )}

              {importResult && (
                <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-2.5 rounded-lg space-y-0.5">
                  <p className="font-semibold">Import successful!</p>
                  <p>✓ Imported {importResult.importedBots} Bots</p>
                  <p>✓ Imported {importResult.importedSteps} Process Steps</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Close</button>
                <button type="submit" disabled={importing || !importFile}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['Code', 'Name', 'Status', 'Review', 'Criticality', 'Vendor', 'Department', 'Steps', 'Findings', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground text-sm">Loading...</td></tr>
              ) : bots.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <BotIcon className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No bots found</p>
                    <button onClick={() => setShowNewBot(true)} className="text-sm text-primary hover:underline mt-1">Add your first bot</button>
                  </div>
                </td></tr>
              ) : bots.map((bot) => (
                <tr key={bot.id} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-primary font-medium">{bot.botCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/bots/${bot.id}`} className="text-sm text-foreground hover:text-primary transition-colors font-medium">
                      {bot.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[bot.currentStatus] || STATUS_STYLES.UNKNOWN}`}>
                      {bot.currentStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${REVIEW_STYLES[bot.reviewStatus] || REVIEW_STYLES.NOT_STARTED}`}>
                      {bot.reviewStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CRITICALITY_STYLES[bot.criticality] || ''}`}>
                      {bot.criticality}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{bot.vendor || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{bot.department || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground text-center">{bot._count.steps}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground text-center">{bot._count.findings}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/bots/${bot.id}`}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/10 transition-all" title="Review">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            Showing {bots.length} of {total} bots
          </div>
        )}
      </div>
    </div>
  );
}
