import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BillingSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 shadow-sm space-y-3">
        <p className="text-sm font-semibold uppercase text-emerald-700">Payment Success</p>
        <h1 className="text-2xl font-bold text-slate-900">Thanks for upgrading to Pro</h1>
        <p className="text-sm text-slate-700">
          Your upgrade is processing. If your plan doesn’t show as Pro immediately, refresh or re-open the app—it may take a
          moment to reflect after Stripe confirms the subscription.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
          <Link
            href="/app/canvas"
            className="rounded-full bg-black px-4 py-2 text-sm font-bold uppercase text-white shadow-[0_3px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_4px_0_#111]"
          >
            Back to app
          </Link>
          <Link
            href="/app/billing"
            className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
          >
            Go to billing
          </Link>
        </div>
      </div>
    </div>
  );
}


