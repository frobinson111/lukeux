"use client";

import { useState, useTransition } from "react";
import Image from "next/image";

type TemplateRow = {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  prompt: string;
  guidanceUseAiTo: string | null;
  guidanceExample: string | null;
  guidanceOutcome: string | null;
  assets: string | null;
  allowedModels: string[];
  allowedModes: string[];
  isActive: boolean;
  createdAt: Date;
  templateCategoryId?: string | null;
};

export default function TemplatesAdmin({
  initialTemplates,
  availableModels,
  categories
}: {
  initialTemplates: TemplateRow[];
  availableModels: string[];
  categories: { id: string; name: string; sortOrder: number }[];
}) {
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates);
  const [cats, setCats] = useState(categories);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "",
    categoryId: "",
    title: "",
    prompt: "",
    guidanceUseAiTo: "",
    guidanceExample: "",
    guidanceOutcome: "",
    assets: "",
    allowedModels: [] as string[],
    allowedModes: ["auto"] as string[]
  });

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      try {
        const body = {
          categoryId: form.categoryId,
          title: form.title.trim(),
          prompt: form.prompt.trim(),
          guidanceUseAiTo: form.guidanceUseAiTo.trim() || undefined,
          guidanceExample: form.guidanceExample.trim() || undefined,
          guidanceOutcome: form.guidanceOutcome.trim() || undefined,
          assets: form.assets.trim() || undefined,
          allowedModels: form.allowedModels,
          allowedModes: form.allowedModes,
          isActive: true
        };

        if (!body.categoryId || !body.title || !body.prompt) {
          setStatus("Category, title, and prompt are required.");
          return;
        }

        const res = await fetch(editingId ? `/api/templates/${editingId}` : "/api/templates", {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus(json?.error || `Failed to ${editingId ? "update" : "create"} template.`);
          return;
        }
        const tpl = json.template as TemplateRow;
        setTemplates((prev) =>
          editingId
            ? prev.map((t) => (t.id === editingId ? tpl : t)).sort((a, b) => (a.category + a.title).localeCompare(b.category + b.title))
            : [...prev, tpl].sort((a, b) => (a.category + a.title).localeCompare(b.category + b.title))
        );
        setForm({
          category: "",
          categoryId: "",
          title: "",
          prompt: "",
          guidanceUseAiTo: "",
          guidanceExample: "",
          guidanceOutcome: "",
          assets: "",
          allowedModels: [],
          allowedModes: ["auto"]
        });
        setEditingId(null);
        setStatus(editingId ? "Template updated." : "Template created.");
      } catch {
        setStatus(`Failed to ${editingId ? "update" : "create"} template.`);
      }
    });
  }

  async function toggleActive(id: string, next: boolean) {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: next })
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus(json?.error || "Failed to update template.");
          return;
        }
        const updated = json.template as TemplateRow;
        setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: updated.isActive } : t)));
        setStatus("Template updated.");
      } catch {
        setStatus("Failed to update template.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {status && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status}</div>}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
          <div className="col-span-2">Template</div>
          <div>Category</div>
          <div>Models</div>
          <div>Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-200">
          {templates.map((t) => (
            <div key={t.id} className="grid grid-cols-7 items-center px-4 py-3 text-sm">
              <div className="col-span-2">
                <div className="font-semibold text-slate-900">{t.title}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {t.prompt.slice(0, 120)}
                  {t.prompt.length > 120 ? "…" : ""}
                </div>
                {t.assets && <div className="text-[11px] text-slate-500 truncate">Assets: {t.assets}</div>}
              </div>
              <div className="text-xs text-slate-700">{t.category}</div>
              <div className="text-[11px] text-slate-600">{t.allowedModels.join(", ") || "Any"}</div>
              <div className={`text-[11px] font-semibold ${t.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                {t.isActive ? "Active" : "Inactive"}
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => toggleActive(t.id, !t.isActive)}
                  disabled={isPending}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                >
                  {t.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const matchedCatId = t.templateCategoryId ?? cats.find((c) => c.name === t.category)?.id ?? "";
                    setForm({
                      category: t.category,
                      categoryId: matchedCatId,
                      title: t.title,
                      prompt: t.prompt,
                      guidanceUseAiTo: t.guidanceUseAiTo ?? "",
                      guidanceExample: t.guidanceExample ?? "",
                      guidanceOutcome: t.guidanceOutcome ?? "",
                      assets: t.assets ?? "",
                      allowedModels: t.allowedModels ?? [],
                      allowedModes: t.allowedModes ?? ["auto"]
                    });
                    setEditingId(t.id);
                    setStatus(null);
                  }}
                  disabled={isPending}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Delete this template?")) return;
                    setStatus(null);
                    startTransition(async () => {
                      try {
                        const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
                        const json = await res.json().catch(() => null);
                        if (!res.ok) {
                          setStatus(json?.error || "Failed to delete template.");
                          return;
                        }
                        setTemplates((prev) => prev.filter((p) => p.id !== t.id));
                        if (editingId === t.id) {
                          setEditingId(null);
                          setForm({
                            category: "",
                            categoryId: "",
                            title: "",
                            prompt: "",
                            guidanceUseAiTo: "",
                            guidanceExample: "",
                            guidanceOutcome: "",
                            assets: "",
                            allowedModels: [],
                            allowedModes: ["auto"]
                          });
                        }
                        setStatus("Template deleted.");
                      } catch {
                        setStatus("Failed to delete template.");
                      }
                    });
                  }}
                  disabled={isPending}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <div className="px-4 py-4 text-sm text-slate-600">No templates yet.</div>}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Image src="/images/add-project.svg" alt="Add template" width={18} height={18} className="h-5 w-5" />
          <h3 className="text-sm font-semibold text-slate-900">Add Template</h3>
        </div>
        <form className="space-y-3" onSubmit={createTemplate}>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Category</span>
              <div className="flex gap-2">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      categoryId: e.target.value,
                      category: e.target.options[e.target.selectedIndex]?.textContent || ""
                    }))
                  }
                  required
                >
                  <option value="">Choose a category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingCat((v) => !v)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
                >
                  {addingCat ? "Cancel" : "Add"}
                </button>
              </div>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Title</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
          </div>
          {addingCat && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="text-sm font-semibold text-slate-800">Add Category</div>
              <label className="space-y-1 text-sm font-semibold text-slate-700">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (!newCatName.trim()) {
                      setStatus("Category name is required.");
                      return;
                    }
                    setStatus(null);
                    startTransition(async () => {
                      try {
                        const res = await fetch("/api/admin/template-categories", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: newCatName.trim() })
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok) {
                          setStatus(json?.error || "Failed to add category.");
                          return;
                        }
                        const cat = json.category as { id: string; name: string; sortOrder: number };
                        setCats((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
                        setForm((f) => ({ ...f, categoryId: cat.id, category: cat.name }));
                        setNewCatName("");
                        setAddingCat(false);
                        setStatus("Category added.");
                      } catch {
                        setStatus("Failed to add category.");
                      }
                    });
                  }}
                  className="rounded-full bg-black px-3 py-1.5 text-xs font-bold uppercase text-white shadow-[0_3px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_4px_0_#111] disabled:opacity-60"
                >
                  Save Category
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Use AI to</span>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                rows={2}
                value={form.guidanceUseAiTo}
                onChange={(e) => setForm((f) => ({ ...f, guidanceUseAiTo: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Example</span>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                rows={2}
                value={form.guidanceExample}
                onChange={(e) => setForm((f) => ({ ...f, guidanceExample: e.target.value }))}
              />
            </label>
          </div>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Outcome</span>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              rows={2}
              value={form.guidanceOutcome}
              onChange={(e) => setForm((f) => ({ ...f, guidanceOutcome: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Core Input Assets</span>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              rows={3}
              value={form.assets}
              onChange={(e) => setForm((f) => ({ ...f, assets: e.target.value }))}
              placeholder="Describe expected asset inputs (e.g., PDFs, CSVs, screenshots) and guidance."
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Prompt</span>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              rows={4}
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Allowed Models</span>
              <div className="rounded-md border border-slate-300 px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {availableModels.map((m) => {
                    const selected = form.allowedModels.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            allowedModels: selected
                              ? f.allowedModels.filter((x) => x !== m)
                              : [...f.allowedModels, m]
                          }))
                        }
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          selected
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                {form.allowedModels.length === 0 && (
                  <p className="mt-2 text-[11px] text-slate-500">None selected = any model</p>
                )}
              </div>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Allowed Modes</span>
              <div className="rounded-md border border-slate-300 px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {["auto", "instant", "thinking"].map((mode) => {
                    const selected = form.allowedModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            allowedModes: selected
                              ? f.allowedModes.filter((m) => m !== mode)
                              : [...f.allowedModes, mode]
                          }))
                        }
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          selected
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
                {form.allowedModes.length === 0 && (
                  <p className="mt-2 text-[11px] text-slate-500">None selected = any mode</p>
                )}
              </div>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
            >
              {isPending ? "Saving..." : editingId ? "Update Template" : "Create Template"}
            </button>
            {editingId && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    category: "",
                    categoryId: "",
                    title: "",
                    prompt: "",
                    guidanceUseAiTo: "",
                    guidanceExample: "",
                    guidanceOutcome: "",
                    assets: "",
                    allowedModels: [],
                    allowedModes: ["auto"]
                  });
                  setStatus(null);
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold uppercase text-slate-700 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

