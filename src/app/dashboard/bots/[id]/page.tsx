'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import {
  ArrowLeft, Save, Trash2, Plus, Minus, GripVertical, X,
  CheckCircle2, AlertTriangle, Shield, FileText, GitBranch,
  ClipboardList, Bug, Upload, Wrench, MessageSquare, Activity, Copy,
  Paperclip, FileUp, Briefcase, Server, Calendar, Users, ExternalLink, Globe, Zap, Clock, Hash, BarChart3
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
  
  // Bot Registry Fields
  srNo: number | null;
  projectName: string | null;
  partner: string | null;
  departmentSpoc: string | null;
  vendorSpoc: string | null;
  unitySpoc: string | null;
  startDate: string | null;
  cabDate: string | null;
  nextSteps: string | null;
  effortsInDays: number | null;
  roi: string | null;
  oldBotsNewBots: string | null;
  vendorPaymentStatus: string | null;
  botAssociated: string | null;
  botFrequency: string | null;
  processId: string | null;
  server: string | null;
  botExecutionUserId: string | null;
  docsLinks: string | null;
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

const CHECKLIST_SUGGESTIONS: Record<string, { category: string; observation: string; priority: string }> = {
  businessPurposeConfirmed: { category: 'DOCUMENTATION', observation: 'Business purpose is not confirmed or documented.', priority: 'LOW' },
  businessOwnerConfirmed: { category: 'GOVERNANCE', observation: 'Business owner has not signed off or confirmed ownership.', priority: 'MEDIUM' },
  documentationAvailable: { category: 'DOCUMENTATION', observation: 'Bot documentation (SOP/BRD) is missing or incomplete.', priority: 'MEDIUM' },
  botCanBeOpened: { category: 'MAINTAINABILITY', observation: 'Bot flow file cannot be opened/viewed in builder.', priority: 'HIGH' },
  botCanBeExecuted: { category: 'MAINTAINABILITY', observation: 'Bot cannot be executed under test or sandbox conditions.', priority: 'HIGH' },
  errorHandlingPresent: { category: 'ERROR_HANDLING', observation: 'Global and step-level error handling is not present in the bot flow.', priority: 'HIGH' },
  retryLogicPresent: { category: 'ERROR_HANDLING', observation: 'Retry logic is missing for unstable external network/system connections.', priority: 'MEDIUM' },
  loggingPresent: { category: 'GOVERNANCE', observation: 'Bot execution logs are missing or insufficient for troubleshooting.', priority: 'MEDIUM' },
  auditTrailPresent: { category: 'GOVERNANCE', observation: 'Audit trail of processed records is not stored.', priority: 'MEDIUM' },
  hardcodedCredentials: { category: 'SECURITY', observation: 'Hardcoded credentials were found in plain-text parameters/variables.', priority: 'CRITICAL' },
  hardcodedFilePaths: { category: 'SECURITY', observation: 'Hardcoded local/network file paths were found.', priority: 'MEDIUM' },
  usesScreenCoordinates: { category: 'ARCHITECTURE', observation: 'Uses screen coordinates/pixel offsets instead of object selectors, risking UI breakage.', priority: 'HIGH' },
  usesUISelectors: { category: 'ARCHITECTURE', observation: 'Relies on brittle selectors without timeout standard/fallbacks.', priority: 'MEDIUM' },
  usesReusableSubflows: { category: 'MAINTAINABILITY', observation: 'Does not utilize shared/reusable subflows or modular components.', priority: 'LOW' },
  duplicateFilePrevention: { category: 'DATA', observation: 'Prevention mechanism for duplicate file/record processing is absent.', priority: 'HIGH' },
  fileValidationPresent: { category: 'DATA', observation: 'Schema, format, or size validation is missing before file ingestion.', priority: 'MEDIUM' },
  uploadVerificationPresent: { category: 'DATA', observation: 'Verification step after upload/transfer (like checking size or success response) is missing.', priority: 'MEDIUM' },
  alertingPresent: { category: 'ERROR_HANDLING', observation: 'Alerting notifications (Teams/Email) on bot failures are missing.', priority: 'HIGH' },
  recoveryProcedureDocumented: { category: 'DOCUMENTATION', observation: 'Recovery and manual fallback procedures are not documented in the runbook.', priority: 'MEDIUM' },
  dependenciesIdentified: { category: 'DEPENDENCY', observation: 'System or application dependencies are not fully identified/listed.', priority: 'MEDIUM' },
  accessConfirmed: { category: 'SECURITY', observation: 'Access credentials and network permissions are not confirmed for run systems.', priority: 'MEDIUM' },
  sensitiveDataExposureRisk: { category: 'SECURITY', observation: 'Risk of sensitive data exposure (PII/credentials) in logs or temporary files.', priority: 'CRITICAL' },
  changeVersionInfoAvailable: { category: 'DOCUMENTATION', observation: 'Change logs, release notes, or version metadata are not maintained.', priority: 'LOW' },
};

export default function BotDetailPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;
  const { toast } = useToast();
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneConfirmOpen, setCloneConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; label: string } | null>(null);
  const [checklistFindingSuggestion, setChecklistFindingSuggestion] = useState<{ category: string; observation: string; priority: string } | null>(null);
  const [findingTaskSuggestion, setFindingTaskSuggestion] = useState<{ title: string; priority: string } | null>(null);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('SCREENSHOT');

  // Sub-entity add states
  const [newStep, setNewStep] = useState({ actionType: 'OTHER', description: '', systemName: '', tags: [] as string[] });
  const [newDep, setNewDep] = useState({ dependencyType: 'OTHER', name: '' });
  const [newFinding, setNewFinding] = useState({ category: 'DOCUMENTATION', observation: '', priority: 'MEDIUM' });
  const [newRootCause, setNewRootCause] = useState({ failurePoint: '', category: 'UNKNOWN', probableCause: '' });
  const [newRemediation, setNewRemediation] = useState({ title: '', priority: 'MEDIUM', owner: '' });
  const [stepMatches, setStepMatches] = useState<any[]>([]);
  const [stepViewMode, setStepViewMode] = useState<'list' | 'visual'>('list');
  const [depViewMode, setDepViewMode] = useState<'list' | 'graph'>('list');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const mermaidCode = useMemo(() => {
    if (!bot) return '';
    let code = 'graph TD;\n';
    code += `  Bot["${bot.name}"]\n`;
    bot.dependencies?.forEach((dep: any, i: number) => {
      code += `  Dep${i}["${dep.name} (${dep.dependencyType})"]\n`;
      code += `  Bot -->|Uses| Dep${i}\n`;
    });
    bot.steps?.forEach((step: any, i: number) => {
      if (step.systemName) {
        code += `  Sys${i}["${step.systemName}"]\n`;
        code += `  Bot -.->|Step ${i+1}| Sys${i}\n`;
      }
    });
    return code;
  }, [bot]);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'dependencies' && depViewMode === 'graph' && mermaidRef.current) {
      if (typeof (window as any).mermaid !== 'undefined') {
        const renderGraph = async () => {
          try {
            const { svg } = await (window as any).mermaid.render('mermaid-svg-' + botId, mermaidCode);
            if (isMounted && mermaidRef.current) {
              mermaidRef.current.innerHTML = svg;
            }
          } catch (e) {
            console.error('Mermaid render error', e);
          }
        };
        renderGraph();
      }
    }
    return () => { isMounted = false; };
  }, [activeTab, depViewMode, mermaidCode, botId]);

  const fetchBot = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}`);
      if (res.ok) {
        const data = await res.json();
        setBot(data);
        setEditFields(data);
      }
      const evRes = await fetch(`/api/bots/${botId}/evidence`);
      if (evRes.ok) {
        setEvidence(await evRes.json());
      }
      const auditRes = await fetch(`/api/bots/${botId}/audit`);
      if (auditRes.ok) {
        setAuditLogs(await auditRes.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => { fetchBot(); }, [fetchBot]);

  useEffect(() => {
    const text = (newStep.description + " " + newStep.systemName).toLowerCase();
    const suggestions = new Set<string>();
    
    if (text.includes('download') || text.includes('sftp') || text.includes('ftp')) {
      suggestions.add('file-transfer');
      if (text.includes('sftp')) suggestions.add('sftp');
    }
    if (text.includes('login') || text.includes('portal') || text.includes('auth')) {
      suggestions.add('authentication');
      suggestions.add('portal');
    }
    if (text.includes('email') || text.includes('notify') || text.includes('mail')) {
      suggestions.add('notification');
      suggestions.add('email');
    }
    if (text.includes('excel') || text.includes('csv') || text.includes('macro')) {
      suggestions.add('excel');
      suggestions.add('data-processing');
    }
    if (text.includes('api') || text.includes('rest') || text.includes('http')) {
      suggestions.add('api');
      suggestions.add('integration');
    }
    if (text.includes('sap')) {
      suggestions.add('sap');
      suggestions.add('erp');
    }

    setSuggestedTags(Array.from(suggestions));
  }, [newStep.description, newStep.systemName]);

  const saveBot = async (fields: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        toast({ title: "Overview Saved", description: "Successfully updated bot details." });
        fetchBot();
      } else {
        toast({ title: "Error Saving", description: "Failed to update bot details.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const uploadEvidence = async () => {
    if (!evidenceFile) return;
    setUploadingEvidence(true);
    try {
      const formData = new FormData();
      formData.append('file', evidenceFile);
      formData.append('evidenceType', evidenceType);
      
      const res = await fetch(`/api/bots/${botId}/evidence`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Evidence Uploaded", description: "File successfully attached." });
        setEvidenceFile(null);
        fetchBot();
      } else {
        toast({ title: "Upload Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleClone = () => {
    setCloneConfirmOpen(true);
  };

  const confirmClone = async () => {
    setCloning(true);
    try {
      const res = await fetch(`/api/bots/${botId}/clone`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Bot Cloned", description: `Successfully created clone: ${data.botCode}` });
        router.push(`/dashboard/bots/${data.id}`);
      } else {
        toast({ title: "Error Cloning Bot", description: data.error || "Failed to clone bot.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred while cloning.", variant: "destructive" });
    } finally { 
      setCloning(false); 
      setCloneConfirmOpen(false);
    }
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
      setNewStep({ actionType: 'OTHER', description: '', systemName: '', tags: [] });
      toast({ title: "Step Added", description: "Successfully added step to the workflow." });
      fetchBot();
    } else {
      toast({ title: "Error Adding Step", description: "Failed to add step.", variant: "destructive" });
    }
  };

  const handleStepDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStepIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStepDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStepDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedStepIndex === null || draggedStepIndex === dropIndex) return;

    const reordered = [...bot!.steps];
    const [moved] = reordered.splice(draggedStepIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const payload = reordered.map((step, idx) => ({
      id: step.id,
      stepOrder: idx + 1,
    }));

    try {
      const res = await fetch(`/api/bots/${botId}/steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: "Workflow Reordered", description: "Successfully updated step sequence." });
        fetchBot();
      } else {
        toast({ title: "Error Reordering", description: "Failed to save workflow order.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setDraggedStepIndex(null);
    }
  };

  const deleteStep = async (stepId: string) => {
    setDeleteConfirm({ type: 'step', id: stepId, label: 'process step' });
  };

  const executeDeleteStep = async (stepId: string) => {
    const res = await fetch(`/api/bots/${botId}/steps?stepId=${stepId}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: "Step Deleted", description: "Successfully removed step from the workflow." });
      fetchBot();
    } else {
      toast({ title: "Error Deleting Step", description: "Failed to delete step.", variant: "destructive" });
    }
  };

  const addDependency = async () => {
    if (!newDep.name.trim()) return;
    const res = await fetch(`/api/bots/${botId}/dependencies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDep),
    });
    if (res.ok) {
      setNewDep({ dependencyType: 'OTHER', name: '' });
      toast({ title: "Dependency Added", description: "Successfully added dependency." });
      fetchBot();
    } else {
      toast({ title: "Error Adding Dependency", description: "Failed to add dependency.", variant: "destructive" });
    }
  };

  const deleteDependency = async (id: string) => {
    setDeleteConfirm({ type: 'dependency', id, label: 'dependency' });
  };

  const executeDeleteDependency = async (id: string) => {
    const res = await fetch(`/api/bots/${botId}/dependencies?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: "Dependency Deleted", description: "Successfully removed dependency." });
      fetchBot();
    } else {
      toast({ title: "Error Deleting Dependency", description: "Failed to delete dependency.", variant: "destructive" });
    }
  };

  const addFinding = async () => {
    if (!newFinding.observation.trim()) return;
    const res = await fetch(`/api/bots/${botId}/findings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newFinding),
    });
    if (res.ok) {
      toast({ title: "Finding Recorded", description: "Successfully added finding." });
      // If critical or high, prompt task suggestion
      if (newFinding.priority === 'CRITICAL' || newFinding.priority === 'HIGH') {
        setFindingTaskSuggestion({
          title: `Address finding: ${newFinding.observation}`,
          priority: newFinding.priority,
        });
      }
      setNewFinding({ category: 'DOCUMENTATION', observation: '', priority: 'MEDIUM' });
      fetchBot();
    } else {
      toast({ title: "Error Recording Finding", description: "Failed to record finding.", variant: "destructive" });
    }
  };

  const createRemediationFromFinding = async () => {
    if (!findingTaskSuggestion) return;
    const res = await fetch(`/api/bots/${botId}/remediation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: findingTaskSuggestion.title,
        priority: findingTaskSuggestion.priority,
        owner: '',
      }),
    });
    if (res.ok) {
      toast({ title: "Remediation Task Created", description: "Task successfully generated and linked to this finding." });
      fetchBot();
    } else {
      toast({ title: "Error Creating Task", description: "Failed to auto-create remediation task.", variant: "destructive" });
    }
    setFindingTaskSuggestion(null);
  };

  const deleteFinding = async (id: string) => {
    setDeleteConfirm({ type: 'finding', id, label: 'finding' });
  };

  const executeDeleteFinding = async (id: string) => {
    const res = await fetch(`/api/bots/${botId}/findings?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: "Finding Deleted", description: "Successfully removed finding." });
      fetchBot();
    } else {
      toast({ title: "Error Deleting Finding", description: "Failed to delete finding.", variant: "destructive" });
    }
  };

  const updateFindingStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/bots/${botId}/findings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId: id, status }),
    });
    if (res.ok) {
      toast({ title: "Finding Updated", description: `Finding status set to ${status.replace(/_/g, ' ')}.` });
      fetchBot();
    } else {
      toast({ title: "Error Updating Finding", description: "Failed to update finding status.", variant: "destructive" });
    }
  };

  const addRootCause = async () => {
    if (!newRootCause.failurePoint.trim()) return;
    const res = await fetch(`/api/bots/${botId}/root-cause`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRootCause),
    });
    if (res.ok) {
      setNewRootCause({ failurePoint: '', category: 'UNKNOWN', probableCause: '' });
      toast({ title: "Root Cause Added", description: "Successfully recorded root cause assessment." });
      fetchBot();
    } else {
      toast({ title: "Error Adding Assessment", description: "Failed to add root cause assessment.", variant: "destructive" });
    }
  };

  const deleteRootCause = async (id: string) => {
    setDeleteConfirm({ type: 'rootcause', id, label: 'root cause assessment' });
  };

  const executeDeleteRootCause = async (id: string) => {
    const res = await fetch(`/api/bots/${botId}/root-cause?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: "Assessment Deleted", description: "Successfully removed root cause assessment." });
      fetchBot();
    } else {
      toast({ title: "Error Deleting Assessment", description: "Failed to delete root cause assessment.", variant: "destructive" });
    }
  };

  const addRemediation = async () => {
    if (!newRemediation.title.trim()) return;
    const res = await fetch(`/api/bots/${botId}/remediation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRemediation),
    });
    if (res.ok) {
      setNewRemediation({ title: '', priority: 'MEDIUM', owner: '' });
      toast({ title: "Task Added", description: "Successfully added remediation task." });
      fetchBot();
    } else {
      toast({ title: "Error Adding Task", description: "Failed to add remediation task.", variant: "destructive" });
    }
  };

  const deleteRemediation = async (id: string) => {
    setDeleteConfirm({ type: 'remediation', id, label: 'remediation task' });
  };

  const executeDeleteRemediation = async (id: string) => {
    const res = await fetch(`/api/bots/${botId}/remediation?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: "Task Deleted", description: "Successfully removed remediation task." });
      fetchBot();
    } else {
      toast({ title: "Error Deleting Task", description: "Failed to delete remediation task.", variant: "destructive" });
    }
  };

  const confirmGenericDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    if (type === 'step') await executeDeleteStep(id);
    else if (type === 'dependency') await executeDeleteDependency(id);
    else if (type === 'finding') await executeDeleteFinding(id);
    else if (type === 'rootcause') await executeDeleteRootCause(id);
    else if (type === 'remediation') await executeDeleteRemediation(id);
    setDeleteConfirm(null);
  };

  const updateRemediationStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/bots/${botId}/remediation`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: id, status }),
    });
    if (res.ok) {
      toast({ title: "Task Updated", description: `Task status set to ${status.replace(/_/g, ' ')}.` });
      fetchBot();
    } else {
      toast({ title: "Error Updating Task", description: "Failed to update task status.", variant: "destructive" });
    }
  };

  const updateChecklist = async (item: string, value: string) => {
    const res = await fetch(`/api/bots/${botId}/checklist`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistItem: item, value }),
    });
    if (res.ok) {
      toast({ title: "Checklist Updated", description: "Successfully updated checklist item." });
      if (value === 'NO' && CHECKLIST_SUGGESTIONS[item]) {
        setChecklistFindingSuggestion({
          category: CHECKLIST_SUGGESTIONS[item].category,
          observation: CHECKLIST_SUGGESTIONS[item].observation,
          priority: CHECKLIST_SUGGESTIONS[item].priority,
        });
      }
      fetchBot();
    } else {
      toast({ title: "Error Updating Checklist", description: "Failed to update checklist item.", variant: "destructive" });
    }
  };

  const createFindingFromChecklist = async () => {
    if (!checklistFindingSuggestion) return;
    const res = await fetch(`/api/bots/${botId}/findings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: checklistFindingSuggestion.category,
        observation: checklistFindingSuggestion.observation,
        priority: checklistFindingSuggestion.priority,
      }),
    });
    if (res.ok) {
      toast({ title: "Finding Created", description: "Finding successfully generated from checklist item." });
      fetchBot();
    } else {
      toast({ title: "Error Creating Finding", description: "Failed to auto-create finding.", variant: "destructive" });
    }
    setChecklistFindingSuggestion(null);
  };


  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-muted/65 rounded-lg" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-muted/65 rounded" />
              <div className="h-5 w-20 bg-muted/50 rounded-full" />
            </div>
            <div className="h-6 w-56 bg-muted/65 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1 text-right">
            <div className="h-3 w-28 bg-muted/65 rounded" />
            <div className="h-4 w-36 bg-muted/50 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border/50 pb-0">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-10 w-28 bg-muted/30 rounded-t-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/85 p-5 space-y-4">
            <div className="h-4 w-36 bg-muted/65 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-24 bg-muted/65 rounded" />
                <div className="h-9 w-full bg-muted/35 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/85 p-5 space-y-4">
            <div className="h-4 w-36 bg-muted/65 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-24 bg-muted/65 rounded" />
                <div className="h-9 w-full bg-muted/35 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!bot) return <div className="text-center text-muted-foreground py-12">Bot not found</div>;

  const completeness = bot.completenessScore ?? 0;

  // Health Score Calculation
  const checklistTotal = bot?.checklist?.length || 0;
  const checklistYes = bot?.checklist?.filter((c: any) => c.value === 'YES').length || 0;
  const checklistRate = checklistTotal ? checklistYes / checklistTotal : 0;
  
  const openCriticalFindings = bot?.findings?.filter((f: any) => (f.priority === 'CRITICAL' || f.priority === 'HIGH') && f.status !== 'CLOSED').length || 0;
  
  const healthScore = Math.round(
    (completeness * 0.30) + 
    (openCriticalFindings === 0 ? 25 : 0) + 
    (bot?.currentStatus === 'ACTIVE' ? 20 : 10) +
    (checklistRate * 15) +
    (bot?.businessOwner ? 10 : 0)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js" strategy="lazyOnload" onLoad={() => {
        (window as any).mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      }} />

      {/* ── HERO HEADER ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/[0.03]">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/[0.02] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Back + Bot Identity */}
            <div className="flex items-start gap-4">
              <button onClick={() => router.push('/dashboard/bots')} className="mt-1 p-2.5 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 transition-all hover:scale-105 active:scale-95">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-sm text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 font-bold tracking-wider">{bot.botCode}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${STATUS_STYLES[bot.currentStatus]} ${
                    bot.currentStatus === 'ACTIVE' ? 'border-green-500/30' :
                    bot.currentStatus === 'FAILED' ? 'border-red-500/30' :
                    bot.currentStatus === 'INACTIVE' ? 'border-amber-500/30' : 'border-border/50'
                  }`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                      bot.currentStatus === 'ACTIVE' ? 'bg-green-400 animate-pulse' :
                      bot.currentStatus === 'FAILED' ? 'bg-red-400' :
                      bot.currentStatus === 'INACTIVE' ? 'bg-amber-400' : 'bg-gray-400'
                    }`} />
                    {bot.currentStatus.replace(/_/g, ' ')}
                  </span>
                  {bot.criticality && (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                      bot.criticality === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      bot.criticality === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      bot.criticality === 'MEDIUM' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {bot.criticality} Priority
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{bot.name}</h1>
                {bot.businessPurpose && (
                  <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed line-clamp-2">{bot.businessPurpose}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  {bot.vendor && <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" />{bot.vendor}</span>}
                  {bot.technology && <span className="flex items-center gap-1.5"><Server className="h-3 w-3" />{bot.technology.replace(/_/g, ' ')}</span>}
                  {bot.department && <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{bot.department}</span>}
                  {bot.environment && <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" />{bot.environment}</span>}
                </div>
              </div>
            </div>

            {/* Right: Scores + Actions */}
            <div className="flex items-center gap-5 flex-shrink-0">
              {/* Completeness Gauge */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative h-16 w-16 flex items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-muted/30 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="2.5" />
                    <path className="text-blue-500 stroke-current transition-all duration-1000 ease-out" strokeDasharray={`${completeness}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-sm font-bold">{completeness}<span className="text-[10px] text-muted-foreground">%</span></span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Complete</span>
              </div>

              {/* Health Score Gauge */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative h-16 w-16 flex items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-muted/30 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="2.5" />
                    <path className={`${healthScore > 80 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-rose-500'} stroke-current transition-all duration-1000 ease-out`} strokeDasharray={`${healthScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-sm font-bold">{healthScore}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Health</span>
              </div>

              {/* Divider */}
              <div className="w-px h-12 bg-border/50" />

              {/* Review Sign-off and Validation Actions */}
              {(bot.reviewStatus === 'NOT_STARTED' || bot.reviewStatus === 'IN_PROGRESS') && (
                <button
                  onClick={() => saveBot({ ...editFields, reviewStatus: 'AWAITING_VALIDATION' })}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-amber-500/5 active:scale-95"
                >
                  <Clock className="h-4 w-4" /> Submit for Validation
                </button>
              )}

              {bot.reviewStatus === 'AWAITING_VALIDATION' && (
                userRole === 'ADMIN' ? (
                  <button
                    onClick={() => saveBot({ ...editFields, reviewStatus: 'COMPLETED' })}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-500/5 active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve & Sign-off
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 text-amber-500/70 border border-amber-500/10 rounded-xl text-sm font-medium">
                    <Clock className="h-4 w-4 animate-pulse" /> Pending Validation
                  </div>
                )
              )}

              {bot.reviewStatus === 'COMPLETED' && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/5 text-emerald-500/80 border border-emerald-500/20 rounded-xl text-sm font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Verified & Complete
                </div>
              )}

              {userRole === 'ADMIN' && (
                <button onClick={handleClone} disabled={cloning}
                  className="flex items-center gap-2 px-4 py-2.5 bg-card hover:bg-muted border border-border/50 rounded-xl text-sm font-medium disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm">
                  <Copy className="h-4 w-4 text-primary" /> {cloning ? 'Cloning...' : 'Clone Bot'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-0 -mb-px">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap group ${
              activeTab === tab.id
                ? 'text-primary bg-card border border-border/50 border-b-transparent shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}>
            <tab.icon className={`h-4 w-4 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
            {tab.label}
            {tab.id === 'findings' && bot.findings.length > 0 && (
              <span className="ml-1 bg-red-500/15 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{bot.findings.length}</span>
            )}
            {tab.id === 'steps' && bot.steps.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{bot.steps.length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="border-t border-border/50 -mt-6" />

      {/* Tab Content */}
      <div className="animate-fade-in pt-2">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT COLUMN ── */}
            <div className="space-y-6">
              {/* Business Information */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-blue-500/10"><Briefcase className="h-3.5 w-3.5 text-blue-400" /></div>
                  <h3 className="text-sm font-bold">Business Information</h3>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { key: 'businessPurpose', label: 'Business Purpose', type: 'textarea' },
                    { key: 'businessProcess', label: 'Business Process', type: 'text' },
                    { key: 'department', label: 'Department', type: 'text' },
                    { key: 'businessOwner', label: 'Business Owner', type: 'text' },
                    { key: 'technicalOwner', label: 'Technical Owner', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-muted-foreground mb-1 block font-medium">{f.label}</label>
                      {f.type === 'textarea' ? (
                        <textarea value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                          disabled={userRole === 'VIEWER'}
                          rows={2} className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-60" />
                      ) : (
                        <input type="text" value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                          disabled={userRole === 'VIEWER'}
                          className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-60" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Technical Details */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-cyan-500/10"><Server className="h-3.5 w-3.5 text-cyan-400" /></div>
                  <h3 className="text-sm font-bold">Technical Details</h3>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  {[
                    { key: 'vendor', label: 'Vendor', type: 'text' },
                    { key: 'technology', label: 'Technology', type: 'select', options: ['PAD','POWER_AUTOMATE_CLOUD','UI_PATH','BLUE_PRISM','AUTOMATION_ANYWHERE','OTHER'] },
                    { key: 'environment', label: 'Environment', type: 'select', options: ['DEFAULT','DEV','UAT','PROD','UNKNOWN'] },
                    { key: 'currentStatus', label: 'Current Status', type: 'select', options: ['UNKNOWN','ACTIVE','FAILED','INACTIVE','OBSOLETE','RETIRED'] },
                    { key: 'reviewStatus', label: 'Review Status', type: 'select', options: ['NOT_STARTED','IN_PROGRESS','COMPLETED','AWAITING_VALIDATION'] },
                    { key: 'criticality', label: 'Criticality', type: 'select', options: ['CRITICAL','HIGH','MEDIUM','LOW'] },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-muted-foreground mb-1 block font-medium">{f.label}</label>
                      {f.type === 'select' ? (
                        <select value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                          disabled={userRole === 'VIEWER'}
                          className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60">
                          {f.options!.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                          disabled={userRole === 'VIEWER'}
                          className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60" />
                      )}
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block font-medium">Schedule / Trigger</label>
                    <input type="text" value={editFields['scheduleOrTrigger'] || ''} onChange={e => setEditFields(p => ({ ...p, scheduleOrTrigger: e.target.value }))}
                      disabled={userRole === 'VIEWER'}
                      className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60" />
                  </div>
                </div>
              </div>

              {/* Documentation Links */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-500/10"><FileText className="h-3.5 w-3.5 text-amber-400" /></div>
                  <h3 className="text-sm font-bold">Documentation</h3>
                </div>
                {(() => {
                  let docs: Record<string, string> = {};
                  try { docs = JSON.parse(editFields['docsLinks'] || '{}'); } 
                  catch { docs = { Other: editFields['docsLinks'] || '' }; }
                  return (
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {['SOP', 'BRD', 'FSD', 'Other'].map(type => (
                          <button key={type}
                            onClick={() => docs[type] && window.open(docs[type], '_blank')}
                            disabled={!docs[type]}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              docs[type] 
                                ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer' 
                                : 'bg-muted/30 text-muted-foreground border-border/30 cursor-not-allowed opacity-50'
                            }`}>
                            <ExternalLink className="h-3 w-3" />
                            {type}
                            {docs[type] && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                          </button>
                        ))}
                      </div>
                      {userRole !== 'VIEWER' && (
                        <div className="space-y-2 border-t border-border/30 pt-3">
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Edit Links</label>
                          {['SOP', 'BRD', 'FSD', 'Other'].map(type => (
                            <div key={type} className="flex items-center gap-2">
                              <span className="text-[10px] font-bold w-9 text-muted-foreground uppercase">{type}</span>
                              <input type="text" placeholder={`Paste ${type} URL...`} value={docs[type] || ''}
                                onChange={e => {
                                  const newDocs = { ...docs };
                                  if (e.target.value.trim()) newDocs[type] = e.target.value.trim();
                                  else delete newDocs[type];
                                  setEditFields(p => ({ ...p, docsLinks: Object.keys(newDocs).length ? JSON.stringify(newDocs) : null }));
                                }}
                                className="flex-1 px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-6">
              {/* Registry Information */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-violet-500/10"><Hash className="h-3.5 w-3.5 text-violet-400" /></div>
                  <h3 className="text-sm font-bold">Registry Information</h3>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  {[
                    { key: 'projectName', label: 'Project Name' },
                    { key: 'partner', label: 'Partner' },
                    { key: 'processId', label: 'Process ID' },
                    { key: 'departmentSpoc', label: 'Dept SPOC' },
                    { key: 'vendorSpoc', label: 'Vendor SPOC' },
                    { key: 'unitySpoc', label: 'Unity SPOC' },
                    { key: 'roi', label: 'ROI (Time / FTE)' },
                    { key: 'oldBotsNewBots', label: 'Old/New Bots' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-muted-foreground mb-1 block font-medium">{f.label}</label>
                      <input type="text" value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                        disabled={userRole === 'VIEWER'}
                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block font-medium">Vendor Payment Status</label>
                    <input type="text" value={editFields['vendorPaymentStatus'] || ''} onChange={e => setEditFields(p => ({ ...p, vendorPaymentStatus: e.target.value }))}
                      disabled={userRole === 'VIEWER'}
                      className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60" />
                  </div>
                </div>
              </div>
              
              {/* Operations & Infrastructure */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-500/10"><Zap className="h-3.5 w-3.5 text-emerald-400" /></div>
                  <h3 className="text-sm font-bold">Operations & Infra</h3>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  {[
                    { key: 'server', label: 'Server', type: 'text' },
                    { key: 'botExecutionUserId', label: 'Execution User ID', type: 'text' },
                    { key: 'botAssociated', label: 'Bot Associated', type: 'text' },
                    { key: 'botFrequency', label: 'Bot Frequency', type: 'text' },
                    { key: 'startDate', label: 'Start Date', type: 'text' },
                    { key: 'cabDate', label: 'CAB Date', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-muted-foreground mb-1 block font-medium">{f.label}</label>
                      <input type={f.type} value={editFields[f.key] || ''} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                        disabled={userRole === 'VIEWER'}
                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block font-medium">Efforts (Days)</label>
                    <input type="number" value={editFields['effortsInDays'] || ''} onChange={e => setEditFields(p => ({ ...p, effortsInDays: Number(e.target.value) }))}
                      disabled={userRole === 'VIEWER'}
                      className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60" />
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-pink-500/10"><BarChart3 className="h-3.5 w-3.5 text-pink-400" /></div>
                  <h3 className="text-sm font-bold">Next Steps</h3>
                </div>
                <div className="p-5">
                  <textarea value={editFields['nextSteps'] || ''} onChange={e => setEditFields(p => ({ ...p, nextSteps: e.target.value }))}
                    disabled={userRole === 'VIEWER'}
                    rows={3} placeholder="Outline the next steps for this bot..."
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60 placeholder:text-muted-foreground/50" />
                </div>
              </div>

              {/* Save Button */}
              {userRole !== 'VIEWER' && (
                <button onClick={() => saveBot(editFields)} disabled={saving}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEPS TAB */}
        {activeTab === 'steps' && (
          <div className="space-y-4">
            {/* Add Step */}
            {userRole !== 'VIEWER' && (
              <div className="rounded-xl border border-border/50 bg-card/80 p-4">
                <h3 className="text-sm font-semibold mb-3">Add Process Step</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Action Type</label>
                  <select value={newStep.actionType} onChange={e => setNewStep(p => ({ ...p, actionType: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <input type="text" value={newStep.description} onChange={e => setNewStep(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g., Download reconciliation file from NPCI portal"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">System</label>
                  <input type="text" value={newStep.systemName} onChange={e => setNewStep(p => ({ ...p, systemName: e.target.value }))}
                    placeholder="e.g., NPCI Portal"
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              {suggestedTags.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">Suggested Tags <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">Click to apply</span></label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {suggestedTags.map(tag => (
                      <button key={tag} onClick={() => setNewStep(p => ({ ...p, tags: [...new Set([...p.tags, tag])] }))} 
                        className="px-2 py-0.5 rounded-full bg-secondary/50 hover:bg-secondary text-secondary-foreground text-xs border border-border/50 transition-colors">
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button onClick={addStep} disabled={!newStep.description.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                  <Plus className="h-4 w-4 inline mr-2" /> Add Step
                </button>
              </div>
            </div>
            )}

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
                  <div key={step.id} 
                    draggable={userRole !== 'VIEWER'}
                    onDragStart={(e) => handleStepDragStart(e, i)}
                    onDragOver={handleStepDragOver}
                    onDrop={(e) => handleStepDrop(e, i)}
                    className={`flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3 group hover:border-border transition-colors ${
                      userRole !== 'VIEWER' ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-6 text-center">{i + 1}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md whitespace-nowrap">
                      {step.actionType.replace(/_/g, ' ')}
                    </span>
                    <span className="flex-1 text-sm text-foreground">{step.description}</span>
                    {step.systemName && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{step.systemName}</span>}
                    {userRole !== 'VIEWER' && (
                      <button onClick={() => deleteStep(step.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
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
                      <div 
                        draggable={userRole !== 'VIEWER'}
                        onDragStart={(e) => handleStepDragStart(e, i)}
                        onDragOver={handleStepDragOver}
                        onDrop={(e) => handleStepDrop(e, i)}
                        className={`relative w-64 p-5 rounded-xl border border-border/50 bg-card/90 shadow-md hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col gap-2.5 ${
                          userRole !== 'VIEWER' ? 'cursor-grab active:cursor-grabbing' : ''
                        }`}
                      >
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
            <div className="flex items-center justify-between">
              <div className="flex bg-muted/50 p-1 rounded-lg">
                <button onClick={() => setDepViewMode('list')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${depViewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>List View</button>
                <button onClick={() => setDepViewMode('graph')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${depViewMode === 'graph' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Graph View</button>
              </div>
            </div>

            {depViewMode === 'list' ? (
              <>
                {userRole !== 'VIEWER' && (
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
                )}
                <div className="space-y-2">
                  {bot.dependencies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50">No dependencies added yet.</div>
                  ) : bot.dependencies.map((dep: any) => (
                    <div key={dep.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3 group hover:border-border transition-colors">
                      <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">{dep.dependencyType}</span>
                      <span className="flex-1 text-sm">{dep.name}</span>
                      {dep.accessConfirmed && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                      {userRole !== 'VIEWER' && (
                        <button onClick={() => deleteDependency(dep.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="relative rounded-xl border border-border/50 bg-card/80 p-6 min-h-[500px] flex flex-col overflow-hidden">
                <div className="absolute top-4 right-4 z-10 flex gap-1 bg-background/80 backdrop-blur-sm border border-border/50 p-1 rounded-lg shadow-sm">
                  <button onClick={() => setZoomLevel(z => Math.max(z - 0.2, 0.4))} className="p-1.5 hover:bg-muted rounded text-foreground transition-colors" title="Zoom Out">
                    <Minus className="w-4 h-4" />
                  </button>
                  <button onClick={() => setZoomLevel(1)} className="px-2 text-xs font-medium hover:bg-muted rounded text-foreground transition-colors" title="Reset Zoom">
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button onClick={() => setZoomLevel(z => Math.min(z + 0.2, 3))} className="p-1.5 hover:bg-muted rounded text-foreground transition-colors" title="Zoom In">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 w-full h-full overflow-auto flex">
                  <div 
                    ref={mermaidRef} 
                    className="mermaid-container m-auto transition-all duration-200 ease-out"
                    style={{ zoom: zoomLevel }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVIDENCE TAB */}
        {activeTab === 'evidence' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Paperclip className="h-5 w-5 text-blue-400" /> Attached Evidence</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {userRole !== 'VIEWER' && (
                <div className="col-span-1 border border-border/50 bg-card rounded-xl p-5 h-fit">
                  <h4 className="font-medium mb-4 flex items-center gap-2"><FileUp className="h-4 w-4 text-muted-foreground" /> Upload New Evidence</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Evidence Type</label>
                    <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)} className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      {['SCREENSHOT', 'PAD_EXPORT', 'BRD', 'ERROR_LOG', 'OTHER'].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">File</label>
                    <input type="file" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors" />
                  </div>
                  <button onClick={uploadEvidence} disabled={!evidenceFile || uploadingEvidence} className="w-full flex justify-center items-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {uploadingEvidence ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              </div>
              )}

              <div className={userRole === 'VIEWER' ? 'col-span-3 space-y-3' : 'col-span-2 space-y-3'}>
                {evidence.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border/50 rounded-xl bg-muted/20">
                    <p className="text-sm text-muted-foreground">No evidence attached yet.</p>
                  </div>
                ) : (
                  evidence.map((ev: any) => (
                    <div key={ev.id} className="flex items-center justify-between p-4 border border-border/50 bg-card rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ev.fileName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono">{ev.evidenceType}</span>
                            <span className="text-xs text-muted-foreground">Uploaded on {new Date(ev.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <a href={ev.filePath} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">View / Download</a>
                    </div>
                  ))
                )}
              </div>
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
                          disabled={userRole === 'VIEWER'}
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
            {userRole !== 'VIEWER' && (
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
            )}
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
                    {userRole !== 'VIEWER' && (
                      <button onClick={() => deleteRootCause(rc.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINDINGS TAB */}
        {activeTab === 'findings' && (
          <div className="space-y-4">
            {userRole !== 'VIEWER' && (
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
            )}
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
                          disabled={userRole === 'VIEWER'}
                          className="ml-auto text-xs bg-background border border-border/50 rounded px-2 py-1 focus:outline-none">
                          {['OPEN','IN_PROGRESS','BLOCKED','CLOSED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <p className="text-sm">{f.observation}</p>
                    </div>
                    {userRole !== 'VIEWER' && (
                      <button onClick={() => deleteFinding(f.id)} className="opacity-0 group-hover:opacity-100 p-1 ml-2 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REMEDIATION TAB */}
        {activeTab === 'remediation' && (
          <div className="space-y-6">
            {userRole !== 'VIEWER' && (
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
            )}
            
            {/* Kanban Board */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['OPEN', 'IN_PROGRESS', 'BLOCKED', 'CLOSED'].map((columnStatus) => (
                <div 
                  key={columnStatus} 
                  className="rounded-xl border border-border/50 bg-card/40 flex flex-col h-[500px]"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('bg-primary/5'); }}
                  onDrop={(e) => {
                    if (userRole === 'VIEWER') return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-primary/5');
                    const taskId = e.dataTransfer.getData('text/plain');
                    if (taskId) updateRemediationStatus(taskId, columnStatus);
                  }}
                >
                  <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/80 rounded-t-xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{columnStatus.replace('_', ' ')}</h4>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                      {bot.remediationTasks?.filter((t: any) => t.status === columnStatus).length || 0}
                    </span>
                  </div>
                  <div className="p-2 flex-1 overflow-y-auto space-y-2">
                    {bot.remediationTasks?.filter((t: any) => t.status === columnStatus).map((t: any) => (
                      <div 
                        key={t.id} 
                        draggable={userRole !== 'VIEWER'}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); }}
                        className="bg-card border border-border/50 rounded-lg p-3 shadow-sm hover:border-primary/50 cursor-grab active:cursor-grabbing group relative"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider ${
                            t.priority === 'CRITICAL' ? 'bg-red-500/15 text-red-400' :
                            t.priority === 'HIGH' ? 'bg-orange-500/15 text-orange-400' :
                            t.priority === 'MEDIUM' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'
                          }`}>{t.priority}</span>
                          {userRole !== 'VIEWER' && (
                            <div className="flex items-center gap-1.5">
                              <select 
                                value={t.status}
                                onChange={(e) => updateRemediationStatus(t.id, e.target.value)}
                                className="text-[10px] bg-background border border-border/50 rounded-md px-1 py-0.5 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
                              >
                                <option value="OPEN">Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="BLOCKED">Blocked</option>
                                <option value="CLOSED">Closed</option>
                              </select>
                              <button onClick={() => deleteRemediation(t.id)} className="p-0.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-2 leading-tight">{t.title}</p>
                        {t.owner && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] text-primary font-bold">
                              {t.owner.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{t.owner}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
                      disabled={userRole === 'VIEWER'}
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
                  disabled={userRole === 'VIEWER'}
                  rows={5} placeholder="Summarize the review findings and rationale for the recommendation..."
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              {userRole !== 'VIEWER' && (
                <button onClick={() => saveBot({ ...editFields, reviewStatus: 'COMPLETED' })} disabled={saving}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save & Complete Review'}
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── AUDIT HISTORY ───────────────────────────────────────────── */}
      {!loading && (
        <div className="mt-8 rounded-2xl border border-border/50 bg-card/80 backdrop-blur overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10"><Clock className="h-4 w-4 text-slate-400" /></div>
              <h3 className="text-sm font-bold tracking-wide">Audit History</h3>
            </div>
            {auditLogs.length > 0 && (
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full font-medium">{auditLogs.length} events</span>
            )}
          </div>
          <div className="p-6">
            <div className="space-y-0 max-h-72 overflow-y-auto pr-2">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No audit logs found.</p>
                </div>
              ) : (
                auditLogs.map((log: any, i: number) => (
                  <div key={log.id} className="relative flex gap-4 pb-4 last:pb-0">
                    {/* Timeline line */}
                    {i < auditLogs.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/50" />
                    )}
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0 mt-1">
                      <div className="w-[22px] h-[22px] rounded-full bg-muted/50 border-2 border-border/50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary/50" />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4 border-b border-border/20 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{log.action}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 space-x-2">
                            {log.field && <span>Field: <span className="font-mono text-foreground/70 bg-muted/50 px-1 rounded">{log.field}</span></span>}
                            {log.oldValue && <span>From: <span className="font-mono text-red-400/70 line-through">{log.oldValue}</span></span>}
                            {log.newValue && <span>→ <span className="font-mono text-green-400/70">{log.newValue}</span></span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                          {log.userId && <p className="text-[10px] text-primary/70 font-medium mt-0.5">{log.userId}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={cloneConfirmOpen} onOpenChange={setCloneConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to clone this bot?</AlertDialogTitle>
            <AlertDialogDescription>
              All process steps, dependencies, and checklist items will be copied to the new bot. 
              The new bot will have the suffix '-CLONE'.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClone} className="bg-primary hover:bg-primary/90">Clone Bot</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generic Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleteConfirm?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This {deleteConfirm?.label} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenericDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Checklist NO → Finding Suggestion Dialog */}
      <AlertDialog open={checklistFindingSuggestion !== null} onOpenChange={(open) => !open && setChecklistFindingSuggestion(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-500 font-bold">
              <AlertTriangle className="h-5 w-5" />
              Create Finding for Checklist Issue?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-sm text-foreground/90">You have marked this checklist item as <strong className="text-red-400 font-semibold">NO</strong>. Would you like to automatically record a corresponding audit finding?</p>
              <div className="bg-muted/30 p-3.5 rounded-xl border border-border/50 text-xs space-y-1.5 text-left">
                <p><span className="font-semibold text-muted-foreground">Category:</span> <span className="font-mono text-foreground/80">{checklistFindingSuggestion?.category}</span></p>
                <p><span className="font-semibold text-muted-foreground">Priority:</span> <span className="font-mono text-amber-500 font-bold">{checklistFindingSuggestion?.priority}</span></p>
                <p className="mt-1 font-medium text-foreground bg-card/50 p-2 rounded-lg border border-border/30">&ldquo;{checklistFindingSuggestion?.observation}&rdquo;</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Dismiss</AlertDialogCancel>
            <AlertDialogAction onClick={createFindingFromChecklist} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Create Finding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* High/Critical Finding → Remediation Task Suggestion Dialog */}
      <AlertDialog open={findingTaskSuggestion !== null} onOpenChange={(open) => !open && setFindingTaskSuggestion(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Plus className="h-5 w-5" />
              Link Remediation Task?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-sm text-foreground/90">Since this finding is marked as <strong className="text-red-400 font-semibold">{findingTaskSuggestion?.priority}</strong> priority, would you like to automatically create a linked Remediation Task to track the resolution?</p>
              <div className="bg-muted/30 p-3.5 rounded-xl border border-border/50 text-xs space-y-1.5 text-left">
                <p><span className="font-semibold text-muted-foreground">Task Title:</span> <span className="text-foreground/80 font-medium">{findingTaskSuggestion?.title}</span></p>
                <p><span className="font-semibold text-muted-foreground">Priority:</span> <span className="font-mono text-primary font-bold">{findingTaskSuggestion?.priority}</span></p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Dismiss</AlertDialogCancel>
            <AlertDialogAction onClick={createRemediationFromFinding} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Create Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
