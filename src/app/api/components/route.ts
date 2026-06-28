import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { componentSchema } from "@/lib/validators";
import { ComponentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { componentCode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status as ComponentStatus;
    }

    const components = await prisma.component.findMany({
      where,
      include: {
        sourceBot: {
          select: {
            id: true,
            name: true,
            botCode: true,
          },
        },
        _count: {
          select: {
            stepMaps: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(components);
  } catch (error) {
    console.error("GET /api/components error:", error);
    return NextResponse.json(
      { error: "Failed to fetch components" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = componentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Auto-generate componentCode: CMP-XXX
    const lastComponent = await prisma.component.findFirst({
      where: { componentCode: { startsWith: "CMP-" } },
      orderBy: { componentCode: "desc" },
      select: { componentCode: true },
    });

    let nextNumber = 1;
    if (lastComponent) {
      const match = lastComponent.componentCode.match(/^CMP-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const componentCode = `CMP-${String(nextNumber).padStart(3, "0")}`;

    const component = await prisma.component.create({
      data: {
        componentCode,
        name: parsed.data.name,
        componentType: parsed.data.componentType,
        description: parsed.data.description,
        canonicalSignature: parsed.data.canonicalSignature,
        sourceBotId: parsed.data.sourceBotId || null,
        owner: parsed.data.owner,
        status: parsed.data.status,
        tags: parsed.data.tags || [],
        knownLimitations: parsed.data.knownLimitations,
      },
      include: {
        sourceBot: {
          select: {
            id: true,
            name: true,
            botCode: true,
          },
        },
        _count: {
          select: {
            stepMaps: true,
          },
        },
      },
    });

    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    console.error("POST /api/components error:", error);
    return NextResponse.json(
      { error: "Failed to create component" },
      { status: 500 }
    );
  }
}
