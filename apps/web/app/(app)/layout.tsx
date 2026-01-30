import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireUser } from "../../lib/auth";
import AvatarDropdown from "./components/avatar-dropdown";
// SignOutButton is client-side; keep logout via form below to avoid client boundary here.

export const metadata = {
  // Icons are defined at the root app/layout.tsx so they apply everywhere.
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim() || "U";
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Luke UX home">
            <Image src="/images/lukeux-logo.svg" alt="Luke UX" width={160} height={32} priority className="h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-4">
            {user.plan === "FREE" && (
              <form action="/api/billing/checkout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full bg-[var(--brand-yellow,#ffd526)] px-3 py-1.5 text-xs font-bold uppercase text-black shadow-[0_2px_0_#111] transition hover:-translate-y-[1px]"
                >
                  Free Plan - Upgrade
                </button>
              </form>
            )}

            <AvatarDropdown user={user} initials={initials} fullName={fullName} />
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-slate-500">
          © 2026 Luke UX LLC
        </div>
      </footer>
    </div>
  );
}
