"use client";

import { AlertTriangle, Bot, CheckCircle2, ClipboardList, FileUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department, Incident, IncidentStatus, RawInput, RpaRun } from "@/lib/types";
import { PriorityPill, StatusPill } from "./status-pill";

const statuses: IncidentStatus[] = ["new", "triaged", "assigned", "in_progress", "waiting_customer", "resolved", "closed"];

type DashboardProps = {
  incidents: Incident[];
  rawInputs: RawInput[];
  rpaRuns: RpaRun[];
  departments: Department[];
};

export function Dashboard({ incidents, rawInputs, rpaRuns, departments }: DashboardProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      const search = `${incident.title} ${incident.summary} ${incident.customerName} ${incident.trackingNumber}`.toLowerCase();
      return (
        search.includes(query.toLowerCase()) &&
        (status === "all" || incident.status === status) &&
        (department === "all" || incident.department === department)
      );
    });
  }, [department, incidents, query, status]);

  const openCount = incidents.filter((incident) => !["resolved", "closed"].includes(incident.status)).length;
  const criticalCount = incidents.filter((incident) => incident.priority === "critical").length;
  const duplicateCount = incidents.filter((incident) => incident.duplicateOf).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={<ClipboardList size={20} />} label="Open incidents" value={openCount.toString()} />
        <Metric icon={<AlertTriangle size={20} />} label="Critical" value={criticalCount.toString()} />
        <Metric icon={<FileUp size={20} />} label="Raw inputs today" value={rawInputs.length.toString()} />
        <Metric icon={<Bot size={20} />} label="Duplicate hints" value={duplicateCount.toString()} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Manage incidents</h2>
              <p className="text-sm text-stone-600">Search, prioritize, and move incidents through the support workflow.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search incidents"
                  className="w-full rounded-md border border-stone-300 py-2 pl-9 pr-3 text-sm"
                />
              </label>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
                <option value="all">All statuses</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
              <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
                <option value="all">All departments</option>
                {departments.map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-stone-200">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Incident</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filtered.map((incident) => (
                  <tr key={incident.id} className="align-top hover:bg-stone-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{incident.title}</p>
                      <p className="mt-1 max-w-md text-stone-600">{incident.summary}</p>
                      <p className="mt-2 text-xs text-stone-500">{incident.id} · {incident.source.replace("_", " ")}</p>
                    </td>
                    <td className="px-4 py-4"><StatusPill status={incident.status} /></td>
                    <td className="px-4 py-4"><PriorityPill priority={incident.priority} /></td>
                    <td className="px-4 py-4">{incident.department}</td>
                    <td className="px-4 py-4">{incident.trackingNumber}</td>
                    <td className="px-4 py-4">{incident.assignedTo}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-stone-600" colSpan={6}>
                      No incidents found. Send a raw input from UiPath or create one from the intake panel.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <IntakePanel />
          <RpaPanel rpaRuns={rpaRuns} />
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-600">{label}</p>
        <span className="text-dhlRed">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

function IntakePanel() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    if (!title.trim()) {
      setStatusMessage("Title is required.");
      setIsSubmitting(false);
      return;
    }

    if (!content.trim() && !attachment) {
      setStatusMessage("Provide text or attach a file before submitting.");
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("status", status);
      formData.append("tags", tags);
      formData.append("body", content);
      if (attachment) {
        formData.append("file", attachment);
      }

      const response = await fetch("/api/content", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to create raw input.");
      }

      setTitle("");
      setTags("");
      setContent("");
      setAttachment(null);
      setStatusMessage("Content saved.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel" onSubmit={handleSubmit}>
      <h2 className="text-lg font-bold text-ink">Upload console</h2>
      <label className="mt-4 block text-sm font-semibold text-ink">Title</label>
      <input
        className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        placeholder="Short headline for the update"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Status
          <select
            className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-ink">
          Tags
          <input
            className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            placeholder="customer, billing, delivery"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-ink">Details</label>
      <textarea
        className="mt-2 min-h-28 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        placeholder="Paste notes or a draft update"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <label className="mt-4 block rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-center text-sm text-stone-600">
        Attach text, PDF, or DOCX
        <input
          className="sr-only"
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
        />
      </label>
      <p className="mt-2 text-xs text-stone-500">Uploads are stored in Supabase Storage (incident-attachments).</p>
      {statusMessage ? <p className="mt-3 text-sm text-stone-600">{statusMessage}</p> : null}
      <button
        type="submit"
        className="mt-4 w-full rounded-md bg-dhlRed px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save content"}
      </button>
    </form>
  );
}

function RpaPanel({ rpaRuns }: { rpaRuns: RpaRun[] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-ink">UiPath reporting</h2>
      <div className="mt-4 space-y-3">
        {rpaRuns.map((run) => (
          <div key={run.id} className="rounded-md border border-stone-200 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">{run.id}</p>
              <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                <CheckCircle2 size={15} />
                {run.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-600">{run.summary}</p>
            <p className="mt-2 text-xs text-stone-500">{run.processed} processed · {run.failed} failed · {run.source.replace("_", " ")}</p>
          </div>
        ))}
        {rpaRuns.length === 0 ? (
          <div className="rounded-md border border-stone-200 p-4 text-sm text-stone-600">
            UiPath run summaries will appear here after the robot posts to the app.
          </div>
        ) : null}
      </div>
    </div>
  );
}
