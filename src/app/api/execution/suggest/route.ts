import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

// Auto-releases sessions locked for more than 30 minutes and promotes queued users
async function autoReleaseStaleSessions() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  const db = prisma as any;
  const staleSessions = await db.pamSession.findMany({
    where: {
      status: "BUSY",
      lastCheckInAt: { lt: cutoff },
    },
  });

  if (staleSessions.length === 0) return;

  // Resolve a valid Administrator CUID for the system background log record
  const adminUser = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true }
  });

  if (!adminUser) {
    console.error("Cannot release stale sessions: No Administrator user exists in the database.");
    return;
  }

  for (const session of staleSessions) {
    const botId = session.currentBotId;
    if (!botId) continue;

    // Release session
    await db.pamSession.update({
      where: { id: session.id },
      data: {
        status: "FREE",
        currentBotId: null,
        lastReleasedAt: new Date(),
      },
    });

    // Log timeout activity using the resolved admin user CUID
    await db.executionActivityLog.create({
      data: {
        botId,
        userId: adminUser.id,
        serverId: session.serverId,
        sessionName: session.sessionName,
        action: "QUEUE_LEAVE_TIMEOUT",
        details: `Session auto-released due to 30-min inactivity timeout.`,
      },
    });

    // Promote next in queue
    const nextInQueue = await db.executionQueue.findFirst({
      where: { botId, status: "QUEUED" },
      orderBy: { queuePosition: "asc" },
    });

    if (nextInQueue) {
      await db.executionQueue.update({
        where: { id: nextInQueue.id },
        data: {
          status: "ASSIGNED",
          assignedServerId: session.serverId,
          assignedSessionId: session.id,
          assignedAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes to claim
        },
      });

      await db.pamSession.update({
        where: { id: session.id },
        data: {
          status: "BUSY",
          currentBotId: botId,
          lastCheckInAt: new Date(),
        },
      });

      // Shift other queue positions
      await db.executionQueue.updateMany({
        where: { botId, status: "QUEUED" },
        data: { queuePosition: { decrement: 1 } },
      });
    }
  }
}

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

    // Run cleanup of stale sessions
    await autoReleaseStaleSessions();

    const db = prisma as any;

    // 1. Check user entitlement to run this bot
    const bot = await db.bot.findUnique({
      where: { id: botId },
      include: {
        botAssignments: {
          where: { userId: user.id }
        }
      }
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Admins bypass entitlement check
    if (user.role !== "ADMIN" && bot.botAssignments.length === 0) {
      // Log access denied attempt
      await db.executionActivityLog.create({
        data: {
          botId,
          userId: user.id,
          action: "ACCESS_DENIED",
          details: `Access denied for user ${user.name} (${user.email}). No bot assignment found.`,
        },
      });

      return NextResponse.json({
        status: "ACCESS_DENIED",
        message: "Not available: Request access. You are not entitled to run this bot."
      });
    }

    // 2. Fetch deployments for this bot
    const deployments = await db.botDeployment.findMany({
      where: { botId },
      include: {
        server: true,
      },
    });

    if (deployments.length === 0) {
      return NextResponse.json({
        status: "NOT_DEPLOYED",
        message: "Not available: This bot has not been deployed on any servers."
      });
    }

    // Get all sessions corresponding to these deployments
    const serverIds = deployments.map((d: any) => d.serverId);
    const sessionNames = deployments.map((d: any) => d.sessionName);

    const sessions = await db.pamSession.findMany({
      where: {
        serverId: { in: serverIds },
        sessionName: { in: sessionNames },
      },
      include: {
        server: true,
      },
    });

    // Check if user already holds a lock on one of these sessions
    const existingLock = sessions.find((s: any) => s.status === "BUSY" && s.currentUserId === user.id && s.currentBotId === botId);
    
    if (existingLock) {
      return NextResponse.json({
        status: "ASSIGNED",
        message: `Session restored: You already checked out ${existingLock.server.name}, ${existingLock.sessionName}.`,
        session: {
          id: existingLock.id,
          serverId: existingLock.serverId,
          serverName: existingLock.server.name,
          sessionName: existingLock.sessionName,
          pamUserId: existingLock.pamUserId,
        },
      });
    }

    // Filter free sessions
    const freeSessions = sessions.filter((s: any) => s.status === "FREE");

    if (freeSessions.length > 0) {
      // LRU selection: choose the session with the oldest lastReleasedAt or updatedAt
      freeSessions.sort((a: any, b: any) => {
        const timeA = a.lastReleasedAt ? new Date(a.lastReleasedAt).getTime() : 0;
        const timeB = b.lastReleasedAt ? new Date(b.lastReleasedAt).getTime() : 0;
        return timeA - timeB;
      });

      const selectedSession = freeSessions[0];

      // Log suggestion activity
      await db.executionActivityLog.create({
        data: {
          botId,
          userId: user.id,
          serverId: selectedSession.serverId,
          sessionName: selectedSession.sessionName,
          action: "SUGGEST_REQUESTED",
          details: `Suggested session '${selectedSession.sessionName}' on '${selectedSession.server.name}' to user.`,
        },
      });

      return NextResponse.json({
        status: "FREE",
        message: `Suggested session: ${selectedSession.server.name}, ${selectedSession.sessionName}`,
        session: {
          id: selectedSession.id,
          serverId: selectedSession.serverId,
          serverName: selectedSession.server.name,
          sessionName: selectedSession.sessionName,
          pamUserId: selectedSession.pamUserId,
        },
      });
    }

    // 3. No free sessions available -> queue the user
    // First check if already in queue
    const existingQueue = await db.executionQueue.findFirst({
      where: {
        botId,
        userId: user.id,
        status: { in: ["QUEUED", "ASSIGNED"] },
      },
      include: {
        session: {
          include: {
            server: true,
          }
        }
      }
    });

    if (existingQueue) {
      if (existingQueue.status === "ASSIGNED" && existingQueue.session) {
        return NextResponse.json({
          status: "ASSIGNED",
          message: `Your queue slot is ready! Please run on ${existingQueue.session.server.name}, ${existingQueue.session.sessionName}.`,
          session: {
            id: existingQueue.session.id,
            serverId: existingQueue.session.serverId,
            serverName: existingQueue.session.server.name,
            sessionName: existingQueue.session.sessionName,
            pamUserId: existingQueue.session.pamUserId,
          },
        });
      }

      return NextResponse.json({
        status: "QUEUED",
        message: `All sessions busy — you are position #${existingQueue.queuePosition} in the queue.`,
        queuePosition: existingQueue.queuePosition,
        estWaitMinutes: existingQueue.queuePosition * 8,
      });
    }

    // Add user to the queue
    const currentQueueCount = await db.executionQueue.count({
      where: { botId, status: "QUEUED" },
    });

    const newPosition = currentQueueCount + 1;
    await db.executionQueue.create({
      data: {
        botId,
        userId: user.id,
        status: "QUEUED",
        queuePosition: newPosition,
      },
    });

    await db.executionActivityLog.create({
      data: {
        botId,
        userId: user.id,
        action: "QUEUE_ENTER",
        details: `Entered queue at position #${newPosition} for bot execution.`,
      },
    });

    return NextResponse.json({
      status: "QUEUED",
      message: `All sessions busy — you're #${newPosition} in queue.`,
      queuePosition: newPosition,
      estWaitMinutes: newPosition * 8,
    });

  } catch (error: any) {
    console.error("Suggestion error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
