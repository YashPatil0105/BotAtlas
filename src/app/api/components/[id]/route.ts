import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { componentSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const component = await prisma.component.findUnique({
      where: { id },
      include: {
        sourceBot: {
          select: {
            id: true,
            name: true,
            botCode: true,
          },
        },
        stepMaps: {
          include: {
            step: {
              include: {
                bot: {
                  select: {
                    id: true,
                    name: true,
                    botCode: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(component);
  } catch (error) {
    console.error("GET /api/components/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch component" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = componentSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.component.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    const component = await prisma.component.update({
      where: { id },
      data: {
        ...parsed.data,
        status: parsed.data.status as any,
      },
      include: {
        sourceBot: {
          select: {
            id: true,
            name: true,
            botCode: true,
          },
        },
        stepMaps: {
          include: {
            step: {
              include: {
                bot: {
                  select: {
                    id: true,
                    name: true,
                    botCode: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(component);
  } catch (error) {
    console.error("PUT /api/components/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update component" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.component.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    await prisma.component.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Component deleted",
    });
  } catch (error) {
    console.error("DELETE /api/components/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete component" },
      { status: 500 }
    );
  }
}
