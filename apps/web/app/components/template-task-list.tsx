"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type TemplateRow = {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  guidanceUseAiTo: string | null;
  guidanceExample: string | null;
  guidanceOutcome: string | null;
  templateCategory: {
    name: string;
  } | null;
};

export default function TemplateTaskList() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TemplateRow | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/templates/public");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      console.log("Templates loaded:", json.templates?.[0]); // Debug: check first template structure
      setTemplates(json.templates ?? []);
      setError(null);
    } catch {
      setError("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 45000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  let body = null;
  if (error) {
    body = <div className="py-6 text-center text-sm text-slate-600">{error}</div>;
  } else if (loading) {
    body = <div className="py-6 text-center text-sm text-slate-600">Loading templates…</div>;
  } else if (!templates.length) {
    body = <div className="py-6 text-center text-sm text-slate-600">No templates available yet.</div>;
  } else {
    body = (
      <div className="max-h-60 overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white shadow-[0_6px_0_#eaebf1] pb-10 custom-scroll">
        {templates.map((t, idx) => {
          return (
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
              <span className="truncate">
                {t.category ? (
                  <>
                    <span className="font-bold">{t.category}</span>
                    <span className="font-normal">: {t.title}</span>
                  </>
                ) : (
                  <span className="font-semibold">{t.title}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-6 mb-8 space-y-3">
      <h3 className="text-[20px] font-bold tracking-wide text-black uppercase">What Luke UX Can Help You Do</h3>
      {body}

      {selected && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" 
          role="dialog" 
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div 
            className="w-full max-w-lg max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 pb-3 border-b border-slate-200">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{selected.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full px-2 py-1 text-xl font-semibold text-slate-700 hover:bg-slate-100 leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-5 pt-3 space-y-3 text-sm text-slate-800">
              <Field label="Use AI To" value={selected.guidanceUseAiTo} bgClass="bg-[rgb(239,246,255)]" />
              <Field label="Example" value={selected.guidanceExample} bgClass="bg-[rgb(236,253,245)]" />
              <Field label="Outcome" value={selected.guidanceOutcome} bgClass="bg-[rgb(236,253,245)]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, bgClass }: { label: string; value: string | null; bgClass?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className={`rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 prose prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:my-1 ${bgClass ?? "bg-slate-50"}`}>
        {value?.trim() ? (
          <div dangerouslySetInnerHTML={{ __html: value }} />
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}

// Scoped scrollbar styling
const styles = `
.custom-scroll::-webkit-scrollbar {
  width: 10px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: #ffd526;
  border-radius: 9999px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: #f8fafc;
}
`;

// Inject styles once
if (typeof document !== "undefined" && !document.getElementById("custom-scrollbar-styles")) {
  const style = document.createElement("style");
  style.id = "custom-scrollbar-styles";
  style.innerHTML = styles;
  document.head.appendChild(style);
}
