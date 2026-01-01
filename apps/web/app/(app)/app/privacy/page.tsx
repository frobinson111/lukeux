import Link from "next/link";

const sections = [
  {
    title: "How we protect your data",
    bullets: [
      "Encryption in transit (TLS) for all app traffic.",
      "Principle of least privilege for data and infrastructure access.",
      "Access logging and audit trails for administrative actions."
    ]
  },
  {
    title: "How we use your data",
    bullets: [
      "To deliver requested UX task generation and related platform features.",
      "To improve reliability, performance, and user experience based on aggregated usage patterns.",
      "To communicate about service updates, security notifications, and billing (where applicable)."
    ]
  },
  {
    title: "Data retention",
    bullets: [
      "We retain account and usage data only as long as necessary for service delivery, legal, or compliance needs.",
      "You may request deletion of your account; associated sessions are revoked, and data scheduled for removal unless retention is required by law."
    ]
  },
  {
    title: "Your controls & choices",
    bullets: [
      "Update your profile information in Settings.",
      "Change your password and manage active sessions from Settings → Security.",
      "Delete your account from Settings → Account (destructive)."
    ]
  },
  {
    title: "Contact",
    bullets: [
      "For privacy requests or questions, contact support. Include the email associated with your account."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/app" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          ← Back to app
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Privacy</h1>
        <p className="text-sm text-slate-600">How Luke UX handles and protects your data.</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}


