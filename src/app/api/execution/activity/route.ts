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

    const whereClause: any = {};
    if (botId) {
      whereClause.botId = botId;
    }

    const logs = await prisma.executionActivityLog.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      take: 50,
      include: {
        bot: {
          select: {
            botCode: true,
            name: true,
          }
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(logs);

  } catch (error: any) {
    console.error("Fetch activity logs error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
