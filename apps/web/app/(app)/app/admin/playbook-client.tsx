"use client";

import { useEffect, useState } from "react";

type PlaybookItem = {
  id: string;
  title: string;
  audioUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  showAudio: boolean;
  showVideo: boolean;
  showDocument: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PlaybookForm = {
  title: string;
  audioUrl: string;
  videoUrl: string;
  documentUrl: string;
  showAudio: boolean;
  showVideo: boolean;
  showDocument: boolean;
};

const emptyForm: PlaybookForm = {
  title: "",
  audioUrl: "",
  videoUrl: "",
  documentUrl: "",
  showAudio: false,
  showVideo: false,
  showDocument: false,
};

export default function PlaybookAdmin() {
  const [items, setItems] = useState<PlaybookItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlaybookForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibleCountInput, setVisibleCountInput] = useState("3");
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const res = await fetch("/api/admin/playbook");
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        const vc = data.config?.visibleCount ?? 3;
        setVisibleCount(vc);
        setVisibleCountInput(String(vc));
      }
    } catch {
      setStatus({ msg: "Failed to load playbook items", ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setStatus({ msg: "Title is required", ok: false });
      return;
    }
    setSaving(true);
    setStatus(null);

    try {
      const payload = {
        ...(editingId && { id: editingId }),
        title: form.title,
        audioUrl: form.audioUrl || null,
        videoUrl: form.videoUrl || null,
        documentUrl: form.documentUrl || null,
        showAudio: form.showAudio,
        showVideo: form.showVideo,
        showDocument: form.showDocument,
      };

      const res = await fetch("/api/admin/playbook", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ msg: data.error || "Failed to save", ok: false });
        return;
      }

      setStatus({ msg: editingId ? "Playbook item updated" : "Playbook item created", ok: true });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadItems();
    } catch {
      setStatus({ msg: "Failed to save playbook item", ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/playbook?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setStatus({ msg: data.error || "Failed to delete", ok: false });
        return;
      }
      setStatus({ msg: `"${title}" deleted`, ok: true });
      loadItems();
    } catch {
      setStatus({ msg: "Failed to delete", ok: false });
    }
  }

  async function handleToggleActive(item: PlaybookItem) {
    try {
      const res = await fetch("/api/admin/playbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      if (!res.ok) {
        setStatus({ msg: "Failed to toggle status", ok: false });
        return;
      }
      loadItems();
    } catch {
      setStatus({ msg: "Failed to toggle status", ok: false });
    }
  }

  async function handleMoveUp(index: number) {
    if (index <= 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const orderedIds = newItems.map((i) => i.id);

    try {
      await fetch("/api/admin/playbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      setItems(newItems);
    } catch {
      setStatus({ msg: "Failed to reorder", ok: false });
    }
  }

  async function handleMoveDown(index: number) {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const orderedIds = newItems.map((i) => i.id);

    try {
      await fetch("/api/admin/playbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      setItems(newItems);
    } catch {
      setStatus({ msg: "Failed to reorder", ok: false });
    }
  }

  async function handleSaveConfig() {
    const count = Number(visibleCountInput);
    if (isNaN(count) || count < 1) {
      setStatus({ msg: "Visible count must be at least 1", ok: false });
      return;
    }
    setSavingConfig(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/playbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleCount: count }),
      });
      if (!res.ok) {
        setStatus({ msg: "Failed to update visible count", ok: false });
        return;
      }
      setVisibleCount(count);
      setStatus({ msg: `Visible count set to ${count}`, ok: true });
    } catch {
      setStatus({ msg: "Failed to update config", ok: false });
    } finally {
      setSavingConfig(false);
    }
  }

  function startEdit(item: PlaybookItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      audioUrl: item.audioUrl ?? "",
      videoUrl: item.videoUrl ?? "",
      documentUrl: item.documentUrl ?? "",
      showAudio: item.showAudio,
      showVideo: item.showVideo,
      showDocument: item.showDocument,
    });
    setShowForm(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Loading playbook items…</div>;
  }

  return (
    <div className="space-y-4">
      {status && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            status.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* Config: Visible Count */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <label className="flex-1 space-y-1 text-sm font-semibold text-slate-800">
            <span className="block">Visible items before scrolling</span>
            <input
              type="number"
              min="1"
              max="10"
              value={visibleCountInput}
              onChange={(e) => setVisibleCountInput(e.target.value)}
              className="w-full max-w-[120px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
          >
            {savingConfig ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">{items.length} playbook item{items.length !== 1 ? "s" : ""}</span>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-[#ffd526] px-4 py-2 text-xs font-bold uppercase text-black shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111]"
        >
          + Add Playbook Item
        </button>
      </div>

      {/* Form (Create / Edit) */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? "Edit Playbook Item" : "New Playbook Item"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          {/* Title */}
          <label className="block space-y-1 text-sm font-semibold text-slate-800">
            <span>Title *</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Getting Started with Luke UX"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </label>

          {/* Audio */}
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={form.showAudio}
                  onChange={(e) => setForm((f) => ({ ...f, showAudio: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Show Audio Overview
              </label>
            </div>
            {form.showAudio && (
              <input
                type="text"
                value={form.audioUrl}
                onChange={(e) => setForm((f) => ({ ...f, audioUrl: e.target.value }))}
                placeholder="Audio URL or file path"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            )}
          </div>

          {/* Video */}
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={form.showVideo}
                  onChange={(e) => setForm((f) => ({ ...f, showVideo: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Show How-to Video
              </label>
            </div>
            {form.showVideo && (
              <input
                type="text"
                value={form.videoUrl}
                onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                placeholder="YouTube link or direct video URL"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            )}
          </div>

          {/* Document */}
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={form.showDocument}
                  onChange={(e) => setForm((f) => ({ ...f, showDocument: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Show Download Guide
              </label>
            </div>
            {form.showDocument && (
              <input
                type="text"
                value={form.documentUrl}
                onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                placeholder="Document download URL"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-black px-5 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Item" : "Create Item"}
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No playbook items yet. Click &ldquo;+ Add Playbook Item&rdquo; to create one.
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-1">Order</div>
            <div className="col-span-3">Title</div>
            <div className="col-span-2">Content Types</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2">Actions</div>
          </div>
          <div className="divide-y divide-slate-200">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                {/* Order arrows */}
                <div className="col-span-1 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="text-slate-500 hover:text-black disabled:opacity-20 text-xs leading-none"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    className="text-slate-500 hover:text-black disabled:opacity-20 text-xs leading-none"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Title */}
                <div className="col-span-3 font-semibold text-slate-900 truncate pr-2">
                  {item.title}
                </div>

                {/* Content types */}
                <div className="col-span-2 flex flex-wrap gap-1">
                  {item.showAudio && item.audioUrl && (
                    <span className="rounded-full bg-blue-50 px-2 py-[2px] text-[10px] font-semibold text-blue-700 border border-blue-200">
                      Audio
                    </span>
                  )}
                  {item.showVideo && item.videoUrl && (
                    <span className="rounded-full bg-red-50 px-2 py-[2px] text-[10px] font-semibold text-red-700 border border-red-200">
                      Video
                    </span>
                  )}
                  {item.showDocument && item.documentUrl && (
                    <span className="rounded-full bg-emerald-50 px-2 py-[2px] text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Doc
                    </span>
                  )}
                  {!((item.showAudio && item.audioUrl) || (item.showVideo && item.videoUrl) || (item.showDocument && item.documentUrl)) && (
                    <span className="text-[10px] text-slate-400">None</span>
                  )}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`rounded-full px-2 py-[2px] text-[11px] font-semibold border transition ${
                      item.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                {/* Created */}
                <div className="col-span-2 text-[12px] text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.title)}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 transition hover:-translate-y-[1px] hover:shadow"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
