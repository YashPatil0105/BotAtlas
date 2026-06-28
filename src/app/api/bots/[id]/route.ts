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
        findings: true,
        rootCauseAssessments: true,
        remediationTasks: true,
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
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.bot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
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
    console.error("PUT /api/bots/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update bot" },
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
