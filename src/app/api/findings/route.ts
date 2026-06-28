import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { FindingCategory, FindingStatus, Criticality } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status as FindingStatus;
    }
    if (category) {
      where.category = category as FindingCategory;
    }
    if (priority) {
      where.priority = priority as Criticality;
    }
    if (search) {
      where.observation = { contains: search, mode: "insensitive" };
    }

    const [findings, total, statusCounts, categoryCounts, priorityCounts] =
      await Promise.all([
        prisma.finding.findMany({
          where,
          include: {
            bot: {
              select: {
                id: true,
                name: true,
                botCode: true,
                vendor: true,
                department: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.finding.count({ where }),

        // Aggregate counts for KPI cards
        prisma.finding.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.finding.groupBy({
          by: ["category"],
          _count: { _all: true },
          orderBy: { _count: { category: "desc" } },
        }),
        prisma.finding.groupBy({
          by: ["priority"],
          _count: { _all: true },
        }),
      ]);

    const stats = {
      total: await prisma.finding.count(),
      open: 0,
      inProgress: 0,
      blocked: 0,
      closed: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const row of statusCounts) {
      if (row.status === "OPEN") stats.open = row._count._all;
      if (row.status === "IN_PROGRESS") stats.inProgress = row._count._all;
      if (row.status === "BLOCKED") stats.blocked = row._count._all;
      if (row.status === "CLOSED") stats.closed = row._count._all;
    }

    for (const row of priorityCounts) {
      if (row.priority === "CRITICAL") stats.critical = row._count._all;
      if (row.priority === "HIGH") stats.high = row._count._all;
      if (row.priority === "MEDIUM") stats.medium = row._count._all;
      if (row.priority === "LOW") stats.low = row._count._all;
    }

    const categoryBreakdown = categoryCounts.map((row) => ({
      category: row.category,
      count: row._count._all,
    }));

    return NextResponse.json({
      findings,
      total,
      stats,
      categoryBreakdown,
    });
  } catch (error) {
    console.error("GET /api/findings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch findings" },
      { status: 500 }
    );
  }
}
