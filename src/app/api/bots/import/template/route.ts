import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Template column definitions for each sheet
const BOT_COLUMNS = [
  { header: "Bot Name", key: "name", example: "NPCI Daily Reconciliation" },
  { header: "Vendor", key: "vendor", example: "TCS" },
  { header: "Technology", key: "technology", example: "PAD", validation: ["PAD", "POWER_AUTOMATE_CLOUD", "UI_PATH", "BLUE_PRISM", "AUTOMATION_ANYWHERE", "OTHER"] },
  { header: "Department", key: "department", example: "Treasury Operations" },
  { header: "Current Status", key: "currentStatus", example: "ACTIVE", validation: ["UNKNOWN", "ACTIVE", "FAILED", "INACTIVE", "OBSOLETE", "RETIRED"] },
  { header: "Criticality", key: "criticality", example: "HIGH", validation: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
  { header: "Environment", key: "environment", example: "PROD" },
  { header: "Business Purpose", key: "businessPurpose", example: "Downloads daily reconciliation file from NPCI portal" },
  { header: "Business Process", key: "businessProcess", example: "Treasury Reconciliation" },
  { header: "Business Owner", key: "businessOwner", example: "Priya Sharma" },
  { header: "Technical Owner", key: "technicalOwner", example: "Raj Patel" },
  { header: "Schedule / Trigger", key: "scheduleOrTrigger", example: "Daily at 6:00 AM" },
];

const STEP_COLUMNS = [
  { header: "Bot Name", key: "botName", example: "NPCI Daily Reconciliation" },
  { header: "Step Order", key: "stepOrder", example: "1" },
  { header: "Action Type", key: "actionType", example: "PORTAL_LOGIN", validation: [
    "PORTAL_LOGIN", "BROWSER_NAVIGATION", "FILE_DOWNLOAD", "FILE_UPLOAD",
    "SFTP_UPLOAD", "SFTP_DOWNLOAD", "FILE_VALIDATION", "FILE_ARCHIVE",
    "EXCEL_READ", "EXCEL_WRITE", "DATABASE_QUERY", "API_CALL",
    "EMAIL_SEND", "TEAMS_NOTIFICATION", "APPROVAL", "DATA_TRANSFORMATION",
    "SCREENSHOT_CAPTURE", "ERROR_LOGGING", "RETRY", "OTHER",
  ]},
  { header: "Description", key: "description", example: "Login to NPCI portal with service account" },
  { header: "System Name", key: "systemName", example: "NPCI Portal" },
  { header: "Notes", key: "notes", example: "Uses Chrome browser" },
];

const DEP_COLUMNS = [
  { header: "Bot Name", key: "botName", example: "NPCI Daily Reconciliation" },
  { header: "Dependency Type", key: "dependencyType", example: "PORTAL", validation: [
    "PORTAL", "APPLICATION", "SFTP", "API", "DATABASE", "VM",
    "FOLDER", "BROWSER", "CREDENTIAL", "NETWORK", "VPN", "SCHEDULER", "OTHER",
  ]},
  { header: "Name", key: "name", example: "NPCI Portal (https://npci.org.in)" },
  { header: "Notes", key: "notes", example: "Requires VPN access" },
];

export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Bots ──
    const botHeaders = BOT_COLUMNS.map(c => c.header);
    const botExample = BOT_COLUMNS.map(c => c.example);
    const botWs = XLSX.utils.aoa_to_sheet([botHeaders, botExample]);
    // Set column widths
    botWs["!cols"] = BOT_COLUMNS.map(c => ({ wch: Math.max(c.header.length, c.example.length, 20) }));
    XLSX.utils.book_append_sheet(wb, botWs, "Bots");

    // ── Sheet 2: Steps ──
    const stepHeaders = STEP_COLUMNS.map(c => c.header);
    const stepExample = STEP_COLUMNS.map(c => c.example);
    const stepWs = XLSX.utils.aoa_to_sheet([stepHeaders, stepExample]);
    stepWs["!cols"] = STEP_COLUMNS.map(c => ({ wch: Math.max(c.header.length, (c.example || "").length, 20) }));
    XLSX.utils.book_append_sheet(wb, stepWs, "Steps");

    // ── Sheet 3: Dependencies ──
    const depHeaders = DEP_COLUMNS.map(c => c.header);
    const depExample = DEP_COLUMNS.map(c => c.example);
    const depWs = XLSX.utils.aoa_to_sheet([depHeaders, depExample]);
    depWs["!cols"] = DEP_COLUMNS.map(c => ({ wch: Math.max(c.header.length, (c.example || "").length, 20) }));
    XLSX.utils.book_append_sheet(wb, depWs, "Dependencies");

    // ── Sheet 4: Instructions ──
    const instructions = [
      ["BotAtlas Import Template — Instructions"],
      [""],
      ["SHEET: Bots"],
      ["Fill in one row per bot. 'Bot Name' is the only required field."],
      ["Technology values: PAD, POWER_AUTOMATE_CLOUD, UI_PATH, BLUE_PRISM, AUTOMATION_ANYWHERE, OTHER"],
      ["Status values: UNKNOWN, ACTIVE, FAILED, INACTIVE, OBSOLETE, RETIRED"],
      ["Criticality values: CRITICAL, HIGH, MEDIUM, LOW"],
      [""],
      ["SHEET: Steps"],
      ["Fill in process steps for each bot. Link to bot via 'Bot Name' column."],
      ["Action Type values: PORTAL_LOGIN, BROWSER_NAVIGATION, FILE_DOWNLOAD, FILE_UPLOAD, SFTP_UPLOAD, SFTP_DOWNLOAD, FILE_VALIDATION, FILE_ARCHIVE, EXCEL_READ, EXCEL_WRITE, DATABASE_QUERY, API_CALL, EMAIL_SEND, TEAMS_NOTIFICATION, APPROVAL, DATA_TRANSFORMATION, SCREENSHOT_CAPTURE, ERROR_LOGGING, RETRY, OTHER"],
      [""],
      ["SHEET: Dependencies"],
      ["Fill in external dependencies for each bot. Link to bot via 'Bot Name' column."],
      ["Dependency Type values: PORTAL, APPLICATION, SFTP, API, DATABASE, VM, FOLDER, BROWSER, CREDENTIAL, NETWORK, VPN, SCHEDULER, OTHER"],
      [""],
      ["TIPS:"],
      ["- Delete the example row before importing"],
      ["- You can import the same template multiple times — new bots will be created each time"],
      ["- Column names are case-sensitive — don't rename headers"],
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instructions);
    instrWs["!cols"] = [{ wch: 120 }];
    XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=BotAtlas_Import_Template.xlsx",
      },
    });
  } catch (error) {
    console.error("GET /api/bots/import/template error:", error);
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  }
}
