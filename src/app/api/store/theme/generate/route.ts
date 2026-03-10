import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTheme } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { prompt } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "prompt is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  const theme = await generateTheme(prompt.trim());

  return NextResponse.json({ theme });
}
