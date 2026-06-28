import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const query = q.trim();

    const [bots, steps, components, findings] = await Promise.all([
      // Search bots by name, botCode, businessPurpose
      prisma.bot.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { botCode: { contains: query, mode: "insensitive" } },
            { businessPurpose: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          botCode: true,
          businessPurpose: true,
          currentStatus: true,
          reviewStatus: true,
          criticality: true,
        },
        take: 20,
        orderBy: { updatedAt: "desc" },
      }),

      // Search steps by description, systemName
      prisma.botStep.findMany({
        where: {
          OR: [
            { description: { contains: query, mode: "insensitive" } },
            { systemName: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          stepOrder: true,
          actionType: true,
          description: true,
          systemName: true,
          botId: true,
          bot: {
            select: {
              id: true,
              name: true,
              botCode: true,
            },
          },
        },
        take: 20,
        orderBy: { updatedAt: "desc" },
      }),

      // Search components by name, description
      prisma.component.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          componentCode: true,
          name: true,
          description: true,
          componentType: true,
          status: true,
        },
        take: 20,
        orderBy: { updatedAt: "desc" },
      }),

      // Search findings by observation
      prisma.finding.findMany({
        where: {
          observation: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          category: true,
          observation: true,
          priority: true,
          status: true,
          botId: true,
          bot: {
            select: {
              id: true,
              name: true,
              botCode: true,
            },
          },
        },
        take: 20,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      bots,
      steps,
      components,
      findings,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
