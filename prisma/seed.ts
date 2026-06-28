import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { processStepForMatching } from '../src/services/similarity.service';

const prisma = new PrismaClient();

// ─── CHECKLIST ITEMS ─────────────────────────────────

const CHECKLIST_ITEMS = [
  'Flow file (.pad) collected',
  'BRD / SDD available',
  'Runbook available',
  'Error handling reviewed',
  'Retry logic present',
  'Credential management reviewed',
  'Environment configuration checked',
  'Logging / audit trail verified',
  'Input validation present',
  'Output validation present',
  'Exception paths documented',
  'Hardcoded values identified',
  'Dependencies documented',
  'Scheduling mechanism verified',
  'VM / machine assignment confirmed',
  'Browser compatibility checked',
  'Network / VPN requirements verified',
  'Data sensitivity classification done',
  'Security review completed',
  'Performance baseline captured',
  'Rollback procedure documented',
  'Business owner sign-off obtained',
  'Test evidence collected',
];

type ChecklistValue = 'YES' | 'NO' | 'NOT_VERIFIED' | 'NA';

function generateChecklistValues(
  reviewStatus: string,
  botStatus: string
): ChecklistValue[] {
  const values: ChecklistValue[] = [];
  for (let i = 0; i < CHECKLIST_ITEMS.length; i++) {
    if (reviewStatus === 'COMPLETED') {
      // Completed reviews: mostly YES with some NO/NA
      const rand = Math.random();
      if (rand < 0.65) values.push('YES');
      else if (rand < 0.80) values.push('NO');
      else if (rand < 0.90) values.push('NA');
      else values.push('NOT_VERIFIED');
    } else if (reviewStatus === 'IN_PROGRESS') {
      // In progress: mix of YES, NOT_VERIFIED, some NO
      const rand = Math.random();
      if (rand < 0.40) values.push('YES');
      else if (rand < 0.55) values.push('NOT_VERIFIED');
      else if (rand < 0.75) values.push('NO');
      else values.push('NA');
    } else if (botStatus === 'ACTIVE') {
      // Active but not started review: some YES, mostly NOT_VERIFIED
      const rand = Math.random();
      if (rand < 0.25) values.push('YES');
      else if (rand < 0.85) values.push('NOT_VERIFIED');
      else values.push('NA');
    } else {
      // Not started / failed / obsolete: mostly NOT_VERIFIED
      const rand = Math.random();
      if (rand < 0.10) values.push('YES');
      else if (rand < 0.85) values.push('NOT_VERIFIED');
      else values.push('NA');
    }
  }
  return values;
}

// ─── MAIN SEED FUNCTION ──────────────────────────────

async function main() {
  await prisma.$connect();
  console.log('🌱 Seeding BotAtlas database...\n');

  // ─── CLEAN EXISTING DATA ───────────────────────────

  console.log('🗑️  Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.stepComponentMap.deleteMany();
  await prisma.component.deleteMany();
  await prisma.botChecklist.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.remediationTask.deleteMany();
  await prisma.rootCauseAssessment.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.botStep.deleteMany();
  await prisma.botSimilarity.deleteMany();
  await prisma.bot.deleteMany();
  await prisma.user.deleteMany();

  // ─── USERS ─────────────────────────────────────────

  console.log('👤 Creating users...');

  const adminHash = await hash('admin123', 12);
  const reviewerHash = await hash('review123', 12);
  const viewerHash = await hash('view123', 12);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@botatlas.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      name: 'System Admin',
    },
  });
  console.log(`  ✅ Admin: ${adminUser.email}`);

  const reviewerUser = await prisma.user.create({
    data: {
      email: 'reviewer@botatlas.com',
      passwordHash: reviewerHash,
      role: 'REVIEWER',
      name: 'Bot Reviewer',
    },
  });
  console.log(`  ✅ Reviewer: ${reviewerUser.email}`);

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@botatlas.com',
      passwordHash: viewerHash,
      role: 'VIEWER',
      name: 'Report Viewer',
    },
  });
  console.log(`  ✅ Viewer: ${viewerUser.email}`);

  // ─── HELPER: CREATE STEP WITH MATCHING DATA ────────

  function buildStep(
    stepOrder: number,
    actionType: string,
    description: string,
    systemName?: string
  ) {
    const matching = processStepForMatching({
      description,
      actionType,
      inputType: null,
      systemType: systemName || null,
      validationType: null,
      retryStrategy: null,
    });

    return {
      stepOrder,
      actionType: actionType as any,
      description,
      systemName: systemName || null,
      normalizedText: matching.normalizedText,
      canonicalSignature: matching.canonicalSignature,
      exactHash: matching.exactHash,
      tags: [],
    };
  }

  // ─── BOT 1: NPCI Reconciliation SFTP Transfer ─────

  console.log('\n🤖 Creating Bot 1: NPCI Reconciliation SFTP Transfer...');
  const bot1 = await prisma.bot.create({
    data: {
      botCode: 'BOT-001',
      name: 'NPCI Reconciliation SFTP Transfer',
      businessPurpose: 'Automates daily NPCI reconciliation file transfer from portal to bank SFTP server',
      department: 'Operations',
      vendor: 'TCS',
      technology: 'PAD',
      currentStatus: 'FAILED',
      reviewStatus: 'COMPLETED',
      criticality: 'CRITICAL',
      environment: 'PROD',
      scheduleOrTrigger: 'Daily 06:00 AM IST',
      lastKnownRunAt: new Date('2024-12-15T06:00:00Z'),
      finalRecommendation: 'RESTORE',
      reviewSummary: 'Bot is critical for daily reconciliation. Root cause identified as expired credentials. Immediate restoration recommended after credential renewal.',
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'PORTAL_LOGIN', 'Login to NPCI Portal with service account credentials', 'NPCI Portal'),
          buildStep(2, 'FILE_DOWNLOAD', 'Download daily reconciliation CSV file from NPCI portal', 'NPCI Portal'),
          buildStep(3, 'FILE_VALIDATION', 'Validate downloaded file row count and checksum against expected values'),
          buildStep(4, 'DATA_TRANSFORMATION', 'Apply format mapping to convert NPCI format to bank internal format'),
          buildStep(5, 'SFTP_UPLOAD', 'Upload transformed file to bank SFTP server', 'Bank SFTP Server'),
          buildStep(6, 'EMAIL_SEND', 'Send completion notification email with file details and status'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'PORTAL', name: 'NPCI Portal', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'SFTP', name: 'Bank SFTP Server', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'CREDENTIAL', name: 'NPCI Service Account', criticality: 'CRITICAL', accessConfirmed: false, notes: 'Password expired on 2024-12-15' },
          { dependencyType: 'NETWORK', name: 'VPN Gateway', criticality: 'HIGH', accessConfirmed: true },
        ],
      },
      findings: {
        create: [
          {
            category: 'SECURITY',
            observation: 'Hardcoded SFTP credentials in flow variables',
            priority: 'CRITICAL',
            status: 'OPEN',
            impact: 'Credentials visible in PAD source file, risk of unauthorized SFTP access',
            recommendation: 'Move credentials to Windows Credential Manager or Azure Key Vault',
          },
          {
            category: 'ERROR_HANDLING',
            observation: 'No retry logic for SFTP upload failures',
            priority: 'HIGH',
            status: 'OPEN',
            impact: 'Single SFTP failure causes entire bot to fail, requiring manual re-run',
            recommendation: 'Implement retry with exponential backoff (3 attempts, 30s/60s/120s)',
          },
          {
            category: 'DOCUMENTATION',
            observation: 'No runbook or BRD available',
            priority: 'MEDIUM',
            status: 'OPEN',
            impact: 'Difficult to troubleshoot or hand over to new team members',
            recommendation: 'Create comprehensive runbook with error handling procedures',
          },
        ],
      },
      rootCauseAssessments: {
        create: [
          {
            failurePoint: 'Bot fails at login step with authentication error',
            category: 'CREDENTIAL_ISSUE',
            probableCause: 'NPCI portal password expired on 2024-12-15',
            evidence: 'Error log shows "Authentication failed: Invalid credentials" at step 1',
            confirmed: true,
            validationRequired: false,
            recoveryAction: 'Renew NPCI portal credentials and update in bot configuration',
            status: 'OPEN',
          },
        ],
      },
    },
  });

  // Checklist for Bot 1
  const bot1Checklist = generateChecklistValues('COMPLETED', 'FAILED');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot1.id,
      checklistItem: item,
      value: bot1Checklist[idx],
      verifiedBy: bot1Checklist[idx] !== 'NOT_VERIFIED' ? reviewerUser.id : null,
      verifiedAt: bot1Checklist[idx] !== 'NOT_VERIFIED' ? new Date() : null,
    })),
  });
  console.log(`  ✅ ${bot1.botCode}: ${bot1.name}`);

  // ─── BOT 2: Daily MIS Report Generator ────────────

  console.log('🤖 Creating Bot 2: Daily MIS Report Generator...');
  const bot2 = await prisma.bot.create({
    data: {
      botCode: 'BOT-002',
      name: 'Daily MIS Report Generator',
      businessPurpose: 'Generates daily MIS reports from core banking data and distributes to stakeholders',
      department: 'Finance',
      vendor: 'Wipro',
      technology: 'PAD',
      currentStatus: 'ACTIVE',
      reviewStatus: 'IN_PROGRESS',
      criticality: 'HIGH',
      environment: 'PROD',
      scheduleOrTrigger: 'Daily 08:00 AM IST',
      lastKnownRunAt: new Date('2025-01-10T08:00:00Z'),
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'DATABASE_QUERY', 'Query core banking database for daily transaction summary', 'Core Banking DB'),
          buildStep(2, 'EXCEL_WRITE', 'Write extracted data to MIS Excel template', 'MS Excel'),
          buildStep(3, 'DATA_TRANSFORMATION', 'Create pivot tables and summary calculations in Excel'),
          buildStep(4, 'EMAIL_SEND', 'Send completed MIS report to distribution list'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'DATABASE', name: 'Core Banking DB', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'APPLICATION', name: 'MS Excel', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'CREDENTIAL', name: 'DB Read-only Account', criticality: 'HIGH', accessConfirmed: true },
        ],
      },
      findings: {
        create: [
          {
            category: 'MAINTAINABILITY',
            observation: 'Hardcoded file paths to C:\\Reports\\',
            priority: 'MEDIUM',
            status: 'OPEN',
            impact: 'Bot will break if folder structure changes or during VM migration',
            recommendation: 'Use environment variables or configuration file for file paths',
          },
          {
            category: 'ARCHITECTURE',
            observation: 'No modular subflows',
            priority: 'LOW',
            status: 'OPEN',
            impact: 'Difficult to maintain and reuse individual components',
            recommendation: 'Refactor into modular subflows: data extraction, transformation, distribution',
          },
        ],
      },
    },
  });

  const bot2Checklist = generateChecklistValues('IN_PROGRESS', 'ACTIVE');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot2.id,
      checklistItem: item,
      value: bot2Checklist[idx],
      verifiedBy: bot2Checklist[idx] === 'YES' ? reviewerUser.id : null,
      verifiedAt: bot2Checklist[idx] === 'YES' ? new Date() : null,
    })),
  });
  console.log(`  ✅ ${bot2.botCode}: ${bot2.name}`);

  // ─── BOT 3: KYC Document Verification ─────────────

  console.log('🤖 Creating Bot 3: KYC Document Verification...');
  const bot3 = await prisma.bot.create({
    data: {
      botCode: 'BOT-003',
      name: 'KYC Document Verification',
      businessPurpose: 'Automates KYC document collection, verification, and compliance API updates',
      department: 'Compliance',
      vendor: 'Infosys',
      technology: 'PAD',
      currentStatus: 'INACTIVE',
      reviewStatus: 'NOT_STARTED',
      criticality: 'CRITICAL',
      environment: 'DEFAULT',
      scheduleOrTrigger: 'On-demand trigger',
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'PORTAL_LOGIN', 'Login to KYC Portal with service credentials', 'KYC Portal'),
          buildStep(2, 'BROWSER_NAVIGATION', 'Navigate to customer search and locate customer record', 'KYC Portal'),
          buildStep(3, 'FILE_DOWNLOAD', 'Download KYC documents (PAN, Aadhaar, address proof)', 'KYC Portal'),
          buildStep(4, 'FILE_VALIDATION', 'Validate document completeness and format requirements'),
          buildStep(5, 'SCREENSHOT_CAPTURE', 'Capture verification evidence screenshots for audit trail'),
          buildStep(6, 'API_CALL', 'Update compliance status via Compliance Gateway API', 'Compliance API'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'PORTAL', name: 'KYC Portal', criticality: 'CRITICAL', accessConfirmed: false },
          { dependencyType: 'API', name: 'Compliance Gateway', criticality: 'CRITICAL', accessConfirmed: false },
          { dependencyType: 'VM', name: 'RPA-VM-03', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'BROWSER', name: 'Chrome 120', criticality: 'MEDIUM', accessConfirmed: true },
        ],
      },
      findings: {
        create: [
          {
            category: 'SECURITY',
            observation: 'Handles PAN/Aadhaar data without masking',
            priority: 'CRITICAL',
            status: 'OPEN',
            impact: 'Violation of data privacy regulations, sensitive PII exposed in logs and screenshots',
            recommendation: 'Implement data masking for all PII fields, encrypt at rest and in transit',
          },
          {
            category: 'GOVERNANCE',
            observation: 'Running in default environment',
            priority: 'HIGH',
            status: 'OPEN',
            impact: 'No environment isolation, potential access to production data in uncontrolled setting',
            recommendation: 'Migrate to dedicated PROD environment with proper access controls',
          },
        ],
      },
    },
  });

  const bot3Checklist = generateChecklistValues('NOT_STARTED', 'INACTIVE');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot3.id,
      checklistItem: item,
      value: bot3Checklist[idx],
    })),
  });
  console.log(`  ✅ ${bot3.botCode}: ${bot3.name}`);

  // ─── BOT 4: Loan Application Data Entry ───────────

  console.log('🤖 Creating Bot 4: Loan Application Data Entry...');
  const bot4 = await prisma.bot.create({
    data: {
      botCode: 'BOT-004',
      name: 'Loan Application Data Entry',
      businessPurpose: 'Automates loan application data entry from Excel spreadsheets into LOS Portal',
      department: 'Retail Banking',
      vendor: 'TCS',
      technology: 'PAD',
      currentStatus: 'FAILED',
      reviewStatus: 'IN_PROGRESS',
      criticality: 'HIGH',
      environment: 'UAT',
      scheduleOrTrigger: 'Batch processing - 3 times daily',
      lastKnownRunAt: new Date('2025-01-05T14:00:00Z'),
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'EXCEL_READ', 'Read loan application data from Excel spreadsheet', 'MS Excel'),
          buildStep(2, 'PORTAL_LOGIN', 'Login to Loan Origination System Portal', 'LOS Portal'),
          buildStep(3, 'BROWSER_NAVIGATION', 'Navigate to new application form in LOS Portal', 'LOS Portal'),
          buildStep(4, 'DATA_TRANSFORMATION', 'Map Excel fields to LOS Portal form fields'),
          buildStep(5, 'BROWSER_NAVIGATION', 'Submit application form and wait for confirmation', 'LOS Portal'),
          buildStep(6, 'SCREENSHOT_CAPTURE', 'Capture confirmation screenshot as processing evidence'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'PORTAL', name: 'LOS Portal', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'APPLICATION', name: 'MS Excel', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'VM', name: 'RPA-VM-01', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'BROWSER', name: 'Edge', criticality: 'MEDIUM', accessConfirmed: true },
        ],
      },
      findings: {
        create: [
          {
            category: 'MAINTAINABILITY',
            observation: 'Uses absolute XPath selectors',
            priority: 'HIGH',
            status: 'OPEN',
            impact: 'Any UI change breaks all selectors, causing complete bot failure',
            recommendation: 'Migrate to relative XPath or CSS selectors with fallback strategies',
          },
          {
            category: 'ERROR_HANDLING',
            observation: 'No screenshot on failure',
            priority: 'MEDIUM',
            status: 'OPEN',
            impact: 'Difficult to diagnose failures without visual evidence of error state',
            recommendation: 'Add screenshot capture in all error handling blocks',
          },
        ],
      },
      rootCauseAssessments: {
        create: [
          {
            failurePoint: 'All UI selectors broken after portal update',
            category: 'UI_CHANGE',
            probableCause: 'LOS Portal UI redesigned in Jan 2025',
            evidence: 'Error log shows "Element not found" for all UI interaction steps after 2025-01-06',
            confirmed: true,
            validationRequired: false,
            recoveryAction: 'Rebuild all UI selectors against new LOS Portal interface',
            status: 'IN_PROGRESS',
          },
        ],
      },
    },
  });

  const bot4Checklist = generateChecklistValues('IN_PROGRESS', 'FAILED');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot4.id,
      checklistItem: item,
      value: bot4Checklist[idx],
      verifiedBy: bot4Checklist[idx] === 'YES' ? reviewerUser.id : null,
      verifiedAt: bot4Checklist[idx] === 'YES' ? new Date() : null,
    })),
  });
  console.log(`  ✅ ${bot4.botCode}: ${bot4.name}`);

  // ─── BOT 5: SWIFT Message Reconciliation ──────────

  console.log('🤖 Creating Bot 5: SWIFT Message Reconciliation...');
  const bot5 = await prisma.bot.create({
    data: {
      botCode: 'BOT-005',
      name: 'SWIFT Message Reconciliation',
      businessPurpose: 'Reconciles SWIFT messages against treasury database records and generates exception reports',
      department: 'Treasury',
      vendor: 'Accenture',
      technology: 'POWER_AUTOMATE_CLOUD',
      currentStatus: 'ACTIVE',
      reviewStatus: 'COMPLETED',
      criticality: 'CRITICAL',
      environment: 'PROD',
      scheduleOrTrigger: 'Every 4 hours during business hours',
      lastKnownRunAt: new Date('2025-01-10T16:00:00Z'),
      finalRecommendation: 'REFACTOR',
      reviewSummary: 'Bot is well-designed and operational. Minor refactoring recommended for improved error handling and modularization.',
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'API_CALL', 'Fetch SWIFT messages from Alliance Lite2 API', 'SWIFT Alliance'),
          buildStep(2, 'DATABASE_QUERY', 'Query Treasury database for matching transactions', 'Treasury DB'),
          buildStep(3, 'DATA_TRANSFORMATION', 'Execute matching logic to identify exceptions'),
          buildStep(4, 'EXCEL_WRITE', 'Generate exception report in Excel format', 'MS Excel'),
          buildStep(5, 'SFTP_UPLOAD', 'Upload exception report to audit server', 'Audit SFTP'),
          buildStep(6, 'TEAMS_NOTIFICATION', 'Send Teams notification to Treasury team with summary', 'MS Teams'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'API', name: 'SWIFT Alliance Lite2', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'DATABASE', name: 'Treasury DB', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'SFTP', name: 'Audit SFTP', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'CREDENTIAL', name: 'SWIFT API Key', criticality: 'CRITICAL', accessConfirmed: true },
        ],
      },
    },
  });

  const bot5Checklist = generateChecklistValues('COMPLETED', 'ACTIVE');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot5.id,
      checklistItem: item,
      value: bot5Checklist[idx],
      verifiedBy: bot5Checklist[idx] !== 'NOT_VERIFIED' ? reviewerUser.id : null,
      verifiedAt: bot5Checklist[idx] !== 'NOT_VERIFIED' ? new Date() : null,
    })),
  });
  console.log(`  ✅ ${bot5.botCode}: ${bot5.name}`);

  // ─── BOT 6: Vendor Invoice Processing ─────────────

  console.log('🤖 Creating Bot 6: Vendor Invoice Processing...');
  const bot6 = await prisma.bot.create({
    data: {
      botCode: 'BOT-006',
      name: 'Vendor Invoice Processing',
      businessPurpose: 'Processes vendor invoices from email, extracts data, and enters into ERP system',
      department: 'Procurement',
      vendor: 'Wipro',
      technology: 'PAD',
      currentStatus: 'INACTIVE',
      reviewStatus: 'NOT_STARTED',
      criticality: 'MEDIUM',
      environment: 'DEFAULT',
      scheduleOrTrigger: 'Triggered by new email in invoices mailbox',
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'EMAIL_SEND', 'Check invoices inbox for new unread emails with attachments', 'MS Outlook'),
          buildStep(2, 'FILE_DOWNLOAD', 'Download invoice PDF attachments from email'),
          buildStep(3, 'FILE_VALIDATION', 'Validate invoice format and required fields (amount, vendor, PO number)'),
          buildStep(4, 'DATA_TRANSFORMATION', 'Extract invoice fields using template matching'),
          buildStep(5, 'PORTAL_LOGIN', 'Login to SAP ERP Portal with service account', 'ERP Portal'),
          buildStep(6, 'BROWSER_NAVIGATION', 'Navigate to invoice entry screen and populate fields', 'SAP ERP'),
          buildStep(7, 'APPROVAL', 'Trigger manager approval workflow for invoices above threshold'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'APPLICATION', name: 'MS Outlook', criticality: 'HIGH', accessConfirmed: false },
          { dependencyType: 'PORTAL', name: 'SAP ERP', criticality: 'CRITICAL', accessConfirmed: false },
          { dependencyType: 'VM', name: 'RPA-VM-02', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'CREDENTIAL', name: 'ERP Service Account', criticality: 'HIGH', accessConfirmed: false },
        ],
      },
    },
  });

  const bot6Checklist = generateChecklistValues('NOT_STARTED', 'INACTIVE');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot6.id,
      checklistItem: item,
      value: bot6Checklist[idx],
    })),
  });
  console.log(`  ✅ ${bot6.botCode}: ${bot6.name}`);

  // ─── BOT 7: Regulatory Return Filing ──────────────

  console.log('🤖 Creating Bot 7: Regulatory Return Filing...');
  const bot7 = await prisma.bot.create({
    data: {
      botCode: 'BOT-007',
      name: 'Regulatory Return Filing',
      businessPurpose: 'Automates regulatory return computation, validation, and filing with RBI portal',
      department: 'Compliance',
      vendor: 'Infosys',
      technology: 'PAD',
      currentStatus: 'FAILED',
      reviewStatus: 'NOT_STARTED',
      criticality: 'CRITICAL',
      environment: 'PROD',
      scheduleOrTrigger: 'Monthly - 5th business day',
      lastKnownRunAt: new Date('2024-12-05T10:00:00Z'),
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'DATABASE_QUERY', 'Extract regulatory data from Regulatory DB', 'Regulatory DB'),
          buildStep(2, 'DATA_TRANSFORMATION', 'Compute return values based on RBI guidelines'),
          buildStep(3, 'EXCEL_WRITE', 'Populate RBI return template with computed values', 'MS Excel'),
          buildStep(4, 'FILE_VALIDATION', 'Run validation rules against RBI format specifications'),
          buildStep(5, 'PORTAL_LOGIN', 'Login to RBI Filing Portal', 'RBI Portal'),
          buildStep(6, 'FILE_UPLOAD', 'Submit return file through RBI filing portal', 'RBI Portal'),
          buildStep(7, 'SCREENSHOT_CAPTURE', 'Capture acknowledgment receipt as proof of submission'),
          buildStep(8, 'SFTP_UPLOAD', 'Archive submission to archive SFTP server', 'Archive Server'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'PORTAL', name: 'RBI Filing Portal', criticality: 'CRITICAL', accessConfirmed: false },
          { dependencyType: 'DATABASE', name: 'Regulatory DB', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'SFTP', name: 'Archive Server', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'CREDENTIAL', name: 'RBI Portal Account', criticality: 'CRITICAL', accessConfirmed: false, notes: 'Credentials expired, renewal pending with IT Security' },
          { dependencyType: 'VPN', name: 'RBI Secure Gateway', criticality: 'CRITICAL', accessConfirmed: true },
        ],
      },
      findings: {
        create: [
          {
            category: 'SECURITY',
            observation: 'Credentials stored in plain text flow variable',
            priority: 'CRITICAL',
            status: 'OPEN',
            impact: 'RBI portal credentials exposed in PAD source, serious compliance risk',
            recommendation: 'Migrate credentials to secure vault (Azure Key Vault / CyberArk)',
          },
          {
            category: 'GOVERNANCE',
            observation: 'No audit trail of submissions',
            priority: 'HIGH',
            status: 'OPEN',
            impact: 'Cannot prove regulatory submissions were made on time during audits',
            recommendation: 'Implement comprehensive audit logging with timestamps and evidence capture',
          },
        ],
      },
      rootCauseAssessments: {
        create: [
          {
            failurePoint: 'Bot fails at RBI portal login step',
            category: 'CREDENTIAL_ISSUE',
            probableCause: 'RBI portal credentials expired, renewal pending with IT Security',
            evidence: 'Error log shows "Authentication failed" at step 5 since 2024-12-05',
            confirmed: true,
            validationRequired: true,
            recoveryAction: 'Expedite credential renewal with IT Security team and update bot configuration',
            status: 'OPEN',
          },
        ],
      },
    },
  });

  const bot7Checklist = generateChecklistValues('NOT_STARTED', 'FAILED');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot7.id,
      checklistItem: item,
      value: bot7Checklist[idx],
    })),
  });
  console.log(`  ✅ ${bot7.botCode}: ${bot7.name}`);

  // ─── BOT 8: Customer Complaint Auto-Router ────────

  console.log('🤖 Creating Bot 8: Customer Complaint Auto-Router...');
  const bot8 = await prisma.bot.create({
    data: {
      botCode: 'BOT-008',
      name: 'Customer Complaint Auto-Router',
      businessPurpose: 'Monitors complaint inbox, classifies complaints, and routes to appropriate teams via CRM',
      department: 'Customer Service',
      vendor: 'TCS',
      technology: 'POWER_AUTOMATE_CLOUD',
      currentStatus: 'ACTIVE',
      reviewStatus: 'COMPLETED',
      criticality: 'MEDIUM',
      environment: 'PROD',
      scheduleOrTrigger: 'Real-time email trigger',
      lastKnownRunAt: new Date('2025-01-10T18:30:00Z'),
      finalRecommendation: 'RESTORE',
      reviewSummary: 'Bot is functioning well with good error handling. Cloud-based architecture provides reliability. Minor improvements suggested for classification accuracy.',
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'EMAIL_SEND', 'Monitor customer complaints inbox for new emails', 'MS Outlook'),
          buildStep(2, 'DATA_TRANSFORMATION', 'Classify complaint category based on keywords and rules'),
          buildStep(3, 'API_CALL', 'Create/update case in Salesforce CRM via API', 'Salesforce CRM'),
          buildStep(4, 'TEAMS_NOTIFICATION', 'Send Teams notification to assigned team with case details', 'MS Teams'),
          buildStep(5, 'ERROR_LOGGING', 'Log routing decision and outcome to audit log'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'APPLICATION', name: 'MS Outlook', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'API', name: 'Salesforce CRM', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'APPLICATION', name: 'MS Teams', criticality: 'MEDIUM', accessConfirmed: true },
        ],
      },
    },
  });

  const bot8Checklist = generateChecklistValues('COMPLETED', 'ACTIVE');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot8.id,
      checklistItem: item,
      value: bot8Checklist[idx],
      verifiedBy: bot8Checklist[idx] !== 'NOT_VERIFIED' ? reviewerUser.id : null,
      verifiedAt: bot8Checklist[idx] !== 'NOT_VERIFIED' ? new Date() : null,
    })),
  });
  console.log(`  ✅ ${bot8.botCode}: ${bot8.name}`);

  // ─── BOT 9: Account Closure Processing ────────────

  console.log('🤖 Creating Bot 9: Account Closure Processing...');
  const bot9 = await prisma.bot.create({
    data: {
      botCode: 'BOT-009',
      name: 'Account Closure Processing',
      businessPurpose: 'Processes customer account closure requests including balance checks and final statements',
      department: 'Operations',
      vendor: 'Accenture',
      technology: 'PAD',
      currentStatus: 'OBSOLETE',
      reviewStatus: 'NOT_STARTED',
      criticality: 'LOW',
      environment: 'DEFAULT',
      scheduleOrTrigger: 'Weekly batch - Friday 17:00 IST',
      lastKnownRunAt: new Date('2024-06-14T17:00:00Z'),
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'EXCEL_READ', 'Read account closure request list from Excel file', 'MS Excel'),
          buildStep(2, 'PORTAL_LOGIN', 'Login to Core Banking System Portal', 'CBS Portal'),
          buildStep(3, 'DATABASE_QUERY', 'Check account balance and pending transactions', 'Core Banking DB'),
          buildStep(4, 'BROWSER_NAVIGATION', 'Navigate to account closure form and submit', 'CBS Portal'),
          buildStep(5, 'DATA_TRANSFORMATION', 'Generate final account statement with closure details'),
          buildStep(6, 'EMAIL_SEND', 'Send closure confirmation and final statement to customer'),
          buildStep(7, 'FILE_ARCHIVE', 'Archive closure records to designated folder'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'PORTAL', name: 'CBS Portal', criticality: 'CRITICAL', accessConfirmed: false },
          { dependencyType: 'DATABASE', name: 'Core Banking DB', criticality: 'CRITICAL', accessConfirmed: false },
          { dependencyType: 'APPLICATION', name: 'MS Excel', criticality: 'MEDIUM', accessConfirmed: true },
          { dependencyType: 'VM', name: 'RPA-VM-04', criticality: 'LOW', accessConfirmed: false, notes: 'VM decommissioned in Aug 2024' },
        ],
      },
    },
  });

  const bot9Checklist = generateChecklistValues('NOT_STARTED', 'OBSOLETE');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot9.id,
      checklistItem: item,
      value: bot9Checklist[idx],
    })),
  });
  console.log(`  ✅ ${bot9.botCode}: ${bot9.name}`);

  // ─── BOT 10: ATM Cash Forecasting Report ─────────

  console.log('🤖 Creating Bot 10: ATM Cash Forecasting Report...');
  const bot10 = await prisma.bot.create({
    data: {
      botCode: 'BOT-010',
      name: 'ATM Cash Forecasting Report',
      businessPurpose: 'Generates ATM cash demand forecasting reports based on transaction history and trends',
      department: 'Operations',
      vendor: 'Wipro',
      technology: 'PAD',
      currentStatus: 'ACTIVE',
      reviewStatus: 'IN_PROGRESS',
      criticality: 'HIGH',
      environment: 'PROD',
      scheduleOrTrigger: 'Daily 05:00 AM IST via Windows Task Scheduler',
      lastKnownRunAt: new Date('2025-01-10T05:00:00Z'),
      createdBy: adminUser.id,
      steps: {
        create: [
          buildStep(1, 'DATABASE_QUERY', 'Query ATM transaction database for historical data', 'ATM Transaction DB'),
          buildStep(2, 'DATA_TRANSFORMATION', 'Apply forecasting model to predict cash demand'),
          buildStep(3, 'EXCEL_WRITE', 'Generate forecast report in Excel with charts', 'MS Excel'),
          buildStep(4, 'FILE_VALIDATION', 'Run threshold checks against minimum/maximum cash levels'),
          buildStep(5, 'EMAIL_SEND', 'Distribute forecast report to operations and treasury teams'),
          buildStep(6, 'FILE_ARCHIVE', 'Archive report to monthly archive folder on file server'),
        ],
      },
      dependencies: {
        create: [
          { dependencyType: 'DATABASE', name: 'ATM Transaction DB', criticality: 'CRITICAL', accessConfirmed: true },
          { dependencyType: 'APPLICATION', name: 'MS Excel', criticality: 'HIGH', accessConfirmed: true },
          { dependencyType: 'FOLDER', name: '\\\\fileserver\\reports', criticality: 'MEDIUM', accessConfirmed: true },
          { dependencyType: 'SCHEDULER', name: 'Windows Task Scheduler', criticality: 'HIGH', accessConfirmed: true },
        ],
      },
      findings: {
        create: [
          {
            category: 'DEPENDENCY',
            observation: 'Uses shared network folder with no access controls',
            priority: 'MEDIUM',
            status: 'OPEN',
            impact: 'Any user on the network can access, modify, or delete forecast reports',
            recommendation: 'Implement folder-level ACLs and move to SharePoint or secured file share',
          },
          {
            category: 'SCHEDULING',
            observation: 'Relies on Windows Task Scheduler instead of orchestrator',
            priority: 'LOW',
            status: 'OPEN',
            impact: 'No centralized monitoring, logging, or retry capabilities',
            recommendation: 'Migrate scheduling to Power Automate orchestrator or dedicated RPA scheduler',
          },
        ],
      },
    },
  });

  const bot10Checklist = generateChecklistValues('IN_PROGRESS', 'ACTIVE');
  await prisma.botChecklist.createMany({
    data: CHECKLIST_ITEMS.map((item, idx) => ({
      botId: bot10.id,
      checklistItem: item,
      value: bot10Checklist[idx],
      verifiedBy: bot10Checklist[idx] === 'YES' ? reviewerUser.id : null,
      verifiedAt: bot10Checklist[idx] === 'YES' ? new Date() : null,
    })),
  });
  console.log(`  ✅ ${bot10.botCode}: ${bot10.name}`);

  // ─── SUMMARY ───────────────────────────────────────

  const totalBots = await prisma.bot.count();
  const totalSteps = await prisma.botStep.count();
  const totalDeps = await prisma.dependency.count();
  const totalFindings = await prisma.finding.count();
  const totalChecklist = await prisma.botChecklist.count();
  const totalRCA = await prisma.rootCauseAssessment.count();
  const totalUsers = await prisma.user.count();

  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Seeding complete!\n');
  console.log(`  👤 Users:                ${totalUsers}`);
  console.log(`  🤖 Bots:                 ${totalBots}`);
  console.log(`  📋 Process Steps:        ${totalSteps}`);
  console.log(`  🔗 Dependencies:         ${totalDeps}`);
  console.log(`  🔍 Findings:             ${totalFindings}`);
  console.log(`  🩺 Root Cause Assessments: ${totalRCA}`);
  console.log(`  ✅ Checklist Items:       ${totalChecklist}`);
  console.log('═'.repeat(50));
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
