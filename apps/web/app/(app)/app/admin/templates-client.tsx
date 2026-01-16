 "use client";

import { useState } from "react";
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
  categories
}: {
  initialTemplates: TemplateRow[];
  availableModels: string[];
  categories: CategoryRow[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateFormData | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!formData.category || !formData.subcategory || !formData.title || !formData.prompt) {
      setError("Category, subcategory, title, and prompt are required");
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Subcategory *</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Guidance: Use AI to...</label>
              <input
                type="text"
                value={formData.guidanceUseAiTo}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceUseAiTo: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Guidance: Example</label>
              <input
                type="text"
                value={formData.guidanceExample}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceExample: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Guidance: Outcome</label>
              <input
                type="text"
                value={formData.guidanceOutcome}
                onChange={(e) => setFormData((prev) => ({ ...prev, guidanceOutcome: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Assets (JSON)</label>
              <input
                type="text"
                value={formData.assets}
                onChange={(e) => setFormData((prev) => ({ ...prev, assets: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                placeholder='e.g., ["image", "pdf"]'
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
            {templates.map((t) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

