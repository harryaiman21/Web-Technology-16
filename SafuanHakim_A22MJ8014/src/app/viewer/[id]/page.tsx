import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { ContentVersionForm } from "@/components/content-version-form";
import { createClient } from "@/utils/supabase/server";

export default async function ViewerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient(cookies());
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: item } = await supabase
    .from("content_items")
    .select("id, title, status, tags, created_at, updated_at, current_version, created_by, profiles(full_name)")
    .eq("id", params.id)
    .single();

  if (!item) {
    redirect("/viewer");
  }

  const { data: versions } = await supabase
    .from("content_versions")
    .select("id, version, status, body, created_at, created_by, profiles(full_name)")
    .eq("content_id", params.id)
    .order("version", { ascending: false });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-dhlRed">Content detail</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{item.title}</h2>
            <p className="mt-2 text-sm text-stone-600">
              Status: <span className="capitalize font-semibold">{item.status}</span> · Version {item.current_version}
            </p>
          </div>
          <Link className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-ink hover:bg-stone-50" href="/viewer">
            Back to viewer
          </Link>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
              <h3 className="text-lg font-bold text-ink">Metadata</h3>
              <div className="mt-4 grid gap-2 text-sm text-stone-600">
                <p><span className="font-semibold text-stone-700">Creator:</span> {item.profiles?.full_name ?? item.created_by ?? "Unknown"}</p>
                <p><span className="font-semibold text-stone-700">Tags:</span> {item.tags?.join(", ") || "-"}</p>
                <p><span className="font-semibold text-stone-700">Created:</span> {new Date(item.created_at).toLocaleString()}</p>
                <p><span className="font-semibold text-stone-700">Updated:</span> {new Date(item.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
              <h3 className="text-lg font-bold text-ink">Version history</h3>
              <div className="mt-4 space-y-4">
                {versions?.map((version) => (
                  <div key={version.id} className="rounded-md border border-stone-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">Version {version.version}</p>
                      <span className="text-xs uppercase text-stone-500">{version.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{version.body}</p>
                    <p className="mt-3 text-xs text-stone-500">
                      {new Date(version.created_at).toLocaleString()} · {version.profiles?.full_name ?? version.created_by ?? "Unknown"}
                    </p>
                  </div>
                ))}
                {versions?.length === 0 ? (
                  <p className="text-sm text-stone-600">No versions recorded yet.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <ContentVersionForm contentId={item.id} currentStatus={item.status} />
          </div>
        </section>
      </main>
    </>
  );
}
