import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luke UX | AI-Augmented UX Design Copilot",
  description:
    "Desktop-first UX design copilot with structured prompts, LLM selection, and admin-controlled models.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-slate-900 antialiased">
        <div className="min-h-screen flex flex-col">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
