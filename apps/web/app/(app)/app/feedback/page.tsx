import Link from "next/link";
import { requireUser } from "../../../../lib/auth";
import FeedbackClientComponent from "./feedback-client";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await requireUser();
  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-700">You must be signed in to submit feedback.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/app" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          ← Back to app
        </Link>
      </div>
      <h1 className="text-xl font-bold text-slate-900">Feedback &amp; Requests</h1>
      <FeedbackClientComponent />
    </div>
  );
}

