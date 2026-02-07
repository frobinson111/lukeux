"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { EyeIcon, EyeOffIcon } from "../../components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || "")
    };

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Unable to sign in");
      setLoading(false);
      return;
    }

    router.push("/app");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-black text-slate-900">SIGN IN</h1>
        <p className="text-sm text-slate-600">Your second brain for UX decisions.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-xs font-semibold uppercase text-slate-700">
          <span className="block">Email address</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
          />
        </label>

        <label className="block text-xs font-semibold uppercase text-slate-700">
          <span className="block">Password</span>
          <div className="mt-1 relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              aria-required="true"
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
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-4 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <Link className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-black hover:underline" href="/auth/register">
          Create account
        </Link>
        <Link className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-black hover:underline" href="/auth/forgot">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
