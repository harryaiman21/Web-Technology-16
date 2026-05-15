import { NextResponse } from "next/server";
import { z } from "zod";
import { extractIncidentFields } from "@/lib/llm";
import { assertUiPathToken } from "@/lib/rpa-auth";
import { createServiceSupabaseClient } from "@/lib/supabase-service";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const rawInputSchema = z.object({
  source: z.enum(["email", "google_drive", "teams", "whatsapp", "phone", "warehouse_note"]),
  content: z.string().min(1),
  externalId: z.string().optional(),
  fileName: z.string().optional(),
  fileUrl: z.string().url().optional(),
  createIncident: z.boolean().default(true)
});

export async function POST(request: Request) {
  const hasAuthHeader = Boolean(request.headers.get("authorization"));

  if (hasAuthHeader) {
    const authError = assertUiPathToken(request);
    if (authError) return authError;
  } else {
    const supabaseAuth = createClient(cookies());
    const {
      data: { user }
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
  }

  const parsed = rawInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid raw input payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const extraction = extractIncidentFields(parsed.data.content);

  const { data: rawInput, error: rawError } = await supabase
    .from("raw_inputs")
    .insert({
      source: parsed.data.source,
      content: parsed.data.content,
      external_id: parsed.data.externalId,
      file_name: parsed.data.fileName,
      file_url: parsed.data.fileUrl,
      processing_status: "received",
      extracted_json: extraction
    })
    .select()
    .single();

  if (rawError) {
    return NextResponse.json({ error: rawError.message }, { status: 500 });
  }

  if (!parsed.data.createIncident) {
    return NextResponse.json({ rawInput, extraction });
  }

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .insert({
      raw_input_id: rawInput.id,
      title: extraction.title,
      summary: extraction.summary,
      issue_type: extraction.issueType,
      priority: extraction.priority,
      source: parsed.data.source,
      department: extraction.suggestedDepartment,
      tracking_number: extraction.trackingNumber,
      status: "new"
    })
    .select()
    .single();

  if (incidentError) {
    return NextResponse.json({ rawInput, extraction, warning: incidentError.message }, { status: 207 });
  }

  await supabase.from("incident_events").insert({
    incident_id: incident.id,
    event_type: "created_from_rpa",
    message: `Created from ${parsed.data.source} raw input.`
  });

  return NextResponse.json({ rawInput, extraction, incident }, { status: 201 });
}
