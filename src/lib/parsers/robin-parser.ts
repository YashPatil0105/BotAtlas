// ─── Robin Script Parser ──────────────────────────
// Parses Power Automate Desktop's Robin scripting language.
// Robin is a line-by-line text format — no AST needed, just a simple lexer.

import {
  ParsedBot, ParsedStep, ParsedDependency, ParsedChecklist,
  MODULE_ACTION_MAP, detectDependencyType,
} from './types';
import { generateFindings } from './findings-generator';

// Regex to extract $'''...''' string literals from Robin
const STRING_LITERAL_REGEX = /\$'''(.*?)'''/g;
// Regex to match Module.Action pattern
const MODULE_ACTION_REGEX = /^(\w+)\.(\w+(?:\.\w+)?)\s/;
// Regex for error handling blocks
const ERROR_BLOCK_REGEX = /^ON\s+BLOCK\s+ERROR/i;
const END_ERROR_REGEX = /^END\s+ON\s+BLOCK\s+ERROR/i;
const RETRY_REGEX = /\bRetry\b|\bLOOP\b.*\bRetry\b/i;
// Regex for variable assignment
const VARIABLE_ASSIGN_REGEX = /(\w+)=>\s*(\w+)/;

export function parseRobinScript(script: string, botName?: string): ParsedBot {
  const controlMap = new Map<string, string>();

  // Extract Control Repository if present
  const controlRepoSplit = script.split('# [ControlRepository][PowerAutomateDesktop]');
  if (controlRepoSplit.length > 1) {
    try {
      const repoJsonStr = controlRepoSplit[1].trim();
      if (repoJsonStr) {
        const repoObj = JSON.parse(repoJsonStr);
        if (repoObj && repoObj.ControlRepositorySymbols && Array.isArray(repoObj.ControlRepositorySymbols)) {
          for (const symbol of repoObj.ControlRepositorySymbols) {
            if (symbol.Name && symbol.Repository) {
              const innerRepo = JSON.parse(symbol.Repository);
              if (innerRepo && innerRepo.Screens && innerRepo.Screens.length > 0) {
                const processName = innerRepo.Screens[0].ProcessName;
                if (processName) {
                  controlMap.set(symbol.Name, processName);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse control repository from Robin script", e);
    }
  }

  const robinCode = controlRepoSplit[0];
  const lines = robinCode.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));

  const steps: ParsedStep[] = [];
  const dependencyMap = new Map<string, ParsedDependency>();
  const checklistFlags: Record<string, boolean> = {
    errorHandlingPresent: false,
    retryLogicPresent: false,
    hardcodedFilePaths: false,
    usesUISelectors: false,
    loggingPresent: false,
    usesReusableSubflows: false,
  };

  let stepOrder = 0;
  let inErrorBlock = false;
  let subflowCount = 0;
  const warnings: string[] = [];

  for (const line of lines) {
    // Detect error handling blocks
    if (ERROR_BLOCK_REGEX.test(line)) {
      checklistFlags.errorHandlingPresent = true;
      inErrorBlock = true;
      continue;
    }
    if (END_ERROR_REGEX.test(line)) {
      inErrorBlock = false;
      continue;
    }

    // Detect retry logic
    if (RETRY_REGEX.test(line)) {
      checklistFlags.retryLogicPresent = true;
    }

    // Detect subflow calls
    if (/^CALL\s+/i.test(line) || /^Run\s+Subflow/i.test(line)) {
      checklistFlags.usesReusableSubflows = true;
      subflowCount++;
    }

    // Parse module.action lines
    const moduleMatch = line.match(MODULE_ACTION_REGEX);
    if (!moduleMatch) continue;

    const moduleName = moduleMatch[1];
    const actionName = moduleMatch[2];
    const fullAction = `${moduleName}.${actionName}`;

    // Detect UI automation
    if (moduleName === 'UIAutomation') {
      checklistFlags.usesUISelectors = true;
    }

    // Detect logging
    if (moduleName === 'System' && actionName.includes('Log')) {
      checklistFlags.loggingPresent = true;
    }

    // Map to ActionType
    const actionType = MODULE_ACTION_MAP[fullAction]
      || MODULE_ACTION_MAP[`${moduleName}.${actionName.split('.')[0]}`]
      || 'OTHER';

    // Extract string literals (URLs, paths, etc.)
    const stringLiterals: string[] = [];
    let match;
    const regexCopy = new RegExp(STRING_LITERAL_REGEX.source, 'g');
    while ((match = regexCopy.exec(line)) !== null) {
      stringLiterals.push(match[1]);
    }

    // Extract dependencies from string literals
    for (const literal of stringLiterals) {
      const dep = detectDependencyType(literal);
      if (dep && !dependencyMap.has(dep.name)) {
        dependencyMap.set(dep.name, {
          dependencyType: dep.type,
          name: dep.name,
          source: literal,
          confidence: 'high',
        });
      }

      // Detect hardcoded file paths
      if (/^[A-Z]:\\/i.test(literal) || literal.startsWith('\\\\')) {
        checklistFlags.hardcodedFilePaths = true;
      }
    }

    // Build step description
    stepOrder++;
    let description = '';

    // Try to extract a label or meaningful description
    const labelMatch = line.match(/Label:\s*['"]?([^'"]+)['"]?/i);
    if (labelMatch) {
      description = labelMatch[1].trim();
    } else {
      // Build from module/action + first string literal
      description = `${actionName.replace(/\./g, ' ')}`;
      if (stringLiterals.length > 0) {
        const firstLiteral = stringLiterals[0];
        if (firstLiteral.length < 80) {
          description += ` — ${firstLiteral}`;
        }
      }
    }

    // Detect system name from UIAutomation controls
    let systemName: string | undefined;
    for (const [controlName, processName] of controlMap.entries()) {
      if (line.includes(controlName)) {
        systemName = processName;
        break;
      }
    }

    // Detect system name from System.RunApplication
    if (!systemName && fullAction.includes('RunApplication')) {
      for (const literal of stringLiterals) {
        if (literal.toLowerCase().endsWith('.exe')) {
          const parts = literal.split(/[/\\]/);
          systemName = parts[parts.length - 1]; // Get just the exe name
          break;
        }
      }
    }

    // Detect system name from URL (Fallback)
    if (!systemName) {
      for (const literal of stringLiterals) {
        if (literal.startsWith('http') || literal.startsWith('sftp') || literal.startsWith('ftp')) {
          try {
            systemName = new URL(literal).hostname;
          } catch { /* ignore */ }
          break;
        }
      }
    }

    const confidence = MODULE_ACTION_MAP[fullAction] ? 'high' as const : 'medium' as const;

    steps.push({
      stepOrder,
      actionType,
      description,
      moduleName: fullAction,
      systemName,
      confidence,
      warning: confidence === 'medium' ? `Unknown action: ${fullAction}` : undefined,
      tags: [moduleName.toLowerCase()],
    });
  }

  // Build checklist auto-fills
  const checklistAutoFills: ParsedChecklist[] = Object.entries(checklistFlags).map(([key, val]) => ({
    checklistItem: key,
    value: val ? 'YES' as const : 'NOT_VERIFIED' as const,
    notes: val ? 'Auto-detected from Robin script' : undefined,
  }));

  const dependencies = Array.from(dependencyMap.values());

  // Generate findings
  const findings = generateFindings(steps, dependencies, checklistFlags, subflowCount);

  return {
    sourceFormat: 'robin',
    name: botName || 'Imported Bot (Robin)',
    technology: 'PAD',
    steps,
    dependencies,
    findings,
    checklistAutoFills,
    stats: {
      totalSteps: steps.length,
      totalDependencies: dependencies.length,
      totalFindings: findings.length,
      checklistAutoFilled: checklistAutoFills.filter(c => c.value !== 'NOT_VERIFIED').length,
      subflowCount,
    },
    warnings,
  };
}
