"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import TemplateTaskList from "./components/template-task-list";

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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [contactStatus, setContactStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
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

      // Email verification messaging disabled
      setMessage(null);
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

  const faqItems = [
    { q: "What is Luke UX?", a: "Luke UX is a desktop-first UX copilot designed to sharpen your thinking, surface blind spots, and pressure-test decisions without replacing your judgment. No magic wand. Just rigor." },
    { q: "Is Luke UX meant to replace designers?", a: "No. If you’re looking to be replaced, automation already has you covered. Luke UX exists to make designers harder to ignore, not easier to replace." },
    { q: "Who is Luke UX for?", a: "Senior UX/UI designers, product designers, researchers, and design leads who care about craft and don’t need hand-holding or inspirational quotes." },
    { q: "What problems does Luke UX actually solve?", a: "Cognitive blind spots, shallow reviews, rushed decisions, vague feedback, and that uncomfortable feeling that something’s off but you can’t name it." },
    { q: "How is this different from using a generic AI chat tool?", a: "Luke UX is opinionated, structured, and built specifically around real UX workflows. It doesn’t ramble. It doesn’t flatter. It interrogates." },
    { q: "Does Luke UX generate designs or screens?", a: "No. It critiques, analyzes, challenges, and clarifies. If you want auto-generated UI, there are plenty of tools eager to lower your standards." },
    { q: "What kinds of tasks can I run through Luke UX?", a: "Design reviews, accessibility audits, research synthesis, UX writing critiques, heuristic evaluations, stakeholder prep, and decision validation." },
    { q: "Is Luke UX beginner-friendly?", a: "It will work with juniors, but it won’t coddle them. Luke UX assumes you’re here to improve, not to be told you’re doing great." },
    { q: "Does it follow accessibility standards?", a: "Yes. Luke UX is built to support WCAG 2.1 AA, Section 508, and accessibility-first thinking as a baseline, not a bonus." },
    { q: "Can I customize prompts or frameworks?", a: "Absolutely. Luke UX encourages customization so the feedback reflects your product, constraints, and reality. Templates are a starting point, not a cage." },
    { q: "Is Luke UX desktop-only?", a: "Yes, intentionally. This is deep work software. It’s not optimized for thumbs, distractions, or pretending to work on the couch." },
    { q: "Does Luke UX remember my projects or data?", a: "Your project data stays within your workspace context. No training on your proprietary work. No surprise memory hoarding." },
    { q: "How accurate is the feedback?", a: "As accurate as the inputs you give it. Garbage in still produces garbage out. Luke UX just makes the garbage more obvious." },
    { q: "Will Luke UX tell me my design is bad?", a: "Yes. Politely, clearly, and with receipts. Praise is earned. Vague encouragement is not part of the feature set." },
    { q: "Can Luke UX help with stakeholder communication?", a: "Yes. It’s especially good at translating UX rationale into language executives won’t immediately dismiss." },
    { q: "Is Luke UX opinionated about UX best practices?", a: "Very. Neutrality is how bad patterns survive. Luke UX is built around established UX principles and real-world constraints." },
    { q: "Does Luke UX integrate with Figma or other tools?", a: "Not directly yet. It’s designed to sit alongside your tools and improve the thinking that happens before and after pixels." },
    { q: "How often is Luke UX updated?", a: "Regularly. The goal is to evolve with UX practice, not chase trends or bolt on shiny features no one asked for." },
    { q: "Is this platform suitable for teams?", a: "Yes. Especially teams tired of shallow reviews, inconsistent standards, and “looks good to me” feedback." },
    { q: "What’s the core philosophy behind Luke UX?", a: "AI won’t make your designs better by itself. It will make your thinking sharper, your blind spots louder, and your standards harder to ignore." }
  ];

  const privacyItems = [
    { heading: "Last Updated: [Insert Date]", body: "" },
    {
      heading: "Privacy Policy Overview",
      body:
        "This Privacy Policy explains how Luke UX (“we,” “us,” or “our”) collects, uses, discloses, and protects information when you access or use the Luke UX platform, website, and related services (collectively, the “Platform”).\n\nBy using the Platform, you agree to the collection and use of information as described in this Privacy Policy."
    },
    {
      heading: "1. Information We Collect",
      body:
        "1.1 Information You Provide Directly\n\nWe may collect information you provide when you:\n\n• Create an account\n• Subscribe to a paid plan\n• Submit prompts, content, or feedback\n• Contact support\n\nThis information may include:\n\n• Name\n• Email address\n• Account credentials\n• Payment and billing information\n• Content submitted to the Platform\n\n1.2 Information Collected Automatically\n\nWhen you use the Platform, we may automatically collect:\n\n• IP address\n• Device and browser information\n• Usage data (feature interactions, session duration, task counts)\n• Log files and diagnostic data\n\nThis data helps us operate, secure, and improve the Platform.\n\n1.3 Cookies and Tracking Technologies\n\nWe may use cookies or similar technologies to:\n\n• Maintain session state\n• Authenticate users\n• Analyze usage patterns\n• Improve performance and reliability\n\nYou may disable cookies through your browser settings, but some features may not function properly."
    },
    {
      heading: "2. How We Use Information",
      body:
        "We use collected information to:\n\n• Provide and operate the Platform\n• Authenticate users and manage accounts\n• Process subscriptions and payments\n• Enforce plan limits and usage rules\n• Improve Platform functionality and reliability\n• Respond to inquiries and support requests\n• Comply with legal obligations\n\nWe do not sell your personal information."
    },
    {
      heading: "3. AI Processing and User Content",
      body:
        "3.1 Use of Submitted Content\n\nContent you submit (including prompts, project descriptions, and uploaded materials) is processed solely to provide Platform functionality.\n\nWe do not use your proprietary content to train public or third-party AI models.\n\n3.2 Responsibility for Outputs\n\nAI-generated outputs are produced based on your inputs. You remain responsible for how outputs are used and interpreted."
    },
    {
      heading: "4. Payment Information",
      body:
        "Payment processing is handled by third-party payment providers. We do not store full credit card details on our servers.\n\nPayment providers process your information in accordance with their own privacy policies."
    },
    {
      heading: "5. Data Sharing and Disclosure",
      body:
        "We may share information only in the following circumstances:\n\n• With trusted service providers necessary to operate the Platform\n• To comply with legal obligations or lawful requests\n• To protect the rights, property, or safety of Luke UX or others\n• In connection with a business transaction (merger, acquisition, or sale of assets)\n\nWe do not share personal data for advertising resale purposes."
    },
    {
      heading: "6. Data Retention",
      body:
        "We retain personal information only as long as necessary to:\n\n• Provide the Platform\n• Comply with legal and accounting obligations\n• Resolve disputes and enforce agreements\n\nWhen data is no longer required, it is securely deleted or anonymized."
    },
    {
      heading: "7. Data Security",
      body:
        "We implement reasonable administrative, technical, and organizational safeguards to protect your information.\n\nHowever, no system is completely secure. You acknowledge that data transmission over the internet carries inherent risks."
    },
    {
      heading: "8. Your Rights and Choices",
      body:
        "Depending on your jurisdiction, you may have the right to:\n\n• Access your personal data\n• Correct inaccurate information\n• Request deletion of your data\n• Object to or restrict certain processing\n\nRequests may be subject to legal or operational limitations."
    },
    {
      heading: "9. California Privacy Rights (If Applicable)",
      body:
        "California residents may have additional rights under the California Consumer Privacy Act (CCPA), including the right to request information about data collection and deletion.\n\nLuke UX does not sell personal information."
    }
  ];

  const termsItems = [
    { heading: "Last Updated: 01/01/2026", body: "" },
    {
      heading: "1. Eligibility",
      body: "You must be at least 18 years old to use the Platform. By using the Platform, you represent and warrant that you meet this requirement and have the legal capacity to enter into these Terms."
    },
    {
      heading: "2. Account Registration",
      body:
        "To access certain features, you must create an account. You agree to:\n\n• Provide accurate and complete information\n• Maintain the security of your account credentials\n• Accept responsibility for all activities that occur under your account\n\nYou are responsible for any unauthorized use of your account."
    },
    {
      heading: "3. Platform Purpose and Disclaimer",
      body:
        "Luke UX is a UX design support and analysis platform intended to assist with professional decision-making. The Platform does not provide legal, medical, financial, or compliance advice.\n\nAll outputs are informational only. You remain solely responsible for your design decisions, business actions, and outcomes."
    },
    {
      heading: "4. Subscription Plans",
      body:
        "The Platform offers multiple subscription tiers, including but not limited to:\n\n• Free Plan\n• Pro Plan\n\nFeatures, limits, and pricing are described on the Platform and may change from time to time."
    },
    {
      heading: "5. Free Plan Limitations",
      body:
        "The Free Plan includes limited access to Platform features and usage caps, which may include but are not limited to:\n\n• A daily task generation limit\n• A lifetime task cap\n• Restricted access to advanced tools and workflows\n\nOnce Free Plan limits are reached, access will be restricted unless you upgrade to a paid plan."
    },
    {
      heading: "6. Pro Plan Subscription and Billing",
      body:
        "The Pro Plan is a paid subscription billed on a recurring basis at the rate displayed at the time of purchase.\n\nBy subscribing, you authorize us to charge your payment method on a recurring basis until canceled in accordance with these Terms.\n\nAll fees are non-refundable except as required by law."
    },
    {
      heading: "7. No Downgrades from Pro to Free",
      body:
        "Important Subscription Policy:\n\nOnce you upgrade from the Free Plan to the Pro Plan:\n\n• You may not downgrade from Pro back to the Free Plan\n• You may cancel future renewals of your Pro subscription, but access will continue through the end of the current billing period\n• After cancellation, your account may be restricted, paused, or require reactivation under a paid plan to continue use\n\nThis policy exists to prevent abuse of Platform limits and features."
    },
    {
      heading: "8. Changes to Plans and Pricing",
      body:
        "We reserve the right to modify subscription plans, pricing, features, or limits at any time. Changes will apply prospectively and will not affect active billing periods already paid for."
    },
    {
      heading: "9. Acceptable Use",
      body:
        "You agree not to:\n\n• Use the Platform for unlawful or harmful purposes\n• Attempt to reverse engineer, scrape, or exploit the Platform\n• Interfere with or disrupt Platform infrastructure\n• Misrepresent AI-generated outputs as human-produced work without disclosure where required\n• Use the Platform in a way that violates applicable laws or regulations\n\nWe reserve the right to suspend or terminate access for violations."
    },
    {
      heading: "10. Intellectual Property",
      body:
        "All content, software, prompts, frameworks, branding, and materials provided through the Platform are owned by Luke UX or its licensors and are protected by intellectual property laws.\n\nYou may not copy, distribute, modify, or create derivative works without prior written consent."
    },
    {
      heading: "11. User Content",
      body:
        "You retain ownership of content you submit to the Platform. By submitting content, you grant us a limited, non-exclusive license to process and display that content solely for the purpose of providing the Platform’s services.\n\nWe do not use your proprietary content to train public models."
    },
    {
      heading: "12. Privacy",
      body: "Your use of the Platform is subject to our Privacy Policy, which explains how we collect, use, and protect your information."
    },
    {
      heading: "13. Availability and Modifications",
      body: "We do not guarantee uninterrupted access to the Platform. We may modify, suspend, or discontinue any part of the Platform at any time without liability."
    },
    {
      heading: "14. Termination",
      body:
        "We may suspend or terminate your account at our discretion if you violate these Terms or engage in conduct that harms the Platform, other users, or our business.\n\nUpon termination, your access rights will cease immediately."
    },
    {
      heading: "15. Disclaimer of Warranties",
      body: "The Platform is provided “as is” and “as available.”\nWe make no warranties, express or implied, regarding accuracy, reliability, or suitability for any purpose."
    },
    {
      heading: "16. Limitation of Liability",
      body:
        "To the maximum extent permitted by law, Luke UX shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the Platform.\n\nOur total liability shall not exceed the amount paid by you to us in the twelve (12) months preceding the claim."
    },
    {
      heading: "17. Indemnification",
      body: "You agree to indemnify and hold harmless Luke UX from any claims, damages, or expenses arising from your use of the Platform or violation of these Terms."
    },
    {
      heading: "18. Governing Law",
      body: "These Terms are governed by the laws of the State of [Insert State], without regard to conflict of law principles."
    },
    {
      heading: "19. Changes to These Terms",
      body: "We may update these Terms from time to time. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms."
    },
    {
      heading: "20. Contact Information",
      body: "For questions about these Terms, contact us at:\n[Insert support email address]"
    }
  ];

  const sections: Record<PanelKey, { title: string; body: string }> = {
    about: {
      title: "About",
      body:
        "Luke UX is a desktop-first UX copilot built for designers who take the work seriously. It doesn’t replace judgment or automate taste. It sharpens thinking, exposes blind spots, and pressures decisions until they hold up. AI won’t make your designs better by itself. It will make your thinking clearer, your blind spots louder, and your standards impossible to ignore.\n\nThis is a tool for people who still believe craft matters and are willing to be challenged by it."
    },
    features: {
      title: "Features",
      body:
        "AI Design Copilot for Senior UX\n\nNot a chatbot. Not a tutorial. A thinking partner that challenges assumptions, exposes blind spots, and sharpens decisions in real time.\n\nContext-Aware Prompt Engine\n\nUnderstands where you are in the design lifecycle. Discovery, synthesis, critique, delivery. No generic prompts. No amnesia.\n\nDesign Critique, Not Design Generation\n\nEvaluates reasoning, structure, accessibility, and risk. It critiques your work instead of vomiting UI you didn’t ask for.\n\nBlind Spot Detection\n\nFlags missing user groups, untested assumptions, accessibility risks, and logic gaps before stakeholders do.\n\nAccessibility-First Intelligence\n\nBuilt around WCAG 2.1 AA and Section 508 from the start. Not a bolt-on checklist. Real critique tied to real UI decisions.\n\nResearch Synthesis Assistant\n\nTurns messy interviews, notes, and tickets into defensible insights. Clusters by mental model, not keywords.\n\nDesign Review Scorecards\n\nStructured, repeatable evaluations across usability, accessibility, clarity, and risk. Great for teams. Terrifying for sloppy work.\n\nArtifact-Aware Feedback\n\nResponds differently to wireframes, flows, PRDs, audit notes, and strategy docs. Because those are different things.\n\nEnterprise UX Standards Guardrails\n\nKeeps outputs aligned to design systems, accessibility rules, and organizational constraints without killing creativity.\n\nDecision Traceability\n\nShows why a recommendation exists. No black-box advice. No “trust me bro” AI energy.\n\nDesktop-First, Deep Work Oriented\n\nBuilt for long sessions, complex thinking, and serious output. Not a mobile distraction machine.\n\nZero Beginner Hand-Holding\n\nAssumes you already know UX fundamentals. Respects your experience. Doesn’t explain what a persona is.\n\nPrompt Libraries for Real Work\n\nPrebuilt, high-signal prompts for audits, critiques, synthesis, strategy, and stakeholder prep. Copy. Paste. Think better.\n\nPrivate by Design\n\nNo training on your work. No “thanks for the data” nonsense. Your thinking stays yours.\n\nDesigned for Solo and Team Use\n\nEqually useful for principal designers, ICs, and small teams who actually ship things.\n\nOpinionated, Not Neutral\n\nLuke UX has standards. If something is weak, it says so. Gently, but firmly. Like a senior designer who still cares."
    },
    pricing: {
      title: "Pricing",
      body: ""
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
      body: ""
    },
    privacy: {
      title: "Privacy",
      body: ""
    }
  };

  const openPanel = (key: PanelKey) => {
    setActivePanel((prev) => (prev === key ? null : key));
  };

  const closePanel = () => setActivePanel(null);

  const panelContent = activePanel ? sections[activePanel] : null;
  const panelParagraphs = panelContent?.body ? panelContent.body.split("\n\n") : [];
  const panelNodes: JSX.Element[] = [];
  if (panelParagraphs) {
    const headings = new Set([
      "AI Design Copilot for Senior UX",
      "Context-Aware Prompt Engine",
      "Design Critique, Not Design Generation",
      "Blind Spot Detection",
      "Accessibility-First Intelligence",
      "Research Synthesis Assistant",
      "Design Review Scorecards",
      "Artifact-Aware Feedback",
      "Enterprise UX Standards Guardrails",
      "Decision Traceability",
      "Desktop-First, Deep Work Oriented",
      "Zero Beginner Hand-Holding",
      "Prompt Libraries for Real Work",
      "Private by Design",
      "Designed for Solo and Team Use",
      "Opinionated, Not Neutral"
    ]);
    let prevHeading = false;
    panelParagraphs.forEach((para, idx) => {
      const trimmed = para.trim();
      const isHeading = headings.has(trimmed);
      if (isHeading) {
        panelNodes.push(
          <h3
            key={`h-${idx}`}
            className={`text-sm font-semibold text-slate-900 ${idx === 0 ? "mt-2" : "mt-[10px]"}`}
          >
            {trimmed}
          </h3>
        );
        prevHeading = true;
      } else {
        const marginClass = idx === 0 ? "mt-2" : prevHeading ? "mt-0" : "mt-[10px]";
        panelNodes.push(
          <p
            key={`p-${idx}`}
            className={`text-sm text-slate-700 leading-relaxed whitespace-pre-line ${marginClass}`}
          >
            {para}
          </p>
        );
        prevHeading = false;
      }
    });
  }

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
              Luke UX sharpens thinking, accelerates decisions, and exposes blind spots without diluting the craft.
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
            <TemplateTaskList />
          </div>
          <div className="hidden w-full flex-wrap items-center justify-between gap-4 text-xs text-slate-600 lg:flex mt-[50px]">
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
                onClick={() => (window.location.href = "/api/auth/google/start")}
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center justify-center gap-2">
                  <Image src="/images/google-icon.svg" alt="Google" width={18} height={18} className="h-4 w-4" />
                  <span>Continue with Google</span>
                </span>
              </button>
              <div className="text-[11px] text-slate-600 text-center">
                <Link href="/app/privacy" className="underline hover:text-slate-800">
                  Privacy Policy
                </Link>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
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
            <h2 className="text-xl font-black text-slate-900">{panelContent?.title}</h2>

            {activePanel === "faq" ? (
              <div className="mt-4 space-y-2">
                {faqItems.map((item, idx) => {
                  const open = openFaqIndex === idx;
                  return (
                    <div key={item.q} className="rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(open ? null : idx)}
                        aria-expanded={open}
                        aria-controls={`faq-${idx}`}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        <span>{item.q}</span>
                        <span className="text-slate-500">{open ? "−" : "+"}</span>
                      </button>
                      {open && (
                        <div id={`faq-${idx}`} className="px-4 pb-3 text-sm text-slate-700">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : activePanel === "contact" ? (
              <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contact Us</div>
                <h3 className="text-lg font-semibold text-slate-900">We’d love to hear from you</h3>
                <a href="mailto:info@lukux.ai" className="text-sm font-semibold text-blue-600 hover:underline">
                  info@lukux.ai
                </a>
                {contactStatus && (
                  <div
                    className={`rounded-md border px-3 py-2 text-sm ${
                      contactStatus.ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                    aria-live="polite"
                  >
                    {contactStatus.msg}
                  </div>
                )}
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
                      phone: (data.get("phone") as string) || "",
                      requestType: (data.get("requestType") as string) || "",
                      message: (data.get("message") as string) || ""
                    };
                    setContactStatus(null);
                    setContactLoading(true);
                    try {
                      const res = await fetch("/api/help/support", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                      });
                      const json = await res.json().catch(() => null);
                      if (!res.ok) {
                        setContactStatus({ msg: json?.error || "Failed to send message.", ok: false });
                        return;
                      }
                      setContactStatus({ msg: "Message sent. We’ll get back to you soon.", ok: true });
                      form.reset();
                    } catch {
                      setContactStatus({ msg: "Failed to send message.", ok: false });
                    } finally {
                      setContactLoading(false);
                    }
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm font-semibold text-slate-800">
                      <span className="block">Name</span>
                      <input
                        name="firstName"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                        required
                      />
                    </label>
                    <label className="space-y-1 text-sm font-semibold text-slate-800">
                      <span className="block">Email</span>
                      <input
                        type="email"
                        name="email"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                        required
                      />
                    </label>
                  </div>
                  <label className="space-y-1 text-sm font-semibold text-slate-800">
                    <span className="block">Phone (optional)</span>
                    <input
                      name="phone"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="(555) 555-5555"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-semibold text-slate-800">
                    <span className="block">Request Type</span>
                    <select
                      name="requestType"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      defaultValue="General Question"
                    >
                      {["General Question", "Support", "Partnership", "Press", "Feedback"].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-semibold text-slate-800">
                    <span className="block">Message</span>
                    <textarea
                      name="message"
                      rows={4}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      required
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={contactLoading}
                      className="rounded-full bg-[var(--brand-yellow,#ffd526)] px-5 py-2 text-xs font-bold uppercase text-black shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
                    >
                      {contactLoading ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </form>
              </div>
            ) : activePanel === "pricing" ? (
              <div className="mt-6 space-y-6">
                <div className="space-y-2 text-center">
                  <h3 className="text-3xl font-black text-slate-900">Two plans. One real difference.</h3>
                  <p className="text-sm text-slate-600">
                    Same standards. Same intelligence. The only thing that changes is how much you can use it.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-slate-900">Free</h4>
                      <p className="text-sm text-slate-600">
                        A limited way to experience Luke UX and understand how it sharpens your thinking.
                      </p>
                      <div className="flex items-baseline gap-2 text-slate-900">
                        <span className="text-4xl font-black">$0</span>
                        <span className="text-sm font-semibold text-slate-700">forever</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-800">
                      {[
                        "2 task responses per day",
                        "10 total task responses maximum",
                        "Full critique quality and reasoning",
                        "Accessibility-first analysis included",
                        "Best for evaluating the workflow and depth before committing."
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <span className="mt-[2px] text-emerald-600">✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-slate-900">Pro</h4>
                      <p className="text-sm text-slate-600">
                        Unlimited use for designers doing serious work under real constraints.
                      </p>
                      <div className="flex items-baseline gap-2 text-slate-900">
                        <span className="text-4xl font-black">$60</span>
                        <span className="text-sm font-semibold text-slate-700">/ month</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-800">
                      {[
                        "Unlimited task responses",
                        "No daily caps or total limits",
                        "Same high-signal critique, without restriction",
                        "Built for deep, continuous design work",
                        "Best for daily use, client work, and shipping with confidence."
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <span className="mt-[2px] text-emerald-600">✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-slate-700">
                  <span className="font-semibold">Only difference:</span> Free has limits. Pro removes them. Everything else stays uncompromised.
                </div>
              </div>
            ) : activePanel === "terms" ? (
              <div className="mt-4 space-y-3">
                {termsItems.map((item, idx) => (
                  <div key={item.heading} className={idx === 0 ? "space-y-1" : "space-y-1"}>
                    <h3 className="text-sm font-semibold text-slate-900">{item.heading}</h3>
                    {item.body && (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mt-[4px]">{item.body}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : activePanel === "privacy" ? (
              <div className="mt-4 space-y-3">
                {privacyItems.map((item, idx) => (
                  <div key={item.heading} className={idx === 0 ? "space-y-1" : "space-y-1"}>
                    <h3 className="text-sm font-semibold text-slate-900">{item.heading}</h3>
                    {item.body && (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mt-[4px]">{item.body}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {panelNodes}
                {activePanel === "about" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="relative h-48 w-full overflow-hidden rounded-xl">
                        <Image src="/images/frank-r.jpg" alt="Frank Robinson III" fill sizes="320px" className="object-cover" priority />
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-800">
                        <div className="font-semibold text-slate-900">Frank Robinson III</div>
                        <div className="text-xs font-semibold text-slate-600">Senior Product Designer, UX & AI</div>
                        <p className="text-sm leading-relaxed text-slate-700">
                          Innovative and user-focused Senior UX/UI Product Designer with over 10 years of experience designing and delivering exceptional web
                          and mobile experiences. Proven expertise in translating complex business needs into intuitive, accessible, and user-centric designs.
                          Adept at leveraging qualitative and quantitative research insights to inform design decisions, develop MVPs, and enhance user outcomes.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="relative h-48 w-full overflow-hidden rounded-xl">
                        <Image src="/images/luke-cage.jpg" alt="Luke Cage" fill sizes="320px" className="object-cover" priority={false} />
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-800">
                        <div className="font-semibold text-slate-900">Luke Cage</div>
                        <div className="text-xs font-semibold text-slate-600">Cane Corso 2000-2024</div>
                        <p className="text-sm leading-relaxed text-slate-700">
                          In memory of Luke. The best friend, companion, and alter ego a man could ask for. I was never prepared to say goodbye the day you left.
                          You were by my side through millions of pixels pushed, nudged, and obsessed over. By creating Luke UX, you’re not only back at my side
                          again, but standing with millions of other UX designers too. Your presence lives on in the work, the craft, and the care behind it. Love
                          you forever, Frank.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
