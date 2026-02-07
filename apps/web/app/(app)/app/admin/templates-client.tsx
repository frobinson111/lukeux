 "use client";

import { useState, useMemo } from "react";
import type { CategoryRow, TemplateRow, LlmModelRow } from "./page";
import { exportToCSV } from "./export-utils";

type TemplateFormData = {
  id?: string;
  category: string;
  subcategory: string;
  title: string;
  prompt: string;
  guidanceUseAiTo: string;
  guidanceExample: string;
  guidanceOutcome: string;
  assets: string;
  allowedModes: string[];
  allowUrlInput: boolean;
  allowFileUploads: boolean;
  allowMockupGeneration: boolean;
  allowRefineAnalysis: boolean;
  allowWireframeRenderer: boolean;
  isActive: boolean;
  templateCategoryId: string | null;
  taskType: "llm" | "accessibility";
  accessibilityConfig: { maxPages?: number } | null;
  defaultModel: string | null;
  defaultMode: string | null;
  defaultDetailLevel: string | null;
};

const emptyForm: TemplateFormData = {
  category: "",
  subcategory: "",
  title: "",
  prompt: "",
  guidanceUseAiTo: "",
  guidanceExample: "",
  guidanceOutcome: "",
  assets: "",
  allowedModes: ["auto", "instant", "thinking"],
  allowUrlInput: false,
  allowFileUploads: true,
  allowMockupGeneration: true,
  allowRefineAnalysis: true,
  allowWireframeRenderer: false,
  isActive: true,
  templateCategoryId: null,
  taskType: "llm",
  accessibilityConfig: null,
  defaultModel: null,
  defaultMode: null,
  defaultDetailLevel: null,
};

export default function TemplatesAdmin({
  initialTemplates,
  llmModels,
  categories: initialCategories
}: {
  initialTemplates: TemplateRow[];
  llmModels: LlmModelRow[];
  categories: CategoryRow[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [categories, setCategories] = useState(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateFormData | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Category management state
  const [showCategorySection, setShowCategorySection] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categorySortOrder, setCategorySortOrder] = useState(0);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  
  // Category dropdown state
  const [categoryMode, setCategoryMode] = useState<"select" | "new">("select");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);

  // Get unique existing categories from templates
  const existingCategories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.category?.toLowerCase().includes(query) ||
      t.subcategory?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Pagination
  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredTemplates.slice(startIndex, endIndex);
  }, [filteredTemplates, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredTemplates.length / rowsPerPage);

  const total = templates.length;
  const active = templates.filter((t) => t.isActive).length;

  const handleAddNew = () => {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setShowForm(true);
    setError(null);
    setCategoryMode("select");
    setNewCategoryName("");
    setNewCategoryError(null);
  };

  const handleEdit = (template: TemplateRow) => {
    const allowMockupGeneration = (template as any).allowMockupGeneration ?? true;
    const allowRefineAnalysis = (template as any).allowRefineAnalysis ?? true;
    const allowWireframeRenderer = (template as any).allowWireframeRenderer ?? false;
    const taskType = (template as any).taskType || "llm";
    const accessibilityConfig = (template as any).accessibilityConfig || null;
    const editData: TemplateFormData = {
      id: template.id,
      category: template.category,
      subcategory: template.subcategory || "",
      title: template.title,
      prompt: template.prompt,
      guidanceUseAiTo: template.guidanceUseAiTo || "",
      guidanceExample: template.guidanceExample || "",
      guidanceOutcome: template.guidanceOutcome || "",
      assets: template.assets || "",
      allowedModes: template.allowedModes || ["auto", "instant", "thinking"],
      allowUrlInput: (template as any).allowUrlInput || false,
      allowFileUploads: (template as any).allowFileUploads ?? true,
      allowMockupGeneration,
      allowRefineAnalysis,
      allowWireframeRenderer,
      isActive: template.isActive,
      templateCategoryId: template.templateCategoryId || null,
      taskType,
      accessibilityConfig,
      defaultModel: (template as any).defaultModel || null,
      defaultMode: (template as any).defaultMode || null,
      defaultDetailLevel: (template as any).defaultDetailLevel || null,
    };
    setEditingTemplate(editData);
    setFormData(editData);
    setShowForm(true);
    setError(null);
    setCategoryMode("select");
    setNewCategoryName("");
    setNewCategoryError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData(emptyForm);
    setError(null);
    setCategoryMode("select");
    setNewCategoryName("");
    setNewCategoryError(null);
  };

  const handleSave = async () => {
    if (!formData.category || !formData.title || !formData.prompt) {
      setError("Category, title, and prompt are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const isEditing = !!editingTemplate?.id;
      const url = isEditing ? `/api/templates/${editingTemplate.id}` : "/api/templates";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formData.category,
          subcategory: formData.subcategory,
          title: formData.title,
          prompt: formData.prompt,
          guidanceUseAiTo: formData.guidanceUseAiTo || null,
          guidanceExample: formData.guidanceExample || null,
          guidanceOutcome: formData.guidanceOutcome || null,
          assets: formData.assets || null,
          allowedModes: formData.allowedModes,
          allowUrlInput: formData.allowUrlInput,
          allowFileUploads: formData.allowFileUploads,
          allowMockupGeneration: formData.allowMockupGeneration,
          allowRefineAnalysis: formData.allowRefineAnalysis,
          allowWireframeRenderer: formData.allowWireframeRenderer,
          isActive: formData.isActive,
          templateCategoryId: formData.templateCategoryId,
          taskType: formData.taskType,
          accessibilityConfig: formData.accessibilityConfig,
          defaultModel: formData.defaultModel,
          defaultMode: formData.defaultMode,
          defaultDetailLevel: formData.defaultDetailLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save template");
        return;
      }

      if (isEditing) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? data.template : t))
        );
      } else {
        setTemplates((prev) => [...prev, data.template]);
      }

      handleCancel();
    } catch (err) {
      setError("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  const handleModeToggle = (mode: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedModes: prev.allowedModes.includes(mode)
        ? prev.allowedModes.filter((m) => m !== mode)
        : [...prev.allowedModes, mode],
    }));
  };

  // Category management handlers
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      setCategoryError("Category name is required");
      return;
    }

    setSavingCategory(true);
    setCategoryError(null);

    try {
      if (editingCategoryId) {
        // Update existing category
        const res = await fetch("/api/admin/template-categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCategoryId,
            name: categoryName.trim(),
            sortOrder: categorySortOrder,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update category");
        }

        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategoryId ? { ...c, name: data.name, sortOrder: data.sortOrder } : c))
        );
      } else {
        // Create new category
        const res = await fetch("/api/admin/template-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName.trim(),
            sortOrder: categorySortOrder,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create category");
        }

        setCategories((prev) => [...prev, { id: data.id, name: data.name, sortOrder: data.sortOrder }].sort((a, b) => a.sortOrder - b.sortOrder));
      }

      // Reset form
      setCategoryName("");
      setCategorySortOrder(0);
      setEditingCategoryId(null);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditCategory = (cat: CategoryRow) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategorySortOrder(cat.sortOrder ?? 0);
    setCategoryError(null);
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategorySortOrder(0);
    setCategoryError(null);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Templates linked to it will be unlinked.")) return;

    try {
      const res = await fetch(`/api/admin/template-categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete category");
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Templates</span>
          <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
            {active} active / {total} total
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
            {categories.length} categories
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportToCSV(
              filteredTemplates,
              [
                { key: "category", label: "Category" },
                { key: "subcategory", label: "Subcategory" },
                { key: "title", label: "Title" },
                { key: "prompt", label: "Prompt" },
                { key: "isActive", label: "Status", format: (v) => v ? "Active" : "Inactive" },
                { key: "createdAt", label: "Created At", format: (v) => v instanceof Date ? v.toISOString().split("T")[0] : String(v) }
              ],
              "ux-objectives"
            )}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleAddNew}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Template
          </button>
        </div>
      </div>

      {/* Frameworks Section */}
      <div className="mb-6 border-b border-slate-200 pb-4">
        <button
          onClick={() => setShowCategorySection(!showCategorySection)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <span className={`transform transition-transform ${showCategorySection ? "rotate-90" : ""}`}>▶</span>
          Frameworks ({categories.length})
        </button>

        {showCategorySection && (
          <div className="mt-3 space-y-3">
            {/* Framework Form */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {editingCategoryId ? "Edit UX Framework" : "New UX Framework"}
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Research"
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Sort Order</label>
                  <input
                    type="number"
                    value={categorySortOrder}
                    onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCategory}
                    disabled={savingCategory}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingCategory ? "Saving..." : editingCategoryId ? "Update" : "Add"}
                  </button>
                  {editingCategoryId && (
                    <button
                      onClick={handleCancelCategoryEdit}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {categoryError && (
                <p className="mt-2 text-xs text-red-600">{categoryError}</p>
              )}
            </div>

            {/* Categories List */}
            {categories.length === 0 ? (
              <p className="text-sm text-slate-500">No categories yet. Add one above.</p>
            ) : (
              <div className="rounded-md border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2 w-24">Sort Order</th>
                      <th className="px-3 py-2 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-900">{cat.name}</td>
                        <td className="px-3 py-2 text-slate-600">{cat.sortOrder ?? 0}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by title, category, or subcategory..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-1 text-xs text-slate-500">
            Showing {filteredTemplates.length} of {total} templates
          </p>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 font-semibold text-slate-900">
            {editingTemplate?.id ? "Edit Template" : "Add New Template"}
          </h3>
          
          {error && (
            <div className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Category *</label>
              <select
                value={categoryMode === "new" ? "__new__" : formData.category}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "__new__") {
                    setCategoryMode("new");
                    setNewCategoryName("");
                    setNewCategoryError(null);
                    setFormData((prev) => ({ ...prev, category: "" }));
                  } else {
                    setCategoryMode("select");
                    setNewCategoryName("");
                    setNewCategoryError(null);
                    setFormData((prev) => ({ ...prev, category: value }));
                  }
                }}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Choose existing category...</option>
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__new__">➕ Create New Category</option>
              </select>
              {categoryMode === "new" && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewCategoryName(value);
                      
                      // Validate for duplicates (case-insensitive)
                      const duplicate = existingCategories.find(
                        cat => cat.toLowerCase() === value.trim().toLowerCase()
                      );
                      
                      if (duplicate) {
                        setNewCategoryError(`Category "${duplicate}" already exists`);
                        setFormData((prev) => ({ ...prev, category: "" }));
                      } else {
                        setNewCategoryError(null);
                        setFormData((prev) => ({ ...prev, category: value.trim() }));
                      }
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="Enter new category name..."
                  />
                  {newCategoryError && (
                    <p className="mt-1 text-xs text-red-600">{newCategoryError}</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Subcategory</label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="e.g., Synthesis"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Description *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="e.g., Research Synthesis"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Prompt *</label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData((prev) => ({ ...prev, prompt: e.target.value }))}
                className="min-h-[350px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="The system prompt for this template..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">WHAT LUKE UX WILL CHECK</label>
              <textarea
                value={formData.guidanceUseAiTo}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceUseAiTo: e.target.value }))}
                className="min-h-[350px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Supports HTML: <strong>bold</strong>, <br>, <ul><li>list</li></ul>"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">EXAMPLE OF A PROBLEM</label>
              <textarea
                value={formData.guidanceExample}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceExample: e.target.value }))}
                className="min-h-[350px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Supports HTML: <strong>bold</strong>, <br>, <ul><li>list</li></ul>"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">HOW LUKE UX HELPS</label>
              <textarea
                value={formData.guidanceOutcome}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceOutcome: e.target.value }))}
                className="min-h-[350px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Supports HTML: <strong>bold</strong>, <br>, <ul><li>list</li></ul>"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">UPLOAD THESE FILES</label>
              <textarea
                value={formData.assets}
                onChange={(e) => setFormData((prev) => ({ ...prev, assets: e.target.value }))}
                className="min-h-[350px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Supports HTML: <strong>bold</strong>, <br>, <ul><li>list</li></ul>"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Allowed Modes</label>
              <div className="flex flex-wrap gap-2">
                {["auto", "instant", "thinking"].map((mode) => (
                  <label key={mode} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.allowedModes.includes(mode)}
                      onChange={() => handleModeToggle(mode)}
                    />
                    {mode}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Framework</label>
              <select
                value={formData.templateCategoryId || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, templateCategoryId: e.target.value || null }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Task-Optimized Defaults</label>
              <p className="mb-2 text-xs text-slate-500">
                Set the default model, mode, and detail level for this task. Users see this as the &ldquo;Task-Optimized&rdquo; preset.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Default Model</label>
                  <select
                    value={formData.defaultModel || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultModel: e.target.value || null }))}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">None</option>
                    {llmModels.filter((m) => m.isEnabled).map((m) => (
                      <option key={m.modelId} value={m.modelId}>{m.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Default Mode</label>
                  <select
                    value={formData.defaultMode || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultMode: e.target.value || null }))}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">None</option>
                    <option value="auto">Auto</option>
                    <option value="instant">Instant</option>
                    <option value="thinking">Thinking</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Default Detail Level</label>
                  <select
                    value={formData.defaultDetailLevel || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultDetailLevel: e.target.value || null }))}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">None</option>
                    <option value="brief">Brief</option>
                    <option value="standard">Standard</option>
                    <option value="in-depth">In-depth</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.allowUrlInput}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowUrlInput: e.target.checked }))}
                />
                Allow URL Input
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.allowFileUploads}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowFileUploads: e.target.checked }))}
                />
                Allow File Uploads
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Controls whether users can attach files and follow-up assets for this template.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.allowMockupGeneration}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowMockupGeneration: e.target.checked }))}
                />
                Allow Mockup Generation
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Controls whether users can access the post-affordance mockup/image generation UI.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.allowRefineAnalysis}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowRefineAnalysis: e.target.checked }))}
                />
                Allow Refine the Analysis
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Controls whether users can access the post-affordance follow-up (Refine the Analysis) UI.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.allowWireframeRenderer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowWireframeRenderer: e.target.checked }))}
                />
                Allow Wireframe Renderer
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Controls whether users see the High‑Fidelity → Low‑Fidelity Wireframe tool for this UX objective.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Task Type</label>
              <select
                value={formData.taskType}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  taskType: e.target.value as "llm" | "accessibility",
                  // Reset accessibility config when switching to llm
                  accessibilityConfig: e.target.value === "llm" ? null : prev.accessibilityConfig,
                }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="llm">LLM (Standard AI Analysis)</option>
                <option value="accessibility">Accessibility Audit (WCAG/508)</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                LLM uses AI analysis. Accessibility runs automated WCAG 2.x AA + Section 508 scans.
              </p>
            </div>
            {formData.taskType === "accessibility" && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Max Pages to Scan</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.accessibilityConfig?.maxPages || 3}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    accessibilityConfig: { maxPages: Math.min(10, Math.max(1, parseInt(e.target.value) || 3)) },
                  }))}
                  className="mt-1 w-20 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Maximum number of URLs to scan per audit (1-10). Higher values increase scan time.
                </p>
              </div>
            )}
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded border border-slate-100" style={{ maxHeight: '600px' }}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-600 sticky top-0">
            <tr>
              <th className="px-3 py-2 bg-slate-50">Category</th>
              <th className="px-3 py-2 bg-slate-50">Description</th>
              <th className="px-3 py-2 bg-slate-50">Status</th>
              <th className="px-3 py-2 bg-slate-50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  {searchQuery ? "No templates match your search" : "No templates found"}
                </td>
              </tr>
            ) : (
              paginatedTemplates.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-700">{t.category || "Uncategorized"}</td>
                <td className="px-3 py-2 text-slate-900">{t.title}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                      t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(t)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredTemplates.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Show:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-600">
              Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredTemplates.length)} of {filteredTemplates.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
