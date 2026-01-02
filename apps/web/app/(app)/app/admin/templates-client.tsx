 "use client";

import type { CategoryRow, TemplateRow } from "./page";

export default function TemplatesAdmin({
  initialTemplates,
  availableModels,
  categories
}: {
  initialTemplates: TemplateRow[];
  availableModels: string[];
  categories: CategoryRow[];
}) {
  const total = initialTemplates.length;
  const active = initialTemplates.filter((t) => t.isActive).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Templates</span>
        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
          {active} active / {total} total
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
          {availableModels.length} models
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
          {categories.length} categories
        </span>
      </div>
      <div className="max-h-80 overflow-auto rounded border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {initialTemplates.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-900">{t.title}</td>
                <td className="px-3 py-2 text-slate-700">{t.category || "Uncategorized"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                      t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

