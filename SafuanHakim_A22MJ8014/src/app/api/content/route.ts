import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUiPathToken } from "@/lib/rpa-auth";
import { createServiceSupabaseClient } from "@/lib/supabase-service";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const statusSchema = z.enum(["draft", "reviewed", "published"]);
const allowedExtensions = new Set([".txt", ".pdf", ".docx"]);

function normalizeTags(tagsValue: string) {
  return tagsValue
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function isAllowedFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return Array.from(allowedExtensions).some((ext) => lowerName.endsWith(ext));
}

export async function POST(request: Request) {
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

  const contentType = request.headers.get("content-type") ?? "";
  let title = "";
  let body = "";
  let statusValue = "draft";
  let tagsValue = "";
  let file: FormDataEntryValue | null = null;

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    title = String(form.get("title") ?? "").trim();
    body = String(form.get("body") ?? "").trim();
    statusValue = String(form.get("status") ?? "draft");
    tagsValue = String(form.get("tags") ?? "");
    file = form.get("file");
  } else {
    const payload = await request.json().catch(() => ({} as Record<string, unknown>));
    title = String(payload.title ?? "").trim();
    body = String(payload.body ?? "").trim();
    statusValue = String(payload.status ?? "draft");
    tagsValue = String(payload.tags ?? "");
  }

  const status = statusSchema.safeParse(statusValue);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!status.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (!body && !(file instanceof File)) {
    return NextResponse.json({ error: "Provide text or attach a file." }, { status: 400 });
  }

  if (file instanceof File && !isAllowedFile(file)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const tags = normalizeTags(tagsValue);

  if (actorId) {
    await supabase
      .from("profiles")
      .upsert({ id: actorId, full_name: actorName }, { onConflict: "id" });
  }

  const { data: contentItem, error: contentError } = await supabase
    .from("content_items")
    .insert({
      title,
      status: status.data,
      tags,
      current_version: 1,
      created_by: actorId
    })
    .select()
    .single();

  if (contentError) {
    return NextResponse.json({ error: contentError.message }, { status: 500 });
  }

  const { data: version, error: versionError } = await supabase
    .from("content_versions")
    .insert({
      content_id: contentItem.id,
      version: 1,
      status: status.data,
      body: body || "(uploaded file)",
      created_by: actorId
    })
    .select()
    .single();

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }

  if (file instanceof File) {
    const bucket = "incident-attachments";
    const path = `${contentItem.id}/${Date.now()}-${file.name}`;
    const upload = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false
    });

    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const { error: attachmentError } = await supabase.from("content_attachments").insert({
      content_id: contentItem.id,
      bucket,
      path,
      mime_type: file.type || null
    });

    if (attachmentError) {
      return NextResponse.json({ error: attachmentError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ content: contentItem, version }, { status: 201 });
}
