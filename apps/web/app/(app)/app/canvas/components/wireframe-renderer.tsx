"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function downscaleDataUrl(dataUrl: string, maxWidth = 1280): Promise<string> {
  // Browser-only image downscale to keep payload reasonable for API.
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = dataUrl;
  });
}

async function autoCropDataUrl(dataUrl: string, paddingPx = 10): Promise<string> {
  // Browser-only auto-crop to remove large white margins from generated wireframes.
  // Keeps a small outer margin so the wireframe doesn’t touch the edge.
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const { data } = imageData;

      const isInk = (i: number) => {
        const a = data[i + 3];
        if (a < 10) return false;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // consider anything not near-white as content
        return r < 245 || g < 245 || b < 245;
      };

      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          if (!isInk(idx)) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }

      // If we didn't detect any non-white pixels, don't crop.
      if (maxX < 0 || maxY < 0) {
        resolve(dataUrl);
        return;
      }

      minX = Math.max(0, minX - paddingPx);
      minY = Math.max(0, minY - paddingPx);
      maxX = Math.min(w - 1, maxX + paddingPx);
      maxY = Math.min(h - 1, maxY + paddingPx);

      const cropW = Math.max(1, maxX - minX + 1);
      const cropH = Math.max(1, maxY - minY + 1);

      const out = document.createElement("canvas");
      out.width = cropW;
      out.height = cropH;
      const outCtx = out.getContext("2d");
      if (!outCtx) {
        resolve(dataUrl);
        return;
      }

      outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(out.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = dataUrl;
  });
}

type WireframeResponse = {
  images: string[];
  spec?: string;
  source?: { kind?: string; url?: string | null };
};

export default function WireframeRenderer() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [wireframes, setWireframes] = useState<string[]>([]);
  const [expandedSrc, setExpandedSrc] = useState<string | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [specText, setSpecText] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const canGenerate = useMemo(() => {
    return !!sourceImageDataUrl || !!sourceUrl.trim();
  }, [sourceImageDataUrl, sourceUrl]);

  const handlePickImage = async (file: File) => {
    setError(null);
    setWireframes([]);
    setSpecText(null);
    setSpecOpen(false);
    setSourceUrl("");

    if (!allowedImageTypes.has(file.type)) {
      setError("Please upload a PNG/JPG/WEBP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Image is too large. Please upload an image under 3MB.");
      return;
    }

    const dataUrl = await readAsDataUrl(file);
    const downscaled = await downscaleDataUrl(dataUrl, 1280);
    setSourceFile(file);
    setSourceImageDataUrl(downscaled);
  };

  const handleGenerate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError(null);
    setWireframes([]);
    setSpecText(null);
    setSpecOpen(false);

    try {
      const payload: any = {
        // Generate landscape by default to match the output viewport and reduce vertical whitespace
        size: "1536x1024",
        n: 1,
        style: "lofi"
      };
      if (sourceImageDataUrl) payload.imageDataUrl = sourceImageDataUrl;
      else payload.url = sourceUrl.trim();

      const res = await fetch("/api/images/wireframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = (await res.json().catch(() => null)) as WireframeResponse | null;
      if (!res.ok) {
        setError((json as any)?.error || "Wireframe generation failed.");
        return;
      }
      const imgs = json?.images || [];
      const processed = await Promise.all(
        imgs.map(async (src) => {
          if (typeof src !== "string") return src;
          if (!src.startsWith("data:image/")) return src;
          try {
            return await autoCropDataUrl(src, 10);
          } catch {
            return src;
          }
        })
      );
      setWireframes(processed);
      setSpecText(json?.spec || null);
    } catch (e: any) {
      setError(e?.message || "Wireframe generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm space-y-4">
      {wireframes.length === 0 && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">High‑Fidelity → Low‑Fidelity Wireframe</p>
            <p className="mt-1 text-xs text-slate-600">
              Upload a hi‑fi UI screenshot (or paste a live URL). I&apos;ll generate a structurally faithful lo‑fi wireframe.
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            onClick={() => {
              setSourceFile(null);
              setSourceImageDataUrl(null);
              setSourceUrl("");
              setWireframes([]);
              setSpecText(null);
              setSpecOpen(false);
              setError(null);
            }}
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {wireframes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wireframe output</div>
            <button
              type="button"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              onClick={() => {
                setSourceFile(null);
                setSourceImageDataUrl(null);
                setSourceUrl("");
                setWireframes([]);
                setSpecText(null);
                setSpecOpen(false);
                setError(null);
              }}
            >
              Clear
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {wireframes.map((src, idx) => (
              <div
                key={`${src}-${idx}`}
                // Target output viewport: 789px × 549px total
                className="flex-shrink-0 flex h-[549px] w-[789px] max-w-full flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSrc(src)}
                  className="block flex-1 p-[10px]"
                  aria-label="Expand wireframe image"
                >
                  {/* Image area: fill remaining vertical space, keep a 10px gutter */}
                  <div className="relative h-full w-full">
                    <Image
                      src={src}
                      alt={`Wireframe ${idx + 1}`}
                      fill
                      sizes="789px"
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = src;
                    link.download = `wireframe-${idx + 1}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="h-[48px] w-full border-t-2 border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Download Wireframe
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {specText && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <button
            type="button"
            onClick={() => setSpecOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700"
            aria-expanded={specOpen}
          >
            <span>Wireframe blueprint (optional)</span>
            <span className="text-slate-500">{specOpen ? "Hide" : "Show"}</span>
          </button>
          {specOpen && <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-700">{specText}</pre>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Source: Image upload */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">Option A — Upload a UI image</p>
          <p className="mt-1 text-[11px] text-slate-500">PNG/JPG/WEBP · under 3MB</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await handlePickImage(f);
            }}
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-800 shadow-[0_3px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_5px_0_#111]"
            >
              Choose image
            </button>
            {sourceFile && <span className="truncate text-xs font-semibold text-slate-700">{sourceFile.name}</span>}
          </div>

          {sourceImageDataUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <Image
                src={sourceImageDataUrl}
                alt="Source UI"
                width={1280}
                height={720}
                unoptimized
                className="h-auto w-full"
              />
            </div>
          )}
        </div>

        {/* Source: URL */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">Option B — Paste a live URL</p>
          <p className="mt-1 text-[11px] text-slate-500">We’ll screenshot the page and render a wireframe.</p>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              setSourceFile(null);
              setSourceImageDataUrl(null);
              setWireframes([]);
              setSpecText(null);
              setSpecOpen(false);
              setError(null);
            }}
            placeholder="https://example.com"
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-1">
        <button
          type="button"
          disabled={!canGenerate || loading}
          onClick={handleGenerate}
          className="inline-flex items-center justify-center rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-8 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
          aria-busy={loading}
        >
          {loading ? "Rendering…" : "Render wireframe"}
        </button>
        {loading && (
          <div className="text-center text-xs text-slate-600">
            <p className="font-semibold">Generating…This can take up to ~30–60s</p>
            <p className="mt-1">Thinking: {elapsedSeconds}s</p>
          </div>
        )}
      </div>


      {expandedSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-[95vw] max-h-[95vh] rounded-2xl bg-white p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setExpandedSrc(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-red-700 transition-colors"
              aria-label="Close"
            >
              ✕ Close
            </button>
            <div className="overflow-auto rounded-xl border border-slate-200 max-h-[calc(95vh-6rem)]">
              <div className="relative min-h-[50vh] w-full">
                <Image
                  src={expandedSrc}
                  alt="Expanded wireframe"
                  fill
                  sizes="95vw"
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
