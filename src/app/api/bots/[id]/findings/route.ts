import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { findingSchema } from "@/lib/validators";
import { FindingCategory, FindingStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { botId: id };

    if (status) {
      where.status = status as FindingStatus;
    }
    if (category) {
      where.category = category as FindingCategory;
    }

    const findings = await prisma.finding.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(findings);
  } catch (error) {
    console.error("GET /api/bots/[id]/findings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch findings" },
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

    const parsed = findingSchema.safeParse(body);
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

    const finding = await prisma.finding.create({
      data: {
        botId: id,
        category: parsed.data.category as any,
        observation: parsed.data.observation,
        evidence: parsed.data.evidence,
        impact: parsed.data.impact,
        recommendation: parsed.data.recommendation,
        priority: parsed.data.priority,
        status: parsed.data.status,
        owner: parsed.data.owner,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    console.error("POST /api/bots/[id]/findings error:", error);
    return NextResponse.json(
      { error: "Failed to create finding" },
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
    const { findingId, ...updateData } = body;

    if (!findingId) {
      return NextResponse.json(
        { error: "findingId is required" },
        { status: 400 }
      );
    }

    const parsed = findingSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.finding.findFirst({
      where: { id: findingId, botId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Finding not found" },
        { status: 404 }
      );
    }

    const dataToUpdate: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.category) {
      dataToUpdate.category = parsed.data.category as any;
    }
    if (parsed.data.dueDate) {
      dataToUpdate.dueDate = new Date(parsed.data.dueDate);
    }

    const finding = await prisma.finding.update({
      where: { id: findingId },
      data: dataToUpdate,
    });

    return NextResponse.json(finding);
  } catch (error) {
    console.error("PUT /api/bots/[id]/findings error:", error);
    return NextResponse.json(
      { error: "Failed to update finding" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const findingId = searchParams.get("id");

    if (!findingId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.finding.findUnique({
      where: { id: findingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Finding not found" },
        { status: 404 }
      );
    }

    await prisma.finding.delete({ where: { id: findingId } });

    return NextResponse.json({ success: true, message: "Finding deleted" });
  } catch (error) {
    console.error("DELETE /api/bots/[id]/findings error:", error);
    return NextResponse.json(
      { error: "Failed to delete finding" },
      { status: 500 }
    );
  }
}
