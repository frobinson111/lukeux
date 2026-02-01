"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type FigmaStatus = {
  connected: boolean;
  email?: string;
  handle?: string;
};

export default function FigmaConnectInline() {
  const [status, setStatus] = useState<FigmaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/integrations/figma/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    window.location.href = "/api/integrations/figma/connect";
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Image src="/images/figma-icon-2.svg" alt="Figma" width={16} height={16} className="h-4 w-4" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  const isConnected = status?.connected;

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Image src="/images/figma-icon-2.svg" alt="Figma" width={16} height={16} className="h-4 w-4" />
        <span className="text-xs">
          Connected as <span className="font-medium">@{status?.handle || status?.email}</span>
        </span>
        <PlugConnectedIcon className="h-3.5 w-3.5 text-emerald-500" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      className="flex items-center gap-2 rounded-md px-2 py-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      title="Connect your Figma account to analyze Figma prototype links"
    >
      <Image src="/images/figma-icon-2.svg" alt="Figma" width={16} height={16} className="h-4 w-4" />
      <span className="text-xs font-medium">Figma</span>
      <PlugDisconnectedIcon className="h-3.5 w-3.5 text-slate-400" />
    </button>
  );
}

// Plug connected icon
function PlugConnectedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="7" y="14" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 6V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 6V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="7" y="6" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

// Plug disconnected icon
function PlugDisconnectedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="7" y="15" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 15V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 15V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 5V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 5V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="7" y="5" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}
