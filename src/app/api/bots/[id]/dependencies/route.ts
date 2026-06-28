import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { dependencySchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dependencies = await prisma.dependency.findMany({
      where: { botId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(dependencies);
  } catch (error) {
    console.error("GET /api/bots/[id]/dependencies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dependencies" },
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

    const parsed = dependencySchema.safeParse(body);
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

    const dependency = await prisma.dependency.create({
      data: {
        botId: id,
        dependencyType: parsed.data.dependencyType as any,
        name: parsed.data.name,
        ownerTeam: parsed.data.ownerTeam,
        criticality: parsed.data.criticality,
        accessConfirmed: parsed.data.accessConfirmed,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    console.error("POST /api/bots/[id]/dependencies error:", error);
    return NextResponse.json(
      { error: "Failed to create dependency" },
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
    const { dependencyId, ...updateData } = body;

    if (!dependencyId) {
      return NextResponse.json(
        { error: "dependencyId is required" },
        { status: 400 }
      );
    }

    const parsed = dependencySchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.dependency.findFirst({
      where: { id: dependencyId, botId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    const dependency = await prisma.dependency.update({
      where: { id: dependencyId },
      data: {
        ...parsed.data,
        dependencyType: parsed.data.dependencyType as any,
      },
    });

    return NextResponse.json(dependency);
  } catch (error) {
    console.error("PUT /api/bots/[id]/dependencies error:", error);
    return NextResponse.json(
      { error: "Failed to update dependency" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dependencyId = searchParams.get("id");

    if (!dependencyId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.dependency.findUnique({
      where: { id: dependencyId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    await prisma.dependency.delete({ where: { id: dependencyId } });

    return NextResponse.json({ success: true, message: "Dependency deleted" });
  } catch (error) {
    console.error("DELETE /api/bots/[id]/dependencies error:", error);
    return NextResponse.json(
      { error: "Failed to delete dependency" },
      { status: 500 }
    );
  }
}
