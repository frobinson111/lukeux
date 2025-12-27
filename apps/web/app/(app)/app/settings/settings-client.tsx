"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

type SessionRow = {
  id: string;
  createdAt: string | Date;
  expiresAt: string | Date;
  revokedAt: string | Date | null;
};

type User = {
  firstName: string;
  lastName: string;
  email: string;
  workDescription: string | null;
  plan: string;
  planStatus: string;
};

export default function SettingsClient({ user, sessions }: { user: User; sessions: SessionRow[] }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [workDescription, setWorkDescription] = useState(user.workDescription ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sessionsState, setSessionsState] = useState(sessions);
  const [isPending, startTransition] = useTransition();

  const fmtDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const iso = typeof d === "string" ? d : d.toISOString();
    return iso.replace("T", " ").slice(0, 19);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/app" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          ← Back to app
        </Link>
      </div>

      {status && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status}</div>}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>First name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Last name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>What best describes your work?</span>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            rows={3}
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setStatus(null);
              startTransition(async () => {
                try {
                  const res = await fetch("/api/settings/account", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      firstName: firstName.trim(),
                      lastName: lastName.trim(),
                      workDescription: workDescription.trim()
                    })
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok) {
                    setStatus(json?.error || "Failed to update account.");
                    return;
                  }
                  setStatus("Account updated.");
                } catch {
                  setStatus("Failed to update account.");
                }
              });
            }}
            className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirm("Delete your account? This cannot be undone.")) return;
              setStatus(null);
              startTransition(async () => {
                try {
                  const res = await fetch("/api/settings/account", { method: "DELETE" });
                  const json = await res.json().catch(() => null);
                  if (!res.ok) {
                    setStatus(json?.error || "Failed to delete account.");
                    return;
                  }
                  window.location.href = "/";
                } catch {
                  setStatus("Failed to delete account.");
                }
              });
            }}
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase text-rose-700 shadow-[0_3px_0_#b91c1c] transition hover:-translate-y-[1px] hover:shadow-[0_4px_0_#b91c1c] disabled:opacity-60"
          >
            Delete Account
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Security</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Current password</span>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 col-span-2">
            <span>New password</span>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 12 chars, mixed case, number, symbol"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setStatus(null);
              startTransition(async () => {
                try {
                  const res = await fetch("/api/settings/security/password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      currentPassword: currentPassword,
                      newPassword: newPassword
                    })
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok) {
                    setStatus(json?.error || "Failed to change password.");
                    return;
                  }
                  setCurrentPassword("");
                  setNewPassword("");
                  setStatus("Password updated. All sessions cleared.");
                } catch {
                  setStatus("Failed to change password.");
                }
              });
            }}
            className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Change Password"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setStatus(null);
              startTransition(async () => {
                try {
                  const res = await fetch("/api/settings/security/logout-all", { method: "POST" });
                  const json = await res.json().catch(() => null);
                  if (!res.ok) {
                    setStatus(json?.error || "Failed to log out sessions.");
                    return;
                  }
                  setSessionsState([]);
                  setStatus("All sessions cleared.");
                } catch {
                  setStatus("Failed to log out sessions.");
                }
              });
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold uppercase text-slate-700 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
          >
            Log out of all devices
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-800">Active sessions</div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-4 bg-slate-50 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
              <div>ID</div>
              <div>Created</div>
              <div>Expires</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-slate-200">
              {sessionsState.length === 0 && <div className="px-3 py-3 text-sm text-slate-600">No active sessions.</div>}
              {sessionsState.map((s) => (
                <div key={s.id} className="grid grid-cols-4 items-center px-3 py-3 text-sm">
                  <div className="text-[11px] text-slate-600 truncate">{s.id}</div>
                  <div className="text-[11px] text-slate-700">{fmtDate(s.createdAt)}</div>
                  <div className="text-[11px] text-slate-700">{fmtDate(s.expiresAt)}</div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setStatus(null);
                        startTransition(async () => {
                          try {
                            const res = await fetch(`/api/settings/security/sessions/${s.id}`, { method: "DELETE" });
                            const json = await res.json().catch(() => null);
                            if (!res.ok) {
                              setStatus(json?.error || "Failed to revoke session.");
                              return;
                            }
                            setSessionsState((prev) => prev.filter((x) => x.id !== s.id));
                            setStatus("Session revoked.");
                          } catch {
                            setStatus("Failed to revoke session.");
                          }
                        });
                      }}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Billing</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase text-slate-500">Plan</div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
              {user.plan} · {user.planStatus}
            </div>
          </div>
          <div className="space-y-1 flex items-end justify-end">
            {user.plan === "FREE" && user.planStatus === "ACTIVE" && (
              <form action="/api/billing/checkout" method="post">
                <button
                  type="submit"
                  className="rounded-full bg-[var(--brand-yellow,#ffd526)] px-4 py-2 text-xs font-bold uppercase text-black shadow-[0_3px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_4px_0_#111]"
                >
                  Upgrade
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

