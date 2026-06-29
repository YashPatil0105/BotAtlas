import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { botStepSchema } from "@/lib/validators";
import { processStepForMatching } from "@/services/similarity.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const steps = await prisma.botStep.findMany({
      where: { botId: id },
      orderBy: { stepOrder: "asc" },
    });

    return NextResponse.json(steps);
  } catch (error) {
    console.error("GET /api/bots/[id]/steps error:", error);
    return NextResponse.json(
      { error: "Failed to fetch steps" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = botStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const bot = await prisma.bot.findUnique({ where: { id } });
    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Generate matching fields
    const matchingFields = processStepForMatching({
      description: parsed.data.description,
      actionType: parsed.data.actionType,
      inputType: parsed.data.inputType,
      systemType: parsed.data.systemType,
      validationType: parsed.data.validationType,
      retryStrategy: parsed.data.retryStrategy,
    });

    const step = await prisma.botStep.create({
      data: {
        botId: id,
        stepOrder: parsed.data.stepOrder,
        actionType: parsed.data.actionType as any,
        description: parsed.data.description,
        systemName: parsed.data.systemName,
        systemType: parsed.data.systemType,
        moduleName: parsed.data.moduleName,
        inputType: parsed.data.inputType,
        outputType: parsed.data.outputType,
        validationType: parsed.data.validationType,
        retryStrategy: parsed.data.retryStrategy,
        tags: parsed.data.tags || [],
        notes: parsed.data.notes,
        normalizedText: matchingFields.normalizedText,
        canonicalSignature: matchingFields.canonicalSignature,
        exactHash: matchingFields.exactHash,
      },
    });

    // Find matching steps from other bots
    const matchingSteps = await prisma.botStep.findMany({
      where: {
        botId: { not: id },
        OR: [
          { exactHash: matchingFields.exactHash },
          { canonicalSignature: matchingFields.canonicalSignature },
        ],
      },
      include: {
        bot: {
          select: { id: true, name: true, botCode: true },
        },
      },
      take: 20,
    });

    return NextResponse.json(
      { step, matchingSteps },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bots/[id]/steps error:", error);
    return NextResponse.json(
      { error: "Failed to create step" },
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

    if (Array.isArray(body)) {
      // Bulk update stepOrder
      const updates = body.map(item => {
        return prisma.botStep.update({
          where: { id: item.id, botId: id },
          data: { stepOrder: item.stepOrder },
        });
      });
      await prisma.$transaction(updates);
      return NextResponse.json({ success: true, message: "Step order updated" });
    }

    const { stepId, ...updateData } = body;

    if (!stepId) {
      return NextResponse.json(
        { error: "stepId is required" },
        { status: 400 }
      );
    }

    const parsed = botStepSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingStep = await prisma.botStep.findFirst({
      where: { id: stepId, botId: id },
    });
    if (!existingStep) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    // Merge existing and new values for matching recalculation
    const mergedDescription = parsed.data.description ?? existingStep.description;
    const mergedActionType = parsed.data.actionType ?? existingStep.actionType;
    const mergedInputType = parsed.data.inputType ?? existingStep.inputType;
    const mergedSystemType = parsed.data.systemType ?? existingStep.systemType;
    const mergedValidationType = parsed.data.validationType ?? existingStep.validationType;
    const mergedRetryStrategy = parsed.data.retryStrategy ?? existingStep.retryStrategy;

    const matchingFields = processStepForMatching({
      description: mergedDescription,
      actionType: mergedActionType,
      inputType: mergedInputType,
      systemType: mergedSystemType,
      validationType: mergedValidationType,
      retryStrategy: mergedRetryStrategy,
    });

    const step = await prisma.botStep.update({
      where: { id: stepId },
      data: {
        ...parsed.data,
        actionType: parsed.data.actionType as any,
        normalizedText: matchingFields.normalizedText,
        canonicalSignature: matchingFields.canonicalSignature,
        exactHash: matchingFields.exactHash,
      },
    });

    return NextResponse.json(step);
  } catch (error) {
    console.error("PUT /api/bots/[id]/steps error:", error);
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stepId = searchParams.get("stepId");

    if (!stepId) {
      return NextResponse.json(
        { error: "stepId query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.botStep.findUnique({
      where: { id: stepId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    await prisma.botStep.delete({ where: { id: stepId } });

    return NextResponse.json({ success: true, message: "Step deleted" });
  } catch (error) {
    console.error("DELETE /api/bots/[id]/steps error:", error);
    return NextResponse.json(
      { error: "Failed to delete step" },
      { status: 500 }
    );
  }
}
