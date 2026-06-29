import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: id }, // Bot itself
          // We could also join finding/step logs here if we populated entityType correctly
        ]
      },
      orderBy: { timestamp: "desc" },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/bots/[id]/audit error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
