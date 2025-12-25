"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
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
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") || "")
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Registration failed");
    } else {
      const message = data.verificationToken
        ? `Registered. Verify your email. Dev token: ${data.verificationToken}`
        : "Registered. Check your email for verification.";
      setSuccess(message);
      setTimeout(() => router.push("/auth/login"), 1200);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="text-sm text-slate-600">
          Desktop-only access. Email verification required before first login.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <label className="flex-1 space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">First name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              name="firstName"
              autoComplete="given-name"
              required
              aria-required="true"
            />
          </label>
          <label className="flex-1 space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Last name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              name="lastName"
              autoComplete="family-name"
              required
              aria-required="true"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Email</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Password</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            aria-required="true"
            minLength={12}
          />
          <p className="text-xs text-slate-500">
            At least 12 chars, with upper, lower, number, and symbol.
          </p>
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
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-semibold text-primary-700 underline-offset-4 hover:underline" href="/auth/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
