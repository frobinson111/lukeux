"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type FigmaStatus = {
  connected: boolean;
  email?: string;
  handle?: string;
  connectedAt?: string;
  expiresAt?: string;
};

type FigmaFile = {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
};

type FigmaProject = {
  id: string;
  name: string;
};

type Props = {
  collapsed?: boolean;
};

export default function FigmaConnectionIndicator({ collapsed = false }: Props) {
  const [status, setStatus] = useState<FigmaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  async function handleDisconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/figma/disconnect", { method: "POST" });
      setStatus({ connected: false });
      setShowDetails(false);
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnect() {
    window.location.href = "/api/integrations/figma/connect";
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-slate-400">
        <Image src="/images/figma-icon-2.svg" alt="Figma" width={20} height={20} className="h-5 w-5" />
        {!collapsed && <span className="text-sm">Loading...</span>}
      </div>
    );
  }

  const isConnected = status?.connected;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (isConnected ? setShowDetails(!showDetails) : handleConnect())}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-100 ${
          isConnected ? "text-slate-800" : "text-slate-500"
        }`}
        title={isConnected ? `Connected as ${status?.handle || status?.email}. Click to disconnect or view details.` : "Connect your Figma account"}
      >
        <div className="relative flex-shrink-0 flex items-center gap-1.5">
          {isConnected ? (
            <svg className="h-5 w-5" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
              <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
              <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
              <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
              <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
            </svg>
          ) : (
            <Image 
              src="/images/figma-icon-2.svg" 
              alt="Figma" 
              width={20} 
              height={20} 
              className="h-5 w-5" 
            />
          )}
          {isConnected ? (
            <PlugConnectedIcon className="h-4 w-4 text-emerald-500" />
          ) : (
            <PlugDisconnectedIcon className="h-4 w-4 text-slate-400" />
          )}
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-medium">
            {isConnected ? "Figma Connected" : "Connect Figma"}
          </span>
        )}
      </button>

      {showDetails && isConnected && (
        <div className="absolute left-full top-0 z-30 ml-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 space-y-1">
            <div className="text-xs font-semibold uppercase text-slate-500">Connected Account</div>
            {status?.handle && (
              <div className="text-sm font-medium text-slate-800">@{status.handle}</div>
            )}
            {status?.email && (
              <div className="text-xs text-slate-600">{status.email}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      )}
    </div>
  );
}

// Plug connected icon (plug inserted)
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

// Plug disconnected icon (plug separated)
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
