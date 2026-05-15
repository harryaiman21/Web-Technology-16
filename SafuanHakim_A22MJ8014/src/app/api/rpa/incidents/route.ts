import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUiPathToken } from "@/lib/rpa-auth";
import { createServiceSupabaseClient } from "@/lib/supabase-service";

const incidentSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  issueType: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  source: z.enum(["manual", "email", "google_drive", "teams", "whatsapp", "phone", "warehouse_note"]),
  status: z.enum(["new", "triaged", "assigned", "in_progress", "waiting_customer", "resolved", "closed"]).default("new"),
  department: z.string().min(1),
  customerName: z.string().optional(),
  trackingNumber: z.string().optional(),
  assignedTo: z.string().optional(),
  duplicateOf: z.string().uuid().nullable().optional()
});

export async function POST(request: Request) {
  const authError = assertUiPathToken(request);
  if (authError) return authError;

  const parsed = incidentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid incident payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const payload = {
    title: parsed.data.title,
    summary: parsed.data.summary,
    issue_type: parsed.data.issueType,
    priority: parsed.data.priority,
    source: parsed.data.source,
    status: parsed.data.status,
    department: parsed.data.department,
    customer_name: parsed.data.customerName,
    tracking_number: parsed.data.trackingNumber,
    assigned_to: parsed.data.assignedTo,
    duplicate_of: parsed.data.duplicateOf
  };

  const query = parsed.data.id
    ? supabase.from("incidents").update(payload).eq("id", parsed.data.id).select().single()
    : supabase.from("incidents").insert(payload).select().single();

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("incident_events").insert({
    incident_id: data.id,
    event_type: parsed.data.id ? "updated_by_rpa" : "created_by_rpa",
    message: parsed.data.id ? "UiPath updated incident fields." : "UiPath created incident directly."
  });

  return NextResponse.json({ incident: data }, { status: parsed.data.id ? 200 : 201 });
}
