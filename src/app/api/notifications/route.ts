import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    return NextResponse.json(notifications);
  } catch (e) {
    console.error("GET /api/notifications error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
