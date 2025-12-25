"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const brand = {
  blue: "#0c3c80",
  red: "#d63b3b",
  yellow: "#ffd526",
  black: "#111"
};

type Mode = "login" | "signup";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  passwordConfirmation: ""
};

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="m3 3 18 18" />
    <path d="M10.6 10.6a3 3 0 0 0 3.8 3.8" />
    <path d="M9.9 3.6A10.1 10.1 0 0 1 12 3c7 0 11 7 11 7a16.9 16.9 0 0 1-2.1 2.9" />
    <path d="M6.6 6.6A16.9 16.9 0 0 0 1 10s4 7 11 7a10.4 10.4 0 0 0 5.4-1.6" />
  </svg>
);

type PanelKey = "about" | "features" | "pricing" | "faq" | "contact" | "terms" | "privacy";

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [panelMaxHeight, setPanelMaxHeight] = useState<string>("70vh");
  const [panelLeft, setPanelLeft] = useState<string>("0px");
  const [panelRight, setPanelRight] = useState<string>("0px");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const columnRef = useRef<HTMLDivElement | null>(null);

  const heading = useMemo(
    () => (mode === "login" ? "Log in" : "Create your account"),
    [mode]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const payload = mode === "login"
        ? { email: form.email.trim(), password: form.password }
        : {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            password: form.password,
            passwordConfirmation: form.passwordConfirmation
          };

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (mode === "login") {
        window.location.href = "/app";
        return;
      }

      setMessage(
        data.devPreview
          ? `Check your email to verify. Dev preview link: ${data.devPreview}`
          : "Check your email to verify your account."
      );
      setForm(initialState);
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // Compute max height for bottom sheet so it stops below the logo
  useEffect(() => {
    function compute() {
      if (!logoRef.current || !columnRef.current) return;
      const logoRect = logoRef.current.getBoundingClientRect();
      const colRect = columnRef.current.getBoundingClientRect();
      const offset = logoRect.bottom - colRect.top + 20; // 20px below logo inside column
      const colHeight = colRect.height;
      const maxH = Math.max(200, colHeight - offset);
      setPanelMaxHeight(`${maxH}px`);
      const targetWidth = Math.max(320, colRect.width * 0.9);
      const leftPos = colRect.left + (colRect.width - targetWidth) / 2;
      const rightPos = Math.max(0, window.innerWidth - (leftPos + targetWidth));
      setPanelLeft(`${leftPos}px`);
      setPanelRight(`${rightPos}px`);
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Lock body scroll when panel open
  useEffect(() => {
    if (activePanel) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [activePanel]);

  const sections: Record<PanelKey, { title: string; body: string }> = {
    about: {
      title: "About",
      body: "Luke UX is a desktop-first UX copilot built to sharpen thinking and reduce blind spots without diluting craft."
    },
    features: {
      title: "Features",
      body: "Task generation, iteration, history management, project folders, and LLM provider selection with guardrails."
    },
    pricing: {
      title: "Pricing",
      body: "Free plan includes 2 generations. Pro offers unlimited generations and full LLM access."
    },
    faq: {
      title: "FAQ",
      body: "Common questions about accounts, billing, limits, and supported models."
    },
    contact: {
      title: "Contact",
      body: "Reach us for support, feedback, or enterprise inquiries."
    },
    terms: {
      title: "Terms of Use",
      body: "Terms governing usage of Luke UX. Content placeholder until finalized."
    },
    privacy: {
      title: "Privacy",
      body: "How we handle data and privacy. Content placeholder until finalized."
    }
  };

  const openPanel = (key: PanelKey) => {
    setActivePanel((prev) => (prev === key ? null : key));
  };

  const closePanel = () => setActivePanel(null);

  const panelContent = activePanel ? sections[activePanel] : null;

  return (
    <>
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="relative flex flex-col justify-between bg-white px-8 py-10 lg:px-14" ref={columnRef}>
          <div className="space-y-6">
            <div className="flex items-center" ref={logoRef}>
              <Image src="/images/lukeux-logo.svg" alt="Luke UX" width={200} height={48} className="h-12 w-auto" priority />
            </div>
            <p className="max-w-xl text-lg leading-relaxed text-slate-800">
              Luke UX helps experienced designers think sharper, move faster, and catch blind spots without diluting the craft.
            </p>
            <div className="relative mt-8 flex justify-center">
              <div className="relative h-96 w-80">
                <Image
                  src="/images/luke-main.png"
                  alt="Luke UX superhero dog illustration"
                  fill
                  sizes="320px"
                  className="object-contain drop-shadow-lg"
                  priority
                />
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <p className="italic">
                “AI won’t make your designs better by itself. It will make your thinking sharper, your blind spots louder, and your standards harder to ignore.”
              </p>
              <p className="text-xs text-slate-600">— Frank Robinson III, Creator</p>
            </div>
          </div>
          <div className="hidden flex-wrap items-center gap-3 text-xs text-slate-600 lg:flex">
            {[
              { key: "about", label: "About" },
              { key: "features", label: "Features" },
              { key: "pricing", label: "Pricing" },
              { key: "faq", label: "FAQ" },
              { key: "contact", label: "Contact" },
              { key: "terms", label: "Terms of Use" },
              { key: "privacy", label: "Privacy" }
            ].map((item, idx, arr) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openPanel(item.key as PanelKey)}
                className="underline-offset-4 hover:underline"
              >
                {item.label}
                {idx < arr.length - 1 ? <span className="mx-2 text-slate-400">•</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-center bg-[#f3f4f6] px-6 pt-8 pb-12 lg:pt-10">
          <div className="w-full max-w-lg rounded-[26px] px-8 pb-10 pt-0 min-h-[520px]">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black text-slate-900">WELCOME TO LUKE UX</h1>
              <p className="text-sm text-slate-600">Your second brain for UX decisions.</p>
            </div>

            <div className="mt-6 flex overflow-hidden rounded-full border-[3px] border-black shadow-[0_5px_0_#0a0a0a] bg-[#f7f7f7]">
              {(
                [
                  { key: "login", label: "Log in" },
                  { key: "signup", label: "Free sign up" }
                ] as const
              ).map((tab) => {
                const active = mode === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setMode(tab.key)}
                    className={`flex-1 rounded-none px-3 py-2.5 text-sm font-black uppercase tracking-wide transition ${
                      active
                        ? "bg-[#ffd100] text-black"
                        : "bg-[#f7f7f7] text-black"
                    } ${tab.key === "signup" ? "border-l-[3px] border-black" : ""}`}
                    aria-pressed={active}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <form
              className="mt-6 space-y-4"
              style={mode === "login" ? { marginTop: "-2.5rem" } : undefined}
              onSubmit={handleSubmit}
            >
              {mode === "signup" ? (
                <div className="flex flex-col gap-3 sm:flex-row min-h-[88px]">
                  <label className="flex-1 text-xs font-semibold uppercase text-slate-700">
                    <span className="block">First name</span>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      required
                      aria-required="true"
                    />
                  </label>
                  <label className="flex-1 text-xs font-semibold uppercase text-slate-700">
                    <span className="block">Last name</span>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      required
                      aria-required="true"
                    />
                  </label>
                </div>
              ) : (
                <div className="min-h-[64px]" aria-hidden="true" />
              )}

              <label className="block text-xs font-semibold uppercase text-slate-700">
                <span className="block">Email address</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                  required
                  aria-required="true"
                  autoComplete={mode === "login" ? "email" : "new-email"}
                />
              </label>

              <label className="block text-xs font-semibold uppercase text-slate-700">
                <span className="block">Password</span>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                    required
                    aria-required="true"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
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
              </label>

              {mode === "signup" && (
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  <span className="block">Confirm password</span>
                  <div className="mt-1 relative">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      name="passwordConfirmation"
                      value={form.passwordConfirmation}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, passwordConfirmation: e.target.value }))
                      }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
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
              )}

              <div className="flex items-center gap-4 text-xs font-semibold uppercase text-slate-600">
                <span className="flex-1 border-t border-slate-300" aria-hidden="true" />
                <span>or</span>
                <span className="flex-1 border-t border-slate-300" aria-hidden="true" />
              </div>

              <button
                type="button"
                disabled
                className="w-full rounded-[12px] border border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 opacity-60"
                aria-disabled="true"
              >
                Continue with Google (coming soon)
              </button>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </div>
              )}
              {message && (
                <div
                  role="status"
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-4 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Working..." : heading}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-600">
              <p>
                Need help?{" "}
                <Link href="#" className="font-semibold underline" aria-disabled="true">
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    {panelContent && (
      <div
        className="fixed bottom-0 z-30"
        style={{ left: panelLeft, right: panelRight, maxHeight: panelMaxHeight }}
      >
        <div
          className="w-full rounded-[18px] border border-slate-200 bg-white shadow-2xl"
          style={{
            maxHeight: panelMaxHeight,
            minHeight: "820px",
            overflow: "hidden",
            transform: "translateY(0)",
            transition: "transform 200ms ease-in-out"
          }}
          role="dialog"
          aria-modal="true"
          aria-label={panelContent?.title}
        >
          <div
            className="relative px-6 py-5"
            style={{ maxHeight: panelMaxHeight, overflowY: "auto", paddingTop: 16, paddingBottom: 16 }}
          >
            <button
              type="button"
              onClick={closePanel}
              className="absolute right-4 top-4 text-lg font-bold text-slate-700 hover:text-slate-900"
              aria-label="Close panel"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-slate-900">{panelContent?.title}</h2>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">{panelContent?.body}</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
