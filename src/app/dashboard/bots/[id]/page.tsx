'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Trash2, Plus, GripVertical, X,
  CheckCircle2, AlertTriangle, Shield, FileText, GitBranch,
  ClipboardList, Bug, Upload, Wrench, MessageSquare, Activity
} from 'lucide-react';

// Types
interface BotDetail {
  id: string; botCode: string; name: string; businessPurpose: string | null;
  businessProcess: string | null; department: string | null; businessOwner: string | null;
  technicalOwner: string | null; vendor: string | null; technology: string;
  environment: string; currentStatus: string; reviewStatus: string;
  criticality: string; lastKnownRunAt: string | null; scheduleOrTrigger: string | null;
  finalRecommendation: string | null; reviewSummary: string | null;
  steps: any[]; dependencies: any[]; findings: any[]; rootCauseAssessments: any[];
  remediationTasks: any[]; evidences: any[]; checklist: any[];
  completenessScore?: number;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'steps', label: 'Process Steps', icon: GitBranch },
  { id: 'dependencies', label: 'Dependencies', icon: Activity },
  { id: 'checklist', label: 'Checklist', icon: ClipboardList },
  { id: 'rootcause', label: 'Root Cause', icon: Bug },
  { id: 'findings', label: 'Findings', icon: AlertTriangle },
  { id: 'remediation', label: 'Remediation', icon: Wrench },
  { id: 'recommendation', label: 'Recommendation', icon: CheckCircle2 },
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400', FAILED: 'bg-red-500/15 text-red-400',
  INACTIVE: 'bg-amber-500/15 text-amber-400', OBSOLETE: 'bg-gray-500/15 text-gray-400',
  RETIRED: 'bg-purple-500/15 text-purple-400', UNKNOWN: 'bg-slate-500/15 text-slate-400',
};

const CHECKLIST_ITEMS = [
  { key: 'businessPurposeConfirmed', label: 'Business purpose confirmed?' },
  { key: 'businessOwnerConfirmed', label: 'Business owner confirmed?' },
  { key: 'documentationAvailable', label: 'Documentation available?' },
  { key: 'botCanBeOpened', label: 'Bot can be opened?' },
  { key: 'botCanBeExecuted', label: 'Bot can be executed in test conditions?' },
  { key: 'errorHandlingPresent', label: 'Error handling present?' },
  { key: 'retryLogicPresent', label: 'Retry logic present?' },
  { key: 'loggingPresent', label: 'Logging present?' },
  { key: 'auditTrailPresent', label: 'Audit trail present?' },
  { key: 'hardcodedCredentials', label: 'Hardcoded credentials present?' },
  { key: 'hardcodedFilePaths', label: 'Hardcoded file paths present?' },
  { key: 'usesScreenCoordinates', label: 'Uses screen coordinates?' },
  { key: 'usesUISelectors', label: 'Uses UI selectors?' },
  { key: 'usesReusableSubflows', label: 'Uses reusable subflows/components?' },
  { key: 'duplicateFilePrevention', label: 'Duplicate file prevention present?' },
  { key: 'fileValidationPresent', label: 'File validation present?' },
  { key: 'uploadVerificationPresent', label: 'Upload verification present?' },
  { key: 'alertingPresent', label: 'Alerting present?' },
  { key: 'recoveryProcedureDocumented', label: 'Recovery procedure documented?' },
  { key: 'dependenciesIdentified', label: 'Dependencies identified?' },
  { key: 'accessConfirmed', label: 'Access confirmed?' },
  { key: 'sensitiveDataExposureRisk', label: 'Sensitive data exposure risk?' },
  { key: 'changeVersionInfoAvailable', label: 'Change/version info available?' },
];

const ACTION_TYPES = [
  'PORTAL_LOGIN','BROWSER_NAVIGATION','FILE_DOWNLOAD','FILE_UPLOAD','SFTP_UPLOAD','SFTP_DOWNLOAD',
  'FILE_VALIDATION','FILE_ARCHIVE','EXCEL_READ','EXCEL_WRITE','DATABASE_QUERY','API_CALL',
  'EMAIL_SEND','TEAMS_NOTIFICATION','APPROVAL','DATA_TRANSFORMATION','SCREENSHOT_CAPTURE',
  'ERROR_LOGGING','RETRY','OTHER'
];

const DEP_TYPES = ['PORTAL','APPLICATION','SFTP','API','DATABASE','VM','FOLDER','BROWSER','CREDENTIAL','NETWORK','VPN','SCHEDULER','OTHER'];
const FINDING_CATEGORIES = ['BUSINESS_LOGIC','ARCHITECTURE','PERFORMANCE','MAINTAINABILITY','ERROR_HANDLING','SECURITY','GOVERNANCE','DOCUMENTATION','DEPENDENCY','DATA','SCHEDULING'];
const ROOT_CAUSE_CATS = ['CREDENTIAL_ISSUE','UI_CHANGE','SELECTOR_ISSUE','HARDCODED_PATH','MACHINE_ISSUE','BROWSER_ISSUE','NETWORK_VPN_ISSUE','SFTP_API_ISSUE','FILE_DATA_FORMAT_ISSUE','SCHEDULING_ISSUE','LOGIC_DEFECT','PERMISSION_ISSUE','PROCESS_OBSOLETE','UNKNOWN'];

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, any>>({});

  // Sub-entity add states
  const [newStep, setNewStep] = useState({ actionType: 'OTHER', description: '', systemName: '' });
  const [newDep, setNewDep] = useState({ dependencyType: 'OTHER', name: '' });
  const [newFinding, setNewFinding] = useState({ category: 'DOCUMENTATION', observation: '', priority: 'MEDIUM' });
  const [newRootCause, setNewRootCause] = useState({ failurePoint: '', category: 'UNKNOWN', probableCause: '' });
  const [newRemediation, setNewRemediation] = useState({ title: '', priority: 'MEDIUM', owner: '' });
  const [stepMatches, setStepMatches] = useState<any[]>([]);
  const [stepViewMode, setStepViewMode] = useState<'list' | 'visual'>('list');

  const fetchBot = useCallback(() => {
    setLoading(true);
    fetch(`/api/bots/${botId}`)
      .then(r => r.json())
      .then(data => { setBot(data); setEditFields(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [botId]);

  useEffect(() => { fetchBot(); }, [fetchBot]);

  const saveBot = async (fields: Record<string, any>) => {
    setSaving(true);
    try {
      await fetch(`/api/bots/${botId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      fetchBot();
    } finally { setSaving(false); }
  };

  const addStep = async () => {
    if (!newStep.description.trim()) return;
    const stepOrder = (bot?.steps?.length || 0) + 1;
    const res = await fetch(`/api/bots/${botId}/steps`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newStep, stepOrder }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.matchingSteps) setStepMatches(data.matchingSteps);
      setNewStep({ actionType: 'OTHER', description: '', systemName: '' });
      fetchBot();
    }
  };

  const deleteStep = async (stepId: string) => {
    await fetch(`/api/bots/${botId}/steps?stepId=${stepId}`, { method: 'DELETE' });
    fetchBot();
  };

  const addDependency = async () => {
    if (!newDep.name.trim()) return;
    await fetch(`/api/bots/${botId}/dependencies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDep),
    });
    setNewDep({ dependencyType: 'OTHER', name: '' });
    fetchBot();
  };

  const deleteDependency = async (id: string) => {
    await fetch(`/api/bots/${botId}/dependencies?id=${id}`, { method: 'DELETE' });
    fetchBot();
  };

  const addFinding = async () => {
    if (!newFinding.observation.trim()) return;
    await fetch(`/api/bots/${botId}/findings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newFinding),
    });
    setNewFinding({ category: 'DOCUMENTATION', observation: '', priority: 'MEDIUM' });
    fetchBot();
  };

  const deleteFinding = async (id: string) => {
    await fetch(`/api/bots/${botId}/findings?id=${id}`, { method: 'DELETE' });
    fetchBot();
  };

  const updateFindingStatus = async (id: string, status: string) => {
    await fetch(`/api/bots/${botId}/findings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId: id, status }),
    });
    fetchBot();
  };

  const addRootCause = async () => {
    if (!newRootCause.failurePoint.trim()) return;
    await fetch(`/api/bots/${botId}/root-cause`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRootCause),
    });
    setNewRootCause({ failurePoint: '', category: 'UNKNOWN', probableCause: '' });
    fetchBot();
  };

  const deleteRootCause = async (id: string) => {
    await fetch(`/api/bots/${botId}/root-cause?id=${id}`, { method: 'DELETE' });
    fetchBot();
  };

  const addRemediation = async () => {
    if (!newRemediation.title.trim()) return;
    await fetch(`/api/bots/${botId}/remediation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRemediation),
    });
    setNewRemediation({ title: '', priority: 'MEDIUM', owner: '' });
    fetchBot();
  };

  const deleteRemediation = async (id: string) => {
    await fetch(`/api/bots/${botId}/remediation?id=${id}`, { method: 'DELETE' });
    fetchBot();
  };

  const updateRemediationStatus = async (id: string, status: string) => {
    await fetch(`/api/bots/${botId}/remediation`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchBot();
  };

  const updateChecklist = async (item: string, value: string) => {
    await fetch(`/api/bots/${botId}/checklist`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistItem: item, value }),
    });
    fetchBot();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!bot) return <div className="text-center text-muted-foreground py-12">Bot not found</div>;

  const completeness = bot.completenessScore ?? 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/bots')} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary">{bot.botCode}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[bot.currentStatus]}`}>
                {bot.currentStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-xl font-bold">{bot.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <p className="text-xs text-muted-foreground">Review Completeness</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${completeness}%`,
                  background: completeness > 80 ? '#22c55e' : completeness > 50 ? '#3b82f6' : '#f59e0b'
                }} />
              </div>
              <span className="text-sm font-medium">{completeness}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/50 pb-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary bg-primary/10 border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
            {tab.id === 'findings' && bot.findings.length > 0 && (
              <span className="ml-1 bg-destructive/20 text-destructive text-xs px-1.5 py-0.5 rounded-full">{bot.findings.length}</span>
            )}
            {tab.id === 'steps' && <span className="ml-1 text-xs text-muted-foreground">{bot.steps.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-card/80 p-5 space-y-4">
                <h3 className="text-sm font-semibold">Business Information</h3>
                {[
                  { key: 'businessPurpose', label: 'Business Purpose', type: 'textarea' },
                  { key: 'businessProcess', label: 'Business Process', type: 'text' },
                  { key: 'department', label: 'Department', type: 'text' },
                  { key: 'businessOwner', label: 'Business Owner', type: 'text' },
                  { key: 'technicalOwner', label: 'Technical Owner', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                        rows={3} className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    ) : (
                      <input type="text" value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-card/80 p-5 space-y-4">
                <h3 className="text-sm font-semibold">Technical Details</h3>
                {[
                  { key: 'vendor', label: 'Vendor', type: 'text' },
                  { key: 'technology', label: 'Technology', type: 'select', options: ['PAD','POWER_AUTOMATE_CLOUD','UI_PATH','BLUE_PRISM','AUTOMATION_ANYWHERE','OTHER'] },
                  { key: 'environment', label: 'Environment', type: 'select', options: ['DEFAULT','DEV','UAT','PROD','UNKNOWN'] },
                  { key: 'currentStatus', label: 'Current Status', type: 'select', options: ['UNKNOWN','ACTIVE','FAILED','INACTIVE','OBSOLETE','RETIRED'] },
                  { key: 'reviewStatus', label: 'Review Status', type: 'select', options: ['NOT_STARTED','IN_PROGRESS','COMPLETED','AWAITING_VALIDATION'] },
                  { key: 'criticality', label: 'Criticality', type: 'select', options: ['CRITICAL','HIGH','MEDIUM','LOW'] },
                  { key: 'scheduleOrTrigger', label: 'Schedule / Trigger', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                        {f.options!.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => saveBot(editFields)} disabled={saving}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* STEPS TAB */}
        {activeTab === 'steps' && (
          <div className="space-y-4">
            {/* Add Step */}
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="text-sm font-semibold mb-3">Add Process Step</h3>
              <div className="flex gap-3 items-end">
                <div className="w-48">
                  <label className="text-xs text-muted-foreground mb-1 block">Action Type</label>
                  <select value={newStep.actionType} onChange={e => setNewStep(p => ({ ...p, actionType: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <input type="text" value={newStep.description} onChange={e => setNewStep(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g., Download reconciliation file from NPCI portal"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="w-40">
                  <label className="text-xs text-muted-foreground mb-1 block">System</label>
                  <input type="text" value={newStep.systemName} onChange={e => setNewStep(p => ({ ...p, systemName: e.target.value }))}
                    placeholder="e.g., NPCI Portal"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <button onClick={addStep} disabled={!newStep.description.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Step Matches */}
            {stepMatches.length > 0 && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 animate-fade-in">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">🔍 Similar steps found!</h4>
                {stepMatches.map((m: any, i: number) => (
                  <div key={i} className="text-sm text-muted-foreground py-1">
                    <span className="text-foreground">{m.description}</span> — from <span className="text-primary">{m.bot?.name || 'Unknown bot'}</span>
                    <span className="ml-2 text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">{m.matchType}</span>
                  </div>
                ))}
                <button onClick={() => setStepMatches([])} className="text-xs text-muted-foreground hover:text-foreground mt-2">Dismiss</button>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex justify-end">
              <div className="inline-flex rounded-lg border border-border/50 bg-card p-0.5">
                <button
                  onClick={() => setStepViewMode('list')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    stepViewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setStepViewMode('visual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    stepViewMode === 'visual'
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Visual Workflow
                </button>
              </div>
            </div>

            {/* Step List or Visual Workflow */}
            {stepViewMode === 'list' ? (
              <div className="space-y-2">
                {bot.steps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50">
                    No process steps added yet. Add steps above to document the bot&apos;s workflow.
                  </div>
                ) : bot.steps.map((step: any, i: number) => (
                  <div key={step.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3 group hover:border-border transition-colors">
                    <span className="text-xs font-mono text-muted-foreground w-6 text-center">{i + 1}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md whitespace-nowrap">
                      {step.actionType.replace(/_/g, ' ')}
                    </span>
                    <span className="flex-1 text-sm text-foreground">{step.description}</span>
                    {step.systemName && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{step.systemName}</span>}
                    <button onClick={() => deleteStep(step.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative overflow-x-auto p-8 rounded-xl border border-border/50 bg-card/40 backdrop-blur min-h-[260px] flex items-center justify-start gap-6 scrollbar">
                {bot.steps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50 w-full">
                    No process steps added yet. Add steps above to document the bot&apos;s workflow.
                  </div>
                ) : bot.steps.map((step: any, i: number) => {
                  const isLast = i === bot.steps.length - 1;
                  return (
                    <div key={step.id} className="flex items-center gap-6 flex-shrink-0 animate-fade-in">
                      {/* Step Card */}
                      <div className="relative w-64 p-5 rounded-xl border border-border/50 bg-card/90 shadow-md hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col gap-2.5">
                        <div className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-mono">
                          {i + 1}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-md uppercase tracking-wider">
                            {step.actionType.replace(/_/g, ' ')}
                          </span>
                          {step.systemName && (
                            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={step.systemName}>
                              {step.systemName}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[40px] mt-1" title={step.description}>
                          {step.description}
                        </p>

                        {step.notes && (
                          <p className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1.5 mt-1 line-clamp-1" title={step.notes}>
                            {step.notes}
                          </p>
                        )}
                      </div>

                      {/* Connector Arrow */}
                      {!isLast && (
                        <div className="flex items-center justify-center text-muted-foreground/30">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DEPENDENCIES TAB */}
        {activeTab === 'dependencies' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="text-sm font-semibold mb-3">Add Dependency</h3>
              <div className="flex gap-3 items-end">
                <div className="w-40">
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <select value={newDep.dependencyType} onChange={e => setNewDep(p => ({ ...p, dependencyType: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {DEP_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                  <input type="text" value={newDep.name} onChange={e => setNewDep(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., NPCI Portal, Bank SFTP Server"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <button onClick={addDependency} disabled={!newDep.name.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {bot.dependencies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50">No dependencies added yet.</div>
              ) : bot.dependencies.map((dep: any) => (
                <div key={dep.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3 group hover:border-border transition-colors">
                  <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">{dep.dependencyType}</span>
                  <span className="flex-1 text-sm">{dep.name}</span>
                  {dep.accessConfirmed && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  <button onClick={() => deleteDependency(dep.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="rounded-xl border border-border/50 bg-card/80 p-5">
            <h3 className="text-sm font-semibold mb-4">Technical Review Checklist</h3>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map(item => {
                const existing = bot.checklist.find((c: any) => c.checklistItem === item.key);
                const val = existing?.value || 'NOT_VERIFIED';
                return (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <div className="flex gap-1">
                      {['YES', 'NO', 'NOT_VERIFIED', 'NA'].map(v => (
                        <button key={v} onClick={() => updateChecklist(item.key, v)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            val === v
                              ? v === 'YES' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                                : v === 'NO' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                                : v === 'NA' ? 'bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/30'
                                : 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                              : 'text-muted-foreground hover:bg-white/5'
                          }`}>
                          {v === 'NOT_VERIFIED' ? '?' : v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ROOT CAUSE TAB */}
        {activeTab === 'rootcause' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="text-sm font-semibold mb-3">Add Root Cause Assessment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Failure Point</label>
                  <input type="text" value={newRootCause.failurePoint} onChange={e => setNewRootCause(p => ({ ...p, failurePoint: e.target.value }))}
                    placeholder="e.g., Login step fails"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <select value={newRootCause.category} onChange={e => setNewRootCause(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {ROOT_CAUSE_CATS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Probable Cause</label>
                  <input type="text" value={newRootCause.probableCause} onChange={e => setNewRootCause(p => ({ ...p, probableCause: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <button onClick={addRootCause} disabled={!newRootCause.failurePoint.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
                <Plus className="h-4 w-4 inline mr-1" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {bot.rootCauseAssessments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50">No root cause assessments yet.</div>
              ) : bot.rootCauseAssessments.map((rc: any) => (
                <div key={rc.id} className="rounded-xl border border-border/50 bg-card/80 p-4 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-md">{rc.category.replace(/_/g, ' ')}</span>
                      <p className="text-sm font-medium mt-1">{rc.failurePoint}</p>
                      {rc.probableCause && <p className="text-sm text-muted-foreground mt-1">{rc.probableCause}</p>}
                    </div>
                    <button onClick={() => deleteRootCause(rc.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINDINGS TAB */}
        {activeTab === 'findings' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="text-sm font-semibold mb-3">Add Finding</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <select value={newFinding.category} onChange={e => setNewFinding(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {FINDING_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Observation</label>
                  <input type="text" value={newFinding.observation} onChange={e => setNewFinding(p => ({ ...p, observation: e.target.value }))}
                    placeholder="e.g., Hardcoded SFTP credentials in flow variables"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                  <select value={newFinding.priority} onChange={e => setNewFinding(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addFinding} disabled={!newFinding.observation.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
                <Plus className="h-4 w-4 inline mr-1" /> Add Finding
              </button>
            </div>
            <div className="space-y-2">
              {bot.findings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50">No findings recorded yet.</div>
              ) : bot.findings.map((f: any) => (
                <div key={f.id} className="rounded-xl border border-border/50 bg-card/80 p-4 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">{f.category.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                          f.priority === 'CRITICAL' ? 'bg-red-500/15 text-red-400' :
                          f.priority === 'HIGH' ? 'bg-orange-500/15 text-orange-400' :
                          f.priority === 'MEDIUM' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'
                        }`}>{f.priority}</span>
                        <select value={f.status} onChange={e => updateFindingStatus(f.id, e.target.value)}
                          className="ml-auto text-xs bg-background border border-border/50 rounded px-2 py-1 focus:outline-none">
                          {['OPEN','IN_PROGRESS','BLOCKED','CLOSED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <p className="text-sm">{f.observation}</p>
                    </div>
                    <button onClick={() => deleteFinding(f.id)} className="opacity-0 group-hover:opacity-100 p-1 ml-2 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REMEDIATION TAB */}
        {activeTab === 'remediation' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="text-sm font-semibold mb-3">Add Remediation Task</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                  <input type="text" value={newRemediation.title} onChange={e => setNewRemediation(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Move SFTP credentials to Azure Key Vault"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Owner</label>
                  <input type="text" value={newRemediation.owner} onChange={e => setNewRemediation(p => ({ ...p, owner: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <button onClick={addRemediation} disabled={!newRemediation.title.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
                <Plus className="h-4 w-4 inline mr-1" /> Add Task
              </button>
            </div>
            <div className="space-y-2">
              {bot.remediationTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50">No remediation tasks yet.</div>
              ) : bot.remediationTasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3 group">
                  <select value={t.status} onChange={e => updateRemediationStatus(t.id, e.target.value)}
                    className={`text-xs font-medium rounded-md px-2 py-1 border-0 focus:outline-none ${
                      t.status === 'CLOSED' ? 'bg-green-500/15 text-green-400' :
                      t.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-400' :
                      t.status === 'BLOCKED' ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400'
                    }`}>
                    {['OPEN','IN_PROGRESS','BLOCKED','CLOSED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                  <span className="flex-1 text-sm">{t.title}</span>
                  {t.owner && <span className="text-xs text-muted-foreground">{t.owner}</span>}
                  <button onClick={() => deleteRemediation(t.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECOMMENDATION TAB */}
        {activeTab === 'recommendation' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/80 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Final Recommendation</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">What should be done with this bot?</label>
                <div className="grid grid-cols-3 gap-2">
                  {['RESTORE','REFACTOR','REBUILD','REPLACE','RETIRE','HOLD'].map(r => (
                    <button key={r} onClick={() => setEditFields(p => ({ ...p, finalRecommendation: r }))}
                      className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all ${
                        editFields.finalRecommendation === r
                          ? 'bg-primary/15 border-primary/50 text-primary ring-1 ring-primary/30'
                          : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Review Summary</label>
                <textarea value={editFields.reviewSummary || ''} onChange={e => setEditFields(p => ({ ...p, reviewSummary: e.target.value }))}
                  rows={5} placeholder="Summarize the review findings and rationale for the recommendation..."
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <button onClick={() => saveBot({ ...editFields, reviewStatus: 'COMPLETED' })} disabled={saving}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save & Complete Review'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
