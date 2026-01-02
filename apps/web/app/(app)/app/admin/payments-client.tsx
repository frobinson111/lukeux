"use client";

import type { PaymentConfigRow } from "./page";

export default function PaymentsAdmin({ config }: { config: PaymentConfigRow }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-800">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="font-semibold text-slate-900">Stripe Configuration</span>
        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">Mode: {config.mode}</span>
      </div>
      <div className="space-y-2 text-slate-700">
        <div>
          <span className="font-semibold text-slate-900">Price ID: </span>
          <span>{config.pricePro ?? "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-900">Secret: </span>
          <span>{config.secretMasked || "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-900">Webhook: </span>
          <span>{config.webhookMasked || "—"}</span>
        </div>
      </div>
    </div>
  );
}

