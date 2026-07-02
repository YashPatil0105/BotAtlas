import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

// POST to resolve (APPROVE/REJECT) an access request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, notes } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const request = await prisma.accessRequest.findUnique({
      where: { id },
      include: { user: true, bot: true }
    });

    if (!request || request.status !== 'PENDING') {
      return NextResponse.json({ error: "Request not found or already resolved" }, { status: 404 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await prisma.$transaction(async (tx) => {
      // 1. Update the request status
      await tx.accessRequest.update({
        where: { id },
        data: {
          status: newStatus,
        }
      });

      // 2. If APPROVED, create the BotAssignment
      if (newStatus === 'APPROVED') {
        // Ensure not already assigned
        const existingAssignment = await tx.botAssignment.findUnique({
          where: { userId_botId: { botId: request.botId, userId: request.userId } }
        });

        if (!existingAssignment) {
          await tx.botAssignment.create({
            data: {
              botId: request.botId,
              userId: request.userId
            }
          });
        }
      }

      // 3. Notify the original user
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: `Run Access ${newStatus}`,
          message: `Your request for run access to ${request.bot.botCode} has been ${newStatus.toLowerCase()} by ${user.name}.${notes ? ` Notes: ${notes}` : ''}`,
          link: `/dashboard/bots/${request.botId}`
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/access/requests/[id]/resolve error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
