"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import TemplatesAdmin from "./templates-client";
import KeysAdmin from "./keys-client";
import PaymentsAdmin from "./payments-client";
import type {
  UserRow,
  TemplateRow,
  UsageRow,
  EventRow,
  KeyRow,
  CategoryRow,
  PaymentConfigRow,
  SupportRow,
  FeedbackRow,
  UsageTotals
} from "./page";
import SupportAdmin from "./support-client";
import FeedbackAdmin from "./feedback-client";

const TABS = ["overview", "users", "limits", "templates", "keys", "payments", "feedback", "usage", "events"] as const;
type Tab = (typeof TABS)[number];

export default function AdminClient({
  userRole,
  users,
  templates,
  usage,
  events,
  keys,
  availableModels,
  categories,
  payments,
  support,
  feedback,
  usageTotals
}: {
  userRole: string;
  users: UserRow[];
  templates: TemplateRow[];
  usage: UsageRow[];
  events: EventRow[];
  keys: KeyRow[];
  availableModels: string[];
  categories: CategoryRow[];
  payments: PaymentConfigRow;
  support: SupportRow[];
  feedback: FeedbackRow[];
  usageTotals: UsageTotals;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [usersState, setUsersState] = useState(users);
  const [status, setStatus] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(usersState.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return usersState.slice(start, start + pageSize);
  }, [usersState, page, pageSize]);

  const stats = useMemo(
    () => ({
      usersTotal: usersState.length,
      admins: usersState.filter((u) => u.role === "ADMIN" || u.role === "SUPERUSER").length,
      pros: usersState.filter((u) => u.plan === "PRO").length,
      templatesTotal: templates.length,
      templatesActive: templates.filter((t) => t.isActive).length,
      apiKeysTotal: keys.length,
      apiKeysActive: keys.filter((k) => k.isActive).length,
      recentUsageCount: usage.length,
      recentEventsCount: events.length,
      initialResponses: usageTotals.initialCount,
      followupResponses: usageTotals.followupCount,
      imagesGenerated: usageTotals.imageCount
    }),
    [usersState, templates, keys, usage, events, usageTotals]
  );

  const menu: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users & Limits" },
    { id: "limits", label: "Plan Limits" },
    { id: "templates", label: "Templates" },
    { id: "keys", label: "LLM API Keys" },
    { id: "payments", label: "Payments" },
    { id: "feedback", label: "Feedback & Enquirer" },
    { id: "usage", label: "Usage" },
    { id: "events", label: "Events" }
  ];

  async function togglePlan(userId: string, currentPlan: string) {
    setStatus(null);
    const nextPlan = currentPlan === "PRO" ? "FREE" : "PRO";
    try {
      const res = await fetch("/api/admin/users/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: nextPlan })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(json?.error || "Failed to update plan.");
        return;
      }
      setUsersState((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: json.user.plan, planStatus: json.user.planStatus } : u))
      );
      setStatus(`Plan updated to ${nextPlan}.`);
    } catch {
      setStatus("Failed to update plan.");
    }
  }

  async function deleteUser(userId: string, email: string) {
    setStatus(null);
    const confirmed = typeof window === "undefined" ? false : window.confirm(`Delete user ${email}? This will suspend access.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(json?.error || "Failed to delete user.");
        return;
      }
      setUsersState((prev) => {
        const next = prev.filter((u) => u.id !== userId);
        const nextTotalPages = Math.max(1, Math.ceil(next.length / pageSize));
        setPage((p) => Math.min(p, nextTotalPages));
        return next;
      });
      setStatus(`User ${email} deleted.`);
    } catch {
      setStatus("Failed to delete user.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start gap-6">
        <aside className="w-48 shrink-0 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sticky top-4 h-fit">
          <div className="text-xs font-semibold uppercase text-slate-500 px-1">Admin</div>
          <nav className="space-y-1 text-sm font-semibold text-slate-800">
            {menu.map((item) => (
              <button
                key={item.id}
                className={`block w-full text-left rounded-md px-2 py-2 hover:bg-slate-100 ${
                  tab === item.id ? "bg-slate-100 text-slate-900" : ""
                }`}
                onClick={() => {
                  setTab(item.id);
                  setPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 space-y-8">
          {status && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status}</div>}

          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Manage users, templates, keys, usage, and events.</p>
            </div>
            <div className="rounded-full bg-black px-3 py-1 text-xs font-bold uppercase text-white shadow-[0_2px_0_#111]">
              {userRole}
            </div>
          </header>

          {tab === "overview" && (
            <section className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard label="Users" value={stats.usersTotal} helper={`${stats.admins} admins`} />
                <StatCard label="Pro Users" value={stats.pros} helper="Plan: PRO" />
                <StatCard label="Templates" value={stats.templatesTotal} helper={`${stats.templatesActive} active`} />
                <StatCard label="LLM Keys" value={stats.apiKeysTotal} helper={`${stats.apiKeysActive} active`} />
                <StatCard label="Initial Responses" value={stats.initialResponses} helper="Total generated" />
                <StatCard label="Follow-up Responses" value={stats.followupResponses} helper="Total refinements" />
                <StatCard label="Images/Mockups" value={stats.imagesGenerated} helper="Total generated" />
                <StatCard label="Recent Usage" value={stats.recentUsageCount} helper="last 20" />
                <StatCard label="Recent Events" value={stats.recentEventsCount} helper="last 20" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image src="/images/settings.svg" alt="Users" width={18} height={18} className="h-5 w-5" />
                    <h2 className="text-lg font-semibold text-slate-900">Users</h2>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                    <div className="col-span-2">User</div>
                    <div>Role</div>
                    <div>Plan</div>
                    <div>Limit</div>
                    <div>Created</div>
                    <div>Actions</div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {pagedUsers.map((u) => (
                      <div key={u.id} className="grid grid-cols-7 items-center px-4 py-3 text-sm">
                        <div className="col-span-2">
                          <div className="font-semibold text-slate-900">{u.email}</div>
                          <div className="text-[11px] text-slate-500">
                            Stripe: {u.stripeCustomerId ? u.stripeCustomerId : "—"}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">{u.role}</div>
                        <div className="text-xs font-semibold text-slate-700">
                          {u.plan} · {u.planStatus}
                        </div>
                        <div className="text-xs text-slate-700">{u.generationLimit ?? "—"}</div>
                        <div className="text-[12px] text-slate-500">{u.createdAt.toISOString().slice(0, 10)}</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => togglePlan(u.id, u.plan)}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition hover:-translate-y-[1px] hover:shadow ${
                              u.plan === "PRO"
                                ? "border border-slate-300 text-slate-700"
                                : "border border-emerald-300 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            Set {u.plan === "PRO" ? "Free" : "Pro"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id, u.email)}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 transition hover:-translate-y-[1px] hover:shadow"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {pagedUsers.length === 0 && <div className="px-4 py-3 text-sm text-slate-600">No users.</div>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "users" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/settings.svg" alt="Users" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Users & Limits</h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  <div className="col-span-2">User</div>
                  <div>Role</div>
                  <div>Plan</div>
                  <div>Limit</div>
                  <div>Created</div>
                  <div>Actions</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {usersState.map((u) => (
                    <div key={u.id} className="grid grid-cols-7 items-center px-4 py-3 text-sm">
                      <div className="col-span-2">
                        <div className="font-semibold text-slate-900">{u.email}</div>
                        <div className="text-[11px] text-slate-500">
                          Stripe: {u.stripeCustomerId ? u.stripeCustomerId : "—"}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">{u.role}</div>
                      <div className="text-xs font-semibold text-slate-700">
                        {u.plan} · {u.planStatus}
                      </div>
                      <div className="text-xs text-slate-700">{u.generationLimit ?? "—"}</div>
                      <div className="text-[12px] text-slate-500">{u.createdAt.toISOString().slice(0, 10)}</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => togglePlan(u.id, u.plan)}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition hover:-translate-y-[1px] hover:shadow ${
                            u.plan === "PRO"
                              ? "border border-slate-300 text-slate-700"
                              : "border border-emerald-300 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          Set {u.plan === "PRO" ? "Free" : "Pro"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUser(u.id, u.email)}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 transition hover:-translate-y-[1px] hover:shadow"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab === "templates" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/help.svg" alt="Templates" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
              </div>
              <TemplatesAdmin initialTemplates={templates} availableModels={availableModels} categories={categories} />
            </section>
          )}
          {tab === "payments" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/billing.svg" alt="Payments" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
              </div>
              <PaymentsAdmin config={payments} />
            </section>
          )}
          {tab === "feedback" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/help.svg" alt="Feedback & Enquirer" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Feedback & Enquirer</h2>
              </div>
              <SupportAdmin requests={support} />
              <FeedbackAdmin feedback={feedback} />
            </section>
          )}

          {tab === "limits" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/settings.svg" alt="Plan Limits" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Plan Limits</h2>
              </div>
              <PlanLimitForm onStatus={setStatus} />
            </section>
          )}

          {tab === "keys" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/share.svg" alt="LLM Keys" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">LLM API Keys</h2>
              </div>
              <KeysAdmin initialKeys={keys} />
            </section>
          )}

          {tab === "usage" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/share.svg" alt="Usage" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Recent Usage</h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-5 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  <div>User</div>
                  <div>Model</div>
                  <div>Tokens</div>
                  <div>When</div>
                  <div>ID</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {usage.map((u) => (
                    <div key={u.id} className="grid grid-cols-5 items-center px-4 py-3 text-sm">
                      <div className="font-semibold text-slate-900">{u.userEmail}</div>
                      <div className="text-xs text-slate-700">{u.model ?? "—"}</div>
                      <div className="text-xs text-slate-700">
                        {u.tokensIn ?? 0} / {u.tokensOut ?? 0}
                      </div>
                      <div className="text-[12px] text-slate-500">{u.createdAt.toISOString().slice(0, 10)}</div>
                      <div className="text-[11px] text-slate-400 truncate">{u.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab === "events" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/logout.svg" alt="Events" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Recent Events</h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  <div>Type</div>
                  <div>User</div>
                  <div>When</div>
                  <div>ID</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {events.map((e) => (
                    <div key={e.id} className="grid grid-cols-4 items-center px-4 py-3 text-sm">
                      <div className="font-semibold text-slate-900">{e.type}</div>
                      <div className="text-xs text-slate-700">{e.userEmail ?? "—"}</div>
                      <div className="text-[12px] text-slate-500">{e.createdAt.toISOString().slice(0, 10)}</div>
                      <div className="text-[11px] text-slate-400 truncate">{e.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {helper && <div className="text-xs text-slate-600 mt-1">{helper}</div>}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-xs text-slate-600">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function PlanLimitForm({ onStatus }: { onStatus: (msg: string | null) => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    onStatus(null);
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      onStatus("Please enter a non-negative number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/limits/free", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimit: parsed })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        onStatus(json?.error || "Failed to update plan limit.");
        return;
      }
      onStatus(`Free plan daily limit set to ${json.dailyLimit}.`);
      setValue("");
    } catch {
      onStatus("Failed to update plan limit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <label className="block text-sm font-semibold text-slate-800 space-y-1">
        <span>Free plan daily limit</span>
        <input
          type="number"
          min="0"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 5"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save Limit"}
      </button>
    </form>
  );
}

