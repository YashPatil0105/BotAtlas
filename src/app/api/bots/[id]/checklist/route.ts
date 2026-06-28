import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { checklistSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const checklist = await prisma.botChecklist.findMany({
      where: { botId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error("GET /api/bots/[id]/checklist error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
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

    const parsed = checklistSchema.safeParse(body);
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

    const checklistItem = await prisma.botChecklist.upsert({
      where: {
        botId_checklistItem: {
          botId: id,
          checklistItem: parsed.data.checklistItem,
        },
      },
      update: {
        value: parsed.data.value,
        notes: parsed.data.notes,
        verifiedAt: new Date(),
      },
      create: {
        botId: id,
        checklistItem: parsed.data.checklistItem,
        value: parsed.data.value,
        notes: parsed.data.notes,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json(checklistItem);
  } catch (error) {
    console.error("PUT /api/bots/[id]/checklist error:", error);
    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 }
    );
  }
}
