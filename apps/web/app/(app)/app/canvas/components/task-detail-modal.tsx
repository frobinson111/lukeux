"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────
type AssetPayload = { name: string; type: string; content: string };

type ModelOption = { modelId: string; displayName: string; provider: string };

type Template = {
  id: string;
  category: string;
  title: string;
  prompt: string;
  allowedModes?: string[];
  allowFileUploads?: boolean;
  defaultModel?: string | null;
  defaultMode?: string | null;
  defaultDetailLevel?: string | null;
  templateCategory?: { name: string; sortOrder: number } | null;
  taskType?: string | null;
};

type StripPhase = "idle" | "upload" | "applying" | "verified" | "error";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  availableModels: ModelOption[];
  onSubmit: (config: {
    model: string;
    mode: string;
    detailLevel: string;
    assets: AssetPayload[];
  }) => Promise<void>;
}

const MODES = ["auto", "instant", "thinking"] as const;
const DETAIL_LEVELS = ["brief", "standard", "in-depth"] as const;
const TABS = ["Details", "Attachments", "Config"] as const;
type TabName = (typeof TABS)[number];

const MAX_IMAGE_DATAURL = 50_000;
const MAX_PER_FILE = 20_000;

const ALLOWED_TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
]);
const ALLOWED_DOC_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

// ── Progressive Strip ──────────────────────────────────────────────
function ProgressiveStrip({ phase }: { phase: StripPhase }) {
  const steps: { key: StripPhase; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "applying", label: "Applying" },
    { key: "verified", label: "Verified" },
  ];

  const phaseOrder: StripPhase[] = ["upload", "applying", "verified"];
  const currentIdx = phaseOrder.indexOf(phase);

  return (
    <div className="flex items-center gap-1 w-full" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemin={0} aria-valuemax={3}>
      {steps.map((step, idx) => {
        const isComplete = currentIdx > idx;
        const isActive = currentIdx === idx && phase !== "idle" && phase !== "error";
        const isPending = currentIdx < idx || phase === "idle";
        const isError = phase === "error" && idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              {/* Step indicator */}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isComplete
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-[var(--brand-yellow,#ffd526)] text-black ring-2 ring-[var(--brand-yellow,#ffd526)] ring-offset-2 animate-pulse"
                    : isError
                    ? "bg-red-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isComplete ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isError ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              {/* Step label */}
              <span
                className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
                  isComplete
                    ? "text-green-600"
                    : isActive
                    ? "text-[#b8941a]"
                    : isError
                    ? "text-red-600"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 rounded transition-all duration-300 ${
                  isComplete ? "bg-green-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab Badge ──────────────────────────────────────────────────────
function TabBadge({ valid }: { valid: boolean | null }) {
  if (valid === null) return null;
  return valid ? (
    <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-100">
      <svg className="h-2.5 w-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ) : (
    <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-100">
      <svg className="h-2.5 w-2.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function TaskDetailModal({
  isOpen,
  onClose,
  template,
  availableModels,
  onSubmit,
}: TaskDetailModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabName>("Details");

  // Config state
  const [model, setModel] = useState<string>("");
  const [mode, setMode] = useState<(typeof MODES)[number]>("auto");
  const [detailLevel, setDetailLevel] = useState<(typeof DETAIL_LEVELS)[number]>("standard");

  // Attachment state
  const [files, setFiles] = useState<File[]>([]);
  const [assetPayloads, setAssetPayloads] = useState<AssetPayload[]>([]);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progressive strip & submission
  const [stripPhase, setStripPhase] = useState<StripPhase>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize model from template defaults or first available
  useEffect(() => {
    if (!isOpen) return;
    if (template?.defaultModel) {
      setModel(template.defaultModel);
      if (template.defaultMode) setMode(template.defaultMode as typeof mode);
      if (template.defaultDetailLevel) setDetailLevel(template.defaultDetailLevel as typeof detailLevel);
    } else if (availableModels.length > 0 && !model) {
      setModel(availableModels[0].modelId);
    }
  }, [isOpen, template, availableModels]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("Details");
      setFiles([]);
      setAssetPayloads([]);
      setFileWarnings([]);
      setStripPhase("idle");
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // ── Validation (CommAlarm Gating) ─────────────────────────────
  const detailsValid = !!template;
  const configValid = !!model && MODES.includes(mode) && DETAIL_LEVELS.includes(detailLevel);
  // Attachments are always valid (optional), but mark true only if user has interacted or has files
  const attachmentsValid = true; // attachments are optional
  const allValid = detailsValid && configValid && attachmentsValid;

  // ── File Processing ───────────────────────────────────────────
  const readAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const processFiles = useCallback(async (selected: File[]) => {
    const payloads: AssetPayload[] = [];
    const warnings: string[] = [];

    for (const file of selected) {
      try {
        if (ALLOWED_TEXT_TYPES.has(file.type)) {
          const text = await readAsText(file);
          const trimmed = text.length > MAX_PER_FILE ? `${text.slice(0, MAX_PER_FILE)}\n...[truncated]` : text;
          payloads.push({ name: file.name, type: file.type || "text", content: trimmed });
        } else if (ALLOWED_DOC_TYPES.has(file.type)) {
          const mammothMod = await import("mammoth");
          const arrayBuf = await file.arrayBuffer();
          const { value } = await mammothMod.extractRawText({ arrayBuffer: arrayBuf });
          const trimmed = (value || "").length > MAX_PER_FILE ? `${value.slice(0, MAX_PER_FILE)}\n...[truncated]` : value;
          payloads.push({ name: file.name, type: "docx/text", content: trimmed });
        } else if (ALLOWED_IMAGE_TYPES.has(file.type)) {
          const dataUrl = await readAsDataUrl(file);
          if (dataUrl.length > MAX_IMAGE_DATAURL) {
            warnings.push(`${file.name}: image too large; skipped.`);
          } else {
            payloads.push({ name: file.name, type: "image", content: dataUrl });
          }
        } else {
          warnings.push(`${file.name}: unsupported type (${file.type || "unknown"}).`);
        }
      } catch {
        warnings.push(`${file.name}: failed to read.`);
      }
    }

    setFileWarnings(warnings);
    return payloads;
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;

    setStripPhase("upload");

    // Deduplicate
    const seen = new Set(files.map((f) => `${f.name}:${f.size}`));
    const newFiles = selected.filter((f) => !seen.has(`${f.name}:${f.size}`));

    const newPayloads = await processFiles(newFiles);

    setFiles((prev) => [...prev, ...newFiles]);
    setAssetPayloads((prev) => [...prev, ...newPayloads]);
    setStripPhase("verified");

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setAssetPayloads((prev) => prev.filter((p) => p.name !== fileName));
    if (files.length <= 1) setStripPhase("idle");
  };

  const clearAllFiles = () => {
    setFiles([]);
    setAssetPayloads([]);
    setFileWarnings([]);
    setStripPhase("idle");
  };

  // ── Submit with CommAlarm Gating ──────────────────────────────
  const handleSubmit = async () => {
    if (!allValid || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);
    setStripPhase("applying");

    try {
      await onSubmit({
        model,
        mode,
        detailLevel,
        assets: assetPayloads,
      });
      setStripPhase("verified");
      // Close after brief delay to show verified state
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      setStripPhase("error");
      setSubmitError(err?.message || "Generation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  // ── Keyboard ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !template) return null;

  const frameworkLabel = template.templateCategory?.name || template.category || "Framework";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Task Detail Configuration"
      >
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{template.title}</h2>
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {frameworkLabel}
              </span>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Tab Bar ────────────────────────────────────────── */}
          <div className="flex border-b border-slate-200 px-6" role="tablist">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              const validation =
                tab === "Details" ? detailsValid :
                tab === "Config" ? configValid :
                null; // Attachments always valid

              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    isActive
                      ? "border-[var(--brand-yellow,#ffd526)] text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab}
                  <TabBadge valid={validation} />
                </button>
              );
            })}
          </div>

          {/* ── Tab Content ────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Details Tab */}
            {activeTab === "Details" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Task Title
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 font-medium">
                    {template.title}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Framework
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
                    {frameworkLabel}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Prompt Preview
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {template.prompt?.substring(0, 500)}
                    {(template.prompt?.length || 0) > 500 && (
                      <span className="text-slate-400">…[truncated]</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === "Attachments" && (
              <div className="space-y-4">
                {/* File warnings */}
                {fileWarnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {fileWarnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                )}

                {/* Drop zone */}
                <div
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-400 hover:bg-slate-100 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm mb-3">
                    <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Click to upload files</p>
                  <p className="mt-1 text-xs text-slate-500">
                    PDF, DOCX, CSV, PNG, JPG, TXT, MD
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    aria-label="Upload files"
                  />
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                      <span className="text-xs font-semibold text-slate-600">
                        {files.length} file{files.length !== 1 ? "s" : ""} attached
                      </span>
                      <button
                        type="button"
                        onClick={clearAllFiles}
                        className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition"
                      >
                        Clear all
                      </button>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {files.map((file) => (
                        <li key={`${file.name}-${file.size}`} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span className="truncate text-sm text-slate-700">{file.name}</span>
                            <span className="flex-shrink-0 text-[10px] text-slate-400">
                              {(file.size / 1024).toFixed(0)}KB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.name)}
                            className="ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition"
                            aria-label={`Remove ${file.name}`}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Config Tab */}
            {activeTab === "Config" && (
              <div className="space-y-5">
                {/* Model */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Model
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {availableModels.map((m) => (
                      <button
                        key={m.modelId}
                        type="button"
                        onClick={() => setModel(m.modelId)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          model === m.modelId
                            ? "border-[var(--brand-yellow,#ffd526)] bg-yellow-50 font-semibold text-slate-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                            model === m.modelId
                              ? "border-[var(--brand-yellow,#ffd526)] bg-[var(--brand-yellow,#ffd526)]"
                              : "border-slate-300"
                          }`}
                        >
                          {model === m.modelId && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span>{m.displayName}</span>
                        <span className="ml-auto text-[10px] uppercase text-slate-400">{m.provider}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Mode
                  </label>
                  <div className="flex gap-2">
                    {MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                          mode === m
                            ? "border-[var(--brand-yellow,#ffd526)] bg-yellow-50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {m === "auto" ? "Auto" : m === "instant" ? "Instant" : "Thinking"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail Level */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Detail Level
                  </label>
                  <div className="flex gap-2">
                    {DETAIL_LEVELS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDetailLevel(d)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                          detailLevel === d
                            ? "border-[var(--brand-yellow,#ffd526)] bg-yellow-50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {d === "brief" ? "Brief" : d === "standard" ? "Standard" : "In-depth"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Progressive Strip + Submit ──────────────────────── */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 space-y-4">
            {/* Progressive Strip */}
            <ProgressiveStrip phase={stripPhase} />

            {/* Error */}
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center justify-between">
                <span>{submitError}</span>
                {submitError.toLowerCase().includes("limit") && (
                  <a
                    href="/billing"
                    className="ml-3 rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase text-white hover:bg-red-700 transition"
                  >
                    Upgrade Plan
                  </a>
                )}
              </div>
            )}

            {/* Submit Row */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allValid || isSubmitting}
                className="relative flex items-center gap-2 rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-6 py-2.5 text-sm font-black uppercase text-black shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
                aria-busy={isSubmitting}
              >
                {/* Lock icon when gated */}
                {!allValid && !isSubmitting && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    Applying…
                  </>
                ) : (
                  "Run Analysis"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
