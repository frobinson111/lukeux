"use client";

import { useState } from "react";
import type { KeyRow, LlmModelRow } from "./page";

export default function KeysAdmin({
  initialKeys,
  initialModels
}: {
  initialKeys: KeyRow[];
  initialModels: LlmModelRow[];
}) {
  const [models, setModels] = useState(initialModels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add model form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newProvider, setNewProvider] = useState("openai");
  const [addingSaving, setAddingSaving] = useState(false);

  async function toggleEnabled(model: LlmModelRow) {
    setSaving(model.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !model.isEnabled })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || "Failed to update model");
        return;
      }
      const { model: updated } = await res.json();
      setModels((prev) => prev.map((m) => (m.id === model.id ? updated : m)));
    } catch {
      setError("Failed to update model");
    } finally {
      setSaving(null);
    }
  }

  function startEdit(model: LlmModelRow) {
    setEditingId(model.id);
    setEditDisplayName(model.displayName);
    setEditSortOrder(model.sortOrder);
    setError(null);
  }

  async function saveEdit(modelId: string) {
    setSaving(modelId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/models/${modelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName,
          sortOrder: editSortOrder
        })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || "Failed to update model");
        return;
      }
      const { model: updated } = await res.json();
      setModels((prev) =>
        prev
          .map((m) => (m.id === modelId ? updated : m))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
      setEditingId(null);
    } catch {
      setError("Failed to update model");
    } finally {
      setSaving(null);
    }
  }

  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    setAddingSaving(true);
    setError(null);
    try {
      const nextSort = models.length > 0 ? Math.max(...models.map((m) => m.sortOrder)) + 1 : 0;
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: newModelId.trim(),
          displayName: newDisplayName.trim(),
          provider: newProvider,
          sortOrder: nextSort
        })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || "Failed to add model");
        return;
      }
      const { model: created } = await res.json();
      setModels((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewModelId("");
      setNewDisplayName("");
      setNewProvider("openai");
      setShowAddForm(false);
    } catch {
      setError("Failed to add model");
    } finally {
      setAddingSaving(false);
    }
  }

  async function deleteModel(model: LlmModelRow) {
    if (!window.confirm(`Delete model "${model.displayName}" (${model.modelId})? This cannot be undone.`)) return;
    setSaving(model.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || "Failed to delete model");
        return;
      }
      setModels((prev) => prev.filter((m) => m.id !== model.id));
    } catch {
      setError("Failed to delete model");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Section A: LLM Models Management */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">LLM Models</span>
            <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
              {models.filter((m) => m.isEnabled).length} / {models.length} enabled
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-full bg-black px-3 py-1.5 text-xs font-bold uppercase text-white shadow-[0_2px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_4px_0_#111]"
          >
            {showAddForm ? "Cancel" : "+ Add Model"}
          </button>
        </div>

        {/* Add Model Form */}
        {showAddForm && (
          <form onSubmit={addModel} className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Model ID</label>
                <input
                  type="text"
                  required
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="e.g. gpt-5.2"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. GPT 5.2"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Provider</label>
                <select
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingSaving}
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                >
                  {addingSaving ? "Adding..." : "Add Model"}
                </button>
              </div>
            </div>
          </form>
        )}

        <p className="mb-3 text-xs text-slate-500">
          Enable or disable models available in the user-facing dropdown. Edit display names and sort order to control how models appear.
        </p>

        <div className="overflow-auto rounded border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 w-16">Order</th>
                <th className="px-3 py-2">Display Name</th>
                <th className="px-3 py-2">Model ID</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2 w-24">Enabled</th>
                <th className="px-3 py-2 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id} className="border-t border-slate-100">
                  {editingId === model.id ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={editSortOrder}
                          onChange={(e) => setEditSortOrder(Number(e.target.value))}
                          className="w-14 rounded border border-slate-300 px-1.5 py-1 text-sm text-center"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-mono text-xs">{model.modelId}</td>
                      <td className="px-3 py-2">
                        <ProviderBadge provider={model.provider} />
                      </td>
                      <td className="px-3 py-2">
                        <ToggleSwitch
                          enabled={model.isEnabled}
                          loading={saving === model.id}
                          onChange={() => toggleEnabled(model)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(model.id)}
                            disabled={saving === model.id}
                            className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {saving === model.id ? "..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-center text-slate-500">{model.sortOrder}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{model.displayName}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono text-xs">{model.modelId}</td>
                      <td className="px-3 py-2">
                        <ProviderBadge provider={model.provider} />
                      </td>
                      <td className="px-3 py-2">
                        <ToggleSwitch
                          enabled={model.isEnabled}
                          loading={saving === model.id}
                          onChange={() => toggleEnabled(model)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(model)}
                            className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteModel(model)}
                            className="rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {models.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                    No LLM models configured. Click &ldquo;+ Add Model&rdquo; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section B: API Keys (existing read-only display) */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">API Keys</span>
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
    </div>
  );
}

function ToggleSwitch({
  enabled,
  loading,
  onChange
}: {
  enabled: boolean;
  loading: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? "bg-emerald-500" : "bg-slate-300"
      } ${loading ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
          enabled ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const styles =
    provider === "openai"
      ? "bg-green-50 text-green-700 border-green-200"
      : provider === "anthropic"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={`rounded-full border px-2 py-[2px] text-[11px] font-semibold ${styles}`}>
      {provider}
    </span>
  );
}
