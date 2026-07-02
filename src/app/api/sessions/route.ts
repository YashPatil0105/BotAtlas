import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { serverId, sessionName, pamUserId, status } = await req.json();

    if (!serverId || !sessionName || !pamUserId) {
      return NextResponse.json({ error: "Missing required session fields (serverId, sessionName, pamUserId)" }, { status: 400 });
    }

    const db = prisma as any;

    // Check if server exists
    const server = await db.pamServer.findUnique({ where: { id: serverId } });
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    // Check if session combination already exists
    const existing = await db.pamSession.findUnique({
      where: {
        serverId_sessionName: {
          serverId,
          sessionName
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Session name already exists on this server" }, { status: 400 });
    }

    const session = await db.pamSession.create({
      data: {
        serverId,
        sessionName,
        pamUserId,
        status: status || "FREE",
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "PAM_SESSION",
        entityId: session.id,
        action: "CREATE_SESSION",
        newValue: `Created session ${sessionName} (PAM User: ${pamUserId}) on server ${server.name}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
