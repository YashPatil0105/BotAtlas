import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "REVIEWER") {
      return NextResponse.json({ error: "Forbidden: Reviewer or Admin permission required." }, { status: 403 });
    }

    const { id } = await params;
    const { action, notes } = await req.json();

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be APPROVE or REJECT" }, { status: 400 });
    }

    const request = await prisma.deploymentRequest.findUnique({
      where: { id },
      include: {
        bot: true,
        server: true
      }
    });

    if (!request) {
      return NextResponse.json({ error: "Deployment request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ error: `Request has already been ${request.status.toLowerCase()}` }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update request status
      const finalStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
      await tx.deploymentRequest.update({
        where: { id },
        data: {
          status: finalStatus,
          approverId: user.id,
          notes: notes || request.notes,
        }
      });

      // 2. If approved, create deployment mapping
      if (action === "APPROVE") {
        await tx.botDeployment.upsert({
          where: {
            botId_serverId_sessionName: {
              botId: request.botId,
              serverId: request.targetServerId,
              sessionName: request.targetSessionName
            }
          },
          create: {
            botId: request.botId,
            serverId: request.targetServerId,
            sessionName: request.targetSessionName
          },
          update: {} // already exists
        });

        // Log to Audit logs
        await tx.auditLog.create({
          data: {
            entityType: "BOT_DEPLOYMENT",
            entityId: request.botId,
            action: "MANUAL_DEPLOY_OVERRIDE",
            newValue: `Approved override deployment of ${request.bot.botCode} to server ${request.server.name} (${request.targetSessionName})`,
            userId: user.id
          }
        });
      } else {
        // If rejected, log rejection
        await tx.auditLog.create({
          data: {
            entityType: "BOT_DEPLOYMENT",
            entityId: request.botId,
            action: "DEPLOY_REJECTED",
            newValue: `Rejected deployment of ${request.bot.botCode} to server ${request.server.name} (${request.targetSessionName}). Reason: ${notes || "None given"}`,
            userId: user.id
          }
        });
      }
    });

    return NextResponse.json({ success: true, message: `Deployment request has been ${action.toLowerCase()}d.` });

  } catch (error: any) {
    console.error("Resolve request error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
