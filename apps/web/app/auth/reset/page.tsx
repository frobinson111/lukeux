"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { EyeIcon, EyeOffIcon } from "../../components/icons";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const hasTokenFromUrl = !!initialToken;

  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-black text-slate-900">SET A NEW PASSWORD</h1>
        <p className="text-sm text-slate-600">
          {hasTokenFromUrl
            ? "Choose a new password for your account."
            : "Paste your reset token and choose a new password."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {!hasTokenFromUrl && (
          <label className="block text-xs font-semibold uppercase text-slate-700">
            <span className="block">Reset token</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              name="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              aria-required="true"
            />
          </label>
        )}

        <label className="block text-xs font-semibold uppercase text-slate-700">
          <span className="block">New password</span>
          <div className="mt-1 relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              required
              aria-required="true"
              minLength={12}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">At least 12 chars, upper/lower/number/symbol.</p>
        </label>

        <label className="block text-xs font-semibold uppercase text-slate-700">
          <span className="block">Confirm password</span>
          <div className="mt-1 relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              type={showPasswordConfirm ? "text" : "password"}
              name="passwordConfirmation"
              autoComplete="new-password"
              required
              aria-required="true"
              minLength={12}
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-slate-600"
              aria-label={showPasswordConfirm ? "Hide password confirmation" : "Show password confirmation"}
              aria-pressed={showPasswordConfirm}
            >
              {showPasswordConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
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
          className="w-full rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-4 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        Back to{" "}
        <Link className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-black hover:underline" href="/auth/login">
          sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
