import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId, sessionId } = await req.json();

    if (!botId || !sessionId) {
      return NextResponse.json({ error: "Missing botId or sessionId" }, { status: 400 });
    }

    const session = await prisma.pamSession.findUnique({
      where: { id: sessionId },
      include: { server: true }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if session is already busy by a different bot (or user)
    // If it's busy but running the SAME bot, it could be the user themselves claiming a queued spot
    const activeQueueEntry = await prisma.executionQueue.findFirst({
      where: {
        botId,
        userId: user.id,
        status: "ASSIGNED",
        assignedSessionId: sessionId,
      }
    });

    if (session.status === "BUSY" && !activeQueueEntry) {
      return NextResponse.json({ error: "Session is already busy" }, { status: 400 });
    }

    // Perform the checkout
    await prisma.$transaction(async (tx) => {
      // 1. Mark session as busy
      await tx.pamSession.update({
        where: { id: sessionId },
        data: {
          status: "BUSY",
          currentBotId: botId,
          currentUserId: user.id,
          lastCheckInAt: new Date(),
        }
      });

      // 2. If user was in the queue and assigned to this session, resolve their queue entry
      if (activeQueueEntry) {
        await tx.executionQueue.update({
          where: { id: activeQueueEntry.id },
          data: {
            status: "COMPLETED",
          }
        });
      }

      // 3. Log checkout
      await tx.executionActivityLog.create({
        data: {
          botId,
          userId: user.id,
          serverId: session.serverId,
          sessionName: session.sessionName,
          action: "CHECKOUT",
          details: `Session '${session.sessionName}' on '${session.server.name}' checked out by ${user.name} for bot run.`,
        }
      });
    });

    return NextResponse.json({ success: true, message: "Session checked out successfully." });

  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
  
