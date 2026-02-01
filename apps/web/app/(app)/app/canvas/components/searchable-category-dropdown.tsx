"use client";

import { useState, useRef, useEffect, useMemo } from "react";

type Template = {
  id: string;
  category: string;
  subcategory?: string | null;
  title: string;
  prompt: string;
  guidanceUseAiTo?: string | null;
  guidanceExample?: string | null;
  guidanceOutcome?: string | null;
  assets?: string | null;
  allowedModels?: string[];
  allowedModes?: string[];
  allowUrlInput?: boolean;
  allowFileUploads?: boolean;
  allowMockupGeneration?: boolean;
  allowRefineAnalysis?: boolean;
  templateCategory?: { name: string; sortOrder: number } | null;
};

type FrameworkGroup = {
  framework: string;
  categories: {
    category: string;
    items: { t: Template; idx: number }[];
  }[];
};

type Props = {
  templateList: Template[];
  groupedTemplates: FrameworkGroup[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  placeholder?: string;
};

export default function SearchableCategoryDropdown({
  templateList,
  groupedTemplates,
  selectedIndex,
  onSelect,
  placeholder = "Select a Category",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = selectedIndex !== null ? templateList[selectedIndex] : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter templates based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedTemplates;
    }

    const query = searchQuery.toLowerCase();
    return groupedTemplates
      .map((frameworkGroup) => ({
        ...frameworkGroup,
        categories: frameworkGroup.categories
          .map((categoryGroup) => ({
            ...categoryGroup,
            items: categoryGroup.items.filter(({ t }) => {
              const searchText = [
                t.category,
                t.subcategory,
                t.title,
                t.templateCategory?.name,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return searchText.includes(query);
            }),
          }))
          .filter((categoryGroup) => categoryGroup.items.length > 0),
      }))
      .filter((frameworkGroup) => frameworkGroup.categories.length > 0);
  }, [groupedTemplates, searchQuery]);

  // Get display text for selected item
  const getDisplayText = (template: Template | null): string => {
    if (!template) return placeholder;
    const parts: string[] = [];
    const categoryLabel = template.category?.trim() || template.templateCategory?.name;
    if (categoryLabel) parts.push(categoryLabel);
    if (template.subcategory) parts.push(template.subcategory);
    parts.push(template.title);
    return parts.join(": ");
  };

  const handleSelect = (idx: number) => {
    onSelect(idx);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left transition-colors ${
          isOpen
            ? "border-slate-400 ring-1 ring-slate-400"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span
          className={`truncate text-sm ${
            selectedTemplate ? "font-medium text-slate-900" : "text-slate-500"
          }`}
        >
          {getDisplayText(selectedTemplate)}
        </span>
        <div className="flex items-center gap-2">
          {selectedTemplate && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e as any); }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              title="Clear selection"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className={`h-5 w-5 text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search Input */}
          <div className="border-b border-slate-200 p-3">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a category"
                className="w-full rounded-md border border-slate-200 py-2 pl-3 pr-10 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <svg
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-80 overflow-y-auto p-3">
            {filteredGroups.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                No categories found
              </div>
            ) : (
              <>
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Please select:
                </div>
                <div className="space-y-4">
                  {filteredGroups.map((frameworkGroup) => (
                    <div key={frameworkGroup.framework}>
                      {/* Framework Header */}
                      <div className="sticky top-0 mb-1 flex items-center gap-2 bg-white py-1">
                        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {frameworkGroup.framework}
                        </span>
                      </div>
                      {/* Framework Items */}
                      <div className="space-y-0.5 pl-1">
                        {frameworkGroup.categories.map((categoryGroup) =>
                          categoryGroup.items.map(({ t, idx }) => {
                            const isSelected = selectedIndex === idx;
                            // Show category: title format within the framework
                            const parts: string[] = [];
                            if (t.category?.trim()) parts.push(t.category.trim());
                            if (t.subcategory) parts.push(t.subcategory);
                            parts.push(t.title);
                            const displayText = parts.join(": ");
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelect(idx)}
                                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                  isSelected
                                    ? "bg-slate-100 font-medium text-slate-900"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {displayText}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
