"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

function OtpVerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submitOtp = useCallback(async (code: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code, email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Verification failed");
        setLoading(false);
        // Clear digits on failure so user can re-enter
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setSuccess("Email verified. You can sign in now.");
      setTimeout(() => router.push("/?verified=true"), 1200);
    } catch {
      setError("Verification failed");
      setLoading(false);
    }
  }, [email, router]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-advance to next field
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const code = newDigits.join("");
      if (code.length === 6) {
        submitOtp(code);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focus the next empty field or the last field
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if all 6 digits are filled
    if (newDigits.every((d) => d)) {
      submitOtp(newDigits.join(""));
    }
  }

  async function resendCode() {
    if (resendCooldown > 0) return;
    setResendStatus(null);
    setError(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to resend code");
        return;
      }

      setResendStatus("New code sent to your email");
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Failed to resend code");
    }
  }

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Enter verification code</h1>
        <p className="text-sm text-slate-600">
          We sent a 6-digit code to <span className="font-medium text-slate-900">{email}</span>
        </p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            className="w-12 h-14 text-center text-2xl font-bold rounded-lg border border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-50"
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={loading}
            autoComplete="one-time-code"
          />
        ))}
      </div>

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
      {resendStatus && !error && !success && (
        <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {resendStatus}
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-slate-500">Verifying...</div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={resendCode}
          disabled={resendCooldown > 0 || loading}
          className="text-sm font-semibold text-primary-700 underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : "Resend code"}
        </button>
      </div>

      <p className="text-sm text-slate-600 text-center">
        <Link className="font-semibold text-primary-700 underline-offset-4 hover:underline" href="/auth/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function TokenVerifyForm() {
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
    setTimeout(() => router.push("/?verified=true"), 1200);
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

function VerifyRouter() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "token";
  const email = searchParams.get("email") || "";

  if (mode === "otp" && email) {
    return <OtpVerifyForm email={email} />;
  }

  return <TokenVerifyForm />;
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyRouter />
    </Suspense>
  );
}
