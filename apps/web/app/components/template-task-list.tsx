"use client";

import useSWR from "swr";
import Image from "next/image";
import { useMemo, useState } from "react";

type TemplateRow = {
  id: string;
  title: string;
  guidanceUseAiTo: string | null;
  guidanceExample: string | null;
  guidanceOutcome: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TemplateTaskList() {
  const { data, error, isLoading } = useSWR<{ templates: TemplateRow[] }>("/api/templates/public", fetcher, {
    refreshInterval: 45000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  const [selected, setSelected] = useState<TemplateRow | null>(null);

  const templates = useMemo(() => data?.templates ?? [], [data]);

  let body = null;
  if (error) {
    body = <div className="py-6 text-center text-sm text-slate-600">Failed to load templates.</div>;
  } else if (isLoading) {
    body = <div className="py-6 text-center text-sm text-slate-600">Loading templates…</div>;
  } else if (!templates.length) {
    body = <div className="py-6 text-center text-sm text-slate-600">No templates available yet.</div>;
  } else {
    body = (
      <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {templates.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => setSelected(t)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-800 transition ${
              idx !== 0 ? "border-t border-slate-200" : ""
            } hover:bg-slate-50 active:bg-slate-100`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Image src="/images/help.svg" alt="" width={16} height={16} className="h-4 w-4" />
            </div>
            <span className="font-semibold truncate">{t.title}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">UX tasks Luke UX can assist with</h3>
      {body}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{selected.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-800">
              <Field label="Use AI To" value={selected.guidanceUseAiTo} />
              <Field label="Example" value={selected.guidanceExample} />
              <Field label="Outcome" value={selected.guidanceOutcome} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 min-h-[44px]">
        {value?.trim() || "—"}
      </div>
    </div>
  );
}


