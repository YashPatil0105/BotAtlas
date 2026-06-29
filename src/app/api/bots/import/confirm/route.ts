import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ParsedBot } from "@/lib/parsers/types";
import { processStepForMatching, generateSubflowSignature } from "@/services/similarity.service";
import crypto from 'crypto';

const DEFAULT_CHECKLIST_ITEMS = [
  "businessPurposeConfirmed", "businessOwnerConfirmed", "documentationAvailable",
  "botCanBeOpened", "botCanBeExecuted", "errorHandlingPresent", "retryLogicPresent",
  "loggingPresent", "auditTrailPresent", "hardcodedCredentials", "hardcodedFilePaths",
  "usesScreenCoordinates", "usesUISelectors", "usesReusableSubflows",
  "duplicateFilePrevention", "fileValidationPresent", "uploadVerificationPresent",
  "alertingPresent", "recoveryProcedureDocumented", "dependenciesIdentified",
  "accessConfirmed", "sensitiveDataExposureRisk", "changeVersionInfoAvailable",
];

export async function POST(request: NextRequest) {
  try {
    const parsed: ParsedBot = await request.json();

    if (!parsed || !parsed.name) {
      return NextResponse.json({ error: "Invalid parsed bot data" }, { status: 400 });
    }

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

    // Map technology string to enum
    const techMap: Record<string, string> = {
      PAD: "PAD",
      POWER_AUTOMATE_CLOUD: "POWER_AUTOMATE_CLOUD",
      UI_PATH: "UI_PATH",
      BLUE_PRISM: "BLUE_PRISM",
      AUTOMATION_ANYWHERE: "AUTOMATION_ANYWHERE",
    };
    const technology = techMap[parsed.technology?.toUpperCase()] || "PAD";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create bot
      const bot = await tx.bot.create({
        data: {
          botCode,
          name: parsed.name,
          technology: technology as any,
          businessPurpose: parsed.businessPurpose || null,
          department: parsed.department || null,
          businessOwner: parsed.businessOwner || null,
          technicalOwner: parsed.technicalOwner || null,
          vendor: parsed.vendor || null,
          environment: (parsed.environment as any) || "UNKNOWN",
          currentStatus: (parsed.currentStatus as any) || "UNKNOWN",
          scheduleOrTrigger: parsed.scheduleOrTrigger || null,
          reviewStatus: "NOT_STARTED",
          criticality: "MEDIUM",
        },
      });

      // 2. Create steps
      let stepsCreated = 0;
      
      const subflowStepIds = new Map<string, string[]>();
      const subflowActionTypes = new Map<string, string[]>();

      for (const step of parsed.steps) {
        const matchingFields = processStepForMatching({
          description: step.description || "",
          actionType: step.actionType || "OTHER",
          inputType: step.inputType,
          systemType: step.systemType,
        });

        const createdStep = await tx.botStep.create({
          data: {
            botId: bot.id,
            stepOrder: step.stepOrder,
            actionType: (step.actionType as any) || "OTHER",
            description: step.description,
            moduleName: step.moduleName || null,
            systemName: step.systemName || null,
            systemType: step.systemType || null,
            inputType: step.inputType || null,
            outputType: step.outputType || null,
            notes: step.notes || null,
            tags: step.tags || [],
            normalizedText: matchingFields.normalizedText,
            canonicalSignature: matchingFields.canonicalSignature,
            exactHash: matchingFields.exactHash,
          },
        });
        stepsCreated++;

        const flowName = (step.tags && step.tags.length > 0) ? step.tags[0].toLowerCase() : 'main';
        if (!subflowStepIds.has(flowName)) {
          subflowStepIds.set(flowName, []);
          subflowActionTypes.set(flowName, []);
        }
        subflowStepIds.get(flowName)!.push(createdStep.id);
        subflowActionTypes.get(flowName)!.push(step.actionType || "OTHER");
      }

      // 2.5 Auto-register subflows as Components
      for (const [flowName, stepIds] of subflowStepIds.entries()) {
        if (flowName === 'main' || flowName === 'mainflow' || stepIds.length < 2) continue; // Skip main flow

        const actionTypes = subflowActionTypes.get(flowName)!;
        const signature = generateSubflowSignature(actionTypes);

        let component = await tx.component.findFirst({
          where: { canonicalSignature: signature }
        });

        if (component) {
          component = await tx.component.update({
            where: { id: component.id },
            data: { usageCount: { increment: 1 } }
          });
        } else {
          const shortHash = crypto.createHash('sha1').update(signature).digest('hex').substring(0, 8).toUpperCase();
          const componentCode = `COMP-${shortHash}`;
          
          component = await tx.component.create({
            data: {
              componentCode,
              name: flowName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              componentType: 'SUBFLOW' as any,
              canonicalSignature: signature,
              sourceBotId: bot.id,
              status: 'CANDIDATE',
              usageCount: 1,
              tags: [flowName]
            }
          });
        }

        // Map all steps in the subflow to this component
        for (const stepId of stepIds) {
          await tx.stepComponentMap.create({
            data: {
              stepId,
              componentId: component.id,
              matchType: 'EXACT',
              confidenceScore: 1.0,
              notes: 'Auto-registered from subflow'
            }
          });
        }
      }

      // 3. Create dependencies
      let depsCreated = 0;
      for (const dep of parsed.dependencies) {
        await tx.dependency.create({
          data: {
            botId: bot.id,
            dependencyType: (dep.dependencyType as any) || "OTHER",
            name: dep.name,
            notes: dep.source || null,
          },
        });
        depsCreated++;
      }

      // 4. Create findings (non-dismissed only)
      let findingsCreated = 0;
      for (const finding of parsed.findings) {
        if (finding.dismissed) continue;
        await tx.finding.create({
          data: {
            botId: bot.id,
            category: (finding.category as any) || "DOCUMENTATION",
            observation: finding.observation,
            recommendation: finding.recommendation || null,
            evidence: finding.evidence || null,
            priority: (finding.priority as any) || "MEDIUM",
            status: "OPEN",
          },
        });
        findingsCreated++;
      }

      // 5. Create checklist — merge auto-fills with defaults
      const autoFillMap = new Map(
        parsed.checklistAutoFills.map((c) => [c.checklistItem, c])
      );
      for (const item of DEFAULT_CHECKLIST_ITEMS) {
        const autoFill = autoFillMap.get(item);
        await tx.botChecklist.create({
          data: {
            botId: bot.id,
            checklistItem: item,
            value: (autoFill?.value as any) || "NOT_VERIFIED",
            notes: autoFill?.notes || null,
          },
        });
      }

      // 6. Create audit log
      await tx.auditLog.create({
        data: {
          entityType: "Bot",
          entityId: bot.id,
          action: `IMPORTED_FROM_${parsed.sourceFormat.toUpperCase()}`,
          field: "import",
          newValue: `${stepsCreated} steps, ${depsCreated} deps, ${findingsCreated} findings`,
        },
      });

      return {
        botId: bot.id,
        botCode: bot.botCode,
        botName: bot.name,
        stepsCreated,
        dependenciesCreated: depsCreated,
        findingsCreated,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("POST /api/bots/import/confirm error:", error);
    return NextResponse.json(
      { error: "Failed to import bot" },
      { status: 500 }
    );
  }
}
