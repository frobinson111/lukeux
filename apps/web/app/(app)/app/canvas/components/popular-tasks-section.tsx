"use client";

type PopularTemplate = {
  idx: number;
  title: string;
  category: string;
};

type Props = {
  collapsed?: boolean;
  templates: PopularTemplate[];
  onSelect: (index: number) => void;
};

export default function PopularTasksSection({ collapsed = false, templates, onSelect }: Props) {
  if (templates.length === 0) return null;

  if (collapsed) {
    return (
      <div className="mt-3 flex-shrink-0 border-t border-slate-200 pt-3 px-3">
        <img src="/images/popular-icon.svg" alt="Popular" className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="mt-3 flex-shrink-0 border-t border-slate-200 pt-3">
      <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Popular UX Tasks
      </div>
      <div className="space-y-0.5 px-1 pb-3">
        {templates.map((t) => (
          <button
            key={t.idx}
            type="button"
            onClick={() => onSelect(t.idx)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <img src="/images/popular-icon.svg" alt="Popular" className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{t.title}</span>
          </button>
        ))}
      </div>
      <div className="border-b border-slate-200" />
    </div>
  );
}
