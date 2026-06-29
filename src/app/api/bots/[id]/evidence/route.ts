import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { EvidenceType } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evidence = await prisma.evidence.findMany({
      where: { botId: id },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(evidence);
  } catch (error) {
    console.error("GET /api/bots/[id]/evidence error:", error);
    return NextResponse.json({ error: "Failed to fetch evidence" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const file = formData.get("file") as File | null;
    const evidenceType = formData.get("evidenceType") as string;
    const findingId = formData.get("findingId") as string | null;
    const uploadedBy = formData.get("uploadedBy") as string || "System";

    if (!file || !evidenceType) {
      return NextResponse.json({ error: "File and evidenceType are required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads dir exists (for prototype, saving to public/uploads)
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const filePath = join(uploadsDir, safeFileName);
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${safeFileName}`;

    const newEvidence = await prisma.evidence.create({
      data: {
        evidenceType: evidenceType as EvidenceType,
        fileName: file.name,
        filePath: relativeUrl,
        uploadedBy,
        botId: id,
        findingId: findingId || null,
      }
    });

    return NextResponse.json(newEvidence, { status: 201 });
  } catch (error) {
    console.error("POST /api/bots/[id]/evidence error:", error);
    return NextResponse.json({ error: "Failed to upload evidence" }, { status: 500 });
  }
}
