import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bots = await prisma.bot.findMany({
      select: {
        id: true,
        botCode: true,
        name: true,
        scheduleOrTrigger: true,
        criticality: true,
      },
      orderBy: {
        botCode: "asc"
      }
    });

    return NextResponse.json({ bots });
  } catch (error: any) {
    console.error("Scheduling GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "REVIEWER") {
      return NextResponse.json({ error: "Forbidden: Reviewer or Admin permission required." }, { status: 403 });
    }

    const { botId, scheduleOrTrigger } = await req.json();

    if (!botId) {
      return NextResponse.json({ error: "Missing botId" }, { status: 400 });
    }

    const updatedBot = await prisma.bot.update({
      where: { id: botId },
      data: { scheduleOrTrigger }
    });

    return NextResponse.json({ success: true, bot: updatedBot });
  } catch (error: any) {
    console.error("Scheduling PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
