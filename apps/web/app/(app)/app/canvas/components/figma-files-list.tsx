"use client";

import { useState, useEffect } from "react";

type FigmaFile = {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
};

export default function FigmaFilesList() {
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    try {
      const res = await fetch("/api/integrations/figma/files");
      if (!res.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500">Loading Figma files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm text-rose-600">Error: {error}</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500">No files found in your Figma account.</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Your Figma Files</h3>
        <p className="text-xs text-slate-500 mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''} found</p>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.key}
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50 transition-colors"
          >
            {file.thumbnail_url ? (
              <img
                src={file.thumbnail_url}
                alt={file.name}
                className="h-10 w-10 rounded border border-slate-200 object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded border border-slate-200 bg-slate-100 flex items-center justify-center">
                <FileIcon className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{file.name}</div>
              <div className="text-xs text-slate-500">
                Modified {new Date(file.last_modified).toLocaleDateString()}
              </div>
            </div>
            <a
              href={`https://www.figma.com/file/${file.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              Open
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
