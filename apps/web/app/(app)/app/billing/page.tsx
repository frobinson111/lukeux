import { requireUser } from "../../../../lib/auth";

export default async function BillingPage() {
  const user = await requireUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">Unauthorized</h1>
        <p className="text-sm text-slate-600">Please sign in to manage billing.</p>
      </div>
    );
  }

  const hasCustomer = Boolean(user.stripeCustomerId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-600 mt-2">
          Current plan: {user.plan} ({user.planStatus?.toLowerCase?.()})
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-200">
        <div className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Upgrade to Pro</h2>
          <p className="text-xs text-slate-600">
            Starts a Stripe checkout session. Use Stripe test mode cards (e.g. 4242 4242 4242 4242).
          </p>
          <form action="/api/billing/checkout" method="post">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-[var(--brand-yellow,#ffd526)] px-4 py-2 text-sm font-bold uppercase text-black shadow-[0_2px_0_#111] transition hover:-translate-y-[1px]"
            >
              Start Checkout
            </button>
          </form>
        </div>

        <div className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Manage Billing</h2>
          <p className="text-xs text-slate-600">
            Opens the Stripe customer portal. Requires a subscription/customer record.
          </p>
          <form action="/api/billing/portal" method="post">
            <button
              type="submit"
              disabled={!hasCustomer}
              className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold uppercase text-slate-800 transition hover:-translate-y-[1px] disabled:opacity-60"
            >
              Open Portal
            </button>
          </form>
          {!hasCustomer && (
            <p className="text-xs text-amber-700">
              No Stripe customer on file yet. Complete checkout first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


