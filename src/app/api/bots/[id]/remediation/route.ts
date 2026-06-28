import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { remediationSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tasks = await prisma.remediationTask.findMany({
      where: { botId: id },
      include: {
        finding: {
          select: {
            id: true,
            observation: true,
            category: true,
            priority: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/bots/[id]/remediation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch remediation tasks" },
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

    const parsed = remediationSchema.safeParse(body);
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

    // Validate findingId belongs to this bot if provided
    if (parsed.data.findingId) {
      const finding = await prisma.finding.findFirst({
        where: { id: parsed.data.findingId, botId: id },
      });
      if (!finding) {
        return NextResponse.json(
          { error: "Finding not found for this bot" },
          { status: 400 }
        );
      }
    }

    const task = await prisma.remediationTask.create({
      data: {
        botId: id,
        findingId: parsed.data.findingId || null,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        owner: parsed.data.owner,
        status: parsed.data.status,
        targetDate: parsed.data.targetDate
          ? new Date(parsed.data.targetDate)
          : null,
      },
      include: {
        finding: {
          select: {
            id: true,
            observation: true,
            category: true,
            priority: true,
          },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/bots/[id]/remediation error:", error);
    return NextResponse.json(
      { error: "Failed to create remediation task" },
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
    const { taskId, ...updateData } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    const parsed = remediationSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.remediationTask.findFirst({
      where: { id: taskId, botId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Remediation task not found" },
        { status: 404 }
      );
    }

    const dataToUpdate: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.targetDate) {
      dataToUpdate.targetDate = new Date(parsed.data.targetDate);
    }

    const task = await prisma.remediationTask.update({
      where: { id: taskId },
      data: dataToUpdate,
      include: {
        finding: {
          select: {
            id: true,
            observation: true,
            category: true,
            priority: true,
          },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("PUT /api/bots/[id]/remediation error:", error);
    return NextResponse.json(
      { error: "Failed to update remediation task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.remediationTask.findUnique({
      where: { id: taskId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Remediation task not found" },
        { status: 404 }
      );
    }

    await prisma.remediationTask.delete({ where: { id: taskId } });

    return NextResponse.json({
      success: true,
      message: "Remediation task deleted",
    });
  } catch (error) {
    console.error("DELETE /api/bots/[id]/remediation error:", error);
    return NextResponse.json(
      { error: "Failed to delete remediation task" },
      { status: 500 }
    );
  }
}
