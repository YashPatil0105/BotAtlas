import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await prisma.deploymentRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        bot: {
          select: {
            botCode: true,
            name: true,
            criticality: true
          }
        },
        server: {
          select: {
            name: true
          }
        },
        developer: {
          select: {
            name: true,
            email: true
          }
        },
        approver: {
          select: {
            name: true
          }
        }
      }
    });

    // Parse checkedRules if they are stored as JSON strings
    const formattedRequests = requests.map((req) => {
      let rules = req.checkedRules;
      if (typeof rules === "string") {
        try {
          rules = JSON.parse(rules);
        } catch {
          // ignore
        }
      }
      return { ...req, checkedRules: rules };
    });

    return NextResponse.json(formattedRequests);

  } catch (error: any) {
    console.error("Fetch requests error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
