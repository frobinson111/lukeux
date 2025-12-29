"use client";

import { useState } from "react";
import Link from "next/link";

const types = [
  { key: "LIKE", label: "😊 I like something" },
  { key: "DISLIKE", label: "🙁 I don't like something" },
  { key: "SUGGESTION", label: "💡 I have a suggestion" }
];

export default function FeedbackClient() {
  const [type, setType] = useState<string>("LIKE");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    if (message.trim().length < 5) {
      setError("Please add at least 5 characters.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), source: "page" })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || "Failed to submit feedback.");
      } else {
        setStatus("Thanks for your feedback!");
        setMessage("");
      }
    } catch {
      setError("Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        {types.map((t) => (
          <label
            key={t.key}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold shadow-sm transition ${
              type === t.key ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t.key}
              checked={type === t.key}
              onChange={() => setType(t.key)}
              className="h-4 w-4"
            />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-600">Comments or Questions</label>
        <textarea
          required
          minLength={5}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          rows={4}
          placeholder="Can you add the following UX task…"
        />
        <div className="mt-1 text-[11px] text-slate-500 text-right">{message.length}/1000</div>
        {error && <div className="text-[12px] text-rose-600">{error}</div>}
        {status && <div className="text-[12px] text-emerald-700">{status}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/app"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting || message.trim().length < 5}
          className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_5px_0_#111] disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

