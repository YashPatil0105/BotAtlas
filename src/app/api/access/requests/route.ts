import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

// GET all access requests (Admins)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await prisma.accessRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        bot: { select: { name: true, botCode: true, criticality: true } },
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(requests);
  } catch (e) {
    console.error("GET /api/access/requests error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST a new access request (Viewers)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { botId, notes } = body;

    if (!botId) {
      return NextResponse.json({ error: "Missing botId" }, { status: 400 });
    }

    // Check if an existing pending request exists
    const existing = await prisma.accessRequest.findFirst({
      where: {
        botId,
        userId: user.id,
        status: 'PENDING'
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Access request is already pending." }, { status: 400 });
    }

    // Create Request
    const accessReq = await prisma.accessRequest.create({
      data: {
        botId,
        userId: user.id,
        notes: notes || null,
        status: 'PENDING'
      },
      include: {
        bot: { select: { name: true, botCode: true } }
      }
    });

    // Notify all ADMINs
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "New Run Access Request",
          message: `${user.name} has requested run access for bot ${accessReq.bot.botCode} (${accessReq.bot.name}).`,
          link: `/dashboard/access`
        }))
      });
    }

    return NextResponse.json({ success: true, request: accessReq });
  } catch (e) {
    console.error("POST /api/access/requests error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
