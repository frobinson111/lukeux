"use client";

import { useRef } from "react";
import HistoryItemMenu from "./history-item-menu";

type Props = {
  item: { id: string; title: string };
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onLoadHistory: () => void;
  onRename: (newTitle: string) => void;
  onMoveToProject: (projectId: string) => void;
  onDelete: () => void;
  projectFolders: { id: string; name: string }[];
};

export default function HistoryItem({
  item,
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
  onLoadHistory,
  onRename,
  onMoveToProject,
  onDelete,
  projectFolders,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="group flex items-center gap-2 rounded px-3 py-1 transition hover:bg-slate-100">
      <button
        type="button"
        className="flex-1 truncate text-left text-sm font-semibold text-slate-800"
        onClick={onLoadHistory}
        title={item.title}
      >
        {item.title}
      </button>
      <button
        ref={triggerRef}
        type="button"
        className="hidden h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-200 group-hover:flex"
        onClick={onMenuToggle}
        aria-label="History actions"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>
      <HistoryItemMenu
        isOpen={isMenuOpen}
        onClose={onMenuClose}
        triggerRef={triggerRef}
        historyTitle={item.title}
        onRename={onRename}
        onMoveToProject={onMoveToProject}
        onDelete={onDelete}
        projectFolders={projectFolders}
      />
    </div>
  );
}
