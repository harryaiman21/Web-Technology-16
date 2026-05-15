import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUiPathToken } from "@/lib/rpa-auth";
import { createServiceSupabaseClient } from "@/lib/supabase-service";

const runSchema = z.object({
  runId: z.string().min(1),
  source: z.enum(["email", "google_drive", "mixed"]),
  status: z.enum(["running", "completed", "failed"]),
  processed: z.number().int().min(0).default(0),
  failed: z.number().int().min(0).default(0),
  summary: z.string().default(""),
  errors: z.array(z.object({ item: z.string(), message: z.string() })).default([])
});

export async function POST(request: Request) {
  const authError = assertUiPathToken(request);
  if (authError) return authError;

  const parsed = runSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid RPA run payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data: run, error } = await supabase
    .from("rpa_runs")
    .upsert(
      {
        id: parsed.data.runId,
        source: parsed.data.source,
        status: parsed.data.status,
        processed: parsed.data.processed,
        failed: parsed.data.failed,
        summary: parsed.data.summary,
        finished_at: parsed.data.status === "running" ? null : new Date().toISOString()
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.errors.length > 0) {
    await supabase.from("rpa_run_logs").insert(
      parsed.data.errors.map((entry) => ({
        rpa_run_id: parsed.data.runId,
        level: "error",
        item_ref: entry.item,
        message: entry.message
      }))
    );
  }

  return NextResponse.json({ run });
}
