"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type FigmaStatus = {
  connected: boolean;
  email?: string;
  handle?: string;
  hasTeamId?: boolean;
};

type Props = {
  onFileSelect?: (fileUrl: string) => void;
};

export default function FigmaConnectInline({ onFileSelect }: Props = {}) {
  const [status, setStatus] = useState<FigmaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [figmaUrlInput, setFigmaUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStatus();

    function handleDisconnected() {
      setStatus({ connected: false });
    }

    window.addEventListener("figma-disconnected", handleDisconnected);
    return () => window.removeEventListener("figma-disconnected", handleDisconnected);
  }, []);

  // Auto-focus the input when dropdown opens
  useEffect(() => {
    if (showDropdown) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showDropdown]);

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

  function extractFileUrl(input: string): string | null {
    const trimmed = input.trim();
    // Match: figma.com/design/:fileKey/... or figma.com/file/:fileKey/...
    const match = trimmed.match(/figma\.com\/(?:design|file)\/([A-Za-z0-9]+)/i);
    if (match) {
      return trimmed;
    }
    // If it looks like just a file key (alphanumeric, 10+ chars), build a URL
    if (/^[A-Za-z0-9]{10,}$/.test(trimmed)) {
      return `https://www.figma.com/file/${trimmed}`;
    }
    return null;
  }

  function handleSubmitUrl() {
    const url = extractFileUrl(figmaUrlInput);
    if (!url) {
      setUrlError("Paste a Figma file URL (e.g. figma.com/design/abc123/File-Name)");
      return;
    }
    setUrlError(null);
    if (onFileSelect) {
      onFileSelect(url);
    }
    setFigmaUrlInput("");
    setShowDropdown(false);
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

  // Connected — show indicator with collapsible Figma URL input dropdown
  if (isConnected) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <Image src="/images/figma-icon-2.svg" alt="Figma" width={16} height={16} className="h-4 w-4" />
          <span className="text-xs">
            Connected as <span className="font-medium">@{status?.handle || status?.email}</span>
          </span>
          <PlugConnectedIcon className="h-3.5 w-3.5 text-emerald-500" />
          <svg
            className={`h-3 w-3 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDropdown && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 space-y-2.5">
              <p className="text-[11px] text-slate-500">
                Paste a Figma file URL to analyze its design.
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={figmaUrlInput}
                  onChange={(e) => { setFigmaUrlInput(e.target.value); setUrlError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && figmaUrlInput.trim()) handleSubmitUrl(); }}
                  placeholder="https://www.figma.com/design/abc123/File-Name"
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                />
                <button
                  type="button"
                  onClick={handleSubmitUrl}
                  disabled={!figmaUrlInput.trim()}
                  className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
                >
                  Go
                </button>
              </div>
              {urlError && <p className="text-[11px] text-red-600">{urlError}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not connected
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
