"use client";

import { useState, useTransition } from "react";
import Image from "next/image";

type KeyRow = {
  id: string;
  provider: string;
  displayName: string;
  last4: string;
  isActive: boolean;
  createdAt: Date;
};

const providerOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "local", label: "Local" }
];

export default function KeysAdmin({ initialKeys }: { initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    provider: "openai",
    displayName: "",
    key: ""
  });

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      try {
        if (!form.displayName.trim() || !form.key.trim()) {
          setStatus("Display name and key are required.");
          return;
        }
        const res = await fetch("/api/admin/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: form.provider,
            displayName: form.displayName.trim(),
            key: form.key.trim()
          })
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus(json?.error || "Failed to add key.");
          return;
        }
        const k = json.key as KeyRow;
        setKeys((prev) => [k, ...prev]);
        setForm({ provider: "openai", displayName: "", key: "" });
        setStatus("Key added.");
      } catch {
        setStatus("Failed to add key.");
      }
    });
  }

  async function toggleActive(id: string, next: boolean) {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/keys/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: next })
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus(json?.error || "Failed to update key.");
          return;
        }
        const updated = json.key as KeyRow;
        setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: updated.isActive } : k)));
        setStatus("Key updated.");
      } catch {
        setStatus("Failed to update key.");
      }
    });
  }

  async function deleteKey(id: string) {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus(json?.error || "Failed to delete key.");
          return;
        }
        setKeys((prev) => prev.filter((k) => k.id !== id));
        setStatus("Key deleted.");
      } catch {
        setStatus("Failed to delete key.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {status && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status}</div>}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-6 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
          <div>Provider</div>
          <div className="col-span-2">Name</div>
          <div>Last4</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        <div className="divide-y divide-slate-200">
          {keys.map((k) => (
            <div key={k.id} className="grid grid-cols-6 items-center px-4 py-3 text-sm">
              <div className="text-xs font-semibold text-slate-700 uppercase">{k.provider}</div>
              <div className="col-span-2">
                <div className="font-semibold text-slate-900">{k.displayName}</div>
                <div className="text-[11px] text-slate-500">{k.id}</div>
              </div>
              <div className="text-xs text-slate-700">{k.last4}</div>
              <div className={`text-[11px] font-semibold ${k.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                {k.isActive ? "Active" : "Inactive"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(k.id, !k.isActive)}
                  disabled={isPending}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                >
                  {k.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteKey(k.id)}
                  disabled={isPending}
                  className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {keys.length === 0 && <div className="px-4 py-4 text-sm text-slate-600">No keys yet.</div>}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Image src="/images/add-project.svg" alt="Add key" width={18} height={18} className="h-5 w-5" />
          <h3 className="text-sm font-semibold text-slate-900">Add LLM API Key</h3>
        </div>
        <form className="space-y-3" onSubmit={createKey}>
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Provider</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              >
                {providerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 col-span-2">
              <span>Display Name</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                required
              />
            </label>
          </div>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Key (stored securely, only last4 shown after save)</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              required
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Add Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


