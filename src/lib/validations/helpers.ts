import { ZodError } from "zod";
import { NextRequest, NextResponse } from "next/server";

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    },
    { status: 400 }
  );
}

export async function parseBody(
  req: NextRequest
): Promise<{ data: unknown; error: null } | { data: null; error: NextResponse }> {
  try {
    const data = await req.json();
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}
