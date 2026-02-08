"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type FigmaStatus = {
  connected: boolean;
  email?: string;
  handle?: string;
  hasTeamId?: boolean;
};

type FigmaFile = { key: string; name: string };
type FigmaNode = { id: string; name: string; type: string; depth: number };

type Props = {
  imageDataUrl: string;
  onClose: () => void;
};

type Step = "connect" | "pick-file" | "pick-node" | "exporting" | "done" | "error";

export default function FigmaExportModal({ imageDataUrl, onClose }: Props) {
  const [step, setStep] = useState<Step>("connect");
  const [status, setStatus] = useState<FigmaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // File picker state
  const [selectedFile, setSelectedFile] = useState<FigmaFile | null>(null);

  // Direct file URL state
  const [directFileUrl, setDirectFileUrl] = useState("");
  const [directFileError, setDirectFileError] = useState<string | null>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Node picker state
  const [nodes, setNodes] = useState<FigmaNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FigmaNode | null>(null);
  const [resourceName, setResourceName] = useState("LukeUX Wireframe");

  // Export state
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/integrations/figma/status");
      const data = await res.json();
      setStatus(data);
      if (data.connected) {
        setStep("pick-file");
        setTimeout(() => directFileInputRef.current?.focus(), 200);
      } else {
        setStep("connect");
      }
    } catch {
      setStatus({ connected: false });
      setStep("connect");
    } finally {
      setLoading(false);
    }
  }

  function extractFileKeyFromUrl(input: string): { fileKey: string; fileName: string } | null {
    const trimmed = input.trim();
    // Match: figma.com/design/:fileKey/:fileName or figma.com/file/:fileKey/:fileName
    const match = trimmed.match(/figma\.com\/(?:design|file)\/([A-Za-z0-9]+)(?:\/([^?/]*))?/i);
    if (match) {
      return { fileKey: match[1], fileName: match[2] ? decodeURIComponent(match[2]).replace(/-/g, " ") : match[1] };
    }
    // If it looks like just a file key (alphanumeric, 10+ chars)
    if (/^[A-Za-z0-9]{10,}$/.test(trimmed)) {
      return { fileKey: trimmed, fileName: trimmed };
    }
    return null;
  }

  async function handleDirectFileUrl() {
    const result = extractFileKeyFromUrl(directFileUrl);
    if (!result) {
      setDirectFileError("Please paste a valid Figma file URL (e.g. figma.com/design/abc123/File-Name)");
      return;
    }
    setDirectFileError(null);
    const file: FigmaFile = { key: result.fileKey, name: result.fileName };
    handleFileSelect(file);
  }

  async function handleFileSelect(file: FigmaFile) {
    setSelectedFile(file);
    setStep("pick-node");
    setLoadingNodes(true);
    try {
      const res = await fetch(`/api/integrations/figma/nodes?fileKey=${file.key}`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
        const firstPage = (data.nodes || []).find((n: FigmaNode) => n.type === "CANVAS");
        if (firstPage) setSelectedNode(firstPage);
      }
    } catch {
      setExportError("Failed to load file structure");
      setStep("error");
    } finally {
      setLoadingNodes(false);
    }
  }

  async function handleExport() {
    if (!selectedFile || !selectedNode) return;
    setStep("exporting");
    setExportError(null);

    try {
      // 1) Save the wireframe to get a persistent ID
      const saveRes = await fetch("/api/wireframes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: imageDataUrl,
          mimeType: "image/png",
          fileName: `wireframe-${selectedFile.name}`
        })
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => null);
        throw new Error(err?.error || "Failed to save wireframe");
      }
      const { id: wireframeId } = await saveRes.json();

      // 2) Export to Figma as Dev Resource
      const exportRes = await fetch("/api/integrations/figma/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wireframeId,
          fileKey: selectedFile.key,
          nodeId: selectedNode.id,
          name: resourceName || "LukeUX Wireframe"
        })
      });
      if (!exportRes.ok) {
        const err = await exportRes.json().catch(() => null);
        throw new Error(err?.error || "Failed to export to Figma");
      }

      setStep("done");
    } catch (err: any) {
      setExportError(err?.message || "Export failed");
      setStep("error");
    }
  }

  function nodeIcon(type: string) {
    if (type === "CANVAS") return "\u{1F4C4}";
    if (type === "FRAME") return "\u{1F532}";
    if (type === "COMPONENT") return "\u25C6";
    if (type === "SECTION") return "\u{1F4C1}";
    return "\u00B7";
  }

  if (loading) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-500">Loading Figma connection...</div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <Image src="/images/figma-icon-2.svg" alt="Figma" width={20} height={20} className="h-5 w-5" />
        <h2 className="text-sm font-bold text-slate-900">Export to Figma</h2>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* Step: Connect */}
      {step === "connect" && (
        <div className="space-y-4 px-5 py-6 text-center">
          <p className="text-sm text-slate-700">
            Connect your Figma account to export wireframes as Dev Resources.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/integrations/figma/connect";
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Image src="/images/figma-icon-2.svg" alt="" width={16} height={16} className="h-4 w-4" />
            Connect Figma
          </button>
        </div>
      )}

      {/* Step: Pick File */}
      {step === "pick-file" && (
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">1. Paste a Figma file URL</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Connected as{" "}
              <span className="font-medium text-slate-700">
                @{status?.handle || status?.email || "unknown"}
              </span>
              . Paste the URL of the Figma file where you want to attach the wireframe.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Open your file in Figma, then copy the URL from your browser address bar.
            </span>
          </div>

          <div className="flex gap-2">
            <input
              ref={directFileInputRef}
              type="text"
              value={directFileUrl}
              onChange={(e) => { setDirectFileUrl(e.target.value); setDirectFileError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && directFileUrl.trim()) handleDirectFileUrl(); }}
              placeholder="https://www.figma.com/design/abc123/File-Name"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <button
              type="button"
              onClick={handleDirectFileUrl}
              disabled={!directFileUrl.trim()}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
          {directFileError && <p className="text-xs text-red-600">{directFileError}</p>}
        </div>
      )}

      {/* Step: Pick Node */}
      {step === "pick-node" && (
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">
              2. Select a page or frame in <span className="text-black">{selectedFile?.name}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              The wireframe will be attached as a Dev Resource to this node.
            </p>
          </div>

          {loadingNodes ? (
            <div className="py-4 text-center text-xs text-slate-500">Loading file structure...</div>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
              {nodes.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">No pages or frames found in this file.</div>
              ) : (
                nodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNode(node)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                      selectedNode?.id === node.id
                        ? "bg-black text-white"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                    style={{ paddingLeft: `${12 + node.depth * 16}px` }}
                  >
                    <span className="text-xs">{nodeIcon(node.type)}</span>
                    <span className="text-sm truncate flex-1">{node.name}</span>
                    <span
                      className={`text-[10px] ${selectedNode?.id === node.id ? "text-slate-300" : "text-slate-400"}`}
                    >
                      {node.type}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resource name</label>
            <input
              type="text"
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setSelectedNode(null);
                setNodes([]);
                setStep("pick-file");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!selectedNode}
              onClick={handleExport}
              className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              Export to Figma
            </button>
          </div>
        </div>
      )}

      {/* Step: Exporting */}
      {step === "exporting" && (
        <div className="px-5 py-8 text-center space-y-3">
          <div className="inline-flex h-10 w-10 animate-spin items-center justify-center rounded-full border-2 border-slate-200 border-t-black" />
          <p className="text-sm font-semibold text-slate-700">Exporting to Figma...</p>
          <p className="text-xs text-slate-500">Saving wireframe and attaching to {selectedFile?.name}</p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="px-5 py-8 text-center space-y-4">
          <div className="text-3xl">{"\u2705"}</div>
          <div>
            <p className="text-sm font-bold text-slate-900">Exported to Figma!</p>
            <p className="mt-1 text-xs text-slate-600">
              The wireframe has been attached as a Dev Resource to{" "}
              <span className="font-medium">{selectedNode?.name}</span> in{" "}
              <span className="font-medium">{selectedFile?.name}</span>.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Open the file in Figma Dev Mode to see it in the Dev Resources panel.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <a
              href={`https://www.figma.com/file/${selectedFile?.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Open in Figma
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Step: Error */}
      {step === "error" && (
        <div className="px-5 py-8 text-center space-y-4">
          <div className="text-3xl">{"\u26A0\uFE0F"}</div>
          <div>
            <p className="text-sm font-bold text-red-700">Export Failed</p>
            <p className="mt-1 text-xs text-slate-600">{exportError}</p>
          </div>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setExportError(null);
                setStep("pick-node");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">{children}</div>
    </div>
  );
}
