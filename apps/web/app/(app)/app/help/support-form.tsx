"use client";

import { useState } from "react";

export default function SupportForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [variant, setVariant] = useState<"success" | "error" | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const data = new FormData(form);
        const payload = {
          firstName: (data.get("firstName") as string) || "",
          lastName: (data.get("lastName") as string) || "",
          email: (data.get("email") as string) || "",
          message: (data.get("message") as string) || ""
        };
        setStatus(null);
        setVariant(null);
        const res = await fetch("/api/help/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(() => null);
        if (res.ok) {
          setStatus("Sent. We’ll get back to you soon.");
          setVariant("success");
          form.reset();
        } else {
          setStatus(json?.error || "Failed to send support request.");
          setVariant("error");
        }
      }}
    >
      {status && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
          aria-live="polite"
        >
          {status}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>First name</span>
          <input
            name="firstName"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Last name</span>
          <input
            name="lastName"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </label>
      </div>
      <label className="space-y-1 text-sm font-semibold text-slate-700">
        <span>Email</span>
        <input
          type="email"
          name="email"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
        />
      </label>
      <label className="space-y-1 text-sm font-semibold text-slate-700">
        <span>Support question</span>
        <textarea
          name="message"
          required
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
        />
      </label>
      <div>
        <button
          type="submit"
          className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111]"
        >
          Send
        </button>
      </div>
    </form>
  );
}


