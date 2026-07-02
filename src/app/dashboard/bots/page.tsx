'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Plus, Search, Filter, Upload,
  ArrowUpDown, Bot as BotIcon, Eye,
  CheckSquare, Trash2, Download, FileCode, FileArchive, FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImportPreviewModal } from '@/components/import/ImportPreviewModal';
import { ParsedBot } from '@/lib/parsers/types';
import * as XLSX from 'xlsx';

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
  deployments?: { server: { name: string }, sessionName: string }[];
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
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const { toast } = useToast();
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActioning, setBulkActioning] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // File import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'excel' | 'robin' | 'pad'>('excel');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<{ importedBots: number; importedSteps: number } | null>(null);

  // Robin script import
  const [robinScript, setRobinScript] = useState('');
  const [robinBotName, setRobinBotName] = useState('');
  const [parsingRobin, setParsingRobin] = useState(false);

  // PAD ZIP import
  const [padFile, setPadFile] = useState<File | null>(null);
  const [padBotName, setPadBotName] = useState('');
  const [parsingPad, setParsingPad] = useState(false);

  // Import preview
  const [parsedPreview, setParsedPreview] = useState<ParsedBot | null>(null);
  const [confirmingImport, setConfirmingImport] = useState(false);

  const fetchBots = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    // Map filters (resolving filter parameter naming bug)
    Object.entries(filters).forEach(([k, v]) => {
      if (v) {
        if (k === 'currentStatus') {
          params.set('status', v);
        } else {
          params.set(k, v);
        }
      }
    });

    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);

    fetch(`/api/bots?${params}`)
      .then(r => r.json())
      .then(data => {
        setBots(data.bots || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, filters, page, limit, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(fetchBots, 300);
    return () => clearTimeout(timer);
  }, [fetchBots]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

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
        const botData = await res.json();
        setShowNewBot(false);
        setNewBot({ name: '', vendor: '', technology: 'PAD', department: '', currentStatus: 'UNKNOWN', criticality: 'MEDIUM' });
        toast({
          title: "Bot Created",
          description: `Successfully created bot ${botData.botCode}: ${botData.name}`,
        });
        fetchBots();
      } else {
        const errorData = await res.json();
        toast({
          title: "Error Creating Bot",
          description: errorData.error || "Failed to create bot",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
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
        toast({
          title: "Import Successful",
          description: `Successfully imported ${data.importedBots || 0} bots and ${data.importedSteps || 0} process steps.`,
        });
        setImportFile(null);
        fetchBots();
      } else {
        setImportError(data.error || 'Failed to import file');
        toast({
          title: "Import Failed",
          description: data.error || 'Failed to import file',
          variant: "destructive",
        });
      }
    } catch {
      setImportError('An unexpected error occurred during import');
      toast({
        title: "Import Error",
        description: 'An unexpected error occurred during import',
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleParseRobin = async () => {
    if (!robinScript.trim()) return;
    setParsingRobin(true);
    setImportError('');
    try {
      const res = await fetch('/api/bots/import/robin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: robinScript, botName: robinBotName || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setParsedPreview(data);
        setShowImportModal(false);
      } else {
        setImportError(data.error || 'Failed to parse Robin script');
      }
    } catch {
      setImportError('An unexpected error occurred while parsing');
    } finally {
      setParsingRobin(false);
    }
  };

  const handleParsePad = async () => {
    if (!padFile) return;
    setParsingPad(true);
    setImportError('');
    try {
      const formData = new FormData();
      formData.append('file', padFile);
      if (padBotName) formData.append('botName', padBotName);
      const res = await fetch('/api/bots/import/pad', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setParsedPreview(data);
        setShowImportModal(false);
      } else {
        setImportError(data.error || 'Failed to parse PAD ZIP');
      }
    } catch {
      setImportError('An unexpected error occurred while parsing');
    } finally {
      setParsingPad(false);
    }
  };

  const handleConfirmImport = async (data: ParsedBot) => {
    setConfirmingImport(true);
    try {
      const res = await fetch('/api/bots/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        toast({
          title: "Import Successful",
          description: `Created ${result.botCode}: ${result.botName} with ${result.stepsCreated} steps, ${result.dependenciesCreated} deps, ${result.findingsCreated} findings.`,
        });
        setParsedPreview(null);
        setRobinScript('');
        setRobinBotName('');
        setPadFile(null);
        setPadBotName('');
        fetchBots();
      } else {
        toast({ title: "Import Failed", description: result.error || 'Failed to import', variant: "destructive" });
      }
    } catch {
      toast({ title: "Import Error", description: 'An unexpected error occurred', variant: "destructive" });
    } finally {
      setConfirmingImport(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/bots/import/template', '_blank');
  };

  const updateBotStatus = async (id: string, currentStatus: string) => {
    try {
      const res = await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStatus }),
      });
      if (res.ok) {
        toast({ title: "Status Updated", description: `Status updated to ${currentStatus.replace(/_/g, ' ')}.` });
        fetchBots();
      } else {
        toast({ title: "Error Updating Status", description: "Failed to update bot status.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) {
          if (k === 'currentStatus') params.set('status', v as string);
          else params.set(k, v as string);
        }
      });
      params.set('page', '1');
      params.set('limit', '10000'); 
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);

      const res = await fetch(`/api/bots?${params}`);
      const data = await res.json();
      
      const exportData = data.bots.map((b: any) => ({
        Code: b.botCode,
        Name: b.name,
        Status: b.currentStatus,
        ReviewStatus: b.reviewStatus,
        Criticality: b.criticality,
        Vendor: b.vendor || '',
        Department: b.department || '',
        StepsCount: b._count?.steps || 0,
        FindingsCount: b._count?.findings || 0,
        DependenciesCount: b._count?.dependencies || 0,
        LastUpdated: new Date(b.updatedAt).toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bots");
      XLSX.writeFile(wb, "BotAtlas_Export.xlsx");
      
      toast({ title: "Export Successful", description: `Exported ${exportData.length} bots to Excel.` });
    } catch {
      toast({ title: "Export Failed", description: "Unexpected error during export.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === bots.length && bots.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bots.map(b => b.id));
    }
  };

  const toggleSelectBot = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action: 'status' | 'criticality', value: string) => {
    if (selectedIds.length === 0) return;
    setBulkActioning(true);
    try {
      const res = await fetch('/api/bots/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botIds: selectedIds, action, value }),
      });
      if (res.ok) {
        toast({ title: "Bulk Update Successful", description: `Updated ${selectedIds.length} bots.` });
        setSelectedIds([]);
        fetchBots();
      } else {
        toast({ title: "Bulk Update Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error during bulk action.", variant: "destructive" });
    } finally {
      setBulkActioning(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    setBulkActioning(true);
    try {
      const res = await fetch(`/api/bots/bulk?ids=${selectedIds.join(',')}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Bulk Delete Successful", description: `Deleted ${selectedIds.length} bots.` });
        setSelectedIds([]);
        fetchBots();
      } else {
        toast({ title: "Bulk Delete Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error during bulk delete.", variant: "destructive" });
    } finally {
      setBulkActioning(false);
      setDeleteConfirmOpen(false);
    }
  };

  const renderSortableHeader = (label: string, field: string) => {
    const isSorted = sortBy === field;
    return (
      <th className="px-4 py-3 whitespace-nowrap">
        <button
          onClick={() => handleSort(field)}
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {label}
          <ArrowUpDown className={`h-3 w-3 transition-all ${isSorted ? 'text-primary rotate-180 opacity-100' : 'opacity-30 group-hover:opacity-75'}`} />
        </button>
      </th>
    );
  };

  // Pagination details
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder="Search bots by name or code..."
              value={search} onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card/80 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card/80 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'}`}>
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground border border-border/50 rounded-lg text-sm font-medium hover:bg-white/5 transition-all disabled:opacity-50">
            <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export'}
          </button>
          {userRole === 'ADMIN' && (
            <>
              <button onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(''); }}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground border border-border/50 rounded-lg text-sm font-medium hover:bg-white/5 transition-all">
                <Upload className="h-4 w-4" /> Import Bots
              </button>
              <button onClick={() => setShowNewBot(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> Add Bot
              </button>
            </>
          )}
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
              onChange={e => handleFilterChange(f.key, e.target.value)}
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

      {/* Import Modal — Tabbed */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)}>
          <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Import Bots</h2>
              <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download Template
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/40 rounded-lg mb-4">
              {([
                { id: 'excel' as const, label: 'Excel / JSON', icon: FileSpreadsheet },
                { id: 'robin' as const, label: 'Robin Script', icon: FileCode },
                { id: 'pad' as const, label: 'PAD Solution', icon: FileArchive },
              ]).map(tab => (
                <button key={tab.id} onClick={() => { setImportTab(tab.id); setImportError(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                    importTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {/* ── Excel/JSON Tab ─── */}
              {importTab === 'excel' && (
                <form onSubmit={handleImportSubmit} className="space-y-4">
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center justify-center bg-background/30 hover:bg-background/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center">
                      Drag and drop or click to upload<br />
                      <strong className="text-primary font-medium">.xlsx, .xls, or .json</strong> files
                    </span>
                    <input type="file" accept=".xlsx,.xls,.json"
                      onChange={e => setImportFile(e.target.files?.[0] || null)}
                      className="mt-4 text-xs text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>
                  {importFile && (
                    <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg truncate">
                      Selected: <span className="text-foreground font-semibold">{importFile.name}</span>
                    </div>
                  )}
                  {importResult && (
                    <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-2.5 rounded-lg space-y-0.5">
                      <p className="font-semibold">Import successful!</p>
                      <p>✓ Imported {importResult.importedBots} Bots</p>
                      <p>✓ Imported {importResult.importedSteps} Process Steps</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Close</button>
                    <button type="submit" disabled={importing || !importFile}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                      {importing ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Robin Script Tab ─── */}
              {importTab === 'robin' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Bot Name (optional)</label>
                    <input type="text" value={robinBotName} onChange={e => setRobinBotName(e.target.value)}
                      placeholder="e.g., NPCI Daily Reconciliation"
                      className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Paste Robin Script</label>
                    <textarea value={robinScript} onChange={e => setRobinScript(e.target.value)}
                      placeholder={'WebBrowser.LaunchBrowser.Chrome Url: $\'\'\'https://npci.org.in\'\'\' BrowserInstance=> BrowserInstance\nWebBrowser.Click BrowserInstance: BrowserInstance Control: appcredential[\'Button_Login\']\n...'}
                      rows={10}
                      className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                    <p className="text-[10px] text-muted-foreground mt-1">Copy from PAD Editor → Edit flow → View code</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Close</button>
                    <button onClick={handleParseRobin} disabled={parsingRobin || !robinScript.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                      {parsingRobin ? 'Parsing...' : 'Parse & Preview'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PAD Solution Tab ─── */}
              {importTab === 'pad' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Bot Name (optional — auto-detected from manifest)</label>
                    <input type="text" value={padBotName} onChange={e => setPadBotName(e.target.value)}
                      placeholder="Leave blank to auto-detect"
                      className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center justify-center bg-background/30 hover:bg-background/50 transition-colors">
                    <FileArchive className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center">
                      Upload PAD Solution export<br />
                      <strong className="text-primary font-medium">.zip</strong> file
                    </span>
                    <input type="file" accept=".zip"
                      onChange={e => setPadFile(e.target.files?.[0] || null)}
                      className="mt-4 text-xs text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>
                  {padFile && (
                    <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg truncate">
                      Selected: <span className="text-foreground font-semibold">{padFile.name}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Close</button>
                    <button onClick={handleParsePad} disabled={parsingPad || !padFile}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                      {parsingPad ? 'Parsing...' : 'Parse & Preview'}
                    </button>
                  </div>
                </div>
              )}

              {/* Error display */}
              {importError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                  {importError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {parsedPreview && (
        <ImportPreviewModal
          parsed={parsedPreview}
          onConfirm={handleConfirmImport}
          onCancel={() => setParsedPreview(null)}
          confirming={confirmingImport}
        />
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        
        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">{selectedIds.length} bots selected</span>
              <div className="h-4 w-px bg-primary/20 mx-2" />
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Set Status:</span>
                <select 
                  onChange={e => e.target.value && handleBulkAction('status', e.target.value)}
                  className="px-2 py-1 bg-background border border-border/50 rounded text-xs focus:outline-none"
                  value=""
                >
                  <option value="">Select...</option>
                  <option value="ACTIVE">Active</option>
                  <option value="FAILED">Failed</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="h-4 w-px bg-primary/20 mx-2" />
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Set Criticality:</span>
                <select 
                  onChange={e => e.target.value && handleBulkAction('criticality', e.target.value)}
                  className="px-2 py-1 bg-background border border-border/50 rounded text-xs focus:outline-none"
                  value=""
                >
                  <option value="">Select...</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground">Clear selection</button>
              <button 
                onClick={handleBulkDelete} disabled={bulkActioning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-md text-xs font-medium transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Selected
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {userRole === 'ADMIN' && (
                  <th className="px-4 py-3 text-left w-10">
                    <input type="checkbox" 
                      checked={bots.length > 0 && selectedIds.length === bots.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border/50 bg-background/50 text-primary focus:ring-primary/50" />
                  </th>
                )}
                {renderSortableHeader('Code', 'botCode')}
                {renderSortableHeader('Name', 'name')}
                {renderSortableHeader('Status', 'currentStatus')}
                {renderSortableHeader('Review', 'reviewStatus')}
                {renderSortableHeader('Criticality', 'criticality')}
                {renderSortableHeader('Vendor', 'vendor')}
                {renderSortableHeader('Department', 'department')}
                {renderSortableHeader('Steps', 'steps')}
                {renderSortableHeader('Findings', 'findings')}
                <th className="px-4 py-3 font-semibold text-left text-muted-foreground whitespace-nowrap">Locations</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-border/30">
                    <td className="px-4 py-4"><div className="h-4 w-4 bg-muted/65 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-12 bg-muted/65 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-40 bg-muted/65 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 bg-muted/50 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-20 bg-muted/50 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 bg-muted/50 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-muted/65 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 bg-muted/65 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-6 bg-muted/65 rounded mx-auto animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-6 bg-muted/65 rounded mx-auto animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-8 bg-muted/65 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : bots.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <BotIcon className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No bots found</p>
                    <button onClick={() => setShowNewBot(true)} className="text-sm text-primary hover:underline mt-1">Add your first bot</button>
                  </div>
                </td></tr>
              ) : bots.map((bot) => (
                <tr key={bot.id} className={`border-b border-border/30 hover:bg-white/[0.02] transition-colors group ${selectedIds.includes(bot.id) ? 'bg-primary/5' : ''}`}>
                  {userRole === 'ADMIN' && (
                    <td className="px-4 py-3">
                      <input type="checkbox" 
                        checked={selectedIds.includes(bot.id)}
                        onChange={() => toggleSelectBot(bot.id)}
                        className="rounded border-border/50 bg-background/50 text-primary focus:ring-primary/50" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-primary font-medium">{bot.botCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/bots/${bot.id}`} className="text-sm text-foreground hover:text-primary transition-colors font-medium">
                      {bot.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {userRole === 'VIEWER' ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[bot.currentStatus] || STATUS_STYLES.UNKNOWN}`}>
                        {bot.currentStatus.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <select 
                        value={bot.currentStatus}
                        onChange={e => updateBotStatus(bot.id, e.target.value)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border appearance-none cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50 ${STATUS_STYLES[bot.currentStatus] || STATUS_STYLES.UNKNOWN}`}
                      >
                        {['UNKNOWN','ACTIVE','FAILED','INACTIVE','OBSOLETE','RETIRED'].map(s => (
                          <option key={s} value={s} className="bg-background text-foreground">{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    )}
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
                    {bot.deployments && bot.deployments.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {bot.deployments.map((dep, idx) => (
                          <span key={idx} className="inline-flex items-center text-[10px] bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded truncate max-w-[120px]" title={`${dep.server.name} > ${dep.sessionName}`}>
                            {dep.server.name} ({dep.sessionName})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 italic">Unmapped</span>
                    )}
                  </td>
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
          <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{start}</span> to{' '}
              <span className="font-semibold text-foreground">{end}</span> of{' '}
              <span className="font-semibold text-foreground">{total}</span> bots
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-card border border-border/50 rounded-lg text-xs font-medium hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-all animate-fade-in"
              >
                Previous
              </button>
              <div className="text-xs text-muted-foreground px-2">
                Page <span className="text-foreground font-medium">{page}</span> of{' '}
                <span className="text-foreground font-medium">{totalPages}</span>
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-card border border-border/50 rounded-lg text-xs font-medium hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-all animate-fade-in"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete {selectedIds.length} bots?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These bots and all their associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
