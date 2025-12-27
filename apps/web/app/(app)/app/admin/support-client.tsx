"use client";

import { useMemo, useState } from "react";

type SupportRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  requestType: string | null;
  message: string;
  createdAt: string | Date;
};

export default function SupportAdmin({ requests }: { requests: SupportRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests]
  );

  const fmtDate = (d: string | Date) => {
    const iso = typeof d === "string" ? d : d.toISOString();
    return iso.slice(0, 10);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-6 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
        <div className="col-span-2">Name</div>
        <div>Email</div>
        <div>Request Type</div>
        <div>Created</div>
        <div className="text-right">Actions</div>
      </div>
      <div className="divide-y divide-slate-200">
        {sorted.map((r) => (
          <div key={r.id} className="grid grid-cols-6 items-center px-4 py-3 text-sm">
            <div className="col-span-2">
              <div className="font-semibold text-slate-900">{`${r.firstName} ${r.lastName}`}</div>
              {r.phone && <div className="text-[11px] text-slate-500">Phone: {r.phone}</div>}
            </div>
            <div className="text-xs text-slate-700 truncate">{r.email}</div>
            <div className="text-xs text-slate-700">{r.requestType || "—"}</div>
            <div className="text-[11px] text-slate-600">{fmtDate(r.createdAt)}</div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setExpanded((prev) => (prev === r.id ? null : r.id))}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
              >
                {expanded === r.id ? "Hide" : "View"}
              </button>
            </div>
            {expanded === r.id && (
              <div className="col-span-6 mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <div className="text-[11px] font-semibold uppercase text-slate-500 mb-1">Message</div>
                <p className="whitespace-pre-line text-sm text-slate-700">{r.message}</p>
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && <div className="px-4 py-4 text-sm text-slate-600">No feedback or inquiries yet.</div>}
      </div>
    </div>
  );
}

