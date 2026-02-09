"use client";

import { useEffect, useState } from "react";

type PlaybookItem = {
  id: string;
  title: string;
  audioUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  showAudio: boolean;
  showVideo: boolean;
  showDocument: boolean;
};

type MediaModal = {
  type: "audio" | "video";
  url: string;
  title: string;
} | null;

/**
 * Extracts a YouTube embed URL from various YouTube link formats.
 */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    } else if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v");
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/embed/")[1];
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

export default function PlaybookScroller() {
  const [items, setItems] = useState<PlaybookItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MediaModal>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/playbook/public")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items ?? []);
        setVisibleCount(data.visibleCount ?? 3);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openMedia = (type: "audio" | "video", url: string, title: string) => {
    setModal({ type, url, title });
  };

  const closeModal = () => setModal(null);

  if (loading) return null;
  if (items.length === 0) return null;

  const displayedItems = showAll ? items : items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;

  return (
    <>
      <div className="mt-8 mb-6">
        <div className="mb-4">
          <h3 className="text-[20px] font-bold tracking-wide text-black">
            Luke UX Playbook
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            Short guides to get the most out of Luke UX
          </p>
        </div>

        {/* Table rows */}
        <div className="overflow-hidden rounded-[16px] border-[2px] border-black shadow-[0_4px_0_#0a0a0a]">
          {displayedItems.map((item, index) => {
            const hasAudio = item.showAudio && item.audioUrl;
            const hasVideo = item.showVideo && item.videoUrl;
            const hasDocument = item.showDocument && item.documentUrl;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 bg-white px-5 py-4 ${
                  index < displayedItems.length - 1 ? "border-b-[1.5px] border-slate-200" : ""
                } transition hover:bg-slate-50`}
              >
                {/* Icon + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 rounded-lg bg-[#ffd526] p-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-black">
                      <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H18.5C19.3284 3 20 3.67157 20 4.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5Z" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-900 truncate">{item.title}</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasAudio && (
                    <button
                      type="button"
                      onClick={() => openMedia("audio", item.audioUrl!, item.title)}
                      className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 hover:-translate-y-[1px] hover:shadow"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                        <path d="M12 3V21M8 8V16M16 6V18M4 11V13M20 10V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <span>Audio</span>
                    </button>
                  )}

                  {hasVideo && (
                    <button
                      type="button"
                      onClick={() => openMedia("video", item.videoUrl!, item.title)}
                      className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 hover:-translate-y-[1px] hover:shadow"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-red-600">
                        <path d="M5 4L19 12L5 20V4Z" fill="currentColor" />
                      </svg>
                      <span>Video</span>
                    </button>
                  )}

                  {hasDocument && (
                    <a
                      href={item.documentUrl!}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 hover:-translate-y-[1px] hover:shadow"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
                        <path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <span>Guide</span>
                    </a>
                  )}

                  {!hasAudio && !hasVideo && !hasDocument && (
                    <span className="text-[11px] text-slate-400 italic">Coming soon</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More / Show Less */}
        {hasMore && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-black hover:underline"
            >
              {showAll ? `Show less` : `Show all ${items.length} items`}
            </button>
          </div>
        )}
      </div>

      {/* Media Player Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${modal.type === "audio" ? "Audio" : "Video"}: ${modal.title}`}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-2xl rounded-[20px] border-[2px] border-black bg-white shadow-[0_8px_0_#0a0a0a] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {modal.type === "audio" ? (
                  <span className="rounded-md bg-blue-100 p-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                      <path d="M12 3V21M8 8V16M16 6V18M4 11V13M20 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : (
                  <span className="rounded-md bg-red-100 p-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
                      <path d="M5 4L19 12L5 20V4Z" fill="currentColor" />
                    </svg>
                  </span>
                )}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {modal.type === "audio" ? "Audio Overview" : "How-to Video"}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{modal.title}</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-lg font-bold text-slate-700 hover:bg-slate-100 leading-none"
                aria-label="Close media player"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {modal.type === "audio" ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <audio
                    controls
                    autoPlay
                    className="w-full"
                    src={modal.url}
                    style={{ outline: "none" }}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                  {getYouTubeEmbedUrl(modal.url) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(modal.url)!}
                      title={modal.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      frameBorder="0"
                    />
                  ) : (
                    <video
                      controls
                      autoPlay
                      className="w-full h-full"
                      src={modal.url}
                    >
                      Your browser does not support the video element.
                    </video>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
