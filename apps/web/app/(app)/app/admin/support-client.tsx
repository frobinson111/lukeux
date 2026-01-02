"use client";

import type { SupportRow } from "./page";

export default function SupportAdmin({ requests }: { requests: SupportRow[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Support Requests</span>
        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
          {requests.length} items
        </span>
      </div>
      <div className="max-h-80 overflow-auto rounded border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-900">{r.email || "—"}</td>
                <td className="px-3 py-2 text-slate-700">{r.subject || "—"}</td>
                <td className="px-3 py-2 text-slate-500">
                  {r.createdAt instanceof Date ? r.createdAt.toISOString().slice(0, 10) : r.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

