import { useMemo } from "react";

export type FeedbackRow = {
  id: string;
  userEmail?: string | null;
  userName?: string | null;
  type: string;
  source?: string | null;
  triggerCount?: number | null;
  message: string;
  createdAt: string;
};

export default function FeedbackAdmin({ feedback }: { feedback: FeedbackRow[] }) {
  const rows = useMemo(
    () =>
      feedback.map((f) => ({
        ...f,
        createdAtDisplay: formatDate(f.createdAt)
      })),
    [feedback]
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-6 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
        <div>User</div>
        <div>Type</div>
        <div>Source</div>
        <div>Trigger</div>
        <div>Created</div>
        <div>Message</div>
      </div>
      <div className="divide-y divide-slate-200">
        {rows.map((f) => (
          <div key={f.id} className="grid grid-cols-6 items-start px-4 py-3 text-sm gap-2">
            <div className="text-xs text-slate-700">
              <div className="font-semibold text-slate-900">{f.userEmail || "—"}</div>
              {f.userName && <div className="text-[11px] text-slate-500">{f.userName}</div>}
            </div>
            <div className="text-[11px] font-semibold uppercase text-slate-700">{f.type}</div>
            <div className="text-[11px] text-slate-600">{f.source || "—"}</div>
            <div className="text-[11px] text-slate-600">{f.triggerCount ?? "—"}</div>
            <div className="text-[11px] text-slate-600">{f.createdAtDisplay}</div>
            <div className="text-[12px] text-slate-800 whitespace-pre-wrap">{f.message}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-3 text-sm text-slate-600">No feedback yet.</div>}
      </div>
    </div>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d).toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return d;
  }
}

