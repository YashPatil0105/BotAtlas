import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import prisma from "./db";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "REVIEWER" | "VIEWER";
}

/**
 * Get the current authenticated user from the server-side session.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return {
    id: (session.user as any).id,
    email: session.user.email!,
    name: session.user.name!,
    role: (session.user as any).role as SessionUser["role"],
  };
}

/**
 * Get the list of bot IDs assigned to a user.
 * Admin gets null (meaning "all bots").
 * Reviewer/Viewer gets an array of bot IDs.
 */
export async function getAssignedBotIds(user: SessionUser): Promise<string[] | null> {
  if (user.role === "ADMIN" || user.role === "VIEWER") return null; // null means "all"

  const assignments = await prisma.botAssignment.findMany({
    where: { userId: user.id },
    select: { botId: true },
  });

  return assignments.map((a) => a.botId);
}
