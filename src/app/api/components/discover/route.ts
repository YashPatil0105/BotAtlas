import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ActionType } from "@prisma/client";

// Map ActionType to suggested ComponentType strings
const ACTION_TYPE_CATEGORY_MAP: Record<ActionType, string> = {
  PORTAL_LOGIN: "Login Module",
  BROWSER_NAVIGATION: "Browser Automation",
  FILE_DOWNLOAD: "File Handler",
  FILE_UPLOAD: "File Handler",
  SFTP_UPLOAD: "SFTP Transfer",
  SFTP_DOWNLOAD: "SFTP Transfer",
  FILE_VALIDATION: "Validation Module",
  FILE_ARCHIVE: "File Handler",
  EXCEL_READ: "Excel Handler",
  EXCEL_WRITE: "Excel Handler",
  DATABASE_QUERY: "Database Connector",
  API_CALL: "API Connector",
  EMAIL_SEND: "Email Notifier",
  TEAMS_NOTIFICATION: "Email Notifier",
  APPROVAL: "Other",
  DATA_TRANSFORMATION: "Data Transformer",
  SCREENSHOT_CAPTURE: "Other",
  ERROR_LOGGING: "Error Handler",
  RETRY: "Retry Mechanism",
  OTHER: "Other",
};

export async function GET(request: NextRequest) {
  try {
    // 1. Group steps by exactHash or canonicalSignature to find repeats
    const repeatedSteps = await prisma.botStep.groupBy({
      by: ["exactHash", "canonicalSignature"],
      where: {
        AND: [
          { exactHash: { not: null } },
          { exactHash: { not: "" } },
        ],
      },
      _count: {
        _all: true,
      },
      having: {
        exactHash: {
          _count: {
            gt: 1, // Must be used in more than 1 step
          },
        },
      },
    });

    const candidates = [];

    for (const group of repeatedSteps) {
      const hash = group.exactHash!;
      const sig = group.canonicalSignature!;
      const count = group._count._all;

      // Find the detailed steps in this group
      const steps = await prisma.botStep.findMany({
        where: { exactHash: hash },
        include: {
          bot: {
            select: {
              id: true,
              name: true,
              botCode: true,
            },
          },
        },
      });

      if (steps.length === 0) continue;

      const firstStep = steps[0];
      const botIds = new Set(steps.map((s) => s.botId));
      
      // We only want candidates used across multiple DIFFERENT bots
      if (botIds.size <= 1) continue;

      // Extract a nice name from descriptions (using the shortest, cleanest description as the name)
      const cleanestDescription = steps
        .map((s) => s.description)
        .sort((a, b) => a.length - b.length)[0];

      // Auto category mapping
      const action = firstStep.actionType;
      const componentType = ACTION_TYPE_CATEGORY_MAP[action] || "Other";

      // Check if this component is already registered in the component registry
      const existingComponent = await prisma.component.findFirst({
        where: {
          OR: [
            { canonicalSignature: sig },
            { name: cleanestDescription },
          ],
        },
        select: {
          id: true,
          componentCode: true,
          status: true,
        },
      });

      candidates.push({
        name: cleanestDescription,
        componentType,
        canonicalSignature: sig,
        exactHash: hash,
        usageCount: count,
        distinctBotsCount: botIds.size,
        associatedSteps: steps.map((s) => ({
          stepId: s.id,
          description: s.description,
          systemName: s.systemName,
          botName: s.bot.name,
          botCode: s.bot.botCode,
          botId: s.bot.id,
        })),
        isRegistered: !!existingComponent,
        registeredCode: existingComponent?.componentCode || null,
        registeredId: existingComponent?.id || null,
      });
    }

    // Sort by usageCount descending
    candidates.sort((a, b) => b.usageCount - a.usageCount);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("GET /api/components/discover error:", error);
    return NextResponse.json(
      { error: "Failed to discover reusable components" },
      { status: 500 }
    );
  }
}
