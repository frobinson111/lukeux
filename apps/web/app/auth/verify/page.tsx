"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export default function VerifyPage() {
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

    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Verification failed");
      setLoading(false);
      return;
    }

    setSuccess("Email verified. You can sign in now.");
    setTimeout(() => router.push("/auth/login"), 1200);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Verify email</h1>
        <p className="text-sm text-slate-600">Paste the verification token you received.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Verification token</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            aria-required="true"
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
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Already verified?{" "}
        <Link className="font-semibold text-primary-700 underline-offset-4 hover:underline" href="/auth/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
