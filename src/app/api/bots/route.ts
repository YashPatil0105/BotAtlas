import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { botCreateSchema } from "@/lib/validators";
import { BotStatus, ReviewStatus, Criticality, Technology } from "@prisma/client";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const reviewStatus = searchParams.get("reviewStatus");
    const vendor = searchParams.get("vendor");
    const department = searchParams.get("department");
    const criticality = searchParams.get("criticality");
    const technology = searchParams.get("technology");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.currentStatus = status as BotStatus;
    }
    if (reviewStatus) {
      where.reviewStatus = reviewStatus as ReviewStatus;
    }
    if (vendor) {
      where.vendor = { contains: vendor, mode: "insensitive" };
    }
    if (department) {
      where.department = { contains: department, mode: "insensitive" };
    }
    if (criticality) {
      where.criticality = criticality as Criticality;
    }
    if (technology) {
      where.technology = technology as Technology;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { botCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [bots, total] = await Promise.all([
      prisma.bot.findMany({
        where,
        include: {
          _count: {
            select: {
              steps: true,
              findings: true,
              dependencies: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.bot.count({ where }),
    ]);

    return NextResponse.json({ bots, total });
  } catch (error) {
    console.error("GET /api/bots error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bots" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = botCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Auto-generate botCode: BOT-XXX
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
    const botCode = `BOT-${String(nextNumber).padStart(3, "0")}`;

    const bot = await prisma.bot.create({
      data: {
        botCode,
        name: parsed.data.name,
        vendor: parsed.data.vendor,
        technology: parsed.data.technology,
        department: parsed.data.department,
        currentStatus: parsed.data.currentStatus,
        criticality: parsed.data.criticality,
        environment: parsed.data.environment,
        businessPurpose: parsed.data.businessPurpose,
        businessProcess: parsed.data.businessProcess,
        businessOwner: parsed.data.businessOwner,
        technicalOwner: parsed.data.technicalOwner,
        scheduleOrTrigger: parsed.data.scheduleOrTrigger,
        reviewSummary: parsed.data.reviewSummary,
        finalRecommendation: parsed.data.finalRecommendation,
        reviewStatus: parsed.data.reviewStatus,
        checklist: {
          create: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
            checklistItem: item,
            value: "NOT_VERIFIED",
          })),
        },
      },
      include: {
        checklist: true,
        _count: {
          select: {
            steps: true,
            findings: true,
            dependencies: true,
          },
        },
      },
    });

    return NextResponse.json(bot, { status: 201 });
  } catch (error) {
    console.error("POST /api/bots error:", error);
    return NextResponse.json(
      { error: "Failed to create bot" },
      { status: 500 }
    );
  }
}
