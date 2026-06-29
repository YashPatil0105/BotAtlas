import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const targetId = searchParams.get('targetId');

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Missing sourceId or targetId' }, { status: 400 });
    }

    const sourceBot = await prisma.bot.findUnique({
      where: { id: sourceId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });

    const targetBot = await prisma.bot.findUnique({
      where: { id: targetId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!sourceBot || !targetBot) {
      return NextResponse.json({ error: 'Bots not found' }, { status: 404 });
    }

    // Basic structural similarity calculation
    let exactMatches = 0;
    sourceBot.steps.forEach(sourceStep => {
      const match = targetBot.steps.find(t => 
        t.actionType === sourceStep.actionType && 
        t.systemName?.toLowerCase() === sourceStep.systemName?.toLowerCase()
      );
      if (match) exactMatches++;
    });

    const maxSteps = Math.max(sourceBot.steps.length, targetBot.steps.length) || 1;
    const similarityScore = Math.round((exactMatches / maxSteps) * 100);

    return NextResponse.json({
      sourceBot,
      targetBot,
      similarityScore,
      exactMatches,
      totalStepsSource: sourceBot.steps.length,
      totalStepsTarget: targetBot.steps.length
    });
  } catch (error) {
    console.error('Error comparing bots:', error);
    return NextResponse.json({ error: 'Failed to compare bots' }, { status: 500 });
  }
}
