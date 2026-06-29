import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/getSessionUser';

// GET: Fetch bot assignments for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const assignments = await prisma.botAssignment.findMany({
      where: { userId: id },
      include: {
        bot: {
          select: { id: true, botCode: true, name: true, currentStatus: true, reviewStatus: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

// POST: Assign bots to a user (body: { botIds: string[] })
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (targetUser.role === 'ADMIN' || targetUser.role === 'VIEWER') {
      return NextResponse.json({ error: 'Cannot assign bots to Admins or Viewers' }, { status: 400 });
    }

    const { botIds } = await request.json();

    if (!Array.isArray(botIds) || botIds.length === 0) {
      return NextResponse.json({ error: 'botIds must be a non-empty array' }, { status: 400 });
    }

    // Use createMany with skipDuplicates to avoid errors on re-assignment
    await prisma.botAssignment.createMany({
      data: botIds.map((botId: string) => ({ userId: id, botId })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true, assigned: botIds.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to assign bots' }, { status: 500 });
  }
}

// DELETE: Remove bot assignments (query: ?botId=xxx)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'botId query parameter required' }, { status: 400 });
    }

    await prisma.botAssignment.deleteMany({
      where: { userId: id, botId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
  }
}
