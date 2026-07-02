import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const { name, ipAddress, maxBotCapacity, isActive } = await req.json();

    const db = prisma as any;
    const current = await db.pamServer.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (name && name !== current.name) {
      const existing = await db.pamServer.findUnique({ where: { name } });
      if (existing) {
        return NextResponse.json({ error: "Server name already exists" }, { status: 400 });
      }
    }

    const server = await db.pamServer.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        ipAddress: ipAddress !== undefined ? ipAddress : undefined,
        maxBotCapacity: maxBotCapacity !== undefined ? Number(maxBotCapacity) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "PAM_SERVER",
        entityId: id,
        action: "UPDATE_SERVER",
        newValue: `Updated server ${server.name}. Capacity: ${server.maxBotCapacity}, Active: ${server.isActive}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, server });
  } catch (error: any) {
    console.error("Update server error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { id } = await params;

    const db = prisma as any;
    const server = await db.pamServer.findUnique({ where: { id } });
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    await db.pamServer.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entityType: "PAM_SERVER",
        entityId: id,
        action: "DELETE_SERVER",
        oldValue: `Deleted server ${server.name}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Server deleted successfully." });
  } catch (error: any) {
    console.error("Delete server error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
