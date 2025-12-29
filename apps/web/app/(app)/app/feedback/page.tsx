import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "../../../../lib/auth";

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
    <div className="mx-auto max-w-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Feedback &amp; Requests</h1>
        <Link href="/app" className="text-sm text-slate-600 hover:text-slate-900 underline">
          Back to app
        </Link>
      </div>
      <FeedbackClient />
    </div>
  );
}

function FeedbackClient() {
  const types = [
    { key: "LIKE", label: "😊 I like something" },
    { key: "DISLIKE", label: "🙁 I don't like something" },
    { key: "SUGGESTION", label: "💡 I have a suggestion" }
  ];

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        "use server";
        const type = formData.get("type") as string;
        const message = (formData.get("message") as string) || "";
        const host = headers().get("host");
        const protocol = host && host.startsWith("localhost") ? "http" : "https";
        const base = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || "";
        if (!base) {
          throw new Error("Missing host to submit feedback");
        }
        await fetch(`${base}/api/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, message, source: "page" })
        });
      }}
    >
      <div className="grid gap-2">
        {types.map((t) => (
          <label key={t.key} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm">
            <input type="radio" name="type" value={t.key} defaultChecked={t.key === "LIKE"} className="h-4 w-4" />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-600">Comments or Questions</label>
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={1000}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          rows={4}
          placeholder='Can you add the following UX task…'
        />
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/app"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_5px_0_#111]"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

