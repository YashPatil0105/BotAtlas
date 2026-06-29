// ─── PAD Solution ZIP Parser ─────────────────────
// Parses Power Automate Desktop solution exports (.zip).
// Extracts flow.json action arrays and manifest.json metadata.

import {
  ParsedBot, ParsedStep, ParsedDependency, ParsedChecklist,
  MODULE_ACTION_MAP, detectDependencyType,
} from './types';
import { generateFindings } from './findings-generator';

// We use adm-zip for extraction — tiny (50KB), zero sub-deps
import AdmZip from 'adm-zip';

interface FlowAction {
  id?: string;
  module?: string;
  action?: string;
  label?: string;
  parameters?: Record<string, any>;
  errorHandling?: { enabled?: boolean; retries?: number };
  children?: FlowAction[];
}

interface FlowMetadata {
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  createdDate?: string;
  modifiedDate?: string;
  creator?: string;
}

interface ManifestData {
  solutionName?: string;
  displayName?: string;
  description?: string;
  version?: string;
  publisher?: string;
}

export function parsePADZip(buffer: Buffer, botName?: string): ParsedBot {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  let manifest: ManifestData | null = null;
  const flows: { metadata: FlowMetadata; actions: FlowAction[] }[] = [];
  let hasUIElements = false;

  // Extract and categorize ZIP contents
  for (const entry of entries) {
    const name = entry.entryName.toLowerCase();

    if (name.endsWith('manifest.json') && !name.includes('flow')) {
      try {
        manifest = JSON.parse(entry.getData().toString('utf8'));
      } catch { /* skip malformed JSON */ }
    }

    if (name.endsWith('flow.json')) {
      try {
        const flowData = JSON.parse(entry.getData().toString('utf8'));
        const actions = Array.isArray(flowData) ? flowData
          : flowData.actions ? flowData.actions
          : flowData.steps ? flowData.steps
          : [];

        // Look for sibling metadata.json
        const dir = entry.entryName.substring(0, entry.entryName.lastIndexOf('/'));
        const metaEntry = entries.find(e =>
          e.entryName.toLowerCase() === `${dir}/metadata.json`.toLowerCase()
        );
        let metadata: FlowMetadata = {};
        if (metaEntry) {
          try {
            metadata = JSON.parse(metaEntry.getData().toString('utf8'));
          } catch { /* ignore */ }
        }

        flows.push({ metadata, actions });
      } catch { /* skip malformed flow.json */ }
    }

    if (name.includes('uielement') || name.includes('ui_element')) {
      hasUIElements = true;
    }
  }

  // Determine bot name
  const resolvedName = botName
    || manifest?.solutionName
    || manifest?.displayName
    || (flows[0]?.metadata?.displayName)
    || (flows[0]?.metadata?.name)
    || 'Imported Bot (PAD)';

  // Parse all actions from all flows
  const steps: ParsedStep[] = [];
  const dependencyMap = new Map<string, ParsedDependency>();
  const checklistFlags: Record<string, boolean> = {
    errorHandlingPresent: false,
    retryLogicPresent: false,
    hardcodedFilePaths: false,
    usesUISelectors: hasUIElements,
    loggingPresent: false,
    usesReusableSubflows: flows.length > 1,
  };
  const warnings: string[] = [];
  let stepOrder = 0;

  function processActions(actions: FlowAction[], flowName?: string): void {
    for (const action of actions) {
      // Check error handling
      if (action.errorHandling?.enabled) {
        checklistFlags.errorHandlingPresent = true;
      }
      if (action.errorHandling?.retries && action.errorHandling.retries > 0) {
        checklistFlags.retryLogicPresent = true;
      }

      const moduleName = action.module || '';
      const actionName = action.action || '';
      const fullAction = `${moduleName}.${actionName}`;

      // Detect logging
      if (moduleName === 'System' && actionName.includes('Log')) {
        checklistFlags.loggingPresent = true;
      }

      // Detect UI automation
      if (moduleName === 'UIAutomation') {
        checklistFlags.usesUISelectors = true;
      }

      // Map to ActionType
      const actionType = MODULE_ACTION_MAP[fullAction]
        || MODULE_ACTION_MAP[`${moduleName}.${actionName.split('.')[0]}`]
        || 'OTHER';

      // Extract string parameters for dependency detection
      if (action.parameters) {
        for (const [, value] of Object.entries(action.parameters)) {
          if (typeof value === 'string') {
            const dep = detectDependencyType(value);
            if (dep && !dependencyMap.has(dep.name)) {
              dependencyMap.set(dep.name, {
                dependencyType: dep.type,
                name: dep.name,
                source: value,
                confidence: 'high',
              });
            }
            if (/^[A-Z]:\\/i.test(value) || value.startsWith('\\\\')) {
              checklistFlags.hardcodedFilePaths = true;
            }
          }
        }
      }

      // Build step
      stepOrder++;
      const description = action.label || `${actionName.replace(/\./g, ' ')}`;
      let systemName: string | undefined;

      // Extract system name from URL parameters
      if (action.parameters) {
        const urlParam = action.parameters.URL || action.parameters.Url || action.parameters.url;
        if (typeof urlParam === 'string' && urlParam.startsWith('http')) {
          try {
            systemName = new URL(urlParam).hostname;
          } catch { /* ignore */ }
        }
      }

      const confidence = MODULE_ACTION_MAP[fullAction] ? 'high' as const : 'medium' as const;

      steps.push({
        stepOrder,
        actionType,
        description,
        moduleName: fullAction || undefined,
        systemName,
        confidence,
        warning: !action.label ? 'No label found — using action name as description' : undefined,
        tags: flowName ? [flowName.toLowerCase()] : [],
      });

      // Process nested children (subactions in loops, conditions, etc.)
      if (action.children && Array.isArray(action.children)) {
        processActions(action.children, flowName);
      }
    }
  }

  for (const flow of flows) {
    const flowName = flow.metadata.displayName || flow.metadata.name;
    processActions(flow.actions, flowName);
  }

  // Build checklist auto-fills
  const checklistAutoFills: ParsedChecklist[] = Object.entries(checklistFlags).map(([key, val]) => ({
    checklistItem: key,
    value: val ? 'YES' as const : 'NOT_VERIFIED' as const,
    notes: val ? 'Auto-detected from PAD solution' : undefined,
  }));

  const dependencies = Array.from(dependencyMap.values());
  const findings = generateFindings(steps, dependencies, checklistFlags, flows.length - 1);

  if (flows.length === 0) {
    warnings.push('No flow.json files found in the ZIP. Make sure this is a valid PAD solution export.');
  }

  return {
    sourceFormat: 'pad_zip',
    name: resolvedName,
    technology: 'PAD',
    technicalOwner: flows[0]?.metadata?.creator || manifest?.publisher,
    steps,
    dependencies,
    findings,
    checklistAutoFills,
    stats: {
      totalSteps: steps.length,
      totalDependencies: dependencies.length,
      totalFindings: findings.length,
      checklistAutoFilled: checklistAutoFills.filter(c => c.value !== 'NOT_VERIFIED').length,
      subflowCount: Math.max(0, flows.length - 1),
    },
    warnings,
  };
}
