import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { BotStatus, Criticality } from "@prisma/client";

export async function PUT(request: NextRequest) {
  try {
    const { botIds, action, value } = await request.json();

    if (!Array.isArray(botIds) || botIds.length === 0) {
      return NextResponse.json({ error: "No bot IDs provided" }, { status: 400 });
    }

    if (action === "status") {
      await prisma.bot.updateMany({
        where: { id: { in: botIds } },
        data: { currentStatus: value as BotStatus },
      });
    } else if (action === "criticality") {
      await prisma.bot.updateMany({
        where: { id: { in: botIds } },
        data: { criticality: value as Criticality },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: botIds.length });
  } catch (error) {
    console.error("PUT /api/bots/bulk error:", error);
    return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsStr = searchParams.get("ids");
    if (!idsStr) {
      return NextResponse.json({ error: "No bot IDs provided" }, { status: 400 });
    }
    
    const botIds = idsStr.split(",");
    
    await prisma.bot.deleteMany({
      where: { id: { in: botIds } },
    });

    return NextResponse.json({ success: true, count: botIds.length });
  } catch (error) {
    console.error("DELETE /api/bots/bulk error:", error);
    return NextResponse.json({ error: "Failed to perform bulk deletion" }, { status: 500 });
  }
}
