 "use client";

import { useState, useMemo } from "react";
import type { CategoryRow, TemplateRow } from "./page";

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
  allowedModels: string[];
  isActive: boolean;
  templateCategoryId: string | null;
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
  allowedModels: [],
  isActive: true,
  templateCategoryId: null,
};

export default function TemplatesAdmin({
  initialTemplates,
  availableModels,
  categories: initialCategories
}: {
  initialTemplates: TemplateRow[];
  availableModels: string[];
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
  
  // Category management state
  const [showCategorySection, setShowCategorySection] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categorySortOrder, setCategorySortOrder] = useState(0);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.category?.toLowerCase().includes(query) ||
      t.subcategory?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const total = templates.length;
  const active = templates.filter((t) => t.isActive).length;

  const handleAddNew = () => {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (template: TemplateRow) => {
    setEditingTemplate({
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
      allowedModels: template.allowedModels || [],
      isActive: template.isActive,
      templateCategoryId: template.templateCategoryId || null,
    });
    setFormData({
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
      allowedModels: template.allowedModels || [],
      isActive: template.isActive,
      templateCategoryId: template.templateCategoryId || null,
    });
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData(emptyForm);
    setError(null);
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
          allowedModels: formData.allowedModels,
          isActive: formData.isActive,
          templateCategoryId: formData.templateCategoryId,
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

  const handleModelToggle = (model: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedModels: prev.allowedModels.includes(model)
        ? prev.allowedModels.filter((m) => m !== model)
        : [...prev.allowedModels, model],
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
            {availableModels.length} models
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-800">
            {categories.length} categories
          </span>
        </div>
        <button
          onClick={handleAddNew}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Template
        </button>
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
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="e.g., Research"
              />
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Title *</label>
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
                className="h-24 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="The system prompt for this template..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">WHAT LUKEUX WILL CHECK</label>
              <textarea
                value={formData.guidanceUseAiTo}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceUseAiTo: e.target.value }))}
                className="h-24 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Supports HTML: <strong>bold</strong>, <br>, <ul><li>list</li></ul>"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">EXAMPLE OF THE PROBLEM</label>
              <textarea
                value={formData.guidanceExample}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceExample: e.target.value }))}
                className="h-24 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Supports HTML: <strong>bold</strong>, <br>, <ul><li>list</li></ul>"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">HOW LUKEUX HELPS</label>
              <textarea
                value={formData.guidanceOutcome}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceOutcome: e.target.value }))}
                className="h-24 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Supports HTML: <strong>bold</strong>, <br>, <ul><li>list</li></ul>"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">UPLOAD THESE FILES</label>
              <textarea
                value={formData.assets}
                onChange={(e) => setFormData((prev) => ({ ...prev, assets: e.target.value }))}
                className="h-24 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Category Link</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Allowed Models</label>
              <div className="flex flex-wrap gap-2">
                {availableModels.map((model) => (
                  <label key={model} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={formData.allowedModels.includes(model)}
                      onChange={() => handleModelToggle(model)}
                    />
                    {model}
                  </label>
                ))}
              </div>
            </div>
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

      <div className="max-h-80 overflow-auto rounded border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
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
              filteredTemplates.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-900">{t.title}</td>
                <td className="px-3 py-2 text-slate-700">{t.category || "Uncategorized"}</td>
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

      {/* Manage Categories Section */}
      <div className="mt-6 border-t border-slate-200 pt-4">
        <button
          onClick={() => setShowCategorySection(!showCategorySection)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <span className={`transform transition-transform ${showCategorySection ? "rotate-90" : ""}`}>▶</span>
          Manage Categories ({categories.length})
        </button>

        {showCategorySection && (
          <div className="mt-3 space-y-3">
            {/* Category Form */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {editingCategoryId ? "Edit Category Name" : "New Category Name"}
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
    </div>
  );
}
