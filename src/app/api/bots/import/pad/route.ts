import { NextRequest, NextResponse } from "next/server";
import { parsePADZip } from "@/lib/parsers/pad-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const botName = formData.get("botName") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded. Upload a PAD solution .zip file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a .zip file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parsePADZip(buffer, botName || undefined);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("POST /api/bots/import/pad error:", error);
    return NextResponse.json(
      { error: "Failed to parse PAD solution ZIP" },
      { status: 500 }
    );
  }
}
