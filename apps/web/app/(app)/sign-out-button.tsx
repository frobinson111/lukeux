"use client";

export default function SignOutButton() {
  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      Sign out
    </button>
  );
}
