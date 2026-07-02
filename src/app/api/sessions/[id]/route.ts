import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const { sessionName, pamUserId, status } = await req.json();

    const db = prisma as any;
    const current = await db.pamSession.findUnique({
      where: { id },
      include: { server: true }
    });

    if (!current) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (sessionName && sessionName !== current.sessionName) {
      const existing = await db.pamSession.findUnique({
        where: {
          serverId_sessionName: {
            serverId: current.serverId,
            sessionName
          }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "Session name already exists on this server" }, { status: 400 });
      }
    }

    const session = await db.pamSession.update({
      where: { id },
      data: {
        sessionName: sessionName !== undefined ? sessionName : undefined,
        pamUserId: pamUserId !== undefined ? pamUserId : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "PAM_SESSION",
        entityId: id,
        action: "UPDATE_SESSION",
        newValue: `Updated session ${session.sessionName} (PAM User: ${session.pamUserId}, Status: ${session.status}) on server ${current.server.name}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error("Update session error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { id } = await params;

    const db = prisma as any;
    const session = await db.pamSession.findUnique({
      where: { id },
      include: { server: true }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await db.pamSession.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entityType: "PAM_SESSION",
        entityId: id,
        action: "DELETE_SESSION",
        oldValue: `Deleted session ${session.sessionName} on server ${session.server.name}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Session deleted successfully." });
  } catch (error: any) {
    console.error("Delete session error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
