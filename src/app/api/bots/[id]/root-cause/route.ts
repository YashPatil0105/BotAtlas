import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { rootCauseSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assessments = await prisma.rootCauseAssessment.findMany({
      where: { botId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error("GET /api/bots/[id]/root-cause error:", error);
    return NextResponse.json(
      { error: "Failed to fetch root cause assessments" },
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

    const parsed = rootCauseSchema.safeParse(body);
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

    const assessment = await prisma.rootCauseAssessment.create({
      data: {
        botId: id,
        failurePoint: parsed.data.failurePoint,
        category: parsed.data.category as any,
        probableCause: parsed.data.probableCause,
        evidence: parsed.data.evidence,
        confirmed: parsed.data.confirmed,
        recoveryAction: parsed.data.recoveryAction,
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error("POST /api/bots/[id]/root-cause error:", error);
    return NextResponse.json(
      { error: "Failed to create root cause assessment" },
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
    const { assessmentId, ...updateData } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 }
      );
    }

    const parsed = rootCauseSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.rootCauseAssessment.findFirst({
      where: { id: assessmentId, botId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Root cause assessment not found" },
        { status: 404 }
      );
    }

    const dataToUpdate: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.category) {
      dataToUpdate.category = parsed.data.category as any;
    }

    const assessment = await prisma.rootCauseAssessment.update({
      where: { id: assessmentId },
      data: dataToUpdate,
    });

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("PUT /api/bots/[id]/root-cause error:", error);
    return NextResponse.json(
      { error: "Failed to update root cause assessment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("id");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.rootCauseAssessment.findUnique({
      where: { id: assessmentId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Root cause assessment not found" },
        { status: 404 }
      );
    }

    await prisma.rootCauseAssessment.delete({ where: { id: assessmentId } });

    return NextResponse.json({
      success: true,
      message: "Root cause assessment deleted",
    });
  } catch (error) {
    console.error("DELETE /api/bots/[id]/root-cause error:", error);
    return NextResponse.json(
      { error: "Failed to delete root cause assessment" },
      { status: 500 }
    );
  }
}
