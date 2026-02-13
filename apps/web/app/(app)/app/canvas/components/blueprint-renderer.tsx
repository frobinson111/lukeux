"use client";

import React, { useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type BlueprintEntry = { key: string; value: string };

type ParsedConcept = {
  id: string;            // e.g. "C1" or "C1_STACKED_CONFIG_DRAWER"
  name: string;          // human-readable name derived from concept_id
  entries: BlueprintEntry[];
  analystBullets: string[];  // analyst summary from markdown before the block
};

type ParsedBlueprint = {
  preamble: string;        // any text before/outside blueprint blocks (input verification, etc.)
  concepts: ParsedConcept[];
};

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Detects whether a response contains LUKEUX blueprint blocks.
 */
export function containsBlueprint(text: string): boolean {
  return /\[\[LUKEUX_BLUEPRINTS_V1\]\]/i.test(text);
}

/**
 * Parses an LLM response containing LUKEUX blueprint blocks.
 * Handles two formats:
 *  A) Single wrapper with [[C1]]..[[/C1]] inner blocks
 *  B) Multiple [[LUKEUX_BLUEPRINTS_V1]] wrappers (one per concept)
 */
export function parseBlueprint(text: string): ParsedBlueprint {
  const concepts: ParsedConcept[] = [];

  // ── Format A: Single wrapper with [[C1]]..[[/C1]] inner blocks ──
  const singleWrapperMatch = text.match(
    /\[\[LUKEUX_BLUEPRINTS_V1\]\]([\s\S]*?)\[\[\/LUKEUX_BLUEPRINTS_V1\]\]/
  );

  if (singleWrapperMatch) {
    const inner = singleWrapperMatch[1];
    // Check for [[C1]]..[[/C1]] inner blocks
    const conceptPattern = /\[\[C(\d+)\]\]([\s\S]*?)\[\[\/C\1\]\]/g;
    let match;
    while ((match = conceptPattern.exec(inner)) !== null) {
      const num = match[1];
      const body = match[2].trim();
      const entries = parseEntries(body);
      const conceptId = entries.find((e) => e.key === "concept_id")?.value ||
        entries.find((e) => e.key === "ID")?.value || `C${num}`;
      const name = entries.find((e) => e.key === "NAME")?.value ||
        humanizeConcept(conceptId);

      concepts.push({
        id: `C${num}`,
        name,
        entries,
        analystBullets: [],
      });
    }

    // If no inner [[C1]] blocks found, treat the whole wrapper as one concept
    if (concepts.length === 0) {
      const entries = parseEntries(inner.trim());
      const conceptId = entries.find((e) => e.key === "concept_id")?.value ||
        entries.find((e) => e.key === "ID")?.value || "C1";
      concepts.push({
        id: "C1",
        name: humanizeConcept(conceptId),
        entries,
        analystBullets: [],
      });
    }
  }

  // ── Format B: Multiple wrappers (one per concept section) ──
  if (concepts.length === 0) {
    const multiPattern = /\[\[LUKEUX_BLUEPRINTS_V1\]\]([\s\S]*?)\[\[\/LUKEUX_BLUEPRINTS_V1\]\]/g;
    let mMatch;
    let idx = 1;
    while ((mMatch = multiPattern.exec(text)) !== null) {
      const body = mMatch[1].trim();
      const entries = parseEntries(body);
      const conceptId = entries.find((e) => e.key === "concept_id")?.value ||
        entries.find((e) => e.key === "ID")?.value || `C${idx}`;
      const name = entries.find((e) => e.key === "NAME")?.value ||
        humanizeConcept(conceptId);

      // Find analyst bullets preceding this wrapper
      const wrapperStart = mMatch.index;
      const preceding = text.substring(0, wrapperStart);
      const analystBullets = extractAnalystBullets(preceding, idx);

      concepts.push({
        id: `C${idx}`,
        name,
        entries,
        analystBullets,
      });
      idx++;
    }
  }

  // Extract preamble (text before the first blueprint block)
  const firstBlockIdx = text.indexOf("[[LUKEUX_BLUEPRINTS_V1]]");
  const preamble = firstBlockIdx > 0
    ? text.substring(0, firstBlockIdx).trim()
    : "";

  return { preamble, concepts };
}

function parseEntries(body: string): BlueprintEntry[] {
  const entries: BlueprintEntry[] = [];
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Match key: value format
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim();
      entries.push({ key, value });
    }
  }
  return entries;
}

function humanizeConcept(id: string): string {
  // C1_STACKED_CONFIG_DRAWER → Stacked Config Drawer
  return id
    .replace(/^C\d+_?/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim() || id;
}

function extractAnalystBullets(textBefore: string, conceptNum: number): string[] {
  // Look for the closest "### Analyst Layer" or bullet list before the wrapper
  const sections = textBefore.split(/###?\s*(?:Concept\s+\d+|Analyst\s+Layer)/i);
  const lastSection = sections[sections.length - 1] || "";
  const bullets: string[] = [];
  const lines = lastSection.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*•]\s+/, ""));
    }
  }
  return bullets.slice(0, 6); // Max 6 bullets per spec
}

// ─── Visual helpers ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  layout: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  structure: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  gating: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  strip: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  submit: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  accessibility: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  responsive: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700" },
  default: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" },
};

function categorizeKey(key: string): string {
  const k = key.toLowerCase();
  if (k.includes("layout") || k.includes("canvas") || k.includes("grid") || k.includes("cols")) return "layout";
  if (k.includes("structure") || k.includes("header") || k.includes("section") || k.includes("pane") || k.includes("tab") || k.includes("step") || k.includes("stage")) return "structure";
  if (k.includes("gating") || k.includes("gate") || k.includes("commalarm")) return "gating";
  if (k.includes("strip") || k.includes("progress")) return "strip";
  if (k.includes("submit") || k.includes("action") || k.includes("error") || k.includes("success")) return "submit";
  if (k.includes("accessibility") || k.includes("aria") || k.includes("focus")) return "accessibility";
  if (k.includes("responsive")) return "responsive";
  return "default";
}

function getColors(key: string) {
  return CATEGORY_COLORS[categorizeKey(key)] || CATEGORY_COLORS.default;
}

// ─── Progressive Strip Component ─────────────────────────────────────────────

function ProgressiveStrip({ entries }: { entries: BlueprintEntry[] }) {
  const stripEntry = entries.find(
    (e) => e.key.toLowerCase().includes("progressive_strip") || e.key.toLowerCase() === "progress_strip"
  );
  if (!stripEntry) return null;

  // Parse strip states like: [Upload|pending, Applying|pending, Verified|pending]
  const steps = stripEntry.value
    .replace(/[\[\]]/g, "")
    .split(",")
    .map((s) => {
      const parts = s.trim().split("|");
      return { label: parts[0]?.trim() || "", state: parts[1]?.trim() || "pending" };
    })
    .filter((s) => s.label);

  if (steps.length === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2">
      {steps.map((step, idx) => (
        <React.Fragment key={step.label}>
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                step.state === "complete" || step.state === "done"
                  ? "bg-emerald-500 text-white"
                  : step.state === "active"
                  ? "bg-[#ffd526] text-black ring-2 ring-[#ffd526]/40"
                  : "bg-slate-300 text-slate-600"
              }`}
            >
              {step.state === "complete" || step.state === "done" ? "✓" : idx + 1}
            </div>
            <span
              className={`text-[11px] font-semibold ${
                step.state === "active"
                  ? "text-slate-900"
                  : step.state === "complete" || step.state === "done"
                  ? "text-emerald-700"
                  : "text-slate-500"
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className="mx-1 h-px flex-1 min-w-[16px] bg-slate-300" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Layout Diagram Component ────────────────────────────────────────────────

function LayoutDiagram({ entries }: { entries: BlueprintEntry[] }) {
  const layoutEntry = entries.find((e) => e.key.toLowerCase() === "layout");
  const structureEntry = entries.find((e) => e.key.toLowerCase() === "structure");

  if (!layoutEntry && !structureEntry) return null;

  const layout = layoutEntry?.value || "";
  const structure = structureEntry?.value || "";

  // Parse structure sections
  const sections = structure
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  // Determine layout type
  const isSplit = layout.includes("split");
  const isDrawer = layout.includes("drawer");
  const isBottomSheet = layout.includes("bottom-sheet");
  const isWizard = layout.includes("wizard") || sections.some((s) => s.includes("stepper"));

  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Layout</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
          {layout}
        </span>
      </div>

      {isSplit ? (
        // Split pane layout
        <div className="flex gap-2 h-24">
          <div className="flex-[3] rounded border border-blue-200 bg-blue-50 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-blue-600">
              {sections[0] || "Left Pane"}
            </span>
          </div>
          <div className="flex-[2] rounded border border-indigo-200 bg-indigo-50 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-indigo-600">
              {sections[1] || "Right Pane"}
            </span>
          </div>
        </div>
      ) : isDrawer ? (
        // Drawer layout
        <div className="flex gap-2 h-24">
          <div className="flex-[3] rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
            <span className="text-[10px] text-slate-400">Main Content</span>
          </div>
          <div className="flex-[2] rounded border-2 border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1">
            {sections.map((s, i) => (
              <span key={i} className="text-[9px] font-semibold text-blue-600">{s}</span>
            ))}
          </div>
        </div>
      ) : isBottomSheet ? (
        // Bottom sheet layout
        <div className="flex flex-col gap-1 h-24">
          <div className="flex-[2] rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
            <span className="text-[10px] text-slate-400">Background</span>
          </div>
          <div className="flex-[3] rounded border-2 border-blue-300 bg-blue-50 flex items-center justify-center gap-2">
            {sections.map((s, i) => (
              <span key={i} className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 border border-blue-200">{s}</span>
            ))}
          </div>
        </div>
      ) : isWizard ? (
        // Wizard/stepper layout
        <div className="flex flex-col gap-1 h-24">
          <div className="flex items-center gap-1 px-1">
            {sections.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                    {i + 1}
                  </div>
                  <span className="text-[9px] font-semibold text-slate-600">{s}</span>
                </div>
                {i < sections.length - 1 && <div className="h-px flex-1 bg-slate-300" />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex-1 rounded border border-blue-200 bg-blue-50 flex items-center justify-center">
            <span className="text-[10px] text-blue-500">Step Content Area</span>
          </div>
        </div>
      ) : (
        // Default modal layout - vertical stack
        <div className="flex flex-col gap-1 h-24">
          {sections.length > 0 ? (
            sections.map((s, i) => (
              <div
                key={i}
                className={`flex-1 rounded border flex items-center justify-center ${
                  i === 0
                    ? "border-blue-200 bg-blue-50"
                    : i === sections.length - 1
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-indigo-200 bg-indigo-50"
                }`}
              >
                <span className={`text-[9px] font-semibold ${
                  i === 0 ? "text-blue-600" : i === sections.length - 1 ? "text-emerald-600" : "text-indigo-600"
                }`}>
                  {s}
                </span>
              </div>
            ))
          ) : (
            <div className="flex-1 rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
              <span className="text-[10px] text-slate-400">Modal Content</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Gating Diagram Component ────────────────────────────────────────────────

function GatingDiagram({ entries }: { entries: BlueprintEntry[] }) {
  const gatingEntries = entries.filter(
    (e) => e.key.toLowerCase().includes("gating") || e.key.toLowerCase().includes("gate")
  );
  if (gatingEntries.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-[11px] font-bold text-amber-800">CommAlarm Gating</span>
      </div>
      {gatingEntries.map((entry, idx) => (
        <div key={idx} className="flex items-start gap-2 pl-5">
          <span className="mt-0.5 text-[10px] text-amber-600">→</span>
          <div>
            <span className="text-[10px] font-semibold text-amber-700">{entry.key}: </span>
            <span className="text-[10px] text-amber-800">{entry.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Concept Card Component ──────────────────────────────────────────────────

function ConceptCard({
  concept,
  index,
  isSelected,
  allowVisualize,
  onSelectVisualize,
}: {
  concept: ParsedConcept;
  index: number;
  isSelected: boolean;
  allowVisualize: boolean;
  onSelectVisualize: (idx: number, name: string, description: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(true);

  const conceptColor = [
    "border-blue-400 bg-blue-500",
    "border-violet-400 bg-violet-500",
    "border-emerald-400 bg-emerald-500",
    "border-orange-400 bg-orange-500",
    "border-pink-400 bg-pink-500",
  ][index % 5];

  const conceptBgColor = [
    "border-blue-100",
    "border-violet-100",
    "border-emerald-100",
    "border-orange-100",
    "border-pink-100",
  ][index % 5];

  // Split entries into visual categories
  const specEntries = concept.entries.filter(
    (e) =>
      !["concept_id", "ID", "NAME"].includes(e.key) &&
      !e.key.toLowerCase().includes("progressive_strip") &&
      !e.key.toLowerCase().includes("progress_strip") &&
      !e.key.toLowerCase().includes("gating") &&
      !e.key.toLowerCase().includes("gate") &&
      e.key.toLowerCase() !== "layout" &&
      e.key.toLowerCase() !== "structure"
  );

  return (
    <div className={`rounded-xl border-2 ${conceptBgColor} bg-white shadow-sm overflow-hidden transition-all`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${conceptColor} text-sm font-bold text-white shadow-sm`}>
          {concept.id}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-slate-900 truncate">{concept.name}</h3>
          <p className="text-[11px] text-slate-500">
            {concept.entries.length} spec keys · {concept.analystBullets.length > 0 ? `${concept.analystBullets.length} analyst notes` : "blueprint block"}
          </p>
        </div>
        {/* Visualize checkbox */}
        {allowVisualize && (
          <label
            className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 hover:text-slate-700 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="whitespace-nowrap">Visualize</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  const description = concept.entries
                    .map((en) => `${en.key}: ${en.value}`)
                    .join(", ")
                    .substring(0, 300);
                  onSelectVisualize(index, concept.name, description);
                }}
                className="sr-only"
                aria-label={`Select ${concept.name} for visualization`}
              />
              <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                isSelected
                  ? 'border-[#3b82f6] bg-[#3b82f6]'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}>
                {isSelected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </label>
        )}
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-5 py-4 space-y-4">
          {/* Analyst Bullets */}
          {concept.analystBullets.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Analyst Summary</p>
              <ul className="space-y-1">
                {concept.analystBullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[12px] text-slate-700">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Layout Diagram */}
          <LayoutDiagram entries={concept.entries} />

          {/* Progressive Strip */}
          <ProgressiveStrip entries={concept.entries} />

          {/* Gating Diagram */}
          <GatingDiagram entries={concept.entries} />

          {/* Spec Table */}
          {specEntries.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2 w-[180px]">Key</th>
                    <th className="px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {specEntries.map((entry, idx) => {
                    const colors = getColors(entry.key);
                    return (
                      <tr key={idx} className={`border-t border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                        <td className="px-3 py-1.5 align-top">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {entry.key}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-700 font-mono text-[11px]">
                          <SpecValue value={entry.value} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Spec Value Renderer (handles arrays, arrows, etc.) ──────────────────────

function SpecValue({ value }: { value: string }) {
  // Render array values as chips
  if (value.startsWith("[") && value.endsWith("]")) {
    const items = value
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  // Render arrow chains as flow
  if (value.includes("→")) {
    const steps = value.split("→").map((s) => s.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap items-center gap-1">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
              {step}
            </span>
            {idx < steps.length - 1 && (
              <span className="text-slate-400 text-[10px]">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Default
  return <span>{value}</span>;
}

// ─── Main BlueprintRenderer ──────────────────────────────────────────────────

export default function BlueprintRenderer({
  response,
  selectedIndex = null,
  allowVisualize = false,
  onSelectConcept,
}: {
  response: string;
  selectedIndex?: number | null;
  allowVisualize?: boolean;
  onSelectConcept?: (idx: number | null, name: string, description: string) => void;
}) {
  const blueprint = useMemo(() => parseBlueprint(response), [response]);

  if (blueprint.concepts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Blueprint Header */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white shadow-md">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">
            LukeUX Blueprint Mode
            <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
              V1
            </span>
          </h2>
          <p className="text-[12px] text-slate-500">
            {blueprint.concepts.length} structurally distinct concept{blueprint.concepts.length !== 1 ? "s" : ""} rendered
          </p>
        </div>
      </div>

      {/* Preamble (Input Verification / Analyst notes) */}
      {blueprint.preamble && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Input Verification</p>
          <div className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
            {blueprint.preamble.replace(/^#+\s+.*$/gm, "").trim()}
          </div>
        </div>
      )}

      {/* Concept Cards */}
      <div className="space-y-4">
        {blueprint.concepts.map((concept, idx) => (
          <ConceptCard
            key={concept.id}
            concept={concept}
            index={idx}
            isSelected={selectedIndex === idx}
            allowVisualize={allowVisualize}
            onSelectVisualize={(i, name, desc) => {
              if (onSelectConcept) {
                onSelectConcept(selectedIndex === i ? null : i, name, desc);
              }
            }}
          />
        ))}
      </div>

      {/* Cross-Concept Summary Footer */}
      <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
        <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-[12px] text-emerald-800">
          <span className="font-semibold">All concepts enforce:</span> CommAlarm gating on AutoApply · Upload → Applying → Verified progressive strip · Deterministic rendering only
        </div>
      </div>
    </div>
  );
}
