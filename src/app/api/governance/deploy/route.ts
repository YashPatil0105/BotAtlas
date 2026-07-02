import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId, targetServerId, targetSessionName, notes } = await req.json();

    if (!botId || !targetServerId || !targetSessionName) {
      return NextResponse.json({ error: "Missing required deployment fields" }, { status: 400 });
    }

    // Fetch bot and target server details
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    const server = await prisma.pamServer.findUnique({ where: { id: targetServerId } });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }
    if (!bot.docsUploaded) {
      return NextResponse.json({ error: "Cannot proceed with server deployment request. All required documents must be uploaded first." }, { status: 400 });
    }
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    // ─── CHECK DUPLICATES ────────────────────────────────
    const existingDeployment = await prisma.botDeployment.findUnique({
      where: {
        botId_serverId_sessionName: {
          botId,
          serverId: targetServerId,
          sessionName: targetSessionName
        }
      }
    });

    if (existingDeployment) {
      return NextResponse.json({ error: "This bot is already deployed to the specified server and session." }, { status: 400 });
    }

    // ─── GOVERNANCE POLICY CHECKS ───────────────────────

    // 1. Replication Cap Check
    const currentDeployments = await prisma.botDeployment.count({
      where: { botId }
    });

    let replicationLimit = 1; // Default for Medium/Low/Unknown
    if (bot.criticality === "CRITICAL") replicationLimit = 3;
    else if (bot.criticality === "HIGH") replicationLimit = 2;

    const replicationPass = currentDeployments < replicationLimit;
    const replicationDetail = replicationPass
      ? `Replication check passed: ${currentDeployments} / ${replicationLimit} servers used.`
      : `Replication cap exceeded: Bot is ${bot.criticality} (Limit: ${replicationLimit}), and already has ${currentDeployments} deployments.`;

    // 2. Server Capacity Check
    const currentServerDeployments = await prisma.botDeployment.count({
      where: { serverId: targetServerId }
    });

    const capacityPass = currentServerDeployments < server.maxBotCapacity;
    const capacityDetail = capacityPass
      ? `Server capacity check passed: ${currentServerDeployments} / ${server.maxBotCapacity} bots deployed.`
      : `Server capacity exceeded: Server ${server.name} has ${currentServerDeployments} / ${server.maxBotCapacity} bots deployed.`;

    // 3. Naming Standard Check
    const namingStandardRegex = /^BOT-\d+$/i;
    const namingPass = namingStandardRegex.test(bot.botCode);
    const namingDetail = namingPass
      ? `Naming standard passed: Code '${bot.botCode}' fits standardized prefix.`
      : `Naming standard failed: Code '${bot.botCode}' must match BOT-XXX format.`;

    const checkedRules = {
      replicationLimit: { pass: replicationPass, detail: replicationDetail },
      serverCapacity: { pass: capacityPass, detail: capacityDetail },
      namingStandard: { pass: namingPass, detail: namingDetail }
    };

    const overallPass = replicationPass && capacityPass && namingPass;

    let failedRuleFlagged = null;
    if (!replicationPass) failedRuleFlagged = "REPLICATION_LIMIT";
    else if (!capacityPass) failedRuleFlagged = "SERVER_CAPACITY";
    else if (!namingPass) failedRuleFlagged = "NAMING_STANDARD";

    // ─── TRANSACTION TO CREATE REQUEST ─────────────────

    const result = await prisma.$transaction(async (tx) => {
      // Create request
      const request = await tx.deploymentRequest.create({
        data: {
          botId,
          targetServerId,
          targetSessionName,
          developerId: user.id,
          status: "PENDING", // Always require manual approval
          checkedRules,
          failedRuleFlagged,
          notes,
          approverId: null,
        },
        include: {
          bot: true,
          server: true
        }
      });

      return request;
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      request: result
    });

  } catch (error: any) {
    console.error("Governance deploy error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
