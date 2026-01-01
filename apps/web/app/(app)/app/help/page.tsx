import Link from "next/link";
import { requireUser } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import SupportForm from "./support-form";

const faqs = [
  {
    q: "What is Luke UX?",
    a: "Luke UX is a desktop UX copilot that helps you generate UX tasks, guidance, and outputs with LLM-driven templates."
  },
  {
    q: "How do I add or manage templates?",
    a: "Admins can add and manage templates in the Admin → Templates tab. Templates are loaded dynamically and can be restricted to certain models and modes."
  },
  {
    q: "How are LLM API keys managed?",
    a: "Admins can manage LLM API keys in Admin → LLM API Keys. Active keys are used to determine available models for templates."
  },
  {
    q: "How do I upgrade to Pro?",
    a: "Go to Settings → Billing or use the Upgrade button in the header when on the Free plan. It redirects to Stripe checkout."
  },
  {
    q: "Can I change my password?",
    a: "Yes, go to Settings → Security to change your password. Current password is required; sessions are cleared except the current session."
  },
  {
    q: "How do I log out of other devices?",
    a: "Settings → Security provides a log-out-all-devices action that clears other sessions while keeping your current session active."
  },
  {
    q: "Where do I see active sessions?",
    a: "Settings → Security shows an active sessions list, and you can revoke individual sessions."
  },
  {
    q: "How does Luke UX handle my data?",
    a: "See the Privacy page for how we protect, use, and retain data, and your controls."
  },
  {
    q: "How do I contact support?",
    a: "Use the support form below to send us your question. We’ll review and respond as soon as possible."
  },
  {
    q: "How do I delete my account?",
    a: "Settings → Account has a Delete Account option (destructive). This removes your account and sessions."
  }
];

export default async function HelpPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/app" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          ← Back to app
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Help</h1>
        <p className="text-sm text-slate-600">FAQs and a quick way to reach support.</p>
      </div>

      <div className="space-y-6">
        {faqs.map((item) => (
          <section key={item.q} className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">{item.q}</h2>
            <p className="text-sm text-slate-700">{item.a}</p>
          </section>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Contact Support</h2>
        <SupportForm />
      </div>
    </div>
  );
}


