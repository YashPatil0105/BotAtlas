'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Bot as BotIcon, GitBranch, Component as ComponentIcon,
  AlertTriangle, ArrowRight, Zap, Layers, BarChart3,
  ChevronDown, ChevronUp, Sparkles, Target, RefreshCw, GitCompare
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────

interface SearchResults {
  bots: Array<{
    id: string; name: string; botCode: string;
    businessPurpose: string | null; currentStatus: string;
    reviewStatus: string; criticality: string;
  }>;
  steps: Array<{
    id: string; stepOrder: number; actionType: string;
    description: string; systemName: string | null; botId: string;
    bot: { id: string; name: string; botCode: string };
  }>;
  components: Array<{
    id: string; componentCode: string; name: string;
    description: string | null; componentType: string; status: string;
  }>;
  findings: Array<{
    id: string; category: string; observation: string;
    priority: string; status: string; botId: string;
    bot: { id: string; name: string; botCode: string };
  }>;
}

interface SimilarBot {
  botId: string;
  botName: string;
  botCode: string;
  stepCount: number;
  sequenceScore: number;
  canonicalScore: number;
  fuzzyScore: number;
  finalScore: number;
}

interface BotOption {
  id: string;
  name: string;
  botCode: string;
  _count: { steps: number };
}

// ─── Helpers ────────────────────────────────────────

function getSimilarityBand(score: number) {
  const pct = score * 100;
  if (pct >= 90) return { label: 'Exact Match', color: '#22c55e', bg: 'bg-green-500/15 text-green-400 border-green-500/30' };
  if (pct >= 70) return { label: 'Strong Match', color: '#3b82f6', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  if (pct >= 50) return { label: 'Related', color: '#f59e0b', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  return { label: 'Weak', color: '#64748b', bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400',
  FAILED: 'bg-red-500/15 text-red-400',
  INACTIVE: 'bg-amber-500/15 text-amber-400',
  OBSOLETE: 'bg-gray-500/15 text-gray-400',
  RETIRED: 'bg-purple-500/15 text-purple-400',
  UNKNOWN: 'bg-slate-500/15 text-slate-400',
};

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  MEDIUM: 'bg-blue-500/15 text-blue-400',
  LOW: 'bg-slate-500/15 text-slate-400',
};

// ─── Score Gauge Component ──────────────────────────

function ScoreGauge({ value, label, size = 'sm' }: { value: number; label: string; size?: 'sm' | 'lg' }) {
  const pct = Math.round(value * 100);
  const band = getSimilarityBand(value);
  const circumference = 2 * Math.PI * (size === 'lg' ? 40 : 24);
  const dashOffset = circumference - (value * circumference);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${size === 'lg' ? 'w-24 h-24' : 'w-14 h-14'}`}>
        <svg className="w-full h-full -rotate-90" viewBox={size === 'lg' ? '0 0 96 96' : '0 0 56 56'}>
          <circle
            cx={size === 'lg' ? 48 : 28}
            cy={size === 'lg' ? 48 : 28}
            r={size === 'lg' ? 40 : 24}
            fill="none"
            stroke="currentColor"
            strokeWidth={size === 'lg' ? 6 : 4}
            className="text-muted/30"
          />
          <circle
            cx={size === 'lg' ? 48 : 28}
            cy={size === 'lg' ? 48 : 28}
            r={size === 'lg' ? 40 : 24}
            fill="none"
            stroke={band.color}
            strokeWidth={size === 'lg' ? 6 : 4}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === 'lg' ? 'text-lg' : 'text-xs'}`} style={{ color: band.color }}>
            {pct}%
          </span>
        </div>
      </div>
      <span className={`text-muted-foreground font-medium ${size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>{label}</span>
    </div>
  );
}

// ─── Search Result Tabs ─────────────────────────────

const SEARCH_TABS = [
  { id: 'bots', label: 'Bots', icon: BotIcon },
  { id: 'steps', label: 'Steps', icon: GitBranch },
  { id: 'components', label: 'Components', icon: ComponentIcon },
  { id: 'findings', label: 'Findings', icon: AlertTriangle },
] as const;

// ─── Main Page Component ────────────────────────────

export default function ReuseExplorerPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState<string>('bots');

  // Similarity state
  const [botOptions, setBotOptions] = useState<BotOption[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [similarBots, setSimilarBots] = useState<SimilarBot[]>([]);
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityMessage, setSimilarityMessage] = useState('');
  const [expandedSimilarityId, setExpandedSimilarityId] = useState<string | null>(null);

  // Load bot options for similarity analyzer
  useEffect(() => {
    fetch('/api/bots')
      .then(r => r.json())
      .then(data => setBotOptions(data.bots || []))
      .catch(() => {});
  }, []);

  // Global search
  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
      .then(r => r.json())
      .then(data => {
        setSearchResults(data);
        // Auto-select first tab with results
        if (data.bots?.length > 0) setActiveSearchTab('bots');
        else if (data.steps?.length > 0) setActiveSearchTab('steps');
        else if (data.components?.length > 0) setActiveSearchTab('components');
        else if (data.findings?.length > 0) setActiveSearchTab('findings');
        setSearchLoading(false);
      })
      .catch(() => setSearchLoading(false));
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(performSearch, 400);
    return () => clearTimeout(timer);
  }, [performSearch]);

  // Similarity analysis
  const analyzeSimilarity = async () => {
    if (!selectedBotId) return;
    setSimilarityLoading(true);
    setSimilarBots([]);
    setSimilarityMessage('');

    try {
      const res = await fetch(`/api/bots/${selectedBotId}/similarity`);
      const data = await res.json();
      if (data.message) {
        setSimilarityMessage(data.message);
      }
      setSimilarBots(data.similarBots || []);
    } catch {
      setSimilarityMessage('Failed to analyze similarity');
    } finally {
      setSimilarityLoading(false);
    }
  };

  const totalSearchResults = searchResults
    ? (searchResults.bots?.length || 0) + (searchResults.steps?.length || 0) +
      (searchResults.components?.length || 0) + (searchResults.findings?.length || 0)
    : 0;

  const selectedBotName = botOptions.find(b => b.id === selectedBotId);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Hero Section ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-card/80 to-card/80 backdrop-blur p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Reuse Explorer</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Search across all bots, process steps, components, and findings. Analyze bot similarity to discover reuse opportunities and reduce duplication.
          </p>
        </div>
      </div>

      {/* ── Global Search ─────────────────────────────── */}
      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search across bots, steps, components, findings..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 bg-card/80 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
          />
          {searchLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults && searchQuery.trim() && (
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden animate-fade-in">
            {/* Tabs */}
            <div className="flex border-b border-border/50">
              {SEARCH_TABS.map(tab => {
                const count = searchResults[tab.id]?.length || 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSearchTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                      activeSearchTab === tab.id
                        ? 'text-primary border-primary bg-primary/5'
                        : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    {count > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-semibold">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Result Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {totalSearchResults === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No results found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                <>
                  {/* Bots */}
                  {activeSearchTab === 'bots' && (
                    <div className="space-y-2">
                      {searchResults.bots.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No bots matched</p>
                      ) : searchResults.bots.map(bot => (
                        <Link key={bot.id} href={`/dashboard/bots/${bot.id}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <BotIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-primary">{bot.botCode}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[bot.currentStatus] || ''}`}>
                                  {bot.currentStatus}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground truncate">{bot.name}</p>
                              {bot.businessPurpose && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{bot.businessPurpose}</p>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Steps */}
                  {activeSearchTab === 'steps' && (
                    <div className="space-y-2">
                      {searchResults.steps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No steps matched</p>
                      ) : searchResults.steps.map(step => (
                        <Link key={step.id} href={`/dashboard/bots/${step.bot.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                          <div className="p-2 rounded-lg bg-indigo-500/10">
                            <GitBranch className="h-4 w-4 text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-md">
                                {step.actionType.replace(/_/g, ' ')}
                              </span>
                              {step.systemName && (
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{step.systemName}</span>
                              )}
                            </div>
                            <p className="text-sm text-foreground truncate mt-0.5">{step.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              from <span className="text-primary">{step.bot.botCode}</span> — {step.bot.name}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Components */}
                  {activeSearchTab === 'components' && (
                    <div className="space-y-2">
                      {searchResults.components.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No components matched</p>
                      ) : searchResults.components.map(comp => (
                        <Link key={comp.id} href="/dashboard/components"
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                          <div className="p-2 rounded-lg bg-teal-500/10">
                            <ComponentIcon className="h-4 w-4 text-teal-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-teal-400">{comp.componentCode}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                comp.status === 'APPROVED' ? 'bg-green-500/15 text-green-400' :
                                comp.status === 'CANDIDATE' ? 'bg-amber-500/15 text-amber-400' :
                                'bg-slate-500/15 text-slate-400'
                              }`}>{comp.status}</span>
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{comp.name}</p>
                            {comp.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{comp.description}</p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Findings */}
                  {activeSearchTab === 'findings' && (
                    <div className="space-y-2">
                      {searchResults.findings.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No findings matched</p>
                      ) : searchResults.findings.map(finding => (
                        <Link key={finding.id} href={`/dashboard/bots/${finding.bot.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-medium rounded-md">
                                {finding.category.replace(/_/g, ' ')}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_STYLES[finding.priority] || ''}`}>
                                {finding.priority}
                              </span>
                            </div>
                            <p className="text-sm text-foreground truncate mt-0.5">{finding.observation}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              from <span className="text-primary">{finding.bot.botCode}</span> — {finding.bot.name}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bot Similarity Analyzer ───────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Target className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Bot Similarity Analyzer</h3>
              <p className="text-xs text-muted-foreground">Select a bot to find similar automation workflows across your registry</p>
            </div>
          </div>
          <Link
            href="/dashboard/reuse/compare"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm shadow-indigo-500/5 active:scale-98"
          >
            <GitCompare className="h-3.5 w-3.5" /> Side-by-Side Comparison
          </Link>
        </div>

        {/* Bot Selector + Analyze Button */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-md">
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Source Bot</label>
            <select
              value={selectedBotId}
              onChange={e => { setSelectedBotId(e.target.value); setSimilarBots([]); setSimilarityMessage(''); }}
              className="w-full px-3 py-2.5 bg-card/80 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              <option value="">Select a bot to analyze...</option>
              {botOptions
                .filter(b => b._count.steps > 0)
                .map(bot => (
                  <option key={bot.id} value={bot.id}>
                    {bot.botCode} — {bot.name} ({bot._count.steps} steps)
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={analyzeSimilarity}
            disabled={!selectedBotId || similarityLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20"
          >
            {similarityLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Analyze Similarity
              </>
            )}
          </button>
        </div>

        {/* Similarity Message */}
        {similarityMessage && (
          <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm animate-fade-in">
            {similarityMessage}
          </div>
        )}

        {/* Similarity Results */}
        {similarBots.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <span className="text-foreground font-medium">{similarBots.length}</span> similar bots
                {selectedBotName && (
                  <> to <span className="text-primary font-medium">{selectedBotName.botCode}</span></>
                )}
              </p>
            </div>

            <div className="space-y-3">
              {similarBots.map((bot, idx) => {
                const band = getSimilarityBand(bot.finalScore);
                const isExpanded = expandedSimilarityId === bot.botId;

                return (
                  <div
                    key={bot.botId}
                    className={`rounded-xl border bg-card/80 backdrop-blur transition-all ${
                      isExpanded ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                          {idx + 1}
                        </div>

                        {/* Final Score Gauge */}
                        <ScoreGauge value={bot.finalScore} label="Final" size="lg" />

                        {/* Bot Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-primary font-medium">{bot.botCode}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${band.bg}`}>
                              {band.label}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{bot.botName}</p>
                          <p className="text-xs text-muted-foreground">{bot.stepCount} process steps</p>
                        </div>

                        {/* Score Breakdown (mini gauges) */}
                        <div className="hidden md:flex items-center gap-4">
                          <ScoreGauge value={bot.sequenceScore} label="Sequence" />
                          <ScoreGauge value={bot.canonicalScore} label="Canonical" />
                          <ScoreGauge value={bot.fuzzyScore} label="Fuzzy" />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Link
                            href={`/dashboard/reuse/compare?sourceId=${selectedBotId}&targetId=${bot.botId}`}
                            className="p-2 rounded-lg hover:bg-indigo-500/10 text-indigo-400 transition-colors"
                            title="Compare side-by-side"
                          >
                            <GitCompare className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setExpandedSimilarityId(isExpanded ? null : bot.botId)}
                            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <Link
                            href={`/dashboard/bots/${bot.botId}`}
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            title="Review bot"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Score Detail */}
                    {isExpanded && (
                      <div className="border-t border-border/30 p-4 animate-fade-in bg-background/30">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sequence Score</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500 transition-all duration-700"
                                  style={{ width: `${Math.round(bot.sequenceScore * 100)}%` }} />
                              </div>
                              <span className="text-sm font-bold text-blue-400">{Math.round(bot.sequenceScore * 100)}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">N-gram Jaccard similarity of action type sequences</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Canonical Score</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                                  style={{ width: `${Math.round(bot.canonicalScore * 100)}%` }} />
                              </div>
                              <span className="text-sm font-bold text-indigo-400">{Math.round(bot.canonicalScore * 100)}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Structural signature match between step definitions</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fuzzy Score</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                                  style={{ width: `${Math.round(bot.fuzzyScore * 100)}%` }} />
                              </div>
                              <span className="text-sm font-bold text-amber-400">{Math.round(bot.fuzzyScore * 100)}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Overlap of unique action types between bots</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card/50 border border-primary/20">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Final Score</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.round(bot.finalScore * 100)}%`, backgroundColor: band.color }} />
                              </div>
                              <span className="text-sm font-bold" style={{ color: band.color }}>{Math.round(bot.finalScore * 100)}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Weighted: 50% sequence + 30% canonical + 20% fuzzy</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state for similarity when no bot selected */}
        {!selectedBotId && similarBots.length === 0 && !similarityLoading && (
          <div className="flex flex-col items-center py-12 rounded-xl border border-dashed border-border/50 bg-card/30">
            <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Select a bot above to discover similar automation workflows</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Only bots with process steps can be analyzed</p>
          </div>
        )}
      </div>
    </div>
  );
}
