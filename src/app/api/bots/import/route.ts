import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { read, utils } from "xlsx";
import { BotStatus, ReviewStatus, Criticality, Technology } from "@prisma/client";
import { processStepForMatching } from "@/services/similarity.service";

// Default checklist items for newly imported bots
const DEFAULT_CHECKLIST_ITEMS = [
  "businessPurposeConfirmed",
  "businessOwnerConfirmed",
  "documentationAvailable",
  "botCanBeOpened",
  "botCanBeExecuted",
  "errorHandlingPresent",
  "retryLogicPresent",
  "loggingPresent",
  "auditTrailPresent",
  "hardcodedCredentials",
  "hardcodedFilePaths",
  "usesScreenCoordinates",
  "usesUISelectors",
  "usesReusableSubflows",
  "duplicateFilePrevention",
  "fileValidationPresent",
  "uploadVerificationPresent",
  "alertingPresent",
  "recoveryProcedureDocumented",
  "dependenciesIdentified",
  "accessConfirmed",
  "sensitiveDataExposureRisk",
  "changeVersionInfoAvailable",
];

// Helper to normalize enum values
function parseEnum<T extends Record<string, string>>(val: any, enumObj: T, defaultVal: keyof T): any {
  if (!val) return defaultVal;
  const upper = String(val).toUpperCase().replace(/\s+/g, "_");
  return Object.values(enumObj).includes(upper as any) ? upper : defaultVal;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let importedBotsCount = 0;
    let importedStepsCount = 0;

    if (filename.endsWith(".json")) {
      const data = JSON.parse(buffer.toString());
      const botsArray = Array.isArray(data) ? data : [data];

      for (const rawBot of botsArray) {
        if (!rawBot.name) continue;

        // Generate next botCode
        const lastBot = await prisma.bot.findFirst({
          where: { botCode: { startsWith: "BOT-" } },
          orderBy: { botCode: "desc" },
          select: { botCode: true },
        });

        let nextNumber = 1;
        if (lastBot) {
          const match = lastBot.botCode.match(/^BOT-(\d+)$/);
          if (match) nextNumber = parseInt(match[1], 10) + 1;
        }
        const botCode = `BOT-${String(nextNumber).padStart(3, "0")}`;

        // Create Bot inside transaction
        await prisma.$transaction(async (tx) => {
          const bot = await tx.bot.create({
            data: {
              botCode,
              name: rawBot.name,
              vendor: rawBot.vendor || null,
              technology: parseEnum(rawBot.technology, Technology, "PAD"),
              department: rawBot.department || null,
              currentStatus: parseEnum(rawBot.currentStatus, BotStatus, "UNKNOWN"),
              criticality: parseEnum(rawBot.criticality, Criticality, "MEDIUM"),
              environment: rawBot.environment || "UNKNOWN",
              businessPurpose: rawBot.businessPurpose || null,
              businessProcess: rawBot.businessProcess || null,
              businessOwner: rawBot.businessOwner || null,
              technicalOwner: rawBot.technicalOwner || null,
              scheduleOrTrigger: rawBot.scheduleOrTrigger || null,
              reviewSummary: rawBot.reviewSummary || null,
              finalRecommendation: rawBot.finalRecommendation || null,
              reviewStatus: parseEnum(rawBot.reviewStatus, ReviewStatus, "NOT_STARTED"),
              
              // New Bot Registry Fields
              srNo: rawBot.srNo ? Number(rawBot.srNo) : null,
              projectName: rawBot.projectName || null,
              partner: rawBot.partner || null,
              departmentSpoc: rawBot.departmentSpoc || null,
              vendorSpoc: rawBot.vendorSpoc || null,
              unitySpoc: rawBot.unitySpoc || null,
              startDate: rawBot.startDate ? new Date(rawBot.startDate) : null,
              cabDate: rawBot.cabDate ? new Date(rawBot.cabDate) : null,
              nextSteps: rawBot.nextSteps || null,
              effortsInDays: rawBot.effortsInDays ? Number(rawBot.effortsInDays) : null,
              roi: rawBot.roi || null,
              oldBotsNewBots: rawBot.oldBotsNewBots || null,
              vendorPaymentStatus: rawBot.vendorPaymentStatus || null,
              botAssociated: rawBot.botAssociated || null,
              botFrequency: rawBot.botFrequency || null,
              processId: rawBot.processId || null,
              server: rawBot.server || null,
              botExecutionUserId: rawBot.botExecutionUserId || null,
              docsLinks: rawBot.docsLinks || null,

              checklist: {
                create: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
                  checklistItem: item,
                  value: "NOT_VERIFIED",
                })),
              },
            },
          });

          // Insert nested steps if any
          if (Array.isArray(rawBot.steps)) {
            for (let i = 0; i < rawBot.steps.length; i++) {
              const rawStep = rawBot.steps[i];
              const matchingFields = processStepForMatching({
                description: rawStep.description || "",
                actionType: rawStep.actionType || "OTHER",
                inputType: rawStep.inputType,
                systemType: rawStep.systemType,
                validationType: rawStep.validationType,
                retryStrategy: rawStep.retryStrategy,
              });

              await tx.botStep.create({
                data: {
                  botId: bot.id,
                  stepOrder: rawStep.stepOrder || i + 1,
                  actionType: rawStep.actionType || "OTHER",
                  description: rawStep.description || "Step",
                  systemName: rawStep.systemName || null,
                  systemType: rawStep.systemType || null,
                  inputType: rawStep.inputType || null,
                  outputType: rawStep.outputType || null,
                  validationType: rawStep.validationType || null,
                  retryStrategy: rawStep.retryStrategy || null,
                  notes: rawStep.notes || null,
                  tags: rawStep.tags || [],
                  normalizedText: matchingFields.normalizedText,
                  canonicalSignature: matchingFields.canonicalSignature,
                  exactHash: matchingFields.exactHash,
                },
              });
              importedStepsCount++;
            }
          }
        });

        importedBotsCount++;
      }
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      const workbook = read(buffer, { type: "buffer" });
      
      // Parse bots sheet (first sheet)
      const botSheetName = workbook.SheetNames[0];
      const botRows: any[] = utils.sheet_to_json(workbook.Sheets[botSheetName]);

      // Optional steps sheet (second sheet)
      let stepRows: any[] = [];
      const stepSheetName = workbook.SheetNames.find(
        (name) => name.toLowerCase().includes("step") || name.toLowerCase().includes("process")
      );
      if (stepSheetName) {
        stepRows = utils.sheet_to_json(workbook.Sheets[stepSheetName]);
      }

      // Track newly created bot mappings by name/code for step association
      const createdBotsMap = new Map<string, string>();

      for (const row of botRows) {
        const name = row.name || row["Bot Name"] || row["Name"];
        if (!name) continue;

        // Generate next botCode
        const lastBot = await prisma.bot.findFirst({
          where: { botCode: { startsWith: "BOT-" } },
          orderBy: { botCode: "desc" },
          select: { botCode: true },
        });

        let nextNumber = 1;
        if (lastBot) {
          const match = lastBot.botCode.match(/^BOT-(\d+)$/);
          if (match) nextNumber = parseInt(match[1], 10) + 1;
        }
        const botCode = `BOT-${String(nextNumber).padStart(3, "0")}`;

        const technology = parseEnum(row.technology || row["Technology"], Technology, "PAD");
        const status = parseEnum(row.currentStatus || row["Status"] || row["Bot Status"] || row["Current Status"], BotStatus, "UNKNOWN");
        const criticality = parseEnum(row.criticality || row["Criticality"], Criticality, "MEDIUM");

        const bot = await prisma.bot.create({
          data: {
            botCode,
            name: String(name),
            vendor: row.vendor || row["Vendor"] || null,
            technology,
            department: row.department || row["Department"] || null,
            currentStatus: status,
            criticality,
            environment: row.environment || row["Environment"] || "UNKNOWN",
            businessPurpose: row.businessPurpose || row["Business Purpose"] || null,
            businessProcess: row.businessProcess || row["Business Process"] || null,
            businessOwner: row.businessOwner || row["Business Owner"] || null,
            technicalOwner: row.technicalOwner || row["Technical Owner"] || null,
            scheduleOrTrigger: row.scheduleOrTrigger || row["Schedule"] || row["Trigger"] || null,
            reviewStatus: "NOT_STARTED",

            // New Bot Registry Fields
            srNo: row.srNo || row["Sr. No"] ? Number(row.srNo || row["Sr. No"]) : null,
            projectName: row.projectName || row["Project Name"] || null,
            partner: row.partner || row["Partner"] || null,
            departmentSpoc: row.departmentSpoc || row["Department spoc"] || null,
            vendorSpoc: row.vendorSpoc || row["Vendor spoc"] || null,
            unitySpoc: row.unitySpoc || row["Unity spoc"] || null,
            startDate: row.startDate || row["Start date"] ? new Date(row.startDate || row["Start date"]) : null,
            cabDate: row.cabDate || row["Cab date"] ? new Date(row.cabDate || row["Cab date"]) : null,
            nextSteps: row.nextSteps || row["Next steps"] || null,
            effortsInDays: row.effortsInDays || row["Efforts in days"] ? Number(row.effortsInDays || row["Efforts in days"]) : null,
            roi: row.roi || row["Roi( time / fte / process improvements)"] || row["Roi( time / fte/ process improvements)"] || null,
            oldBotsNewBots: row.oldBotsNewBots || row["Old bots / new bots"] || null,
            vendorPaymentStatus: row.vendorPaymentStatus || row["Vendor payment status"] || null,
            botAssociated: row.botAssociated || row["Bot associated"] || null,
            botFrequency: row.botFrequency || row["Bot frequency"] || null,
            processId: row.processId || row["Process id"] || null,
            server: row.server || row["Server"] || null,
            botExecutionUserId: row.botExecutionUserId || row["Bot execution user id"] || null,
            docsLinks: row.docsLinks || row["Docs links"] || null,

            checklist: {
              create: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
                checklistItem: item,
                value: "NOT_VERIFIED",
              })),
            },
          },
        });

        // Store mappings by original name or matching criteria in sheet
        createdBotsMap.set(String(name).toLowerCase(), bot.id);
        const originalCode = row.botCode || row["Bot Code"] || row["Code"];
        if (originalCode) {
          createdBotsMap.set(String(originalCode).toLowerCase(), bot.id);
        }

        importedBotsCount++;
      }

      // If we have process steps rows, import them
      if (stepRows.length > 0) {
        // Group step rows by associated bot reference
        for (const row of stepRows) {
          const botRef = row.botCode || row["Bot Code"] || row.botName || row["Bot Name"] || row.bot || row["Bot"];
          const desc = row.description || row["Description"] || row.step || row["Step"];
          if (!botRef || !desc) continue;

          const botId = createdBotsMap.get(String(botRef).toLowerCase());
          if (!botId) continue;

          const actionType = parseEnum(row.actionType || row["Action Type"] || row["Action"], Technology, "OTHER");

          const matchingFields = processStepForMatching({
            description: String(desc),
            actionType,
            inputType: row.inputType || row["Input Type"],
            systemType: row.systemType || row["System Type"],
            validationType: row.validationType || row["Validation Type"],
            retryStrategy: row.retryStrategy || row["Retry Strategy"],
          });

          await prisma.botStep.create({
            data: {
              botId,
              stepOrder: Number(row.stepOrder || row["Step Order"] || row["Order"] || 1),
              actionType: actionType as any,
              description: String(desc),
              systemName: row.systemName || row["System Name"] || null,
              systemType: row.systemType || row["System Type"] || null,
              inputType: row.inputType || row["Input Type"] || null,
              outputType: row.outputType || row["Output Type"] || null,
              validationType: row.validationType || row["Validation Type"] || null,
              retryStrategy: row.retryStrategy || row["Retry Strategy"] || null,
              notes: row.notes || row["Notes"] || null,
              tags: row.tags ? String(row.tags).split(",").map((t) => t.trim()) : [],
              normalizedText: matchingFields.normalizedText,
              canonicalSignature: matchingFields.canonicalSignature,
              exactHash: matchingFields.exactHash,
            },
          });

          importedStepsCount++;
        }
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload JSON or Excel file (.xlsx)" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      importedBots: importedBotsCount,
      importedSteps: importedStepsCount,
    });
  } catch (error) {
    console.error("POST /api/bots/import error:", error);
    return NextResponse.json({ error: "Failed to import bots" }, { status: 500 });
  }
}
