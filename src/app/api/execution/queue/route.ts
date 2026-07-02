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

    const queueEntries = await prisma.executionQueue.findMany({
      where: { botId, status: "QUEUED" },
      orderBy: { queuePosition: "asc" },
      include: {
        session: {
          include: { server: true }
        }
      }
    });

    const myEntry = await prisma.executionQueue.findFirst({
      where: {
        botId,
        userId: user.id,
        status: { in: ["QUEUED", "ASSIGNED"] }
      },
      include: {
        session: {
          include: { server: true }
        }
      }
    });

    const activeLock = await prisma.pamSession.findFirst({
      where: {
        status: "BUSY",
        currentBotId: botId,
        currentUserId: user.id
      },
      include: { server: true }
    });

    return NextResponse.json({
      myEntry,
      activeLock: activeLock ? {
        id: activeLock.id,
        serverId: activeLock.serverId,
        serverName: activeLock.server.name,
        sessionName: activeLock.sessionName,
        pamUserId: activeLock.pamUserId,
      } : null,
      queueLength: queueEntries.length,
      queueEntries: queueEntries.map((q: any) => ({
        id: q.id,
        queuePosition: q.queuePosition,
        requestedAt: q.requestedAt,
        userId: q.userId
      }))
    });

  } catch (error: any) {
    console.error("Queue GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId, action } = await req.json();

    if (!botId || action !== "leave") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const queueSlot = await prisma.executionQueue.findFirst({
      where: {
        botId,
        userId: user.id,
        status: { in: ["QUEUED", "ASSIGNED"] }
      }
    });

    if (!queueSlot) {
      return NextResponse.json({ message: "No active queue slot found." });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Cancel the queue slot
      await tx.executionQueue.update({
        where: { id: queueSlot.id },
        data: { status: "CANCELLED" }
      });

      // 2. If it was ASSIGNED (reserved a session), release that session
      if (queueSlot.status === "ASSIGNED" && queueSlot.assignedSessionId) {
        await tx.pamSession.update({
          where: { id: queueSlot.assignedSessionId },
          data: {
            status: "FREE",
            currentBotId: null,
            lastReleasedAt: new Date()
          }
        });

        // Try to promote the NEXT person since this session is now free again
        const nextInQueue = await tx.executionQueue.findFirst({
          where: { botId, status: "QUEUED" },
          orderBy: { queuePosition: "asc" }
        });

        if (nextInQueue) {
          await tx.executionQueue.update({
            where: { id: nextInQueue.id },
            data: {
              status: "ASSIGNED",
              assignedServerId: queueSlot.assignedServerId,
              assignedSessionId: queueSlot.assignedSessionId,
              assignedAt: new Date(),
              expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
          });

          await tx.pamSession.update({
            where: { id: queueSlot.assignedSessionId },
            data: {
              status: "BUSY",
              currentBotId: botId,
              lastCheckInAt: new Date()
            }
          });

          // Decrement remaining queue positions
          await tx.executionQueue.updateMany({
            where: { botId, status: "QUEUED" },
            data: { queuePosition: { decrement: 1 } }
          });
        }
      } else if (queueSlot.status === "QUEUED") {
        // If it was just QUEUED, decrement all queue positions behind this user
        await tx.executionQueue.updateMany({
          where: {
            botId,
            status: "QUEUED",
            queuePosition: { gt: queueSlot.queuePosition }
          },
          data: {
            queuePosition: { decrement: 1 }
          }
        });
      }

      // 3. Log queue cancellation
      await tx.executionActivityLog.create({
        data: {
          botId,
          userId: user.id,
          action: "QUEUE_LEAVE_TIMEOUT",
          details: `User ${user.name} voluntarily left the queue.`,
        }
      });
    });

    return NextResponse.json({ success: true, message: "Successfully left the queue." });

  } catch (error: any) {
    console.error("Queue POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
