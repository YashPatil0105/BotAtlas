import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bot = await prisma.bot.findUnique({
      where: { id },
      include: { checklist: true },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const defaultItems = [
      { name: "Code Review", note: "Auto-generated requirement based on policy." },
      { name: "Security Review", note: "Auto-generated requirement based on policy." },
      { name: "Access Control", note: "Auto-generated requirement based on policy." },
      { name: "Documentation", note: "Auto-generated requirement based on policy." },
    ];

    if (bot.criticality === "CRITICAL" || bot.criticality === "HIGH") {
      defaultItems.push({ name: "Penetration Testing", note: "Required for High/Critical bots." });
    }

    if (bot.vendor) {
      defaultItems.push({ name: "Vendor License Verification", note: "Required because vendor is associated." });
    }

    const createdItems = [];

    for (const item of defaultItems) {
      // Check if it already exists
      const exists = bot.checklist.find((c) => c.checklistItem === item.name);
      if (!exists) {
        const newItem = await prisma.botChecklist.create({
          data: {
            botId: id,
            checklistItem: item.name,
            value: "NOT_VERIFIED",
            notes: item.note,
          },
        });
        createdItems.push(newItem);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-generated ${createdItems.length} checklist items.`,
      items: createdItems,
    });
  } catch (error) {
    console.error("POST /api/bots/[id]/checklist/auto error:", error);
    return NextResponse.json(
      { error: "Failed to auto-generate checklist" },
      { status: 500 }
    );
  }
}
