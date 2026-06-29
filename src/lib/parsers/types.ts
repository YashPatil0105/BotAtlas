// ─── Shared Types for Bot Parsers ──────────────────
// All parsers (Robin, PAD ZIP, Excel, etc.) output this standardized format.
// The Import Preview UI renders this, and the /confirm endpoint writes it to DB.

export interface ParsedStep {
  stepOrder: number;
  actionType: string;
  description: string;
  moduleName?: string;
  systemName?: string;
  systemType?: string;
  inputType?: string;
  outputType?: string;
  notes?: string;
  tags?: string[];
  /** Confidence level of the auto-detected actionType mapping */
  confidence: 'high' | 'medium' | 'low';
  /** Warning message if something looks off (e.g., unlabeled action) */
  warning?: string;
}

export interface ParsedDependency {
  dependencyType: string;
  name: string;
  /** Where this was detected from (URL, parameter, etc.) */
  source?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParsedFinding {
  category: string;
  observation: string;
  priority: string;
  recommendation?: string;
  evidence?: string;
  /** User can dismiss draft findings before import */
  dismissed?: boolean;
}

export interface ParsedChecklist {
  checklistItem: string;
  value: 'YES' | 'NO' | 'NOT_VERIFIED';
  notes?: string;
}

export interface ParsedBot {
  /** Source format that was parsed */
  sourceFormat: 'robin' | 'pad_zip' | 'excel' | 'json' | 'uipath' | 'blueprism' | 'aa';
  /** Bot metadata */
  name: string;
  technology: string;
  businessPurpose?: string;
  department?: string;
  businessOwner?: string;
  technicalOwner?: string;
  vendor?: string;
  environment?: string;
  currentStatus?: string;
  scheduleOrTrigger?: string;
  
  /** Bot Registry Additional Fields */
  srNo?: number;
  projectName?: string;
  partner?: string;
  departmentSpoc?: string;
  vendorSpoc?: string;
  unitySpoc?: string;
  startDate?: string;
  cabDate?: string;
  nextSteps?: string;
  effortsInDays?: number;
  roi?: string;
  oldBotsNewBots?: string;
  vendorPaymentStatus?: string;
  botAssociated?: string;
  botFrequency?: string;
  processId?: string;
  server?: string;
  botExecutionUserId?: string;
  docsLinks?: string;

  /** Extracted data */
  steps: ParsedStep[];
  dependencies: ParsedDependency[];
  findings: ParsedFinding[];
  checklistAutoFills: ParsedChecklist[];
  /** Summary stats for quick preview */
  stats: {
    totalSteps: number;
    totalDependencies: number;
    totalFindings: number;
    checklistAutoFilled: number;
    /** Number of subflows detected (PAD only) */
    subflowCount?: number;
  };
  /** Warnings and notices for the user */
  warnings: string[];
}

// ─── Module → ActionType Mapping ──────────────────
// Used by both Robin parser and PAD ZIP parser

export const MODULE_ACTION_MAP: Record<string, string> = {
  // Web Browser
  'WebBrowser.LaunchBrowser': 'PORTAL_LOGIN',
  'WebBrowser.LaunchChrome': 'PORTAL_LOGIN',
  'WebBrowser.LaunchFirefox': 'PORTAL_LOGIN',
  'WebBrowser.LaunchEdge': 'PORTAL_LOGIN',
  'WebBrowser.NavigateTo': 'BROWSER_NAVIGATION',
  'WebBrowser.NavigateToUrl': 'BROWSER_NAVIGATION',
  'WebBrowser.Click': 'BROWSER_NAVIGATION',
  'WebBrowser.PopulateTextField': 'BROWSER_NAVIGATION',
  'WebBrowser.ExtractData': 'BROWSER_NAVIGATION',
  'WebBrowser.Close': 'BROWSER_NAVIGATION',

  // FTP / SFTP
  'FTP.DownloadFiles': 'SFTP_DOWNLOAD',
  'FTP.DownloadFile': 'SFTP_DOWNLOAD',
  'FTP.UploadFiles': 'SFTP_UPLOAD',
  'FTP.UploadFile': 'SFTP_UPLOAD',
  'FTP.Connect': 'SFTP_DOWNLOAD',
  'FTP.ListFiles': 'SFTP_DOWNLOAD',

  // Excel
  'Excel.LaunchExcel': 'EXCEL_READ',
  'Excel.OpenSpreadsheet': 'EXCEL_READ',
  'Excel.LaunchAndOpen': 'EXCEL_READ',
  'Excel.ReadCell': 'EXCEL_READ',
  'Excel.ReadFromSheet': 'EXCEL_READ',
  'Excel.ReadCellValue': 'EXCEL_READ',
  'Excel.WriteToCell': 'EXCEL_WRITE',
  'Excel.WriteCell': 'EXCEL_WRITE',
  'Excel.SaveSpreadsheet': 'EXCEL_WRITE',
  'Excel.Save': 'EXCEL_WRITE',
  'Excel.Close': 'EXCEL_READ',

  // Database
  'Database.ExecuteStatement': 'DATABASE_QUERY',
  'Database.ExecuteSqlStatement': 'DATABASE_QUERY',
  'Database.OpenConnection': 'DATABASE_QUERY',
  'Database.Close': 'DATABASE_QUERY',

  // Email
  'Email.Send': 'EMAIL_SEND',
  'Email.SendEmail': 'EMAIL_SEND',
  'Email.SendMail': 'EMAIL_SEND',
  'Email.RetrieveEmails': 'EMAIL_SEND',

  // Teams
  'MicrosoftTeams.SendMessage': 'TEAMS_NOTIFICATION',
  'MicrosoftTeams.PostMessage': 'TEAMS_NOTIFICATION',

  // HTTP / API
  'HTTP.InvokeWebService': 'API_CALL',
  'HTTP.DownloadFromWeb': 'FILE_DOWNLOAD',
  'Web.InvokeWebService': 'API_CALL',
  'Web.DownloadFromWeb': 'FILE_DOWNLOAD',

  // System & Desktop
  'System.RunApplication': 'OTHER',
  'System.RunApplication.RunApplication': 'OTHER',
  'UIAutomation.FocusWindow.Focus': 'OTHER',
  'UIAutomation.ClickElement.Click': 'OTHER',
  'MouseAndKeyboard.SendKeys.FocusAndSendKeysByControl': 'OTHER',
  'MouseAndKeyboard.SendKeys.FocusAndSendKeys': 'OTHER',

  // File operations
  'File.Copy': 'FILE_DOWNLOAD',
  'File.Move': 'FILE_DOWNLOAD',
  'File.Delete': 'OTHER',
  'File.ReadText': 'EXCEL_READ',
  'File.WriteText': 'EXCEL_WRITE',
  'File.Download': 'FILE_DOWNLOAD',
  'File.GetFiles': 'FILE_DOWNLOAD',
  'File.RenameFile': 'OTHER',
  'Folder.Create': 'OTHER',
  'Folder.GetFiles': 'FILE_DOWNLOAD',

  // Compression
  'Compression.ZipFiles': 'FILE_ARCHIVE',
  'Compression.UnzipFiles': 'FILE_ARCHIVE',

  // Scripting
  'Scripting.RunPowerShell': 'OTHER',
  'Scripting.RunDos': 'OTHER',
  'Scripting.RunVBScript': 'OTHER',
  'Scripting.RunPython': 'OTHER',
  'Scripting.RunJavaScript': 'OTHER',

  // UI Automation
  'UIAutomation.Click': 'BROWSER_NAVIGATION',
  'UIAutomation.PopulateTextField': 'BROWSER_NAVIGATION',
  'UIAutomation.GetDetailsOfWindow': 'BROWSER_NAVIGATION',
  'UIAutomation.FocusWindow': 'BROWSER_NAVIGATION',
  'UIAutomation.DragAndDrop': 'BROWSER_NAVIGATION',
  'UIAutomation.SelectMenuItem': 'BROWSER_NAVIGATION',

  // Screenshot
  'Screen.TakeScreenshot': 'SCREENSHOT_CAPTURE',

  // Logging
  'System.LogMessage': 'ERROR_LOGGING',
};

// ─── Dependency Type Detection from URLs/Paths ────

export function detectDependencyType(value: string): { type: string; name: string } | null {
  const lower = value.toLowerCase();

  // SFTP/FTP
  if (lower.startsWith('sftp://') || lower.startsWith('ftp://')) {
    try {
      const url = new URL(value);
      return { type: 'SFTP', name: url.hostname };
    } catch {
      return { type: 'SFTP', name: value.split('//')[1]?.split('/')[0] || value };
    }
  }

  // HTTP URLs → PORTAL or API
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const url = new URL(value);
      const isApi = lower.includes('/api/') || lower.includes('/rest/') || lower.includes('/service');
      return { type: isApi ? 'API' : 'PORTAL', name: url.hostname };
    } catch {
      return { type: 'PORTAL', name: value };
    }
  }

  // File paths → FOLDER
  if (/^[A-Z]:\\/i.test(value) || value.startsWith('\\\\')) {
    const parts = value.replace(/\\/g, '/').split('/');
    const folderPath = parts.slice(0, Math.min(parts.length, 3)).join('/');
    return { type: 'FOLDER', name: folderPath };
  }

  // Database connection strings
  if (lower.includes('server=') || lower.includes('data source=') || lower.includes('jdbc:')) {
    return { type: 'DATABASE', name: value.substring(0, 60) };
  }

  return null;
}
