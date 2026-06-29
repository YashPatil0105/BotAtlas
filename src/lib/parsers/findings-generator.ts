// ─── Auto-Generated Findings from Parse Results ───
// Scans parsed data for known anti-patterns and generates draft findings.

import { ParsedStep, ParsedDependency, ParsedFinding } from './types';

interface FindingRule {
  check: (
    steps: ParsedStep[],
    dependencies: ParsedDependency[],
    flags: Record<string, boolean>,
    subflowCount: number,
  ) => boolean;
  finding: Omit<ParsedFinding, 'dismissed'>;
}

const RULES: FindingRule[] = [
  // ─── CRITICAL ─────────────────────────────────────
  {
    check: (_s, deps) => deps.some(d => d.dependencyType === 'FOLDER'),
    finding: {
      category: 'SECURITY',
      priority: 'CRITICAL',
      observation: 'Hardcoded file path detected in bot definition',
      recommendation: 'Use environment variables or configuration files for file paths instead of hardcoded literals.',
      evidence: 'Detected FOLDER-type dependency from string literal scan',
    },
  },
  {
    check: (steps) => steps.some(s =>
      s.moduleName?.includes('WebBrowser') &&
      (s.description?.toLowerCase().includes('password') || s.description?.toLowerCase().includes('credential'))
    ),
    finding: {
      category: 'SECURITY',
      priority: 'CRITICAL',
      observation: 'Possible hardcoded credentials detected in browser action',
      recommendation: 'Use credential store or vault integration instead of inline credentials.',
      evidence: 'Browser action contains password/credential keywords',
    },
  },

  // ─── HIGH ─────────────────────────────────────────
  {
    check: (_s, _d, flags) => !flags.errorHandlingPresent,
    finding: {
      category: 'ERROR_HANDLING',
      priority: 'HIGH',
      observation: 'No error handling found in bot definition',
      recommendation: 'Add Try/Catch blocks around critical operations (file downloads, API calls, database queries).',
    },
  },
  {
    check: (_s, _d, flags) => !flags.retryLogicPresent,
    finding: {
      category: 'ERROR_HANDLING',
      priority: 'HIGH',
      observation: 'No retry logic found in bot definition',
      recommendation: 'Add retry mechanisms for network-dependent operations (SFTP, API calls, portal logins).',
    },
  },

  // ─── MEDIUM ───────────────────────────────────────
  {
    check: (_s, _d, flags) => !flags.loggingPresent,
    finding: {
      category: 'GOVERNANCE',
      priority: 'MEDIUM',
      observation: 'No logging mechanism found in bot definition',
      recommendation: 'Add logging actions for key milestones and error conditions to support troubleshooting.',
    },
  },
  {
    check: (steps, _d, _f, subflowCount) => steps.length > 20 && subflowCount === 0,
    finding: {
      category: 'MAINTAINABILITY',
      priority: 'MEDIUM',
      observation: 'Monolithic flow detected — over 20 steps with no subflows',
      recommendation: 'Break the bot into reusable subflows for better maintainability and potential reuse across bots.',
    },
  },
  {
    check: (_s, _d, flags) => flags.usesUISelectors === false && false, // placeholder — detect screen coordinates
    finding: {
      category: 'MAINTAINABILITY',
      priority: 'MEDIUM',
      observation: 'Uses fragile screen coordinate-based actions',
      recommendation: 'Replace screen coordinate actions with UI element selectors for more stable automation.',
    },
  },
  {
    check: (steps) => {
      const hasDownload = steps.some(s => ['FILE_DOWNLOAD', 'SFTP_DOWNLOAD'].includes(s.actionType));
      const hasValidation = steps.some(s => s.actionType === 'FILE_VALIDATION' || s.description?.toLowerCase().includes('validat'));
      return hasDownload && !hasValidation;
    },
    finding: {
      category: 'DATA',
      priority: 'MEDIUM',
      observation: 'File download detected without subsequent validation step',
      recommendation: 'Add file validation (check file size, row count, date match) after download operations.',
    },
  },
  {
    check: (steps) => {
      const hasUpload = steps.some(s => ['FILE_UPLOAD', 'SFTP_UPLOAD'].includes(s.actionType));
      const hasVerification = steps.some(s =>
        s.description?.toLowerCase().includes('verif') || s.description?.toLowerCase().includes('confirm')
      );
      return hasUpload && !hasVerification;
    },
    finding: {
      category: 'DATA',
      priority: 'MEDIUM',
      observation: 'File upload detected without verification step',
      recommendation: 'Add upload verification (check file exists on target, compare checksums) after upload operations.',
    },
  },
];

export function generateFindings(
  steps: ParsedStep[],
  dependencies: ParsedDependency[],
  flags: Record<string, boolean>,
  subflowCount: number,
): ParsedFinding[] {
  const findings: ParsedFinding[] = [];

  for (const rule of RULES) {
    try {
      if (rule.check(steps, dependencies, flags, subflowCount)) {
        findings.push({ ...rule.finding, dismissed: false });
      }
    } catch {
      // Skip rules that throw — defensive coding
    }
  }

  return findings;
}
