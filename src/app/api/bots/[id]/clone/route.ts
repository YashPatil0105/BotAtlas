import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const bot = await prisma.bot.findUnique({
      where: { id },
      include: {
        steps: true,
        dependencies: true,
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Generate new bot code
    const lastBot = await prisma.bot.findFirst({
      where: { botCode: { startsWith: "BOT-" } },
      orderBy: { botCode: "desc" },
      select: { botCode: true },
    });

    let nextNumber = 1;
    if (lastBot) {
      const match = lastBot.botCode.match(/^BOT-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const newBotCode = `BOT-${String(nextNumber).padStart(3, "0")}`;

    const newBot = await prisma.bot.create({
      data: {
        botCode: newBotCode,
        name: `${bot.name} (Clone)`,
        vendor: bot.vendor,
        technology: bot.technology,
        department: bot.department,
        currentStatus: "UNKNOWN",
        criticality: bot.criticality,
        environment: bot.environment,
        businessPurpose: bot.businessPurpose,
        businessProcess: bot.businessProcess,
        businessOwner: bot.businessOwner,
        technicalOwner: bot.technicalOwner,
        scheduleOrTrigger: bot.scheduleOrTrigger,
        reviewStatus: "NOT_STARTED",
        checklist: {
          create: [
            "businessPurposeConfirmed", "businessOwnerConfirmed", "documentationAvailable",
            "botCanBeOpened", "botCanBeExecuted", "errorHandlingPresent", "retryLogicPresent",
            "loggingPresent", "auditTrailPresent", "hardcodedCredentials", "hardcodedFilePaths",
            "usesScreenCoordinates", "usesUISelectors", "usesReusableSubflows", "duplicateFilePrevention",
            "fileValidationPresent", "uploadVerificationPresent", "alertingPresent",
            "recoveryProcedureDocumented", "dependenciesIdentified", "accessConfirmed",
            "sensitiveDataExposureRisk", "changeVersionInfoAvailable"
          ].map(item => ({ checklistItem: item, value: "NOT_VERIFIED" }))
        },
        steps: {
          create: bot.steps.map(step => ({
            stepOrder: step.stepOrder,
            actionType: step.actionType,
            description: step.description,
            systemName: step.systemName,
            moduleName: step.moduleName,
            tags: step.tags,
            reusableCandidate: step.reusableCandidate
          }))
        },
        dependencies: {
          create: bot.dependencies.map(dep => ({
            dependencyType: dep.dependencyType,
            name: dep.name,
            ownerTeam: dep.ownerTeam,
            criticality: dep.criticality
          }))
        }
      }
    });

    return NextResponse.json({ id: newBot.id, botCode: newBotCode }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bots/[id]/clone error:", error);
    return NextResponse.json({ error: "Failed to clone bot" }, { status: 500 });
  }
}
