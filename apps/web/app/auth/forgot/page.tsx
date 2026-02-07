"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();

    const res = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Request failed");
    } else {
      const msg = data.devPreview
        ? `Reset email sent. Dev link: ${data.devPreview}`
        : "If that email exists, a password reset link has been sent. Check your inbox.";
      setMessage(msg);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-black text-slate-900">RESET PASSWORD</h1>
        <p className="text-sm text-slate-600">We will send a reset link if the email exists.</p>
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

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-4 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        Remembered it?{" "}
        <Link className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-black hover:underline" href="/auth/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
