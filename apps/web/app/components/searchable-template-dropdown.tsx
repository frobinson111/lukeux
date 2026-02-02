"use client";

import { useState, useRef, useEffect, useMemo } from "react";

type TemplateRow = {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  guidanceUseAiTo: string | null;
  guidanceExample: string | null;
  guidanceOutcome: string | null;
  TemplateCategory: {
    name: string;
  } | null;
};

type GroupedTemplate = {
  framework: string;
  sortOrder: number;
  categories: {
    category: string;
    items: TemplateRow[];
  }[];
};

type Props = {
  templates: TemplateRow[];
  onTemplateSelect: (template: TemplateRow) => void;
  placeholder?: string;
};

export default function SearchableTemplateDropdown({
  templates,
  onTemplateSelect,
  placeholder = "Select a UX task category",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Group templates by framework and category
  const groupedTemplates = useMemo(() => {
    const frameworkGroups: Record<string, {
      framework: string;
      sortOrder: number;
      categories: Record<string, {
        category: string;
        items: TemplateRow[];
      }>;
    }> = {};

    templates.forEach((t) => {
      const framework = t.TemplateCategory?.name || "No Framework";
      const sortOrder = 999; // Default sort order
      const category = t.category || "Uncategorized";

      if (!frameworkGroups[framework]) {
        frameworkGroups[framework] = { framework, sortOrder, categories: {} };
      }

      if (!frameworkGroups[framework].categories[category]) {
        frameworkGroups[framework].categories[category] = { category, items: [] };
      }

      frameworkGroups[framework].categories[category].items.push(t);
    });

    // Convert to sorted array
    return Object.values(frameworkGroups)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.framework.localeCompare(b.framework);
      })
      .map(fGroup => ({
        framework: fGroup.framework,
        sortOrder: fGroup.sortOrder,
        categories: Object.values(fGroup.categories)
          .sort((a, b) => a.category.localeCompare(b.category))
          .map(cGroup => ({
            category: cGroup.category,
            items: cGroup.items.sort((a, b) => a.title.localeCompare(b.title))
          }))
      }));
  }, [templates]);

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
            items: categoryGroup.items.filter((t) => {
              const searchText = [
                t.category,
                t.subcategory,
                t.title,
                t.TemplateCategory?.name,
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

  const handleSelect = (template: TemplateRow) => {
    onTemplateSelect(template);
    // Close dropdown when modal opens to prevent overlap
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left shadow-[0_6px_0_#eaebf1] transition-all hover:-translate-y-[1px] hover:shadow-[0_8px_0_#eaebf1] ${
          isOpen
            ? "border-slate-400 ring-1 ring-slate-400"
            : ""
        }`}
      >
        <span className="truncate text-sm font-medium text-slate-600">
          {placeholder}
        </span>
        <svg
          className={`h-5 w-5 text-slate-600 transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full z-50 mb-1 rounded-lg border border-slate-200 bg-white shadow-lg">
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
          <div className="max-h-80 overflow-y-auto p-3 custom-scroll">
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
                      <div className="mb-1 flex items-center gap-2 py-1">
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
                          categoryGroup.items.map((t) => {
                            // Show framework: category: title format
                            const parts: string[] = [];
                            // Add framework name first
                            if (frameworkGroup.framework && frameworkGroup.framework !== "No Framework") {
                              parts.push(frameworkGroup.framework);
                            }
                            if (t.category?.trim()) parts.push(t.category.trim());
                            if (t.subcategory) parts.push(t.subcategory);
                            parts.push(t.title);
                            const displayText = parts.join(": ");
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelect(t)}
                                className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
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
      
      <style jsx>{`
        .custom-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #ffd526;
          border-radius: 9999px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
