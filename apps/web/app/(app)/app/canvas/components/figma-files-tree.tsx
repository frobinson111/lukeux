"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type FigmaFile = {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
};

type FigmaProject = {
  id: string;
  name: string;
  teamId: string;
};

type Props = {
  onFileSelect?: (fileUrl: string) => void;
};

export default function FigmaFilesTree({ onFileSelect }: Props) {
  const [projects, setProjects] = useState<FigmaProject[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [projectFiles, setProjectFiles] = useState<Record<string, FigmaFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();

    function handleTeamUpdated() {
      setLoading(true);
      setError(null);
      setProjects([]);
      setExpandedProjects(new Set());
      setProjectFiles({});
      fetchProjects();
    }

    window.addEventListener("figma-team-updated", handleTeamUpdated);
    return () => window.removeEventListener("figma-team-updated", handleTeamUpdated);
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/integrations/figma/projects");
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await res.json();
      if (data.needsTeamId) {
        // Team ID not configured yet — FigmaConnectInline handles this state
        setProjects([]);
        return;
      }
      if (data.error) {
        setError(data.error);
        return;
      }
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function toggleProject(projectId: string) {
    const newExpanded = new Set(expandedProjects);
    
    if (newExpanded.has(projectId)) {
      // Collapse
      newExpanded.delete(projectId);
      setExpandedProjects(newExpanded);
    } else {
      // Expand and fetch files if not already loaded
      newExpanded.add(projectId);
      setExpandedProjects(newExpanded);
      
      if (!projectFiles[projectId]) {
        setLoadingFiles(prev => new Set(prev).add(projectId));
        try {
          const res = await fetch(`/api/integrations/figma/files?projectId=${projectId}`);
          if (res.ok) {
            const data = await res.json();
            setProjectFiles(prev => ({ ...prev, [projectId]: data.files || [] }));
          }
        } catch (err) {
          console.error("Failed to fetch files for project:", err);
        } finally {
          setLoadingFiles(prev => {
            const next = new Set(prev);
            next.delete(projectId);
            return next;
          });
        }
      }
    }
  }

  function handleFileClick(file: FigmaFile) {
    const fileUrl = `https://www.figma.com/file/${file.key}`;
    if (onFileSelect) {
      onFileSelect(fileUrl);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500">Loading Figma projects...</div>
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

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Your Figma Files</h3>
        <p className="text-xs text-slate-500 mt-0.5">Click a project to see files, then click a file to analyze</p>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {projects.map((project) => {
          const isExpanded = expandedProjects.has(project.id);
          const files = projectFiles[project.id] || [];
          const isLoadingFiles = loadingFiles.has(project.id);
          
          return (
            <div key={project.id} className="border-b border-slate-100 last:border-b-0">
              {/* Project/Folder Row */}
              <button
                onClick={() => toggleProject(project.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <Image 
                  src={isExpanded ? "/images/open-folder.svg" : "/images/close-folder.svg"} 
                  alt={isExpanded ? "Open folder" : "Closed folder"} 
                  width={20} 
                  height={20} 
                  className="h-5 w-5 flex-shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{project.name}</div>
                </div>
                <svg 
                  className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              {/* Files List (shown when expanded) */}
              {isExpanded && (
                <div className="bg-slate-50 pl-8 pr-4">
                  {isLoadingFiles && (
                    <div className="py-3 text-xs text-slate-500">Loading files...</div>
                  )}
                  {!isLoadingFiles && files.length === 0 && (
                    <div className="py-3 text-xs text-slate-500">No files in this project</div>
                  )}
                  {!isLoadingFiles && files.map((file) => (
                    <button
                      key={file.key}
                      onClick={() => handleFileClick(file)}
                      className="flex w-full items-center gap-2 py-2 text-left hover:bg-slate-100 rounded transition-colors"
                    >
                      <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 truncate">{file.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
