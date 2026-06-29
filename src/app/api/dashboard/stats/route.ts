import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionUser, getAssignedBotIds } from "@/lib/getSessionUser";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignedBotIds = await getAssignedBotIds(user);

    // Build a where clause for bot-level queries
    const botWhere: any = assignedBotIds !== null ? { id: { in: assignedBotIds } } : {};
    // Build a where clause for finding-level queries (filter by botId)
    const findingBotWhere: any = assignedBotIds !== null ? { botId: { in: assignedBotIds } } : {};

    // Total bots
    const totalBots = await prisma.bot.count({ where: botWhere });

    // Status counts
    const statusCountsRaw = await prisma.bot.groupBy({
      by: ["currentStatus"],
      where: botWhere,
      _count: { _all: true },
    });
    const statusCounts: Record<string, number> = {};
    for (const row of statusCountsRaw) {
      statusCounts[row.currentStatus] = row._count._all;
    }

    // Review status counts
    const reviewStatusCountsRaw = await prisma.bot.groupBy({
      by: ["reviewStatus"],
      where: botWhere,
      _count: { _all: true },
    });
    const reviewStatusCounts: Record<string, number> = {};
    for (const row of reviewStatusCountsRaw) {
      reviewStatusCounts[row.reviewStatus] = row._count._all;
    }

    // Criticality counts
    const criticalityCountsRaw = await prisma.bot.groupBy({
      by: ["criticality"],
      where: botWhere,
      _count: { _all: true },
    });
    const criticalityCounts: Record<string, number> = {};
    for (const row of criticalityCountsRaw) {
      criticalityCounts[row.criticality] = row._count._all;
    }

    // Recommendation counts (only where finalRecommendation is set)
    const recommendationCountsRaw = await prisma.bot.groupBy({
      by: ["finalRecommendation"],
      where: { ...botWhere, finalRecommendation: { not: null } },
      _count: { _all: true },
    });
    const recommendationCounts: Record<string, number> = {};
    for (const row of recommendationCountsRaw) {
      if (row.finalRecommendation) {
        recommendationCounts[row.finalRecommendation] = row._count._all;
      }
    }

    // Open findings
    const openFindings = await prisma.finding.count({
      where: { ...findingBotWhere, status: { not: "CLOSED" } },
    });

    // Critical findings (priority CRITICAL and not closed)
    const criticalFindings = await prisma.finding.count({
      where: {
        ...findingBotWhere,
        priority: "CRITICAL",
        status: { not: "CLOSED" },
      },
    });

    // Bots without owner
    const botsWithoutOwner = await prisma.bot.count({
      where: {
        ...botWhere,
        OR: [
          { businessOwner: null },
          { businessOwner: "" },
        ],
      },
    });

    // Bots without documentation
    const botsWithDocs = await prisma.botChecklist.findMany({
      where: {
        checklistItem: "documentationAvailable",
        value: "YES",
        ...(assignedBotIds !== null ? { botId: { in: assignedBotIds } } : {}),
      },
      select: { botId: true },
    });
    const botsWithDocsIds = new Set(botsWithDocs.map((c) => c.botId));
    const allBotIds = await prisma.bot.findMany({
      where: botWhere,
      select: { id: true },
    });
    const botsWithoutDocs = allBotIds.filter(
      (b) => !botsWithDocsIds.has(b.id)
    ).length;

    // Top root causes
    const topRootCausesRaw = await prisma.rootCauseAssessment.groupBy({
      by: ["category"],
      where: findingBotWhere,
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 5,
    });
    const topRootCauses = topRootCausesRaw.map((row) => ({
      category: row.category,
      count: row._count._all,
    }));

    // Top vendor findings
    const findingsWithVendor = await prisma.finding.findMany({
      where: findingBotWhere,
      select: {
        bot: {
          select: { vendor: true },
        },
      },
    });
    const vendorFindingCounts: Record<string, number> = {};
    for (const f of findingsWithVendor) {
      const vendor = f.bot.vendor || "Unknown";
      vendorFindingCounts[vendor] = (vendorFindingCounts[vendor] || 0) + 1;
    }
    const topVendorFindings = Object.entries(vendorFindingCounts)
      .map(([vendor, count]) => ({ vendor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent activity: last 10 updated bots
    const recentActivity = await prisma.bot.findMany({
      where: botWhere,
      select: {
        id: true,
        name: true,
        botCode: true,
        updatedAt: true,
        reviewStatus: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      totalBots,
      statusCounts,
      reviewStatusCounts,
      criticalityCounts,
      recommendationCounts,
      openFindings,
      criticalFindings,
      botsWithoutOwner,
      botsWithoutDocs,
      topRootCauses,
      topVendorFindings,
      recentActivity,
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
