import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, cancel } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = await prisma.pamSession.findUnique({
      where: { id: sessionId },
      include: { server: true }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "BUSY") {
      return NextResponse.json({ error: "Session is not busy" }, { status: 400 });
    }

    const completedBotId = session.currentBotId;

    await prisma.$transaction(async (tx) => {
      // 1. Free the current session
      await tx.pamSession.update({
        where: { id: sessionId },
        data: {
          status: "FREE",
          currentBotId: null,
          currentUserId: null,
          lastReleasedAt: new Date(),
        }
      });

      // 2. Log check-in
      if (completedBotId) {
        await tx.executionActivityLog.create({
          data: {
            botId: completedBotId,
            userId: user.id,
            serverId: session.serverId,
            sessionName: session.sessionName,
            action: "CHECKIN",
            details: cancel 
              ? `Session '${session.sessionName}' on '${session.server.name}' run cancelled by ${user.name}.`
              : `Session '${session.sessionName}' on '${session.server.name}' checked in (execution completed) by ${user.name}.`,
          }
        });

        // 3. Promote the next queued user for this bot (if any)
        const nextInQueue = await tx.executionQueue.findFirst({
          where: { botId: completedBotId, status: "QUEUED" },
          orderBy: { queuePosition: "asc" }
        });

        if (nextInQueue) {
          // Update queue status to ASSIGNED
          await tx.executionQueue.update({
            where: { id: nextInQueue.id },
            data: {
              status: "ASSIGNED",
              assignedServerId: session.serverId,
              assignedSessionId: session.id,
              assignedAt: new Date(),
              expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes to claim
            }
          });

          // Mark session busy again immediately for the promoted user
          await tx.pamSession.update({
            where: { id: sessionId },
            data: {
              status: "BUSY",
              currentBotId: completedBotId,
              currentUserId: nextInQueue.userId,
              lastCheckInAt: new Date(),
            }
          });

          // Decrement all remaining queue entries for this bot
          await tx.executionQueue.updateMany({
            where: {
              botId: completedBotId,
              status: "QUEUED",
            },
            data: {
              queuePosition: { decrement: 1 }
            }
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Session checked in successfully." });

  } catch (error: any) {
    console.error("Checkin error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
  
