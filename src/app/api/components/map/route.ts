import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { MatchType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { componentId, stepId, stepIds, matchType = "MANUAL", notes } = body;

    if (!componentId) {
      return NextResponse.json(
        { error: "componentId is required" },
        { status: 400 }
      );
    }

    const component = await prisma.component.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    const idsToMap: string[] = [];
    if (stepId) idsToMap.push(stepId);
    if (Array.isArray(stepIds)) idsToMap.push(...stepIds);

    if (idsToMap.length === 0) {
      return NextResponse.json(
        { error: "At least one stepId or stepIds array is required" },
        { status: 400 }
      );
    }

    let createdCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const sId of idsToMap) {
        // Check if step exists
        const step = await tx.botStep.findUnique({
          where: { id: sId },
        });

        if (!step) continue;

        // Check if map already exists
        const existingMap = await tx.stepComponentMap.findFirst({
          where: {
            stepId: sId,
            componentId: componentId,
          },
        });

        if (existingMap) continue;

        // Create mapping
        await tx.stepComponentMap.create({
          data: {
            stepId: sId,
            componentId: componentId,
            confidenceScore: matchType === "EXACT" ? 1.0 : 0.8,
            matchType: matchType as MatchType,
            reviewerDecision: "REUSED",
            notes: notes || "Manually mapped component reuse link",
          },
        });

        createdCount++;
      }

      // Update component usageCount
      if (createdCount > 0) {
        await tx.component.update({
          where: { id: componentId },
          data: {
            usageCount: {
              increment: createdCount,
            },
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      mappedCount: createdCount,
    });
  } catch (error) {
    console.error("POST /api/components/map error:", error);
    return NextResponse.json(
      { error: "Failed to map component to steps" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mapId = searchParams.get("id");
    const componentId = searchParams.get("componentId");
    const stepId = searchParams.get("stepId");

    if (mapId) {
      const existing = await prisma.stepComponentMap.findUnique({
        where: { id: mapId },
      });

      if (!existing) {
        return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.stepComponentMap.delete({
          where: { id: mapId },
        });

        await tx.component.update({
          where: { id: existing.componentId },
          data: {
            usageCount: {
              decrement: 1,
            },
          },
        });
      });

      return NextResponse.json({ success: true, message: "Mapping deleted" });
    }

    if (componentId && stepId) {
      const existing = await prisma.stepComponentMap.findFirst({
        where: { componentId, stepId },
      });

      if (!existing) {
        return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.stepComponentMap.delete({
          where: { id: existing.id },
        });

        await tx.component.update({
          where: { id: componentId },
          data: {
            usageCount: {
              decrement: 1,
            },
          },
        });
      });

      return NextResponse.json({ success: true, message: "Mapping deleted" });
    }

    return NextResponse.json(
      { error: "Provide either mapping ID or both componentId and stepId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("DELETE /api/components/map error:", error);
    return NextResponse.json(
      { error: "Failed to delete mapping" },
      { status: 500 }
    );
  }
}
