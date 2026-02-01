"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  historyTitle: string;
  onRename: (newTitle: string) => void;
  onMoveToProject: (projectId: string) => void;
  onDelete: () => void;
  projectFolders: { id: string; name: string }[];
};

export default function HistoryItemMenu({
  isOpen,
  onClose,
  triggerRef,
  historyTitle,
  onRename,
  onMoveToProject,
  onDelete,
  projectFolders,
}: Props) {
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [renameValue, setRenameValue] = useState(historyTitle);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on trigger button
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = 280;

      // Position to the right of the trigger, or left if not enough space
      let left = rect.right + 8;
      let top = rect.top;

      // Check if menu would overflow right edge
      if (left + menuWidth > window.innerWidth) {
        left = rect.left - menuWidth - 8;
      }

      // Check if menu would overflow bottom edge
      if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight - 16;
      }

      setPosition({ top, left });
      setRenameValue(historyTitle);
      setShowRenameInput(false);
      setShowMoveSubmenu(false);
    }
  }, [isOpen, triggerRef, historyTitle]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== historyTitle) {
      onRename(renameValue.trim());
    }
    setShowRenameInput(false);
    onClose();
  };

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
      style={{ top: position.top, left: position.left }}
    >
      {showRenameInput ? (
        <div className="px-3 py-2">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setShowRenameInput(false);
            }}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Enter new name"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setShowRenameInput(false)}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Rename */}
          <button
            onClick={() => setShowRenameInput(true)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Rename
          </button>

          {/* Move to project */}
          <div className="relative">
            <button
              onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="flex items-center gap-3">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Move to project
              </span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {showMoveSubmenu && (
              <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {projectFolders.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500">No projects yet</div>
                ) : (
                  projectFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        onMoveToProject(folder.id);
                        onClose();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {folder.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-slate-100" />

          {/* Delete */}
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </>
      )}
    </div>
  );

  // Use portal to render menu outside scroll container
  if (typeof document !== "undefined") {
    return createPortal(menuContent, document.body);
  }

  return null;
}
