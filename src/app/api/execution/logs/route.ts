import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const botId = searchParams.get("botId");

    if (!botId) {
      return NextResponse.json({ error: "Missing botId" }, { status: 400 });
    }

    const logs = await prisma.executionActivityLog.findMany({
      where: { botId },
      orderBy: { timestamp: "desc" },
      include: {
        user: { select: { name: true, email: true } }
      },
      take: 50 // Limit to last 50 logs for performance
    });

    return NextResponse.json(logs);
  } catch (e) {
    console.error("GET /api/execution/logs error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
 
