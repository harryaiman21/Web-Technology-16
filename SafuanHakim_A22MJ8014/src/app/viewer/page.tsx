import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { createClient } from "@/utils/supabase/server";

const statuses = ["draft", "reviewed", "published"] as const;

type ViewerSearchParams = {
  q?: string;
  status?: string;
  tag?: string;
  creator?: string;
  from?: string;
  to?: string;
};

export default async function ViewerPage({ searchParams }: { searchParams: ViewerSearchParams }) {
  const supabase = createClient(cookies());
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: creators } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  let query = supabase
    .from("content_items")
    .select("id, title, status, tags, created_at, updated_at, created_by, profiles(full_name)")
    .order("updated_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  if (searchParams.tag) {
    query = query.contains("tags", [searchParams.tag]);
  }

  if (searchParams.creator) {
    query = query.eq("created_by", searchParams.creator);
  }

  if (searchParams.from) {
    query = query.gte("created_at", searchParams.from);
  }

  if (searchParams.to) {
    query = query.lte("created_at", searchParams.to);
  }

  if (searchParams.q) {
    query = query.ilike("title", `%${searchParams.q}%`);
  }

  const { data: items } = await query;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink">Content viewer</h2>
            <p className="mt-1 text-sm text-stone-600">Search and filter drafts, reviews, and published updates.</p>
          </div>
          <Link className="rounded-md bg-dhlRed px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" href="/">
            Back to dashboard
          </Link>
        </div>

        <form className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-panel" method="get">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-ink">
              Search title
              <input
                name="q"
                defaultValue={searchParams.q}
                className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder="Search by title"
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              Tag
              <input
                name="tag"
                defaultValue={searchParams.tag}
                className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder="delivery, billing"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-ink">
              Status
              <select name="status" defaultValue={searchParams.status} className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-ink">
              Creator
              <select name="creator" defaultValue={searchParams.creator} className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
                <option value="">All creators</option>
                {creators?.map((creator) => (
                  <option key={creator.id} value={creator.id}>{creator.full_name ?? creator.id}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-ink">
              From
              <input name="from" type="date" defaultValue={searchParams.from} className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-ink">
              To
              <input name="to" type="date" defaultValue={searchParams.to} className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-md bg-dhlRed px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Apply filters</button>
            <Link className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-ink hover:bg-stone-50" href="/viewer">
              Clear
            </Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-panel">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {items?.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50">
                  <td className="px-4 py-4 font-semibold text-ink">{item.title}</td>
                  <td className="px-4 py-4 capitalize text-stone-700">{item.status}</td>
                  <td className="px-4 py-4 text-stone-600">{item.tags?.join(", ") || "-"}</td>
                  <td className="px-4 py-4 text-stone-600">{item.profiles?.full_name ?? item.created_by ?? "Unknown"}</td>
                  <td className="px-4 py-4 text-stone-600">{new Date(item.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-right">
                    <Link className="text-sm font-semibold text-dhlRed hover:underline" href={`/viewer/${item.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {items?.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-stone-600" colSpan={6}>
                    No content matches the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
