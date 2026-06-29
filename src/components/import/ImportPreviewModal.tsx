'use client';

import { useState } from 'react';
import {
  X, CheckCircle2, AlertTriangle, Shield, FileText,
  ChevronDown, ChevronUp, Edit3, Trash2, Bot,
  GitBranch, Activity, ClipboardList, Bug,
} from 'lucide-react';
import { ParsedBot } from '@/lib/parsers/types';

interface ImportPreviewModalProps {
  parsed: ParsedBot;
  onConfirm: (data: ParsedBot) => void;
  onCancel: () => void;
  confirming: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  LOW: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const PRIORITY_DOTS: Record<string, string> = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🟢',
};

export function ImportPreviewModal({ parsed, onConfirm, onCancel, confirming }: ImportPreviewModalProps) {
  const [data, setData] = useState<ParsedBot>({ ...parsed });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    steps: false,
    dependencies: true,
    checklist: false,
    findings: true,
  });
  const [editingName, setEditingName] = useState(false);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const dismissFinding = (idx: number) => {
    setData(prev => ({
      ...prev,
      findings: prev.findings.map((f, i) => i === idx ? { ...f, dismissed: true } : f),
    }));
  };

  const undismissFinding = (idx: number) => {
    setData(prev => ({
      ...prev,
      findings: prev.findings.map((f, i) => i === idx ? { ...f, dismissed: false } : f),
    }));
  };

  const activeFindings = data.findings.filter(f => !f.dismissed);
  const dismissedFindings = data.findings.filter(f => f.dismissed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-card border border-border/50 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─── */}
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Import Preview</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detected: <span className="text-primary font-medium">{data.sourceFormat.toUpperCase()}</span>
              {' · '}{data.stats.totalSteps} steps
              {' · '}{data.stats.totalDependencies} dependencies
              {data.stats.subflowCount ? ` · ${data.stats.subflowCount} subflows` : ''}
            </p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Content ─── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div className="space-y-2">
              {data.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* ── Bot Metadata ─── */}
          <Section
            icon={<Bot className="w-4 h-4 text-primary" />}
            title="Bot Details"
            expanded={expandedSections.metadata}
            onToggle={() => toggleSection('metadata')}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Bot Name</label>
                {editingName ? (
                  <input
                    type="text"
                    value={data.name}
                    onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
                    onBlur={() => setEditingName(false)}
                    autoFocus
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{data.name}</span>
                    <button onClick={() => setEditingName(true)} className="p-1 rounded hover:bg-muted transition-colors">
                      <Edit3 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
              <MetaField label="Technology" value={data.technology} />
              <MetaField label="Status" value={data.currentStatus || 'UNKNOWN'} />
              {data.technicalOwner && <MetaField label="Technical Owner" value={data.technicalOwner} />}
              {data.department && <MetaField label="Department" value={data.department} />}
              {data.scheduleOrTrigger && <MetaField label="Schedule" value={data.scheduleOrTrigger} />}
            </div>
          </Section>

          {/* ── Process Steps ─── */}
          <Section
            icon={<GitBranch className="w-4 h-4 text-blue-400" />}
            title={`${data.steps.length} Process Steps`}
            expanded={expandedSections.steps}
            onToggle={() => toggleSection('steps')}
            badge={data.steps.filter(s => s.warning).length > 0
              ? `${data.steps.filter(s => s.warning).length} warnings`
              : undefined
            }
          >
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {data.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs group">
                  <span className={`shrink-0 mt-0.5 ${step.warning ? 'text-amber-400' : 'text-green-400'}`}>
                    {step.warning ? '⚠️' : '✅'}
                  </span>
                  <span className="text-muted-foreground font-mono w-8 shrink-0">#{step.stepOrder}</span>
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-medium shrink-0">
                    {step.actionType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-foreground flex-1 truncate" title={step.description}>
                    {step.description}
                  </span>
                  {step.systemName && (
                    <span className="text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                      {step.systemName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* ── Dependencies ─── */}
          <Section
            icon={<Activity className="w-4 h-4 text-purple-400" />}
            title={`${data.dependencies.length} Dependencies (Auto-detected)`}
            expanded={expandedSections.dependencies}
            onToggle={() => toggleSection('dependencies')}
          >
            {data.dependencies.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No dependencies auto-detected.</p>
            ) : (
              <div className="space-y-1.5">
                {data.dependencies.map((dep, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">✅</span>
                    <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] rounded font-medium">
                      {dep.dependencyType}
                    </span>
                    <span className="text-foreground">{dep.name}</span>
                    {dep.source && (
                      <span className="text-muted-foreground text-[10px] truncate max-w-[200px]" title={dep.source}>
                        — {dep.source}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Checklist Auto-Fills ─── */}
          <Section
            icon={<ClipboardList className="w-4 h-4 text-green-400" />}
            title={`Checklist Auto-Fills (${data.checklistAutoFills.filter(c => c.value !== 'NOT_VERIFIED').length} detected)`}
            expanded={expandedSections.checklist}
            onToggle={() => toggleSection('checklist')}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {data.checklistAutoFills.filter(c => c.value !== 'NOT_VERIFIED').map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-foreground">{item.checklistItem.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-green-400 font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Auto-Generated Findings ─── */}
          {data.findings.length > 0 && (
            <Section
              icon={<Bug className="w-4 h-4 text-orange-400" />}
              title={`${activeFindings.length} Auto-Generated Findings`}
              expanded={expandedSections.findings}
              onToggle={() => toggleSection('findings')}
              badge={dismissedFindings.length > 0 ? `${dismissedFindings.length} dismissed` : undefined}
            >
              <div className="space-y-2">
                {data.findings.map((finding, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border transition-all ${
                      finding.dismissed
                        ? 'opacity-40 bg-muted/20 border-border/30'
                        : `${PRIORITY_STYLES[finding.priority] || PRIORITY_STYLES.MEDIUM}`
                    }`}
                  >
                    <span className="shrink-0 mt-0.5">{PRIORITY_DOTS[finding.priority] || '🟡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium uppercase text-[10px]">{finding.priority}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{finding.category}</span>
                      </div>
                      <p className="mt-0.5 text-foreground">{finding.observation}</p>
                      {finding.recommendation && (
                        <p className="mt-1 text-muted-foreground italic">💡 {finding.recommendation}</p>
                      )}
                    </div>
                    <button
                      onClick={() => finding.dismissed ? undismissFinding(i) : dismissFinding(i)}
                      className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                      title={finding.dismissed ? 'Restore finding' : 'Dismiss finding'}
                    >
                      {finding.dismissed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ── Footer ─── */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between shrink-0 bg-card">
          <div className="text-xs text-muted-foreground">
            {activeFindings.length > 0 && (
              <span className="text-amber-400">
                ⚠️ {activeFindings.length} finding{activeFindings.length > 1 ? 's' : ''} will be created
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(data)}
              disabled={confirming || !data.name.trim()}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {confirming ? 'Importing...' : `Import ${data.stats.totalSteps} Steps ✓`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────

function Section({
  icon, title, expanded, onToggle, badge, children,
}: {
  icon: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          {title}
          {badge && (
            <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
