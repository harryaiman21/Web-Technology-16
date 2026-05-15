import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUiPathToken } from "@/lib/rpa-auth";
import { createServiceSupabaseClient } from "@/lib/supabase-service";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const versionSchema = z.object({
  body: z.string().min(1),
  status: z.enum(["draft", "reviewed", "published"])
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const hasAuthHeader = Boolean(request.headers.get("authorization"));
  let actorId: string | null = null;
  let actorName: string | null = null;

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

    actorId = user.id;
    actorName = user.email ?? null;
  }

  const parsed = versionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid version payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  if (actorId) {
    await supabase
      .from("profiles")
      .upsert({ id: actorId, full_name: actorName }, { onConflict: "id" });
  }

  const { data: item, error: itemError } = await supabase
    .from("content_items")
    .select("current_version")
    .eq("id", params.id)
    .single();

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 404 });
  }

  const nextVersion = item.current_version + 1;

  const { data: version, error: versionError } = await supabase
    .from("content_versions")
    .insert({
      content_id: params.id,
      version: nextVersion,
      status: parsed.data.status,
      body: parsed.data.body,
      created_by: actorId
    })
    .select()
    .single();

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("content_items")
    .update({
      status: parsed.data.status,
      current_version: nextVersion,
      updated_at: new Date().toISOString()
    })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ version }, { status: 201 });
}
