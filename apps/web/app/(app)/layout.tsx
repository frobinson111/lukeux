import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireUser } from "../../lib/auth";
// SignOutButton is client-side; keep logout via form below to avoid client boundary here.

export const metadata = {
  icons: {
    icon: "/favicon.svg"
  }
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

            <details className="relative">
              <summary className="list-none cursor-pointer rounded-full bg-white border border-black px-3 py-2 text-xs font-bold uppercase text-black shadow-[0_2px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                {initials}
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 flex items-center gap-2">
                <span>{fullName}</span>
                {user.plan === "PRO" && user.planStatus === "ACTIVE" && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-800">
                    Pro
                  </span>
                )}
              </div>
                <div className="flex flex-col divide-y divide-slate-200 text-sm font-semibold text-slate-800">
                  {(user.role === "ADMIN" || user.role === "SUPERUSER") && (
                    <Link className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50" href="/app/admin" role="menuitem">
                      <Image src="/images/settings.svg" alt="Admin" width={18} height={18} className="h-5 w-5" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <Link className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50" href="/app/settings" role="menuitem">
                    <Image src="/images/settings.svg" alt="Settings" width={18} height={18} className="h-5 w-5" />
                    <span>Settings</span>
                  </Link>
                  <Link className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50" href="/app/privacy" role="menuitem">
                    <Image src="/images/account.svg" alt="Privacy" width={18} height={18} className="h-5 w-5" />
                    <span>Privacy</span>
                  </Link>
                  <Link className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50" href="/app/help" role="menuitem">
                    <Image src="/images/help.svg" alt="Help" width={18} height={18} className="h-5 w-5" />
                    <span>Help</span>
                  </Link>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
                      role="menuitem"
                    >
                      <Image src="/images/logout.svg" alt="Log out" width={18} height={18} className="h-5 w-5" />
                      <span>Log out</span>
                    </button>
                  </form>
                </div>
              </div>
            </details>
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
