import { NextResponse } from "next/server";
import { z } from "zod";
import { extractIncidentFields } from "@/lib/llm";

const schema = z.object({
  content: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  return NextResponse.json({ extraction: extractIncidentFields(parsed.data.content) });
}
