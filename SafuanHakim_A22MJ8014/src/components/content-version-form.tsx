"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ContentVersionFormProps = {
  contentId: string;
  currentStatus: "draft" | "reviewed" | "published";
};

export function ContentVersionForm({ contentId, currentStatus }: ContentVersionFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/content/${contentId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status,
          body
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save version.");
      }

      setBody("");
      setMessage("Version saved.");
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unexpected error.";
      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-ink">Add version</h2>
      <label className="mt-4 block text-sm font-semibold text-ink">Status</label>
      <select
        className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        value={status}
        onChange={(event) => setStatus(event.target.value as ContentVersionFormProps["currentStatus"])}
      >
        <option value="draft">Draft</option>
        <option value="reviewed">Reviewed</option>
        <option value="published">Published</option>
      </select>
      <label className="mt-4 block text-sm font-semibold text-ink">Update notes</label>
      <textarea
        className="mt-2 min-h-28 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        placeholder="Describe what changed in this version"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
      />
      {message ? <p className="mt-3 text-sm text-stone-600">{message}</p> : null}
      <button
        type="submit"
        className="mt-4 w-full rounded-md bg-dhlRed px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save version"}
      </button>
    </form>
  );
}
