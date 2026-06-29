import { NextRequest, NextResponse } from "next/server";
import { parseRobinScript } from "@/lib/parsers/robin-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, botName } = body;

    if (!script || typeof script !== "string" || !script.trim()) {
      return NextResponse.json(
        { error: "No Robin script provided. Paste the script content in the 'script' field." },
        { status: 400 }
      );
    }

    const parsed = parseRobinScript(script.trim(), botName || undefined);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("POST /api/bots/import/robin error:", error);
    return NextResponse.json(
      { error: "Failed to parse Robin script" },
      { status: 500 }
    );
  }
}
