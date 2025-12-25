"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type ProjectFolder = { id: string; name: string; open: boolean; sortOrder?: number };
type HistoryItem = { id: string; title: string; content: string; templateIndex: number | null; projectId: string | null };

const templates = [{
  category: "Discover — Research & Insight Generation",
  useAiTo:
    "Cluster qualitative data into themes, mental models, and accessibility-related pain points.",
  example:
    "Combine interview notes and support tickets to uncover root causes tied to cognition, access, or context.",
  outcome: "Clear, defensible insights instead of surface-level observations.",
  assets:
    "User interview transcripts, support tickets, survey open-ended responses, and ethnographic notes.",
  prompt:
    "You are supporting a senior UX designer working on an enterprise SaaS product that must meet WCAG 2.1 AA and Section 508 requirements and is currently in the discovery phase. Using the provided interview notes and support tickets, cluster the data into underlying user needs, mental models, and accessibility-related barriers. Group findings by mental model rather than keywords, explicitly call out accessibility-specific themes, avoid inventing insights not supported by the data, and output a concise bulleted list with defensible explanations. Desired output includes themes like 'Cognitive overload during setup' or 'Keyboard navigation breaks trust.' Avoid generic labels like 'usability issues.'"
}];

const projects = ["New UX Task"];

const models = ["gpt-4o-mini", "gpt-4o", "ChatGPT 5.2", "Claude 3.5"] as const;

export default function CanvasPage({ firstName }: { firstName?: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState<(typeof models)[number]>(models[0]);
  const [templateIndex, setTemplateIndex] = useState<number | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [inputsCollapsed, setInputsCollapsed] = useState(false);
  const [promptEditing, setPromptEditing] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyMenu, setHistoryMenu] = useState<string | null>(null);
  const [historyRename, setHistoryRename] = useState<string>("");
  const [historyMoveProject, setHistoryMoveProject] = useState<string>("");
  const [saveProjectMenu, setSaveProjectMenu] = useState(false);
  const [saveProjectSelection, setSaveProjectSelection] = useState<string>("");
  const [projectFolders, setProjectFolders] = useState<ProjectFolder[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const template = templateIndex !== null ? templates[templateIndex] : null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [firstNameLocal, setFirstNameLocal] = useState(firstName || "");

  useEffect(() => {
    async function loadUser() {
      if (firstNameLocal) return;
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const name = data?.user?.firstName || data?.firstName;
        if (name) setFirstNameLocal(name);
      } catch {
        // ignore
      }
    }
    loadUser();
  }, [firstNameLocal]);

  useEffect(() => {
    if (template) {
      setEditablePrompt(template.prompt);
      setPromptEditing(false);
    } else {
      setEditablePrompt("");
      setPromptEditing(false);
    }
  }, [templateIndex, template]);

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, historyRes] = await Promise.all([fetch("/api/projects"), fetch("/api/history")]);

        if (projectsRes.ok) {
          const json = await projectsRes.json();
          const projects: { id: string; name: string }[] = json.projects ?? [];
          setProjectFolders(projects.map((p) => ({ ...p, open: false })));
        } else {
          setStatus("Failed to load projects.");
        }

        if (historyRes.ok) {
          const json = await historyRes.json();
          const entries: HistoryItem[] = (json.history ?? []).map((h: any) => ({
            id: h.id,
            title: h.title,
            content: h.content,
            templateIndex: h.templateIndex ?? null,
            projectId: h.projectId ?? null
          }));
          setHistory(entries);
        } else {
          setStatus((prev) => prev || "Failed to load history.");
        }
      } catch (err) {
        setStatus("Failed to load workspace.");
      }
    }

    load();
  }, []);

  function handleUploadSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleCreateProject() {
    setShowProjectForm(true);
    setProjectName("");
  }

  async function handleSaveProject() {
    const name = projectName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus(data?.error || "Failed to create project.");
        return;
      }
      const data = await res.json();
      const project = data.project as { id: string; name: string; sortOrder?: number };
      setProjectFolders((prev) =>
        [...prev, { ...project, open: false }].sort((a, b) => {
          if (a.sortOrder !== undefined && b.sortOrder !== undefined && a.sortOrder !== b.sortOrder) {
            return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          }
          return a.name.localeCompare(b.name);
        })
      );
      setShowProjectForm(false);
      setProjectName("");
      setSaveProjectSelection(project.id);
    } catch (err) {
      setStatus("Failed to create project.");
    }
  }

  function handleCancelProject() {
    setShowProjectForm(false);
    setProjectName("");
  }

  async function addToHistory(content: string) {
    const title = template ? template.category : "Untitled Task";
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          templateIndex,
          projectId: null
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.error || "Failed to save history.");
        return;
      }
      const entry = data.history as HistoryItem;
      setHistory((prev) => [entry, ...prev]);
    } catch (err) {
      setStatus("Failed to save history.");
    }
  }

  async function renameHistory(id: string) {
    const current = history.find((h) => h.id === id);
    if (!current) return;
    const next = historyRename.trim();
    if (!next) return;
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.error || "Failed to rename history.");
        return;
      }
      const updated = data.history as HistoryItem;
      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, title: updated.title } : h)));
      setHistoryMenu(null);
      setHistoryRename("");
    } catch (err) {
      setStatus("Failed to rename history.");
    }
  }

  async function deleteHistory(id: string) {
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus(data?.error || "Failed to delete history.");
        return;
      }
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setStatus("Failed to delete history.");
    }
  }

  async function moveHistoryToFolder(id: string, projectId: string) {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.error || "Failed to move history.");
        return;
      }
      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, projectId } : h)));
      const projectName = projectFolders.find((p) => p.id === projectId)?.name ?? "project";
      setStatus(`Moved to ${projectName}`);
      setHistoryMenu(null);
      setHistoryRename("");
    } catch (err) {
      setStatus("Failed to move history.");
    }
  }

  async function saveCurrentToFolder(projectId: string) {
    if (!projectId || !lastResponse) return;
    const title = template ? template.category : "Untitled Task";
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: lastResponse,
          templateIndex,
          projectId
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.error || "Failed to save history.");
        return;
      }
      const entry = data.history as HistoryItem;
      setHistory((prev) => [entry, ...prev]);
      const projectName = projectFolders.find((p) => p.id === projectId)?.name ?? "project";
      setStatus(`Saved to ${projectName}`);
      setSaveProjectMenu(false);
    } catch (err) {
      setStatus("Failed to save history.");
    }
  }

  function loadHistory(id: string) {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    setTemplateIndex(item.templateIndex);
    setLastResponse(item.content);
    setStatus("Loaded from history");
    setHistoryMenu(null);
  }

  async function handleGenerate() {
    if (!template || !model) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: template.category,
          model,
          prompt: editablePrompt?.trim() || template.prompt,
          files: files.map((f) => f.name)
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.error || "Generation failed.");
      } else {
        setStatus("Generation started.");
        setTaskId(data?.taskId || null);
        setThreadId(data?.threadId || null);
        const resp = data?.content || null;
        setLastResponse(resp);
        if (resp) await addToHistory(resp);
        setInputsCollapsed(true);
        setInputsCollapsed(true);
      }
    } catch (err) {
      setStatus("Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto flex max-w-6xl gap-6 px-6 pt-0 pb-10 min-h-[calc(100vh-5rem)] items-stretch">
        <aside
          className={`hidden shrink-0 flex-col gap-4 border-r-2 border-[#EEEEEE] transition-all duration-200 md:flex ${railCollapsed ? "w-16" : "w-64"}`}
        >
          <div className="pt-5">
            <div className="flex items-center justify-between px-3">
              <Image src="/images/logo-icon.svg" alt="Home" width={32} height={32} className="h-8 w-8" />
              <button
                type="button"
                onClick={() => setRailCollapsed((v) => !v)}
                className="flex h-8 w-8 items-center justify-center text-slate-700 transition"
                aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Image src="/images/expand.svg" alt="Toggle" width={20} height={20} className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-2 px-2 text-sm font-semibold text-slate-800">
            {projects.map((proj, idx) => (
              <div key={proj} className={`space-y-1 ${proj === "New UX Task" ? "mt-[10px]" : ""}`}>
                <button
                  className="flex w-full items-center gap-3 px-3 py-2 transition hover:-translate-y-[1px]"
                  onClick={() => {
                    if (proj === "New UX Task") {
                      setTemplateIndex(null);
                      setLastResponse(null);
                      setStatus(null);
                      setInputsCollapsed(false);
                      setFiles([]);
                      setTaskId(null);
                      setThreadId(null);
                      setEditablePrompt("");
                      setPromptEditing(false);
                    }
                  }}
                >
                  <Image src={proj === "New UX Task" ? "/images/new-project.svg" : "/images/close-folder.svg"} alt={proj === "New UX Task" ? "New UX Task" : "Folder"} width={20} height={20} className="h-5 w-5 flex-shrink-0" />
                  {!railCollapsed && <span className="flex-1 text-left">{proj}</span>}

                </button>
                {proj === "New UX Task" && !railCollapsed && (
                  <div className="space-y-1">
                    <div className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Projects</div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:-translate-y-[1px]"
                      onClick={handleCreateProject}
                    >
                      <Image src="/images/add-project.svg" alt="New Project" width={20} height={20} className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1 text-left">Create New Project</span>
                    </button>
                    {showProjectForm && (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 space-y-2">
                        <input
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="Project folder name"
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
                            onClick={handleCancelProject}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-black px-3 py-1 text-[11px] font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111]"
                            onClick={handleSaveProject}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                    {projectFolders.length > 0 && (
                      <div className="space-y-1">
                        {projectFolders.map((folder) => (
                          <div key={folder.id} className="space-y-1 px-2 py-2">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-1 py-1 text-sm font-semibold text-slate-800 transition hover:-translate-y-[1px]"
                              onClick={() =>
                                setProjectFolders((prev) =>
                                  prev.map((f) => (f.id === folder.id ? { ...f, open: !f.open } : f))
                                )
                              }
                            >
                              <Image src="/images/close-folder.svg" alt="Project Folder" width={20} height={20} className="h-5 w-5 flex-shrink-0" />
                              <span className="flex-1 text-left">{folder.name}</span>
                              <span className={`text-xs text-slate-500 transition ${folder.open ? "rotate-90" : ""}`}>⌄</span>
                            </button>
                            {folder.open && (
                              <div className="space-y-1 pl-7">
                                {history.filter((h) => h.projectId === folder.id).length === 0 && (
                                  <div className="text-[11px] text-slate-500">No UX tasks yet</div>
                                )}
                                {history
                                  .filter((h) => h.projectId === folder.id)
                                  .map((h) => (
                                    <div key={h.id} className="flex items-center gap-2">
                                      <button
                                        className="flex-1 rounded-md px-2 py-1 text-left text-sm font-medium text-slate-800 hover:bg-slate-100"
                                        onClick={() => loadHistory(h.id)}
                                      >
                                        {h.title}
                                      </button>
                                      <button
                                        className="flex h-6 w-6 items-center justify-center text-red-600 hover:text-red-700"
                                        onClick={() => deleteHistory(h.id)}
                                        aria-label="Delete history item"
                                      >
                                        <Image src="/images/trash.svg" alt="Delete" width={16} height={16} className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {idx === 0 && !railCollapsed && (
                  <div className="space-y-1">
                    <div className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">History</div>
                    <div className="space-y-1">
                      {history.filter((h) => !h.projectId).length === 0 && (
                        <div className="px-3 text-[11px] text-slate-500">No history yet</div>
                      )}
                      {history.filter((h) => !h.projectId).map((item) => (
                        <div key={item.id} className="group flex items-center gap-2 px-3 py-1 rounded hover:bg-slate-100 transition">
                          <button
                            type="button"
                            className="flex-1 text-left text-sm font-semibold text-slate-800"
                            onClick={() => loadHistory(item.id)}
                          >
                            {item.title}
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              className="hidden h-6 w-6 items-center justify-center rounded-full text-slate-600 transition group-hover:flex"
                              onClick={() => {
                                setHistoryMenu((m) => (m === item.id ? null : item.id));
                                setHistoryRename(item.title);
                                setHistoryMoveProject(projectFolders[0]?.id ?? "");
                              }}
                              aria-label="History actions"
                            >
                              ⋯
                            </button>
                            {historyMenu === item.id && (
                              <div className="absolute right-0 top-7 z-10 w-44 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs font-semibold text-slate-800">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold uppercase text-slate-600">Rename</label>
                                  <input
                                    value={historyRename}
                                    onChange={(e) => setHistoryRename(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-[12px] font-medium text-slate-800 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
                                      onClick={() => {
                                        setHistoryMenu(null);
                                        setHistoryRename("");
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className="rounded-full bg-black px-3 py-1 text-[11px] font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111]"
                                      onClick={() => renameHistory(item.id)}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[11px] font-semibold uppercase text-slate-600">Move to Project</div>
                                  {projectFolders.length === 0 ? (
                                    <div className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                                      No project folders yet
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <select
                                        value={historyMoveProject}
                                        onChange={(e) => setHistoryMoveProject(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-[12px] font-medium text-slate-800 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                                      >
                                  {projectFolders.map((folder) => (
                                    <option key={folder.id} value={folder.id}>
                                      {folder.name}
                                    </option>
                                  ))}
                                      </select>
                              <button
                                className="w-full rounded-full bg-black px-3 py-2 text-[11px] font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
                                disabled={!historyMoveProject}
                                onClick={() => historyMoveProject && moveHistoryToFolder(item.id, historyMoveProject)}
                              >
                                Move
                              </button>
                                    </div>
                                  )}
                                </div>
                                <button
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    deleteHistory(item.id);
                                    setHistoryMenu(null);
                                  }}
                                  aria-label="Delete history item"
                                >
                                  <Image src="/images/trash.svg" alt="Delete" width={16} height={16} className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>
          </div>
        </aside>

        <main className="flex-1 space-y-6 pt-5">
          <header className="flex items-center justify-between text-sm text-slate-700">
            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <span>Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as (typeof models)[number])}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-black focus:outline-none"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <form action="/api/billing/portal" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase text-slate-800 transition hover:-translate-y-[1px]"
              >
                Manage Billing
              </button>
            </form>
          </header>

          {!lastResponse && (
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">
                {firstNameLocal ? `Hi ${firstNameLocal}, how can I support your UX work?` : "How can I support your UX work?"}
              </h1>
            </div>
          )}

          <section className="space-y-4">
            {!lastResponse && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Select a UX task to begin</p>
                <p className="text-xs text-slate-500">Pick a template from the dropdown above to load guidance and the prompt.</p>
              </div>
            </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
                <span className="shrink-0">{template ? template.category : "Select UX Task"}</span>
                <select
                  value={templateIndex ?? ""}
                  onChange={(e) => setTemplateIndex(e.target.value === "" ? null : Number(e.target.value))}
                  className="flex-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-black focus:outline-none"
                >
                  <option value="">Choose…</option>
                  {templates.map((t, idx) => (
                    <option key={t.category} value={idx}>
                      {t.category}
                    </option>
                  ))}
                </select>
              </div>

              {template && (
                <>
                  <div className="flex items-center justify-between px-5 py-2">
                    <span className="text-xs font-semibold text-slate-700">UX Guidance</span>
                    <button
                      type="button"
                      onClick={() => setInputsCollapsed((v) => !v)}
                      className="flex h-6 w-6 items-center justify-center text-slate-700 transition hover:-translate-y-[1px]"
                      aria-label={inputsCollapsed ? "Expand task inputs" : "Collapse task inputs"}
                    >
                      <span className={`transition-transform ${inputsCollapsed ? "" : "rotate-180"}`}>⌄</span>
                    </button>
                  </div>

                  <div className={`space-y-2 px-5 py-4 text-sm ${inputsCollapsed ? "hidden" : ""}`}>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">
                      <span className="inline-block rounded-sm bg-blue-900 px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
                        Use AI to
                      </span>
                      <p className="mt-2">{template.useAiTo}</p>
                    </div>
                    <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-slate-800">
                      <span className="inline-block text-[11px] font-semibold uppercase text-slate-600">Example</span>
                      <p className="mt-1">{template.example}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                      <span className="inline-block text-[11px] font-semibold uppercase">Outcome</span>
                      <p className="mt-1">{template.outcome}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900">
                      <span className="inline-block text-[11px] font-semibold uppercase text-slate-700">Core Input Assets</span>
                      <p className="mt-1">{template.assets}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {template && !inputsCollapsed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-amber-700">AI Prompt</p>
                  {!promptEditing && (
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center text-amber-700 transition hover:-translate-y-[1px]"
                      onClick={() => setPromptEditing(true)}
                      aria-label="Edit prompt"
                    >
                      <Image src="/images/edit-icon.svg" alt="Edit prompt" width={15} height={15} className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {promptEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editablePrompt}
                      onChange={(e) => setEditablePrompt(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111]"
                        onClick={() => setPromptEditing(false)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase text-slate-700 transition hover:-translate-y-[1px] hover:shadow"
                        onClick={() => {
                          setEditablePrompt(template.prompt);
                          setPromptEditing(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-amber-900">
                    {editablePrompt || template.prompt}
                  </p>
                )}
              </div>
            )}

            {template && !inputsCollapsed && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-slate-600">Upload Core Assets</p>
                  <p className="text-xs text-slate-500">PDF, DOCX, CSV, XLSX, PNG, JPG, SVG, TXT, MD</p>
                </div>
                {files.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <p className="font-semibold">Attached files</p>
                    <ul className="mt-1 list-disc pl-4">
                      {files.map((file) => (
                        <li key={file.name}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-col items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUploadSelect}
                    aria-label="Upload core assets"
                  />
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-white text-3xl font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:shadow disabled:opacity-60"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading || !template}
                    className="w-full rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-4 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70 md:w-80"
                  >
                    {loading ? "Working..." : "Generate"}
                  </button>
                </div>
              </div>
            )}
            {lastResponse && (
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                      onClick={() => {
                        setSaveProjectMenu((v) => !v);
                        setSaveProjectSelection(projectFolders[0]?.id ?? "");
                      }}
                    >
                      <Image src="/images/save-icon.svg" alt="Save" width={16} height={16} className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                    {saveProjectMenu && (
                      <div className="absolute left-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs font-semibold text-slate-800">
                        {projectFolders.length === 0 ? (
                          <div className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                            No project folders yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <select
                              value={saveProjectSelection}
                              onChange={(e) => setSaveProjectSelection(e.target.value)}
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-[12px] font-medium text-slate-800 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                            >
                              {projectFolders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                  {folder.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="w-full rounded-full bg-black px-3 py-2 text-[11px] font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111]"
                              onClick={() => saveProjectSelection && saveCurrentToFolder(saveProjectSelection)}
                            >
                              Save to folder
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" className="flex items-center gap-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900">
                    <Image src="/images/share.svg" alt="Share" width={16} height={16} className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{lastResponse}</p>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const followup = String(data.get("followup") || "").trim();
                    if (!followup || !taskId || !threadId) return;
                    setLoading(true);
                    setStatus(null);
                    try {
                      const res = await fetch("/api/tasks/iterate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          model,
                          prompt: followup,
                          taskId,
                          threadId
                        })
                      });
                      const json = await res.json().catch(() => null);
                      if (!res.ok) {
                        setStatus(json?.error || "Iteration failed.");
                      } else {
                        setLastResponse(json?.content || null);
                        setStatus("Iteration completed.");
                      }
                    } catch (err) {
                      setStatus("Iteration failed.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    <span className="block">Follow-up</span>
                    <textarea
                      name="followup"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      rows={3}
                      placeholder="Ask a follow-up or add new context"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:-translate-y-[1px]"
                      aria-label="Add assets"
                    >
                      <Image src="/images/add-assets.svg" alt="Add assets" width={25} height={25} className="h-6 w-6" />
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      aria-label="Send follow-up"
                      className="rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-4 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? (
                        "Working..."
                      ) : (
                        <Image src="/images/uparrow.svg" alt="Send" width={16} height={16} className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {status && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                {status}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
