"use client";

import type { KeyRow } from "./page";

export default function KeysAdmin({ initialKeys }: { initialKeys: KeyRow[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">LLM API Keys</span>
        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
          {initialKeys.length} keys
        </span>
      </div>
      <div className="max-h-80 overflow-auto rounded border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {initialKeys.map((k) => (
              <tr key={k.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-900">{k.provider}</td>
                <td className="px-3 py-2 text-slate-700">{k.displayName}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                      k.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {k.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {k.createdAt instanceof Date ? k.createdAt.toISOString().slice(0, 10) : k.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

