import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { botCreateSchema } from "@/lib/validators";

function computeCompletenessScore(bot: Record<string, unknown>): number {
  const fieldsToCheck = [
    "name",
    "businessPurpose",
    "businessProcess",
    "department",
    "businessOwner",
    "technicalOwner",
    "vendor",
    "scheduleOrTrigger",
    "reviewSummary",
    "finalRecommendation",
  ];

  const defaultValues = new Set(["UNKNOWN", "NOT_STARTED", "MEDIUM"]);

  let filled = 0;
  for (const field of fieldsToCheck) {
    const value = bot[field];
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !defaultValues.has(String(value))
    ) {
      filled++;
    }
  }

  return Math.round((filled / fieldsToCheck.length) * 100);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bot = await prisma.bot.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
        dependencies: true,
        findings: {
          include: { remediationTasks: true }
        },
        rootCauseAssessments: true,
        remediationTasks: {
          include: { finding: true }
        },
        evidences: true,
        checklist: true,
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const completenessScore = computeCompletenessScore(
      bot as unknown as Record<string, unknown>
    );

    return NextResponse.json({ ...bot, completenessScore });
  } catch (error) {
    console.error("GET /api/bots/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bot" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = botCreateSchema.partial().safeParse(body);
    if (!parsed.success) {
      console.error("Validation failed in PUT /api/bots/[id]:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.bot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const isDecommissioned = parsed.data.currentStatus === "RETIRED" || parsed.data.currentStatus === "OBSOLETE";

    if (isDecommissioned) {
      // Run deletions in a transaction with the update
      const [bot] = await prisma.$transaction([
        prisma.bot.update({
          where: { id },
          data: parsed.data,
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
            dependencies: true,
            findings: true,
            rootCauseAssessments: true,
            remediationTasks: true,
            evidences: true,
            checklist: true,
          },
        }),
        prisma.botAssignment.deleteMany({ where: { botId: id } }),
        prisma.botDeployment.deleteMany({ where: { botId: id } }),
        prisma.executionQueue.deleteMany({ where: { botId: id } }),
        prisma.deploymentRequest.deleteMany({ where: { botId: id } }),
      ]);
      return NextResponse.json(bot);
    }

    const bot = await prisma.bot.update({
      where: { id },
      data: parsed.data,
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        dependencies: true,
        findings: true,
        rootCauseAssessments: true,
        remediationTasks: true,
        evidences: true,
        checklist: true,
      },
    });

    return NextResponse.json(bot);
  } catch (error) {
    console.error("PUT /api/bots/[id] 500 error:", error);
    return NextResponse.json(
      { error: "Failed to update bot", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.bot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    await prisma.bot.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Bot deleted" });
  } catch (error) {
    console.error("DELETE /api/bots/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete bot" },
      { status: 500 }
    );
  }
}
