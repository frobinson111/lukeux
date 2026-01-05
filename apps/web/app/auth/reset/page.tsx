export const dynamic = "force-dynamic";
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export default function ResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      token: token.trim(),
      password: String(formData.get("password") || ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") || "")
    };

    const res = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Reset failed");
      setLoading(false);
      return;
    }

    setSuccess("Password reset. You can sign in now.");
    setTimeout(() => router.push("/auth/login"), 1200);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
        <p className="text-sm text-slate-600">Paste your reset token and choose a new password.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Reset token</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            aria-required="true"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">New password</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            aria-required="true"
            minLength={12}
          />
          <p className="text-xs text-slate-500">At least 12 chars, upper/lower/number/symbol.</p>
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Confirm password</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            type="password"
            name="passwordConfirmation"
            autoComplete="new-password"
            required
            aria-required="true"
            minLength={12}
          />
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Back to {" "}
        <Link className="font-semibold text-primary-700 underline-offset-4 hover:underline" href="/auth/login">
          sign in
        </Link>
      </p>
    </div>
  );
}
