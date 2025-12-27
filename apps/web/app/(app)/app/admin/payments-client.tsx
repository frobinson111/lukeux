"use client";

import { useState, useTransition } from "react";

type PaymentConfigRow = {
  pricePro: string | null;
  mode: "live" | "test" | "unknown";
  secretMasked: string;
  webhookMasked: string;
};

export default function PaymentsAdmin({ config }: { config: PaymentConfigRow }) {
  const [pricePro, setPricePro] = useState(config.pricePro ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {status && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status}</div>}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-slate-500">Stripe Mode</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
            {config.mode === "live" ? "Live" : config.mode === "test" ? "Test" : "Unknown"}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-slate-500">STRIPE_SECRET_KEY (masked)</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">{config.secretMasked || "Not set"}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-slate-500">STRIPE_WEBHOOK_SECRET (masked)</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">{config.webhookMasked || "Not set"}</div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase text-slate-500">STRIPE_PRICE_PRO</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            value={pricePro}
            onChange={(e) => setPricePro(e.target.value)}
            placeholder="price_..."
          />
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="text-xs font-semibold uppercase text-slate-500">Integration checklist</div>
        <ul className="list-disc space-y-1 pl-5 text-slate-700">
          <li>Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the server env.</li>
          <li>Set STRIPE_PRICE_PRO to your Pro subscription price id.</li>
          <li>
            Configure Stripe webhook to: <code className="rounded bg-slate-100 px-1">/api/webhooks/stripe</code> with events:{" "}
            <code className="rounded bg-slate-100 px-1">checkout.session.completed</code>,{" "}
            <code className="rounded bg-slate-100 px-1">invoice.payment_succeeded</code>,{" "}
            <code className="rounded bg-slate-100 px-1">customer.subscription.updated</code>.
          </li>
          <li>Use test keys in test mode; switch to live keys and live price id before launch.</li>
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setStatus(null);
            startTransition(async () => {
              try {
                const res = await fetch("/api/admin/payments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pricePro: pricePro.trim() || undefined })
                });
                const json = await res.json().catch(() => null);
                if (!res.ok) {
                  setStatus(json?.error || "Failed to update payments config.");
                  return;
                }
                setStatus("Payments config updated.");
              } catch {
                setStatus("Failed to update payments config.");
              }
            });
          }}
          className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}


