"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import FigmaFilesTree from "./figma-files-tree";

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
  const [teamUrlInput, setTeamUrlInput] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStatus();

    function handleDisconnected() {
      setStatus({ connected: false });
    }

    window.addEventListener("figma-disconnected", handleDisconnected);
    return () => window.removeEventListener("figma-disconnected", handleDisconnected);
  }, []);

  // Auto-focus the team input when arriving from OAuth callback
  useEffect(() => {
    if (status?.connected && !status?.hasTeamId) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("figma_setup") === "team") {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    }
  }, [status]);

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

  function extractTeamId(input: string): string | null {
    const trimmed = input.trim();
    // Direct numeric ID
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }
    // URL like https://www.figma.com/files/team/1234567890/...
    const match = trimmed.match(/figma\.com\/files\/team\/(\d+)/i);
    if (match) {
      return match[1];
    }
    return null;
  }

  async function handleSaveTeam() {
    const teamId = extractTeamId(teamUrlInput);
    if (!teamId) {
      setTeamError("Paste your Figma team page URL or enter a numeric team ID.");
      return;
    }

    setSavingTeam(true);
    setTeamError(null);

    try {
      const res = await fetch("/api/integrations/figma/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setTeamError(data.error || "Failed to save team ID");
        return;
      }

      setStatus((prev) => prev ? { ...prev, hasTeamId: true } : prev);
      setTeamUrlInput("");
      // Notify sibling components (FigmaFilesTree) to refetch projects
      window.dispatchEvent(new Event("figma-team-updated"));

      // Clean up the setup query param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("figma_setup");
      window.history.replaceState({}, "", url.toString());
    } catch {
      setTeamError("Failed to save team ID");
    } finally {
      setSavingTeam(false);
    }
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

  // Connected — show indicator with collapsible project tree dropdown
  if (isConnected) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowTree(!showTree)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <Image src="/images/figma-icon-2.svg" alt="Figma" width={16} height={16} className="h-4 w-4" />
          <span className="text-xs">
            Connected as <span className="font-medium">@{status?.handle || status?.email}</span>
          </span>
          <PlugConnectedIcon className="h-3.5 w-3.5 text-emerald-500" />
          <svg
            className={`h-3 w-3 text-slate-400 transition-transform ${showTree ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showTree && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            {status?.hasTeamId ? (
              <FigmaFilesTree
                compact
                onFileSelect={(fileUrl) => {
                  if (onFileSelect) {
                    onFileSelect(fileUrl);
                  }
                  setShowTree(false);
                }}
              />
            ) : (
              <div className="px-4 py-4 space-y-3">
                <p className="text-xs text-slate-600">
                  Link your Figma team to browse projects and files. Paste your team page URL below.
                </p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={teamUrlInput}
                    onChange={(e) => { setTeamUrlInput(e.target.value); setTeamError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && teamUrlInput.trim()) handleSaveTeam(); }}
                    placeholder="https://www.figma.com/files/team/123456/Team-Name"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTeam}
                    disabled={!teamUrlInput.trim() || savingTeam}
                    className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    {savingTeam ? "Saving..." : "Link"}
                  </button>
                </div>
                {teamError && <p className="text-xs text-red-600">{teamError}</p>}
              </div>
            )}
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
