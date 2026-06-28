import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  sequenceSimilarity,
  canonicalSimilarity,
  calculateFinalScore,
} from "@/services/similarity.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the source bot's steps
    const sourceBot = await prisma.bot.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
          select: {
            actionType: true,
            canonicalSignature: true,
          },
        },
      },
    });

    if (!sourceBot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    if (sourceBot.steps.length === 0) {
      return NextResponse.json({ similarBots: [], message: "No steps to compare" });
    }

    const sourceActionTypes = sourceBot.steps.map((s) => s.actionType);
    const sourceSignatures = sourceBot.steps
      .map((s) => s.canonicalSignature)
      .filter((s): s is string => s !== null);

    // Get all other bots that have steps
    const otherBots = await prisma.bot.findMany({
      where: {
        id: { not: id },
        steps: { some: {} },
      },
      select: {
        id: true,
        name: true,
        botCode: true,
        steps: {
          orderBy: { stepOrder: "asc" },
          select: {
            actionType: true,
            canonicalSignature: true,
          },
        },
      },
    });

    const results: Array<{
      botId: string;
      botName: string;
      botCode: string;
      stepCount: number;
      sequenceScore: number;
      canonicalScore: number;
      fuzzyScore: number;
      finalScore: number;
    }> = [];

    for (const targetBot of otherBots) {
      const targetActionTypes = targetBot.steps.map((s) => s.actionType);
      const targetSignatures = targetBot.steps
        .map((s) => s.canonicalSignature)
        .filter((s): s is string => s !== null);

      // Sequence similarity via n-gram Jaccard
      const seqScore = sequenceSimilarity(sourceActionTypes, targetActionTypes);

      // Canonical signature similarity
      const canScore = canonicalSimilarity(sourceSignatures, targetSignatures);

      // Fuzzy score: count of matching actionTypes / total unique
      const sourceSet = new Set(sourceActionTypes);
      const targetSet = new Set(targetActionTypes);
      const matchingCount = [...sourceSet].filter((a) => targetSet.has(a)).length;
      const totalUnique = new Set([...sourceSet, ...targetSet]).size;
      const fuzzyScore = totalUnique === 0 ? 0 : matchingCount / totalUnique;

      const finalScore = calculateFinalScore(seqScore, canScore, fuzzyScore);

      if (finalScore > 0.1) {
        results.push({
          botId: targetBot.id,
          botName: targetBot.name,
          botCode: targetBot.botCode,
          stepCount: targetBot.steps.length,
          sequenceScore: Math.round(seqScore * 1000) / 1000,
          canonicalScore: Math.round(canScore * 1000) / 1000,
          fuzzyScore: Math.round(fuzzyScore * 1000) / 1000,
          finalScore: Math.round(finalScore * 1000) / 1000,
        });
      }
    }

    // Sort by finalScore descending, return top 10
    results.sort((a, b) => b.finalScore - a.finalScore);
    const topResults = results.slice(0, 10);

    return NextResponse.json({ similarBots: topResults });
  } catch (error) {
    console.error("GET /api/bots/[id]/similarity error:", error);
    return NextResponse.json(
      { error: "Failed to compute similarity" },
      { status: 500 }
    );
  }
}
