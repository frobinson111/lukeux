"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const shouldShowResend =
    !!email.trim() &&
    (needsVerification ||
      lastStatus === 403 ||
      !!error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setNeedsVerification(false);
    setResendMsg(null);
    setResendError(null);

    const payload = {
      email: email.trim(),
      password
    };

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    setLastStatus(res.status);
    if (!res.ok) {
      const msg = data.error || "Unable to sign in";
      setError(msg);
      setNeedsVerification(res.status === 403 || msg.toLowerCase().includes("verify"));
      setLoading(false);
      return;
    }

    router.push("/app");
  }

  async function handleResend() {
    setResendMsg(null);
    setResendError(null);
    if (!email.trim()) {
      setResendError("Enter your email above first.");
      return;
    }
    setResendLoading(true);

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResendError(data.error || "Could not resend verification email");
      setResendLoading(false);
      return;
    }

    setResendMsg(data.message || "If the account is unverified, we sent a verification email.");
    setResendLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-600">Email verification required before first login.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Email</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Password</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            aria-required="true"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {shouldShowResend && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <div>This email isn&apos;t verified yet. Resend the verification email.</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </button>
              {resendMsg && <span className="text-xs text-amber-700">{resendMsg}</span>}
              {resendError && <span className="text-xs text-red-700">{resendError}</span>}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <Link className="font-semibold text-primary-700 underline-offset-4 hover:underline" href="/auth/register">
          Create account
        </Link>
        <Link className="font-semibold text-primary-700 underline-offset-4 hover:underline" href="/auth/forgot">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
