"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@prisma/client";

type Props = {
  user: User;
  initials: string;
  fullName: string;
};

export default function AvatarDropdown({ user, initials, fullName }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isOnAdminPage = pathname?.startsWith("/app/admin");
  const hoverRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node | null;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Debounced close on mouse leave
  const scheduleClose = () => {
    if (hoverRef.current) clearTimeout(hoverRef.current);
    hoverRef.current = setTimeout(() => setOpen(false), 150);
  };
  const cancelClose = () => {
    if (hoverRef.current) clearTimeout(hoverRef.current);
  };

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // ignore; still attempt redirect
    } finally {
      setOpen(false);
      window.location.href = "/";
    }
  }

  return (
    <div className="relative" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="list-none cursor-pointer rounded-full bg-white border border-black px-3 py-2 text-xs font-bold uppercase text-black shadow-[0_2px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          role="menu"
        >
          <div className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>{fullName}</span>
            {user.plan === "PRO" && user.planStatus === "ACTIVE" && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-800">Pro</span>
            )}
          </div>
          <div className="flex flex-col divide-y divide-slate-200 text-sm font-semibold text-slate-800">
            {(user.role === "ADMIN" || user.role === "SUPERUSER") && (
              isOnAdminPage ? (
                <Link className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50" href="/app/canvas" role="menuitem">
                  <Image src="/images/share.svg" alt="Canvas" width={18} height={18} className="h-5 w-5" />
                  <span>Canvas</span>
                </Link>
              ) : (
                <Link className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50" href="/app/admin" role="menuitem">
                  <Image src="/images/settings.svg" alt="Admin" width={18} height={18} className="h-5 w-5" />
                  <span>Admin</span>
                </Link>
              )
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
            <Link className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50" href="/app/feedback" role="menuitem">
              <Image src="/images/help.svg" alt="Feedback" width={18} height={18} className="h-5 w-5" />
              <span>Feedback &amp; Requests</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
              role="menuitem"
              disabled={loggingOut}
            >
              <Image src="/images/logout.svg" alt="Log out" width={18} height={18} className="h-5 w-5" />
              <span>{loggingOut ? "Logging out…" : "Log out"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


