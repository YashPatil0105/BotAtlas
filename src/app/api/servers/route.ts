import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = prisma as any;
    const servers = await db.pamServer.findMany({
      orderBy: { name: "asc" },
      include: {
        sessions: {
          orderBy: { sessionName: "asc" },
        },
        deployments: {
          include: {
            bot: {
              select: {
                botCode: true,
                name: true,
              }
            }
          }
        }
      }
    });

    // For busy sessions, fetch bot info
    const busySessionBotIds = servers
      .flatMap((s: any) => s.sessions)
      .filter((sess: any) => sess.status === "BUSY" && sess.currentBotId !== null)
      .map((sess: any) => sess.currentBotId as string);

    const busyBots = await prisma.bot.findMany({
      where: { id: { in: busySessionBotIds } },
      select: {
        id: true,
        botCode: true,
        name: true,
      }
    });

    const botMap = new Map(busyBots.map((b) => [b.id, b]));

    const formattedServers = servers.map((server: any) => {
      const activeBotsCount = server.deployments.length;
      
      const formattedSessions = server.sessions.map((session: any) => {
        let runningBot = null;
        if (session.status === "BUSY" && session.currentBotId) {
          runningBot = botMap.get(session.currentBotId) || null;
        }
        const deployedBots = server.deployments
          .filter((d: any) => d.sessionName === session.sessionName)
          .map((d: any) => d.bot);

        return {
          ...session,
          runningBot,
          deployedBots,
        };
      });

      return {
        id: server.id,
        name: server.name,
        ipAddress: server.ipAddress,
        maxBotCapacity: server.maxBotCapacity,
        activeBotsCount,
        isActive: server.isActive,
        sessions: formattedSessions,
        deployedBots: server.deployments.map((d: any) => ({ ...d.bot, sessionName: d.sessionName })),
      };
    });

    return NextResponse.json(formattedServers);

  } catch (error: any) {
    console.error("Fetch servers error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { name, ipAddress, maxBotCapacity, isActive } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Missing server name" }, { status: 400 });
    }

    const db = prisma as any;

    // Check if name is unique
    const existing = await db.pamServer.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Server name already exists" }, { status: 400 });
    }

    const server = await db.pamServer.create({
      data: {
        name,
        ipAddress: ipAddress || null,
        maxBotCapacity: maxBotCapacity ? Number(maxBotCapacity) : 10,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "PAM_SERVER",
        entityId: server.id,
        action: "CREATE_SERVER",
        newValue: `Created server ${server.name} with capacity ${server.maxBotCapacity}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, server });
  } catch (error: any) {
    console.error("Create server error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
