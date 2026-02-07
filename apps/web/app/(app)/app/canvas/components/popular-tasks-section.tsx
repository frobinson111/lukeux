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
        <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
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
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="truncate">{t.title}</span>
          </button>
        ))}
      </div>
      <div className="border-b border-slate-200" />
    </div>
  );
}
