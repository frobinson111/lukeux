"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";
import { PromoModal } from "../components/promo-modal";
import UxExtensionsSection from "./components/ux-extensions-section";
import PopularTasksSection from "./components/popular-tasks-section";
import SearchableCategoryDropdown from "./components/searchable-category-dropdown";
import FigmaConnectInline from "./components/figma-connect-inline";
import HistoryItem from "./components/history-item";
import WireframeRenderer from "./components/wireframe-renderer";

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full mt-2 flex flex-col items-center">
      <div className="relative w-full md:w-80 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-2 bg-[var(--brand-yellow,#ffd526)] transition-all duration-200"
          style={{ width: `${progress}%` }}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <span className="mt-1 text-xs font-semibold text-slate-700">{progress}%</span>
    </div>
  );
}
// Simple animated dots for loading indication
function LoadingDots() {
  return (
    <span className="inline-flex items-center ml-2" aria-hidden="true">
      <span className="animate-bounce [animation-delay:-0.32s]">.</span>
      <span className="animate-bounce [animation-delay:-0.16s]">.</span>
      <span className="animate-bounce">.</span>
    </span>
  );
}

// Helper function to format elapsed seconds
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Button with loading message and time estimate
function ProgressButton({ 
  imageLoading, 
  onClick,
  elapsedTime 
}: { 
  imageLoading: boolean; 
  onClick: () => void;
  elapsedTime: number;
}) {
  return (
    <div className="flex flex-col items-center w-full md:w-80">
      <button
        type="button"
        onClick={onClick}
        disabled={imageLoading}
        className="rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-8 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70 w-full"
        aria-busy={imageLoading}
        aria-live="polite"
      >
        {imageLoading ? (
          <>
            Generating image…
          </>
        ) : (
          "Generate Visual Example"
        )}
      </button>
      {imageLoading && (
        <p className="mt-3 text-center text-xs text-slate-600">
          This can take up to ~30–60s.
          {elapsedTime > 0 && (
            <span className="ml-2 font-semibold text-slate-800">
              Elapsed: {formatElapsedTime(elapsedTime)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

type ProjectFolder = { id: string; name: string; open: boolean; sortOrder?: number };
type HistoryItem = { id: string; title: string; content: string; templateIndex: number | null; projectId: string | null };

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
  allowWireframeRenderer?: boolean;
  isPopular?: boolean;
  templateCategory?: { name: string; sortOrder: number } | null;
  taskType?: string | null; // "llm" | "accessibility"
  defaultModel?: string | null;
  defaultMode?: string | null;
  defaultDetailLevel?: string | null;
};

type ModelOption = { modelId: string; displayName: string; provider: string };

const projects = ["New UX Task"];

const modes = ["auto", "instant", "thinking"] as const;
const detailLevels = ["brief", "standard", "in-depth"] as const;
type AssetPayload = { name: string; type: string; content: string };
const milestones = [4, 8, 12];

// Custom markdown components for styled output
const styledMarkdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1 className="mb-4 mt-6 text-xl font-bold text-[#111827]" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="mb-3 mt-5 text-lg font-bold text-[#111827]" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-[#111827]" {...props} />
  ),
  h4: ({ node, ...props }) => (
    <h4 className="mb-2 mt-3 text-[15px] font-semibold text-[#111827]" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="mb-4 text-[15px] leading-relaxed text-[#374151]" {...props} />
  ),
  ul: (props) => (
    <ul className="mb-4 ml-0 list-none space-y-2" {...(props as any)} />
  ),
  ol: (props) => (
    <ol className="mb-4 ml-0 list-none space-y-3 counter-reset-list" {...(props as any)} />
  ),
  li: ({ node, children, ...props }) => {
    // Check if parent is ol (numbered) by checking if the content starts with number pattern
    const content = String(children);
    const isNumbered = /^\d+\)/.test(content.trim());
    
    if (isNumbered) {
      // Extract number and rest of content
      const match = content.match(/^(\d+)\)\s*(.*)/s);
      const num = match ? match[1] : "";
      const text = match ? match[2] : content;
      
      return (
        <li className="relative pl-10 text-[15px] leading-relaxed text-[#374151]" {...props}>
          <span className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#3b82f6] text-xs font-semibold text-white">
            {num}
          </span>
          <span>{text}</span>
        </li>
      );
    }
  // ...existing code continues
  return (
      <li className="relative pl-6 text-[15px] leading-relaxed text-[#374151]" {...props}>
        <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-[#3b82f6]"></span>
        {children}
      </li>
    );
  },
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-[#111827]" {...props} />
  ),
  em: ({ node, ...props }) => (
    <em className="italic text-[#4b5563]" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="my-4 border-l-4 border-[#3b82f6] bg-[#f8fafc] py-2 pl-4 text-[15px] italic text-[#4b5563]" {...props} />
  ),
  code: (p) => {
    const { inline, className, children, ...rest } = p as any;
    if (inline) {
      return (
        <code className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[13px] font-medium text-[#0f172a]" {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className={`block overflow-x-auto rounded-lg bg-[#1e293b] px-4 py-3 text-[13px] text-[#e2e8f0] ${className || ""}`} {...rest}>
        {children}
      </code>
    );
  },
  hr: ({ node, ...props }) => (
    <hr className="my-6 border-t border-[#e5e7eb]" {...props} />
  ),
  table: ({ node, ...props }) => (
    <div className="my-4 w-full overflow-x-auto">
      <table className="min-w-full w-full border-collapse text-left text-[14px]" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-[#f8fafc] text-[13px] font-semibold text-[#111827]" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="text-[14px] text-[#374151]" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th className="border border-[#e5e7eb] px-4 py-3 font-semibold text-left" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="border border-[#e5e7eb] px-4 py-3 align-top" {...props} />
  ),
  tr: ({ node, ...props }) => (
    <tr className="hover:bg-[#f8fafc]" {...props} />
  ),
};

function StructuredAnalysisOutput({
  response,
  recommendation,
  selectedIndex,
  onSelectRecommendation,
  allowMockupGeneration,
  historyEntryId,
  templateId,
  templateTitle,
  feedbacks,
  onFeedbackChange
}: {
  response: string;
  recommendation: string | null;
  selectedIndex: number | null;
  onSelectRecommendation: (index: number | null, title: string, content: string) => void;
  allowMockupGeneration: boolean;
  historyEntryId: string | null;
  templateId: string | null;
  templateTitle: string | null;
  feedbacks: Record<number, "UP" | "DOWN" | null>;
  onFeedbackChange: (recommendationNum: number, feedback: "UP" | "DOWN" | null) => void;
}) {
  // Parse numbered findings from the response
  const parseNumberedFindings = (text: string) => {
    const findings: { num: string; title: string; content: string }[] = [];
    
    // Pattern 1: Structured format with "Concept N — Title" and "**A) Concept Summary**"
    // Note: Using (?![\r\n]) after $ to ensure we match true end of string, not end of line
    const structuredPattern = /###\s*Concept\s+(\d+)\s*[—\-–]\s*([^\n]+)\n+\*\*A\)\s*Concept\s+Summary\*\*\n+([\s\S]*?)(?=###\s*Concept\s+\d+|$(?![\r\n]))/gi;
    let match;
    
    while ((match = structuredPattern.exec(text)) !== null) {
      findings.push({
        num: match[1],
        title: match[2].trim(),
        content: match[3].trim(),
      });
    }
    
    // Pattern 2: Numbered heading sections like "## 1. Title" or "### 1. Title"
    if (findings.length === 0) {
      const numberedHeadingPattern = /(?:^|\n)(#{2,3})\s*(\d+)[\.\)]\s*([^\n]+)\n([\s\S]*?)(?=\n#{2,3}\s*\d+[\.\)]|\n#{1,2}\s+[A-Z]|$)/g;
      let headingMatch;
      
      while ((headingMatch = numberedHeadingPattern.exec(text)) !== null) {
        const content = headingMatch[4].trim();
        // Only include if there's meaningful content
        if (content.length > 10) {
          findings.push({
            num: headingMatch[2],
            title: headingMatch[3].trim(),
            content: content,
          });
        }
      }
    }
    
    // Pattern 3: Non-numbered heading sections like "## Section Title" or "### Section Title"
    if (findings.length === 0) {
      const genericHeadingPattern = /(?:^|\n)(#{2,3})\s+([^\n#]+)\n([\s\S]*?)(?=\n#{2,3}\s+[^\n]|\n#{1}\s+[^\n]|$)/g;
      let genericMatch;
      let sectionNum = 1;
      
      while ((genericMatch = genericHeadingPattern.exec(text)) !== null) {
        const title = genericMatch[2].trim();
        const content = genericMatch[3].trim();
        
        // Only include if there's meaningful content and title
        if (content.length > 10 && title.length > 0) {
          findings.push({
            num: String(sectionNum++),
            title: title,
            content: content,
          });
        }
      }
    }
    
    console.log('Parsed findings:', findings.length, 'from response length:', text.length);
    console.log('First 200 chars of response:', text.substring(0, 200));
    if (findings.length > 0) {
      console.log('Sample finding:', findings[0]);
    }

    return findings;
  };

  // Custom markdown components for content rendering
  const contentMarkdownComponents: Components = {
    p: ({ children }) => (
      <p className="mb-3 last:mb-0 text-[15px] leading-relaxed text-[#4b5563]">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-[#111827]">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 last:mb-0 space-y-1.5 pl-0 list-none">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 last:mb-0 space-y-1.5 pl-0 list-none">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="flex items-start gap-2 text-[15px] leading-relaxed text-[#4b5563]">
        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#9ca3af]"></span>
        <span>{children}</span>
      </li>
    ),
    table: ({ children }) => (
      <div className="my-4 w-full overflow-x-auto">
        <table className="min-w-full w-full border-collapse text-left text-[14px]">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-[#f8fafc] text-[13px] font-semibold text-[#111827]">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="text-[14px] text-[#374151]">{children}</tbody>
    ),
    th: ({ children }) => (
      <th className="border border-[#e5e7eb] px-4 py-3 font-semibold text-left">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-[#e5e7eb] px-4 py-3 align-top">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-[#f8fafc]">{children}</tr>
    ),
  };

  const findings = parseNumberedFindings(response);
  const hasNumberedFindings = findings.length > 0;

  const handleCheckboxChange = (idx: number, title: string, content: string) => {
    if (selectedIndex === idx) {
      // Deselect if already selected
      onSelectRecommendation(null, '', '');
    } else {
      // Select this recommendation
      onSelectRecommendation(idx, title, content);
    }
  };

  return (
    <div className="space-y-4">
      {/* Render numbered findings with card styling matching the screenshot */}
      {hasNumberedFindings ? (
        <div className="space-y-4">
          {findings.map((finding, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <div 
                key={idx} 
                className={`rounded-xl bg-white p-6 transition-all ${
                  isSelected 
                    ? 'border-2 border-[#3b82f6] shadow-md' 
                    : 'border border-[#e5e7eb]'
                }`}
                style={{ boxShadow: isSelected ? "0 4px 12px rgba(59,130,246,0.15)" : "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-start gap-4">
                  {/* Blue circular number badge */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#3b82f6]">
                    <span className="text-sm font-semibold text-white">{finding.num}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="mb-3 text-[16px] font-semibold text-[#111827]">
                        {finding.title}
                      </h4>
                      <div className="flex items-center gap-3">
                        {/* Thumbs up/down feedback buttons - Always visible */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const currentFeedback = feedbacks[idx + 1];
                              onFeedbackChange(idx + 1, currentFeedback === "UP" ? null : "UP");
                            }}
                            className={`group flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                              feedbacks[idx + 1] === "UP"
                                ? 'bg-green-100 text-green-600'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-green-600'
                            }`}
                            aria-label={`${feedbacks[idx + 1] === "UP" ? 'Remove helpful' : 'Mark as helpful'} for ${finding.title}`}
                            title="Helpful"
                          >
                            <svg className="h-4 w-4" fill={feedbacks[idx + 1] === "UP" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const currentFeedback = feedbacks[idx + 1];
                              onFeedbackChange(idx + 1, currentFeedback === "DOWN" ? null : "DOWN");
                            }}
                            className={`group flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                              feedbacks[idx + 1] === "DOWN"
                                ? 'bg-red-100 text-red-600'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-red-600'
                            }`}
                            aria-label={`${feedbacks[idx + 1] === "DOWN" ? 'Remove not helpful' : 'Mark as not helpful'} for ${finding.title}`}
                            title="Not helpful"
                          >
                            <svg className="h-4 w-4" fill={feedbacks[idx + 1] === "DOWN" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                          </button>
                        </div>
                        {/* Checkbox for mockup selection - Only visible when mockup generation is enabled */}
                        {allowMockupGeneration && (
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 hover:text-slate-700">
                            <span className="whitespace-nowrap">Generate mockup</span>
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleCheckboxChange(idx, finding.title, finding.content)}
                                className="sr-only"
                                aria-label={`Select ${finding.title} for mockup generation`}
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
                      </div>
                    </div>
                    <div className="text-[15px] leading-relaxed text-[#4b5563]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={contentMarkdownComponents}>
                        {finding.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Fallback to styled markdown rendering with feedback controls */
        <div 
          className="rounded-xl border border-[#e5e7eb] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          {/* Feedback and mockup controls at top of non-structured content */}
          <div className="mb-4 flex items-center justify-end gap-3 border-b border-slate-200 pb-3">
            {/* Thumbs up/down feedback buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const currentFeedback = feedbacks[0];
                  onFeedbackChange(0, currentFeedback === "UP" ? null : "UP");
                }}
                className={`group flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                  feedbacks[0] === "UP"
                    ? 'bg-green-100 text-green-600'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-green-600'
                }`}
                aria-label={`${feedbacks[0] === "UP" ? 'Remove helpful' : 'Mark as helpful'}`}
                title="Helpful"
              >
                <svg className="h-4 w-4" fill={feedbacks[0] === "UP" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const currentFeedback = feedbacks[0];
                  onFeedbackChange(0, currentFeedback === "DOWN" ? null : "DOWN");
                }}
                className={`group flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                  feedbacks[0] === "DOWN"
                    ? 'bg-red-100 text-red-600'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-red-600'
                }`}
                aria-label={`${feedbacks[0] === "DOWN" ? 'Remove not helpful' : 'Mark as not helpful'}`}
                title="Not helpful"
              >
                <svg className="h-4 w-4" fill={feedbacks[0] === "DOWN" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>
            </div>
            {/* Checkbox for mockup selection */}
            {allowMockupGeneration && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 hover:text-slate-700">
                <span className="whitespace-nowrap">Generate mockup</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedIndex === 0}
                    onChange={() => handleCheckboxChange(0, "Analysis", response.substring(0, 200))}
                    className="sr-only"
                    aria-label="Select analysis for mockup generation"
                  />
                  <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                    selectedIndex === 0
                      ? 'border-[#3b82f6] bg-[#3b82f6]' 
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}>
                    {selectedIndex === 0 && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </label>
            )}
          </div>
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={styledMarkdownComponents}>
              {response}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Key Takeaway Section */}
      {recommendation && (
        <div
          className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-6"
          style={{ boxShadow: "0 2px 8px rgba(251, 191, 36, 0.15)" }}
        >
          <div className="flex items-start gap-3">
            {/* Light bulb icon */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-400">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h4 className="mb-3 text-[17px] font-bold text-amber-900">
                Key Takeaway
              </h4>
              <div className="text-[15px] leading-relaxed text-amber-800">
                {recommendation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type FeedbackType = "LIKE" | "DISLIKE" | "SUGGESTION";
const FEEDBACK_MAX_LEN = 1000;

export default function CanvasPage() {
  // Add styles for bold optgroup labels
  useEffect(() => {
    const styleId = 'template-select-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        select.template-select optgroup {
          font-weight: 700 !important;
          font-size: 14px !important;
          color: #0f172a !important;
        }
        select.template-select option {
          font-weight: 400 !important;
          font-size: 12px !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingElapsedTime, setLoadingElapsedTime] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState<string>("gpt-5.2");
  const [templateIndex, setTemplateIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<(typeof modes)[number]>("auto");
  const [detailLevel, setDetailLevel] = useState<(typeof detailLevels)[number]>("standard");
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isTaskOptimized, setIsTaskOptimized] = useState(false);
  const [assetPayloads, setAssetPayloads] = useState<AssetPayload[]>([]);
  const [followupFiles, setFollowupFiles] = useState<File[]>([]);
  const [followupAssetPayloads, setFollowupAssetPayloads] = useState<AssetPayload[]>([]);
  const [followupText, setFollowupText] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [lastRecommendation, setLastRecommendation] = useState<string | null>(null);
  const [inputsCollapsed, setInputsCollapsed] = useState(true);
  const [promptEditing, setPromptEditing] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyMenu, setHistoryMenu] = useState<string | null>(null);
  const [historyRename, setHistoryRename] = useState<string>("");
  const [historyMoveProject, setHistoryMoveProject] = useState<string>("");
  const [saveProjectMenu, setSaveProjectMenu] = useState(false);
  const [saveProjectSelection, setSaveProjectSelection] = useState<string>("");
  const [downloadMenu, setDownloadMenu] = useState(false);
  const [projectFolders, setProjectFolders] = useState<ProjectFolder[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [genCount, setGenCount] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("LIKE");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [currentHistoryEntryId, setCurrentHistoryEntryId] = useState<string | null>(null);
  const [recommendationFeedbacks, setRecommendationFeedbacks] = useState<Record<number, "UP" | "DOWN" | null>>({});
  const [showPromoModal, setShowPromoModal] = useState(false);
  const responseRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const mockupSectionRef = useRef<HTMLDivElement | null>(null);
  const scrollToStatus = () => {
    if (!statusRef.current) return;
    requestAnimationFrame(() => {
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const scrollToTopOfResponse = () => {
    if (!responseRef.current) return;
    requestAnimationFrame(() => {
      responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageElapsedTime, setImageElapsedTime] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlContent, setUrlContent] = useState<{ url: string; title: string; content: string; contentLength: number } | null>(null);
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [imageSectionOpen, setImageSectionOpen] = useState(false);
  const [inlineWarnings, setInlineWarnings] = useState<string[]>([]);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isViewingHistoryItem, setIsViewingHistoryItem] = useState(false);
  const [guidanceExpanded, setGuidanceExpanded] = useState({
    useAiTo: false,
    example: false,
    outcome: false,
    assets: false
  });
  const MAX_IMAGE_DATAURL = 50_000; // chars
  const template = templateIndex !== null ? templateList[templateIndex] : null;
  const frameworkLabel = template?.templateCategory?.name || template?.category || "Framework";
  const pdfLibsRef = useRef<{ toPng: any; jsPDF: any } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const followupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [firstNameLocal, setFirstNameLocal] = useState("");

  // Backward-compatible default: if templates in DB don’t have this field yet, treat as enabled.
  const fileUploadsAllowed = template?.allowFileUploads ?? true;
  // Backward-compatible default: if templates in DB don't have this field yet, treat as enabled.
  const mockupGenerationAllowed = template?.allowMockupGeneration ?? true;
  const refineAnalysisAllowed = template?.allowRefineAnalysis ?? true;
  const wireframeRendererAllowed = template?.allowWireframeRenderer ?? false;
  // Product decision: when wireframe renderer is enabled, this objective is wireframe-only.
  const isWireframeOnlyObjective = wireframeRendererAllowed;

  const groupedTemplates = useMemo(() => {
    // Group by Framework (templateCategory.name) first
    const frameworkGroups: Record<string, { 
      framework: string;
      sortOrder: number;
      categories: Record<string, {
        category: string;
        items: { t: Template; idx: number }[]
      }>
    }> = {};
    
    templateList.forEach((t, idx) => {
      const framework = t.templateCategory?.name || "No Framework";
      const sortOrder = t.templateCategory?.sortOrder ?? 999;
      const category = t.category || "Uncategorized";
      
      if (!frameworkGroups[framework]) {
        frameworkGroups[framework] = { framework, sortOrder, categories: {} };
      }
      
      if (!frameworkGroups[framework].categories[category]) {
        frameworkGroups[framework].categories[category] = { category, items: [] };
      }
      
      frameworkGroups[framework].categories[category].items.push({ t, idx });
    });
    
    // Convert to sorted array using sortOrder, then alphabetically as fallback
    return Object.values(frameworkGroups)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.framework.localeCompare(b.framework);
      })
      .map(fGroup => ({
        framework: fGroup.framework,
        categories: Object.values(fGroup.categories)
          .sort((a, b) => a.category.localeCompare(b.category))
          .map(cGroup => ({
            category: cGroup.category,
            items: cGroup.items.sort((a, b) => a.t.title.localeCompare(b.t.title))
          }))
      }));
  }, [templateList]);

  const popularTemplates = useMemo(() => {
    return templateList
      .map((t, idx) => ({ idx, title: t.title, category: t.category, isPopular: t.isPopular }))
      .filter((t) => t.isPopular);
  }, [templateList]);

  const markdownComponents: Components = {
    h3: ({ node, ...props }) => (
      <h3 className="mt-6 text-[18px] font-black leading-[1.2] text-slate-900" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="mt-4 text-[16px] font-bold leading-[1.25] text-slate-900" {...props} />
    ),
    p: ({ node, ...props }) => (
      <p
        className="mt-2 border-l-2 border-slate-200 pl-3 text-[15px] leading-[1.7] text-slate-800"
        {...props}
      />
    ),
    // Render unordered lists as ordered (numbered) for clarity
    ul: (props) => <ol className="my-2 ml-5 list-decimal space-y-1.5 text-slate-800" {...(props as any)} />,
    ol: (props) => <ol className="my-2 ml-5 list-decimal space-y-1.5 text-slate-800" {...(props as any)} />,
    li: ({ node, ...props }) => (
      <li className="leading-[1.6] text-[15px] text-slate-800" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="my-3 border-l-2 border-slate-300 pl-3 text-[15px] leading-[1.6] text-slate-800"
        {...props}
      />
    ),
    table: ({ node, ...props }) => (
      <div className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-left" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className="text-[13px] text-slate-900" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="text-[12px] text-slate-800" {...props} />,
    th: ({ node, ...props }) => (
      <th className="border-b border-slate-200 px-3 py-2 font-semibold" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="border-b border-slate-100 px-3 py-2 align-top text-[12px]" {...props} />
    ),
    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
    code: (p) => {
      const { inline, className, children, ...rest } = p as any;
      if (inline) {
        return (
          <code
            className="inline-block rounded-md border border-slate-300 bg-slate-100 px-2 py-[2px] text-[12px] font-semibold uppercase tracking-wide text-slate-800"
            {...rest}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className={`block overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-[13px] leading-6 text-slate-50 ${className || ""}`}
          {...rest}
        >
          {children}
        </code>
      );
    }
  };

  useEffect(() => {
    async function loadUser() {
      if (firstNameLocal) return;
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const name = data?.user?.firstName || data?.firstName;
        const role = data?.user?.role || data?.role || null;
        if (name) setFirstNameLocal(name);
        if (role) setUserRole(role);
      } catch {
        // ignore
      }
    }
    loadUser();
  }, [firstNameLocal]);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/templates", { cache: "no-store" });
        if (!res.ok) {
          setStatus((prev) => prev || "Failed to load templates.");
          return;
        }
        const data = await res.json().catch(() => null);
        const list: Template[] = (data?.templates ?? []).map((t: any) => {
          const templateCategory = t?.templateCategory ?? t?.TemplateCategory ?? null;
          const normalizedCategory = t?.category?.trim() || templateCategory?.name || "";
          return {
            ...t,
            category: normalizedCategory,
            templateCategory,
          };
        });
        setTemplateList(list);
        if (templateIndex !== null && templateIndex >= list.length) {
          setTemplateIndex(null);
        }
      } catch {
        setStatus((prev) => prev || "Failed to load templates.");
      }
    }
    async function loadModels() {
      try {
        const res = await fetch("/api/models", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const modelList: ModelOption[] = data?.models ?? [];
        setAvailableModels(modelList);
        if (modelList.length > 0) {
          setModel((prev) => {
            // Keep current model if it's in the list, otherwise use first
            if (modelList.some((m) => m.modelId === prev)) return prev;
            return modelList[0].modelId;
          });
        }
      } catch {
        // Silently fail – user can still manually type
      }
    }
    loadTemplates();
    loadModels();
    const stored = Number(localStorage.getItem("lx_gen_count") || "0");
    setGenCount(Number.isFinite(stored) ? stored : 0);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stored = Number(localStorage.getItem("lx_gen_count") || "0");
    setGenCount(Number.isFinite(stored) ? stored : 0);
  }, []);

  useEffect(() => {
    if (template) {
      // For accessibility templates, don't pre-fill with the template prompt
      // since users need to enter URLs instead
      if (template.taskType === "accessibility") {
        setEditablePrompt("");
      } else {
        setEditablePrompt(template.prompt);
      }
      setPromptEditing(false);
      const allowed = template.allowedModes && template.allowedModes.length ? template.allowedModes : modes;
      if (!allowed.includes(mode)) {
        setMode((allowed as any)[0] ?? "auto");
      }
      // Auto-select Task-Optimized if template has defaults
      if (template.defaultModel) {
        setIsTaskOptimized(true);
        setModel(template.defaultModel);
        if (template.defaultMode) setMode(template.defaultMode as typeof mode);
        if (template.defaultDetailLevel) setDetailLevel(template.defaultDetailLevel as typeof detailLevel);
      } else {
        setIsTaskOptimized(false);
      }
    } else {
      setEditablePrompt("");
      setPromptEditing(false);
    }
  }, [templateIndex, template, mode]);

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

  // Track completed tasks (successful generations) + trigger feedback prompts/promo modal.
  // NOTE: Guard against loading history entries (which also sets lastResponse).
  useEffect(() => {
    if (!lastResponse) return;
    if (isViewingHistoryItem) return;

    const currentCount = Number(localStorage.getItem("lx_gen_count") || "0");
    const next = currentCount + 1;
    setGenCount(next);
    localStorage.setItem("lx_gen_count", String(next));

    console.log('[PromoModal Debug] Task completed. Count:', next);

    // Free access promo modal: show after a *new user* completes their first task.
    // This takes priority over feedback modal.
    const hasCompleted = localStorage.getItem("promo_signup_completed");
    const hasDismissed = localStorage.getItem("promo_modal_dismissed");
    console.log('[PromoModal Debug] hasCompleted:', hasCompleted, 'hasDismissed:', hasDismissed);
    
    let promoTriggered = false;
    if (next === 1) {
      if (!hasCompleted && !hasDismissed) {
        // Check if promo signups are enabled before showing modal
        fetch("/api/promo-signups?check=enabled")
          .then((res) => res.json())
          .then((data) => {
            if (data.enabled) {
              console.log('[PromoModal Debug] Triggering promo modal!');
              setShowPromoModal(true);
            } else {
              console.log('[PromoModal Debug] Promo signups disabled by admin');
            }
          })
          .catch(() => {
            // If check fails, don't show the modal
            console.log('[PromoModal Debug] Failed to check promo status');
          });
        promoTriggered = true;
      } else {
        console.log('[PromoModal Debug] Not triggering - already completed or dismissed');
      }
    } else {
      console.log('[PromoModal Debug] Not triggering - count is', next, 'not 1');
    }

    // Feedback prompt milestones - only check if promo didn't trigger
    if (!promoTriggered) {
      const promptedRaw = localStorage.getItem("lx_gen_prompted");
      const prompted = promptedRaw ? promptedRaw.split(",").map((n) => Number(n)) : [];
      const milestone = milestones.find((m) => m === next && !prompted.includes(m));
      if (milestone) {
        setShowFeedbackModal(true);
        localStorage.setItem("lx_gen_prompted", [...prompted, milestone].join(","));
      }
    }
  }, [lastResponse, isViewingHistoryItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePromoModalClose = () => {
    setShowPromoModal(false);
    localStorage.setItem("promo_modal_dismissed", Date.now().toString());
  };

  // Timer effect for design context analysis elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (loading) {
      setLoadingElapsedTime(0);
      interval = setInterval(() => {
        setLoadingElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingElapsedTime(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [loading]);

  // Timer effect for image generation elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (imageLoading) {
      setImageElapsedTime(0);
      interval = setInterval(() => {
        setImageElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setImageElapsedTime(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [imageLoading]);

  const allowedTextTypes = new Set([
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/xml",
    "text/xml"
  ]);
  const allowedDocTypes = new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
  const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/jpg"]);
  const maxPerFile = 20_000; // chars

  const readAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  async function parseDocxToText(file: File) {
    const arrayBuf = await file.arrayBuffer();
    const mammothMod = await import("mammoth");
    const { value } = await mammothMod.extractRawText({ arrayBuffer: arrayBuf });
    return value || "";
  }

  async function toAssetPayloads(selected: File[]): Promise<AssetPayload[]> {
    const payloads: AssetPayload[] = [];
    const warnings: string[] = [];
    for (const file of selected) {
      try {
        if (allowedTextTypes.has(file.type)) {
          const text = await readAsText(file);
          const trimmed = text.length > maxPerFile ? `${text.slice(0, maxPerFile)}\n...[truncated]` : text;
          payloads.push({
            name: file.name,
            type: file.type || "text",
            content: trimmed
          });
        } else if (allowedDocTypes.has(file.type)) {
          const text = await parseDocxToText(file);
          const trimmed = text.length > maxPerFile ? `${text.slice(0, maxPerFile)}\n...[truncated]` : text;
          payloads.push({
            name: file.name,
            type: "docx/text",
            content: trimmed
          });
        } else if (allowedImageTypes.has(file.type)) {
          const dataUrl = await readAsDataUrl(file);
          if (dataUrl.length > MAX_IMAGE_DATAURL) {
            warnings.push(`${file.name}: image too large to inline; skipped.`);
          } else {
            payloads.push({
              name: file.name,
              type: "image",
              content: dataUrl
            });
          }
        } else {
          warnings.push(`${file.name}: unsupported type (${file.type || "unknown"}); not inlined.`);
        }
      } catch {
        warnings.push(`${file.name}: failed to read file.`);
      }
    }
    if (warnings.length) {
      setInlineWarnings(warnings);
    } else {
      setInlineWarnings([]);
    }
    return payloads;
  }

  const dedupeFiles = (prev: File[], next: File[]) => {
    const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
    const merged = [...prev];
    next.forEach((f) => {
      const key = `${f.name}:${f.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(f);
      }
    });
    return merged;
  };

  const dedupePayloads = (prev: AssetPayload[], next: AssetPayload[]) => {
    const seen = new Set(prev.map((p) => `${p.name}:${p.type}:${p.content.length}`));
    const merged = [...prev];
    next.forEach((p) => {
      const key = `${p.name}:${p.type}:${p.content.length}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(p);
      }
    });
    return merged;
  };

  const toggleGuidanceSection = (section: keyof typeof guidanceExpanded) => {
    setGuidanceExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  async function handleUploadSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const newPayloads = await toAssetPayloads(selected);
    setFiles((prev) => dedupeFiles(prev, selected));
    setAssetPayloads((prev) => dedupePayloads(prev, newPayloads));
  }

  async function handleFollowupUploadSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const newPayloads = await toAssetPayloads(selected);
    setFollowupFiles((prev) => dedupeFiles(prev, selected));
    setFollowupAssetPayloads((prev) => dedupePayloads(prev, newPayloads));
  }

  const MAX_IMAGE_PROMPT = 900;
  function buildImagePromptFromResponse(resp: string) {
    // Strip code fences and heavy markdown so image prompts stay concise.
    let text = resp.replace(/```[\s\S]*?```/g, " ");
    text = text.replace(/[#>*`_]/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > MAX_IMAGE_PROMPT) {
      text = `${text.slice(0, MAX_IMAGE_PROMPT)}...`;
    }
    return text;
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

  async function handleDeleteProject(projectId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE"
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus(data?.error || "Failed to delete project.");
        return;
      }
      
      // Remove project from state
      setProjectFolders((prev) => prev.filter((p) => p.id !== projectId));
      
      // Move any history items from this project back to uncategorized
      setHistory((prev) =>
        prev.map((h) => (h.projectId === projectId ? { ...h, projectId: null } : h))
      );
      
      setStatus("Project folder deleted successfully.");
      setDeleteConfirmProjectId(null);
    } catch (err) {
      setStatus("Failed to delete project.");
    }
  }

  async function addToHistory(content: string) {
    const title = template ? template.title : "Untitled Task";
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
      // Store the new history entry ID and reset feedbacks
      setCurrentHistoryEntryId(entry.id);
      setRecommendationFeedbacks({});
    } catch (err) {
      setStatus("Failed to save history.");
    }
  }

  // Handler for recommendation feedback (thumbs up/down)
  async function handleRecommendationFeedback(recommendationNum: number, feedback: "UP" | "DOWN" | null) {
    if (!currentHistoryEntryId) return;
    
    // Optimistically update UI
    setRecommendationFeedbacks(prev => ({
      ...prev,
      [recommendationNum]: feedback
    }));

    try {
      const res = await fetch("/api/feedback/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          historyEntryId: currentHistoryEntryId,
          recommendationNum,
          feedback,
          templateId: template?.id || null,
          templateTitle: template?.title || null
        })
      });
      
      if (!res.ok) {
        // Revert on error
        setRecommendationFeedbacks(prev => {
          const newFeedbacks = { ...prev };
          delete newFeedbacks[recommendationNum];
          return newFeedbacks;
        });
        console.error("Failed to save recommendation feedback");
      }
    } catch (err) {
      // Revert on error
      setRecommendationFeedbacks(prev => {
        const newFeedbacks = { ...prev };
        delete newFeedbacks[recommendationNum];
        return newFeedbacks;
      });
      console.error("Failed to save recommendation feedback", err);
    }
  }

  async function renameHistory(id: string, newTitle?: string) {
    const current = history.find((h) => h.id === id);
    if (!current) return;
    const next = (newTitle ?? historyRename).trim();
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
        const title = template ? template.title : "Untitled Task";
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

  async function loadHistory(id: string) {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    setTemplateIndex(item.templateIndex);
    setLastResponse(item.content);
    setStatus(null);
    setHistoryMenu(null);
    setIsViewingHistoryItem(true); // Flag that we're viewing history
    
    // Set the current history entry ID and fetch existing feedbacks
    setCurrentHistoryEntryId(id);
    try {
      const feedbackRes = await fetch(`/api/feedback/recommendation?historyEntryId=${id}`);
      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        const feedbackMap: Record<number, "UP" | "DOWN" | null> = {};
        for (const fb of feedbackData.feedbacks || []) {
          feedbackMap[fb.recommendationNum] = fb.feedback;
        }
        setRecommendationFeedbacks(feedbackMap);
      } else {
        setRecommendationFeedbacks({});
      }
    } catch {
      setRecommendationFeedbacks({});
    }
  }

  async function handleGenerate() {
    if (!template || !model) return;
    setLoading(true);
    setStatus(null);
    setInputsCollapsed(true);
    setUrlError(null);
    
    try {
      // Validate accessibility template has URLs
      if (template.taskType === "accessibility") {
        const urls = editablePrompt?.trim();
        if (!urls) {
          setStatus("Please enter at least one URL to audit.");
          setLoading(false);
          setInputsCollapsed(false);
          return;
        }
      }

      // Include URL content as an asset if URL input is provided
      const allAssets = fileUploadsAllowed ? [...assetPayloads] : [];

      // Fetch URL content inline if URL is provided (for non-accessibility templates)
      if (template.allowUrlInput && template.taskType !== "accessibility" && urlInput.trim()) {
        try {
          const urlRes = await fetch("/api/url/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: urlInput.trim() })
          });
          const urlData = await urlRes.json();
          
          if (!urlRes.ok) {
            setUrlError(urlData.error || "Failed to fetch URL");
            setLoading(false);
            setInputsCollapsed(false);
            return;
          }
          
          // Add URL content to assets
          allAssets.push({
            name: `Website: ${urlData.title}`,
            type: "url",
            content: `URL: ${urlData.url}\n\nPage Title: ${urlData.title}\n\nContent:\n${urlData.content}`
          });
        } catch (err) {
          setUrlError("Failed to fetch URL");
          setLoading(false);
          setInputsCollapsed(false);
          return;
        }
      }
      
      // For accessibility tasks, prompt contains URLs (not the template's LLM prompt)
      const promptToSend = template.taskType === "accessibility"
        ? editablePrompt?.trim() || ""
        : editablePrompt?.trim() || template.prompt;

      const res = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: template.category,
          model,
          mode,
          detailLevel,
          prompt: promptToSend,
          files: fileUploadsAllowed ? files.map((f) => f.name) : [],
          assets: allAssets,
          taskType: template.taskType || "llm",
          templateId: template.id
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.error || "Generation failed.");
      } else {
        setStatus(null);
        setTaskId(data?.taskId || null);
        setThreadId(data?.threadId || null);
        const resp = data?.content || null;
        setLastResponse(resp);
        setLastRecommendation(data?.recommendation || null);
        setSelectedRecommendation(null); // Reset selection when new analysis is generated
        if (resp) await addToHistory(resp);
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
          className={`hidden shrink-0 flex-col border-r-2 border-[#EEEEEE] transition-all duration-200 md:flex ${railCollapsed ? "w-16" : "w-64"}`}
        >
          <div className="flex flex-col h-full pt-5 overflow-hidden">
          <div className="flex items-center justify-between px-3 flex-shrink-0">
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
          <nav className="flex-1 flex flex-col min-h-0 space-y-2 px-2 text-sm font-semibold text-slate-800">
            {projects.map((proj, idx) => (
              <div key={proj} className={`flex flex-col flex-1 min-h-0 space-y-1 ${proj === "New UX Task" ? "mt-[10px]" : ""}`}>
                <button
                  className="flex w-full flex-shrink-0 items-center gap-3 px-3 py-2 transition hover:-translate-y-[1px]"
                  onClick={() => {
                    if (proj === "New UX Task") {
                      setTemplateIndex(null);
                      setLastResponse(null);
                      setLastRecommendation(null);
                      setStatus(null);
                      setInputsCollapsed(true);
                      setFiles([]);
                      setTaskId(null);
                      setThreadId(null);
                      setEditablePrompt("");
                      setPromptEditing(false);
                      setIsViewingHistoryItem(false); // Reset history flag
                    }
                  }}
                >
                  <Image src={proj === "New UX Task" ? "/images/new-project.svg" : "/images/close-folder.svg"} alt={proj === "New UX Task" ? "New UX Task" : "Folder"} width={20} height={20} className="h-5 w-5 flex-shrink-0" />
                  {!railCollapsed && <span className="flex-1 text-left">{proj}</span>}

                </button>
                {proj === "New UX Task" && (
                  <UxExtensionsSection collapsed={railCollapsed} />
                )}
                {proj === "New UX Task" && (
                  <PopularTasksSection
                    collapsed={railCollapsed}
                    templates={popularTemplates}
                    onSelect={(idx) => setTemplateIndex(idx)}
                  />
                )}
                {proj === "New UX Task" && !railCollapsed && (
                  <div className="flex-shrink-0 space-y-1 pb-3 border-b border-slate-200">
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
                            <div className="group flex w-full items-center gap-1 rounded px-1 transition hover:bg-slate-100">
                              <button
                                type="button"
                                className="flex flex-1 items-center gap-2 py-1 text-sm font-semibold text-slate-800"
                                onClick={() =>
                                  setProjectFolders((prev) =>
                                    prev.map((f) => (f.id === folder.id ? { ...f, open: !f.open } : f))
                                  )
                                }
                              >
                                <Image src={folder.open ? "/images/open-folder.svg" : "/images/close-folder.svg"} alt="Project Folder" width={20} height={20} className="h-5 w-5 flex-shrink-0" />
                                <span className="flex-1 text-left">{folder.name}</span>
                                <span className={`text-xs text-slate-500 transition ${folder.open ? "rotate-90" : ""}`}>⌄</span>
                              </button>
                              <button
                                type="button"
                                className="hidden h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-200 group-hover:flex"
                                onClick={() => setProjectMenuOpen(projectMenuOpen === folder.id ? null : folder.id)}
                                aria-label="Project actions"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>
                              </button>
                              {projectMenuOpen === folder.id && (
                                <div 
                                  className="absolute z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                                  style={{ 
                                    marginLeft: '140px',
                                    marginTop: '-10px'
                                  }}
                                  onMouseLeave={() => setProjectMenuOpen(null)}
                                >
                                  <button
                                    onClick={() => {
                                      setDeleteConfirmProjectId(folder.id);
                                      setProjectMenuOpen(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
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
                  <div className="flex flex-1 flex-col min-h-0">
                    <div className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex-shrink-0">UX Task Timeline</div>
                    <div className="flex-1 min-h-0 space-y-1 overflow-y-auto">
                      {history.filter((h) => !h.projectId).length === 0 && (
                        <div className="px-3 text-[11px] text-slate-500">No history yet</div>
                      )}
                      {history.filter((h) => !h.projectId).map((item) => (
                        <HistoryItem
                          key={item.id}
                          item={item}
                          isMenuOpen={historyMenu === item.id}
                          onMenuToggle={() => setHistoryMenu((m) => (m === item.id ? null : item.id))}
                          onMenuClose={() => setHistoryMenu(null)}
                          onLoadHistory={() => loadHistory(item.id)}
                          onRename={(newTitle) => renameHistory(item.id, newTitle)}
                          onMoveToProject={(projectId) => moveHistoryToFolder(item.id, projectId)}
                          onDelete={() => deleteHistory(item.id)}
                          projectFolders={projectFolders}
                        />
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
          {!isWireframeOnlyObjective && (
            <header className="flex items-center justify-between text-sm text-slate-700">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModelMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:shadow focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <span className="text-[11px] uppercase text-slate-500">Model / Mode / Detail</span>
                  <span className={isTaskOptimized ? "text-orange-600 font-bold" : "text-slate-900"}>
                    {isTaskOptimized ? "Task-Optimized" : (availableModels.find((m) => m.modelId === model)?.displayName || model)} · {mode} · {detailLevel === "brief" ? "Brief" : detailLevel === "standard" ? "Standard" : "In-depth"}
                  </span>
                  {isTaskOptimized && (
                    <span className="rounded-full bg-orange-100 px-1.5 py-[1px] text-[10px] font-bold text-orange-700 ml-1">Task-Optimized</span>
                  )}
                </button>
                {modelMenuOpen && (
                  <div
                    className="absolute z-30 mt-2 w-[520px] max-w-[90vw] rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
                    onMouseLeave={() => setModelMenuOpen(false)}
                  >
                    <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-slate-700">
                      <div>
                        <p className="mb-1 text-[11px] uppercase text-slate-500">Model</p>
                        <div className="space-y-1">
                          {/* Task-Optimized option — only when template has defaults */}
                          {template?.defaultModel && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsTaskOptimized(true);
                                  setModel(template.defaultModel!);
                                  if (template.defaultMode) setMode(template.defaultMode as typeof mode);
                                  if (template.defaultDetailLevel) setDetailLevel(template.defaultDetailLevel as typeof detailLevel);
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-orange-50 ${
                                  isTaskOptimized ? "bg-orange-100 font-bold text-orange-700" : "text-orange-600"
                                }`}
                              >
                                <span className="w-4 text-orange-600">{isTaskOptimized ? "✓" : ""}</span>
                                <span className="whitespace-nowrap font-semibold">Task-Optimized</span>
                              </button>
                              <div className="border-b border-slate-100 my-1" />
                            </>
                          )}
                          {/* Dynamic models from API */}
                          {availableModels.map((m) => (
                            <button
                              key={m.modelId}
                              type="button"
                              onClick={() => {
                                setIsTaskOptimized(false);
                                setModel(m.modelId);
                              }}
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-slate-50 ${
                                !isTaskOptimized && model === m.modelId ? "bg-slate-100 font-bold text-slate-900" : "text-slate-700"
                              }`}
                            >
                              <span className="w-4 text-slate-900">{!isTaskOptimized && model === m.modelId ? "✓" : ""}</span>
                              <span className="whitespace-nowrap">{m.displayName}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] uppercase text-slate-500">Mode</p>
                        <div className="space-y-1">
                          {modes.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => { setIsTaskOptimized(false); setMode(m); }}
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-slate-50 ${
                                mode === m ? "bg-slate-100 font-bold text-slate-900" : "text-slate-700"
                              }`}
                            >
                              <span className="w-4 text-slate-900">{mode === m ? "✓" : ""}</span>
                              <span className="truncate">
                                {m === "auto" ? "Auto" : m === "instant" ? "Instant" : "Thinking"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] uppercase text-slate-500">Detail</p>
                        <div className="space-y-1">
                          {detailLevels.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => { setIsTaskOptimized(false); setDetailLevel(d); }}
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-slate-50 ${
                                detailLevel === d ? "bg-slate-100 font-bold text-slate-900" : "text-slate-700"
                              }`}
                            >
                              <span className="w-4 text-slate-900">{detailLevel === d ? "✓" : ""}</span>
                              <span className="truncate">
                                {d === "brief" ? "Brief" : d === "standard" ? "Standard" : "In-depth"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </header>
          )}

          {!lastResponse && (
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">
                {firstNameLocal ? `Hi ${firstNameLocal}, what UX problem are you solving today?` : "What UX problem are you solving today?"}
              </h1>
            </div>
          )}

          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-3">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  {template ? (template.templateCategory?.name || template.category) : "Define Your UX Objective"}
                </div>
                <SearchableCategoryDropdown
                  templateList={templateList}
                  groupedTemplates={groupedTemplates}
                  selectedIndex={templateIndex}
                  onSelect={(idx) => {
                    setTemplateIndex(idx);
                    const nextTemplate = idx !== null ? templateList[idx] : null;
                    setEditablePrompt(nextTemplate?.prompt || "");
                    setTaskId(null);
                    setThreadId(null);
                    setLastResponse(null);
                    setLastRecommendation(null);
                    setStatus(null);
                    setFiles([]);
                    setAssetPayloads([]);
                    setFollowupFiles([]);
                    setFollowupAssetPayloads([]);
                    setFollowupText("");
                    setImages([]);
                    setImageError(null);
                    setImagePrompt("");
                    setResultsCollapsed(false);
                    setIsViewingHistoryItem(false); // Clear history flag when selecting new template
                    setInputsCollapsed(true); // Keep UX Guidance collapsed when selecting new task
                    // Keep guidance sections collapsed for new task
                    setGuidanceExpanded({
                      useAiTo: false,
                      example: false,
                      outcome: false,
                      assets: false
                    });
                  }}
                  placeholder="Select a Category"
                />
              </div>

              {template && !isViewingHistoryItem && (
                <>
                  <div className="flex items-center justify-between px-5 py-2">
                    <span className="text-sm font-semibold text-slate-700">UX Guidance</span>
                    <button
                      type="button"
                      onClick={() => setInputsCollapsed((v) => !v)}
                      className="flex h-6 w-6 items-center justify-center text-slate-700 transition hover:-translate-y-[1px]"
                      aria-label={inputsCollapsed ? "Expand task inputs" : "Collapse task inputs"}
                    >
                    <Image
                      src="/images/rotate.svg"
                      alt="Toggle"
                      width={14}
                      height={14}
                      className={`transition-transform ${inputsCollapsed ? "" : "rotate-180"}`}
                    />
                    </button>
                  </div>

                  <div className={`space-y-2 px-5 py-4 text-sm ${inputsCollapsed ? "hidden" : ""}`}>
                    {template.guidanceUseAiTo && (
                    <div className="rounded-lg border-[1.5px] border-[#e5e7eb] border-l-[4px] border-l-[#3b82f6] bg-white text-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleGuidanceSection('useAiTo')}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        aria-expanded={guidanceExpanded.useAiTo}
                        aria-controls="guidance-useAiTo"
                      >
                        <span className="text-[18px] font-semibold text-[#1e40af]">
                          What Luke UX will check:
                        </span>
                        <svg 
                          className={`h-5 w-5 text-slate-600 transition-transform duration-200 flex-shrink-0 ml-2 ${
                            guidanceExpanded.useAiTo ? 'rotate-180' : ''
                          }`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {guidanceExpanded.useAiTo && (
                        <div 
                          id="guidance-useAiTo"
                          role="region"
                          className="px-5 pb-4 prose prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:my-1" 
                          dangerouslySetInnerHTML={{ __html: template.guidanceUseAiTo }} 
                        />
                      )}
                    </div>
                    )}
                    {template.guidanceExample && (
                    <div className="rounded-lg border-[1.5px] border-[#e5e7eb] border-l-[4px] border-l-[#f59e0b] bg-white text-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleGuidanceSection('example')}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        aria-expanded={guidanceExpanded.example}
                        aria-controls="guidance-example"
                      >
                        <span className="text-[18px] font-semibold text-[#92400e]">Example of a problem:</span>
                        <svg 
                          className={`h-5 w-5 text-slate-600 transition-transform duration-200 flex-shrink-0 ml-2 ${
                            guidanceExpanded.example ? 'rotate-180' : ''
                          }`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {guidanceExpanded.example && (
                        <div 
                          id="guidance-example"
                          role="region"
                          className="px-5 pb-4 prose prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:my-1" 
                          dangerouslySetInnerHTML={{ __html: template.guidanceExample }} 
                        />
                      )}
                    </div>
                    )}
                    {template.guidanceOutcome && (
                    <div className="rounded-lg border-[1.5px] border-[#e5e7eb] border-l-[4px] border-l-[#10b981] bg-white text-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleGuidanceSection('outcome')}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        aria-expanded={guidanceExpanded.outcome}
                        aria-controls="guidance-outcome"
                      >
                        <span className="text-[18px] font-semibold text-[#065f46]">How Luke UX can help:</span>
                        <svg 
                          className={`h-5 w-5 text-slate-600 transition-transform duration-200 flex-shrink-0 ml-2 ${
                            guidanceExpanded.outcome ? 'rotate-180' : ''
                          }`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {guidanceExpanded.outcome && (
                        <div 
                          id="guidance-outcome"
                          role="region"
                          className="px-5 pb-4 prose prose-slate max-w-none [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:my-1" 
                          dangerouslySetInnerHTML={{ __html: template.guidanceOutcome }} 
                        />
                      )}
                    </div>
                    )}
                    {template.assets && (
                    <div className="rounded-lg border-[1.5px] border-[#e5e7eb] border-l-[4px] border-l-[#6b7280] bg-white text-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleGuidanceSection('assets')}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        aria-expanded={guidanceExpanded.assets}
                        aria-controls="guidance-assets"
                      >
                        <span className="text-[18px] font-semibold text-[#374151]">What Luke UX needs:</span>
                        <svg 
                          className={`h-5 w-5 text-slate-600 transition-transform duration-200 flex-shrink-0 ml-2 ${
                            guidanceExpanded.assets ? 'rotate-180' : ''
                          }`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {guidanceExpanded.assets && (
                        <div 
                          id="guidance-assets"
                          role="region"
                          className="px-5 pb-4 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1 [&_li]:my-0 [&_p]:my-1" 
                          dangerouslySetInnerHTML={{ __html: template.assets }} 
                        />
                      )}
                    </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div ref={statusRef} />
            {status && (
              <div className={`flex items-start justify-between rounded-lg border px-3 py-2 text-sm ${
                status.toLowerCase().includes('success') || status.toLowerCase().includes('completed') || status.toLowerCase().includes('downloaded') || status.toLowerCase().includes('saved to') || status.toLowerCase().includes('moved to')
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}>
                <div className="pr-3">{status}</div>
                <button
                  type="button"
                  onClick={() => setStatus(null)}
                  className={`ml-auto font-bold ${
                    status.toLowerCase().includes('success') || status.toLowerCase().includes('completed') || status.toLowerCase().includes('downloaded') || status.toLowerCase().includes('saved to') || status.toLowerCase().includes('moved to')
                      ? 'text-green-700 hover:text-green-900'
                      : status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')
                      ? 'text-red-700 hover:text-red-900'
                      : 'text-amber-700 hover:text-amber-900'
                  }`}
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              </div>
            )}
            {!isWireframeOnlyObjective && loading && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                <div
                  className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin"
                  aria-hidden="true"
                />
                <span>
                  Analyzing…This can take up to ~30–60s
                  {loadingElapsedTime > 0 && (
                    <span className="ml-2 font-semibold text-slate-800">
                      Thinking: {formatElapsedTime(loadingElapsedTime)}
                    </span>
                  )}
                </span>
              </div>
            )}

            {template && !isWireframeOnlyObjective && !inputsCollapsed && !isViewingHistoryItem && (userRole === "ADMIN" || userRole === "SUPERUSER") && template.taskType !== "accessibility" && (
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

            {template && !isWireframeOnlyObjective && !inputsCollapsed && !isViewingHistoryItem && template.allowUrlInput && template.taskType !== "accessibility" && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-600">Analyze a website or prototype link:</p>
                  <p className="text-xs text-slate-500">One URL at a time: Webpage, Prototype or Figma Project URL.</p>
                </div>

                {urlError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {urlError}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlError(null);
                    }}
                    placeholder="https://example.com/page"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <FigmaConnectInline />
                </div>
              </div>
            )}

            {/* Accessibility Audit URL Input */}
            {template && !isWireframeOnlyObjective && !inputsCollapsed && !isViewingHistoryItem && template.taskType === "accessibility" && (
              <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-6 shadow-sm">
                <div className="text-left">
                  <p className="text-xs font-semibold text-blue-700">Enter URLs to audit for WCAG 2.x AA + Section 508:</p>
                  <p className="text-xs text-blue-600">Enter one URL per line (up to 3 URLs for MVP).</p>
                </div>

                <div className="flex flex-col gap-3">
                  <textarea
                    value={editablePrompt}
                    onChange={(e) => setEditablePrompt(e.target.value)}
                    placeholder={"https://example.com\nhttps://example.com/about\nhttps://example.com/contact"}
                    rows={4}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-blue-600">
                    Automated scan checks for: color contrast, alt text, form labels, heading structure, link text, ARIA attributes, and more.
                  </p>
                </div>
              </div>
            )}

            {template && !isWireframeOnlyObjective && !inputsCollapsed && !isViewingHistoryItem && (
              <>
                {/* Upload UI (only when enabled for this template) */}
                {fileUploadsAllowed && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-600">Upload your files:</p>
                      <p className="text-xs text-slate-500">PDF, DOCX, CSV, XLSX, PNG, JPG, SVG, TXT, MD</p>
                    </div>
                    {files.length > 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="font-semibold">Attached files</p>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-slate-600 hover:text-red-600"
                            onClick={() => {
                              setFiles([]);
                              setAssetPayloads([]);
                            }}
                          >
                            Clear all
                          </button>
                        </div>
                        <ul className="mt-1 space-y-1">
                          {files.map((file) => (
                            <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2">
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                className="rounded-full px-2 py-[2px] text-[11px] font-semibold text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setFiles((prev) => prev.filter((f) => !(f.name === file.name && f.size === file.size)));
                                  setAssetPayloads((prev) => prev.filter((p) => p.name !== file.name));
                                }}
                                aria-label={`Remove ${file.name}`}
                              >
                                Remove
                              </button>
                            </li>
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
                        aria-label="Upload your files"
                      />
                      <button
                        type="button"
                        onClick={handleUploadClick}
                        className="flex h-16 w-16 items-center justify-center rounded-full border border-black bg-white text-3xl font-semibold text-black shadow-[0_2px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_3px_0_#111] disabled:opacity-60"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Run button (always visible when template selected) */}
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
                  <div className="flex flex-col items-center gap-4">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={loading || !template}
                      className="inline-flex w-auto max-w-full items-center justify-center whitespace-nowrap rounded-[18px] bg-[var(--brand-yellow,#ffd526)] px-6 py-3 text-base font-black uppercase text-black shadow-[0_6px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? "Working..." : `Analyze ${frameworkLabel}`}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* High-fidelity → low-fidelity wireframe renderer (template-controlled) */}
            {template && wireframeRendererAllowed && !isViewingHistoryItem && <WireframeRenderer />}

{!isWireframeOnlyObjective && lastResponse && (
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
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Download response"
                      disabled={!lastResponse || loading}
                      onClick={() => setStatus(null)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClickCapture={(e) => {
                        e.preventDefault();
                        setSaveProjectMenu(false);
                        setDownloadMenu((v) => !v);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-60"
                    >
                      <Image src="/images/download.svg" alt="Download" width={16} height={16} className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    {downloadMenu && (
                      <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                        {[
                          { label: "Markdown (.md)", fmt: "MD", icon: "/images/markdown-icon.svg", available: true },
                          { label: "Text (.txt)", fmt: "TXT", icon: "/images/text-icon.svg", available: true },
                          { label: "CSV (.csv)", fmt: "CSV", icon: "/images/csv-icon.svg", available: true },
                          { label: "PDF (.pdf)", fmt: "PDF", icon: "/images/pdf-icon.svg", available: true },
                          { label: "DOCX (.docx)", fmt: "DOCX", icon: "/images/docx-icon.svg", available: true },
                          { label: "XLSX (.xlsx)", fmt: "XLSX", icon: "/images/xlsx-icon.svg", available: true },
                          { label: "PNG (.png)", fmt: "PNG", icon: "/images/png-icon.svg", available: true },
                          { label: "JPG (.jpg)", fmt: "JPG", icon: "/images/jpg-icon.svg", available: true },
                          { label: "Figjam (.jam)", fmt: "FIGMA", icon: "/images/figma-icon-2.svg", available: true }
                        ].map((item) => (
                          <button
                            key={item.fmt}
                            type="button"
                            disabled={!lastResponse || loading}
                            onClick={() => {
                              if (!lastResponse) return;
                              const textContent = lastResponse;
                              const download = (data: BlobPart, type: string, filename: string) => {
                                const blob = new Blob([data], { type });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                              };

                              if (!item.available) {
                                setStatus(`${item.label} is coming soon.`);
                                setDownloadMenu(false);
                                return;
                              }

                              if (item.fmt === "MD") {
                                download(textContent, "text/markdown;charset=utf-8", "design-feedback.md");
                                setDownloadMenu(false);
                                return;
                              }
                              if (item.fmt === "TXT") {
                                download(textContent, "text/plain;charset=utf-8", "design-feedback.txt");
                                setDownloadMenu(false);
                                return;
                              }
                              if (item.fmt === "CSV") {
                                const safe = textContent.replace(/"/g, '""');
                                const csv = `\"Content\"\n\"${safe}\"`;
                                download(csv, "text/csv;charset=utf-8", "design-feedback.csv");
                                setDownloadMenu(false);
                                return;
                              }
                              if (item.fmt === "PDF") {
                                (async () => {
                                  try {
                                    if (!responseRef.current) {
                                      setStatus("Nothing to export yet.");
                                      return;
                                    }
                                    if (!pdfLibsRef.current) {
                                      const [toPng, { jsPDF }] = await Promise.all([
                                        import("html-to-image").then((m) => m.toPng),
                                        import("jspdf")
                                      ]);
                                      pdfLibsRef.current = { toPng, jsPDF };
                                    }
                                    const { toPng, jsPDF } = pdfLibsRef.current;
                                    setStatus("Building PDF…");
                                    const dataUrl = await toPng(responseRef.current, { cacheBust: true });
                                    const pdf = new (jsPDF as any)({
                                      orientation: "p",
                                      unit: "px",
                                      format: "a4"
                                    });
                                    const pageWidth = pdf.internal.pageSize.getWidth();
                                    const pageHeight = pdf.internal.pageSize.getHeight();
                                    const img = new (window.Image as any)();
                                    img.src = dataUrl;
                                    await new Promise<void>((resolve, reject) => {
                                      img.onload = () => resolve();
                                      img.onerror = reject;
                                    });
                                    const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
                                    const imgWidth = img.width * ratio;
                                    const imgHeight = img.height * ratio;
                                    const x = (pageWidth - imgWidth) / 2;
                                    const y = 20;
                                    pdf.addImage(dataUrl, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST");
                                    pdf.save("design-feedback.pdf");
                                    setStatus("PDF downloaded.");
                                  } catch (err) {
                                    setStatus("PDF export failed.");
                                  } finally {
                                    setDownloadMenu(false);
                                  }
                                })();
                                return;
                              }
                              if (item.fmt === "DOCX") {
                                (async () => {
                                  try {
                                    if (!lastResponse) {
                                      setStatus("Nothing to export yet.");
                                      return;
                                    }
                                    const { Document, Packer, Paragraph, TextRun } = await import("docx");

                                    const lines = lastResponse.split(/\r?\n/);
                                    const paragraphs = lines.map((line) => {
                                      const trimmed = line.trim();
                                      if (!trimmed) {
                                        return new Paragraph({ children: [new TextRun({ text: " " })], spacing: { after: 120 } });
                                      }
                                      if (/^#{3}\s+/.test(trimmed)) {
                                        return new Paragraph({
                                          children: [
                                            new TextRun({
                                              text: trimmed.replace(/^#{3}\s+/, ""),
                                              bold: true,
                                              size: 26,
                                              font: "Arial"
                                            })
                                          ],
                                          spacing: { after: 180 }
                                        });
                                      }
                                      if (/^#{2}\s+/.test(trimmed)) {
                                        return new Paragraph({
                                          children: [
                                            new TextRun({
                                              text: trimmed.replace(/^#{2}\s+/, ""),
                                              bold: true,
                                              size: 28,
                                              font: "Arial"
                                            })
                                          ],
                                          spacing: { after: 200 }
                                        });
                                      }
                                      if (/^#\s+/.test(trimmed)) {
                                        return new Paragraph({
                                          children: [
                                            new TextRun({
                                              text: trimmed.replace(/^#\s+/, ""),
                                              bold: true,
                                              size: 32,
                                              font: "Arial"
                                            })
                                          ],
                                          spacing: { after: 220 }
                                        });
                                      }
                                      if (/^(\-|\*)\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
                                        return new Paragraph({
                                          children: [
                                            new TextRun({
                                              text: trimmed.replace(/^(\-|\*|\d+\.)\s+/, ""),
                                              size: 22,
                                              font: "Arial"
                                            })
                                          ],
                                          bullet: { level: 0 },
                                          spacing: { after: 100 }
                                        });
                                      }
                                      return new Paragraph({
                                        children: [
                                          new TextRun({
                                            text: trimmed,
                                            size: 22,
                                            font: "Arial"
                                          })
                                        ],
                                        spacing: { after: 160 }
                                      });
                                    });

                                    const doc = new Document({
                                      sections: [
                                        {
                                          properties: {},
                                          children: paragraphs
                                        }
                                      ]
                                    });

                                    const blob = await Packer.toBlob(doc);
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = "design-feedback.docx";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                    setStatus("DOCX downloaded.");
                                  } catch (err) {
                                    setStatus("DOCX export failed.");
                                  } finally {
                                    setDownloadMenu(false);
                                  }
                                })();
                                return;
                              }
                              if (item.fmt === "PNG") {
                                (async () => {
                                  try {
                                    if (!responseRef.current) {
                                      setStatus("Nothing to export yet.");
                                      return;
                                    }
                                    const { toPng } = await import("html-to-image");
                                    setStatus("Building PNG…");
                                    const dataUrl = await toPng(responseRef.current, { cacheBust: true });
                                    const link = document.createElement("a");
                                    link.href = dataUrl;
                                    link.download = "design-feedback.png";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    setStatus("PNG downloaded.");
                                  } catch (err) {
                                    setStatus("PNG export failed.");
                                  } finally {
                                    setDownloadMenu(false);
                                  }
                                })();
                                return;
                              }
                              if (item.fmt === "JPG") {
                                (async () => {
                                  try {
                                    if (!responseRef.current) {
                                      setStatus("Nothing to export yet.");
                                      return;
                                    }
                                    const { toJpeg } = await import("html-to-image");
                                    setStatus("Building JPG…");
                                    const dataUrl = await toJpeg(responseRef.current, { cacheBust: true, quality: 0.92 });
                                    const link = document.createElement("a");
                                    link.href = dataUrl;
                                    link.download = "design-feedback.jpg";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    setStatus("JPG downloaded.");
                                  } catch (err) {
                                    setStatus("JPG export failed.");
                                  } finally {
                                    setDownloadMenu(false);
                                  }
                                })();
                                return;
                              }
                              if (item.fmt === "FIGMA") {
                                (async () => {
                                  try {
                                    if (!lastResponse) {
                                      setStatus("Nothing to export yet.");
                                      return;
                                    }
                                    // Text-based Figjam stub: export the response as plain text with .jam extension.
                                    const blob = new Blob([lastResponse], { type: "text/plain;charset=utf-8" });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = "design-feedback.jam";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                    setStatus("Figjam (.jam) downloaded.");
                                  } catch (err) {
                                    setStatus("Figjam export failed.");
                                  } finally {
                                    setDownloadMenu(false);
                                  }
                                })();
                                return;
                              }
                              if (item.fmt === "XLSX") {
                                (async () => {
                                  try {
                                    if (!lastResponse) {
                                      setStatus("Nothing to export yet.");
                                      return;
                                    }
                                    const XLSX = await import("xlsx");
                                    const lines = lastResponse.split(/\r?\n/);
                                    const rows = lines.map((line) => [line]);
                                    const sheet = XLSX.utils.aoa_to_sheet(rows);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, sheet, "Design Feedback");
                                    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                                    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = "design-feedback.xlsx";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                    setStatus("XLSX downloaded.");
                                  } catch (err) {
                                    setStatus("XLSX export failed.");
                                  } finally {
                                    setDownloadMenu(false);
                                  }
                                })();
                                return;
                              }
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Image src={item.icon} alt={item.fmt} width={16} height={16} className="h-4 w-4" />
                            <span className="flex-1 text-xs font-semibold">
                              {item.label}
                              {!item.available && <span className="ml-1 text-[10px] uppercase text-slate-500">(coming soon)</span>}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">
                      {template?.title ? `Luke UX: ${template.title} Analysis` : "Analysis"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setResultsCollapsed((v) => !v)}
                      className="flex items-center justify-center h-7 w-7 rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-expanded={!resultsCollapsed}
                      aria-label={resultsCollapsed ? "Expand results" : "Collapse results"}
                    >
                      <svg 
                        className={`h-5 w-5 transition-transform ${resultsCollapsed ? "" : "rotate-180"}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {!resultsCollapsed && (
                    <div className="space-y-4">
                      {lastResponse && (
                        <div ref={responseRef} className="ai-response max-w-none">
                          <StructuredAnalysisOutput
                            response={lastResponse}
                            recommendation={lastRecommendation}
                            selectedIndex={selectedRecommendation}
                            allowMockupGeneration={mockupGenerationAllowed}
                            onSelectRecommendation={(idx, title, content) => {
                              // If mockup generation is disabled for this template, do not allow selecting
                              // recommendations for mockup generation or auto-opening that UI.
                              if (!mockupGenerationAllowed) {
                                setSelectedRecommendation(null);
                                setImagePrompt("");
                                return;
                              }

                              setSelectedRecommendation(idx);
                              if (idx !== null) {
                                // Auto-populate the image prompt with the recommendation
                                setImagePrompt(`Create a UI mockup showing: ${title}. ${content.replace(/\*\*/g, '').substring(0, 200)}`);
                                // Auto-expand the mockup section
                                setImageSectionOpen(true);
                                // Scroll to mockup section after a brief delay to allow expansion
                                setTimeout(() => {
                                  mockupSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              } else {
                                setImagePrompt('');
                              }
                            }}
                            historyEntryId={currentHistoryEntryId}
                            templateId={template?.id || null}
                            templateTitle={template?.title || null}
                            feedbacks={recommendationFeedbacks}
                            onFeedbackChange={handleRecommendationFeedback}
                          />
                        </div>
                      )}

                      {!mockupGenerationAllowed && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          Mockup Generation is disabled for this UX objective.
                        </div>
                      )}
                      {images.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {images.map((src, idx) => (
                            <div key={idx} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-sm">
                              <Image src={src} alt={`Generated ${idx + 1}`} width={512} height={512} className="h-auto w-full rounded-md object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = src;
                                  link.download = `generated-${idx + 1}.png`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="mt-2 w-full rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!isWireframeOnlyObjective && refineAnalysisAllowed && (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const followup = followupText.trim();
                    if (!followup) {
                      setStatus("Please enter a follow-up message.");
                      scrollToStatus();
                      return;
                    }
                    setLoading(true);
                    scrollToStatus();
                    setStatus(null);
                    setInputsCollapsed(true);
                    try {
                      // If we have task/thread, use iterate. Otherwise, fall back to a fresh generate with follow-up context.
                      if (taskId && threadId) {
                        const res = await fetch("/api/tasks/iterate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            model,
                            mode,
                            detailLevel,
                            prompt: followup,
                            taskId,
                            threadId,
                            assets: fileUploadsAllowed ? [...assetPayloads, ...followupAssetPayloads] : []
                          })
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok) {
                          setStatus(json?.error || "Iteration failed.");
                        } else {
                          const newContent = json?.content || null;
                          setLastResponse(newContent);
                          setLastRecommendation(json?.recommendation || null);
                          setSelectedRecommendation(null); // Reset selection on new response
                          setStatus("Iteration completed.");
                          setFollowupText("");
                          
                          // If viewing a history item, update it with the refined content
                          if (currentHistoryEntryId && newContent) {
                            try {
                              const updateRes = await fetch(`/api/history/${currentHistoryEntryId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ content: newContent })
                              });
                              if (updateRes.ok) {
                                // Update local history state
                                setHistory((prev) => 
                                  prev.map((h) => 
                                    h.id === currentHistoryEntryId ? { ...h, content: newContent } : h
                                  )
                                );
                              }
                            } catch (err) {
                              console.error("Failed to update history with refinement:", err);
                            }
                          }
                        }
                      } else {
                        // New thread from history-loaded context
                        const context = lastResponse ? `Prior response:\n${lastResponse}\n\n` : "";
                        const prompt = `${context}Follow-up request:\n${followup}`;
                        const res = await fetch("/api/tasks/generate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            template: template?.category || "General",
                            model,
                            mode,
                            detailLevel,
                            prompt,
                            files: [],
                            assets: fileUploadsAllowed ? [...assetPayloads, ...followupAssetPayloads] : []
                          })
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok) {
                          setStatus(json?.error || "Iteration failed.");
                        } else {
                          setStatus("Iteration completed.");
                          setTaskId(json?.taskId || null);
                          setThreadId(json?.threadId || null);
                          const newContent = json?.content || null;
                          setLastResponse(newContent);
                          setLastRecommendation(json?.recommendation || null);
                          setSelectedRecommendation(null); // Reset selection on new response
                          setFollowupText("");
                          
                          // If viewing a history item, update it with the refined content
                          if (currentHistoryEntryId && newContent) {
                            try {
                              const updateRes = await fetch(`/api/history/${currentHistoryEntryId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ content: newContent })
                              });
                              if (updateRes.ok) {
                                // Update local history state
                                setHistory((prev) => 
                                  prev.map((h) => 
                                    h.id === currentHistoryEntryId ? { ...h, content: newContent } : h
                                  )
                                );
                              }
                            } catch (err) {
                              console.error("Failed to update history with refinement:", err);
                            }
                          }
                        }
                      }
                    } catch (err) {
                      setStatus("Iteration failed.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    <span className="block">Refine the Analysis</span>
                    <textarea
                      name="followup"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      rows={3}
                      placeholder="Add Constraints or Context"
                      value={followupText}
                      onChange={(e) => setFollowupText(e.target.value)}
                    />
                  </label>
                  <div className="mt-2 space-y-2">
                    {fileUploadsAllowed && followupFiles.length > 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <p className="font-semibold">Attached files</p>
                        <ul className="mt-1 list-disc pl-4">
                          {followupFiles.map((file) => (
                            <li key={file.name}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {fileUploadsAllowed && (
                        <>
                          <input
                            ref={followupFileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFollowupUploadSelect}
                            aria-label="Upload follow-up assets"
                          />
                          <button
                            type="button"
                            onClick={() => followupFileInputRef.current?.click()}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:-translate-y-[1px]"
                            aria-label="Add assets"
                          >
                            <Image src="/images/add-assets.svg" alt="Add assets" width={25} height={25} className="h-6 w-6" />
                          </button>
                        </>
                      )}
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
                  </div>
                </form>
                )}
                {!isWireframeOnlyObjective && mockupGenerationAllowed && (
                  <div ref={mockupSectionRef} className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900">Visualize</p>
                      <div className="flex items-center gap-2">
                        {imageError && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
                            {imageError}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setImageSectionOpen((v) => !v)}
                          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-expanded={imageSectionOpen}
                          aria-label={imageSectionOpen ? "Collapse image generation" : "Expand image generation"}
                        >
                          <svg 
                            className={`h-5 w-5 transition-transform ${imageSectionOpen ? "rotate-180" : ""}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {imageSectionOpen && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>Or describe your own scenario:</span>
                          </div>
                          <textarea
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                            rows={5}
                            placeholder="Copy any section to generate an image or mockup."
                          />
                        </div>
                        <div className="flex justify-center mt-4">
                          <ProgressButton
                            imageLoading={imageLoading}
                            elapsedTime={imageElapsedTime}
                            onClick={async () => {
                              if (!imagePrompt.trim()) {
                                setImageError("Enter a prompt.");
                                return;
                              }
                              setImageError(null);
                              setImageLoading(true);
                              try {
                                const res = await fetch("/api/images/generate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ prompt: imagePrompt.trim(), size: "1024x1024", n: 1 })
                                });
                                const json = await res.json().catch(() => null);
                                if (!res.ok) {
                                  setImageError(json?.error || "Image generation failed.");
                                  return;
                                }
                                setImages(json.images || []);
                                setResultsCollapsed(false);
                              } catch (err) {
                                setImageError("Image generation failed.");
                              } finally {
                                setImageLoading(false);
                              }
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            )}

            {showFeedbackModal && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Tell us what you think.</h2>
                      <p className="text-xs font-semibold uppercase text-slate-600 mt-1">What kind of feedback do you have?</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="rounded-full px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-2">
                    {[
                      { key: "LIKE", label: "😊 I like something" },
                      { key: "DISLIKE", label: "🙁 I don't like something" },
                      { key: "SUGGESTION", label: "💡 I have a suggestion" }
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                          feedbackType === opt.key ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          className="h-4 w-4"
                          checked={feedbackType === opt.key}
                          onChange={() => setFeedbackType(opt.key as FeedbackType)}
                        />
                        <span className="text-slate-900">{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 space-y-1">
                    <label className="text-xs font-semibold uppercase text-slate-600">Comments or Questions</label>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => {
                        if (e.target.value.length <= FEEDBACK_MAX_LEN) setFeedbackMessage(e.target.value);
                      }}
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="Can you add the following UX task…"
                    />
                    <div className="text-right text-[11px] text-slate-500">{feedbackMessage.length}/{FEEDBACK_MAX_LEN}</div>
                    {feedbackError && <div className="text-[12px] text-rose-600">{feedbackError}</div>}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:-translate-y-[1px] hover:shadow"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={feedbackSubmitting || feedbackMessage.trim().length < 5}
                      onClick={async () => {
                        setFeedbackError(null);
                        setFeedbackSubmitting(true);
                        try {
                          const res = await fetch("/api/feedback", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              type: feedbackType,
                              message: feedbackMessage.trim(),
                              source: "modal",
                              triggerCount: genCount
                            })
                          });
                          if (!res.ok) {
                            const json = await res.json().catch(() => null);
                            setFeedbackError(json?.error || "Failed to send feedback.");
                          } else {
                            setShowFeedbackModal(false);
                            setFeedbackMessage("");
                            setStatus("Thanks for your feedback!");
                          }
                        } catch (err) {
                          setFeedbackError("Failed to send feedback.");
                        } finally {
                          setFeedbackSubmitting(false);
                        }
                      }}
                      className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_5px_0_#111] disabled:opacity-60"
                    >
                      {feedbackSubmitting ? "Sending..." : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </section>
        </main>
      </div>

      {/* Delete Project Confirmation Modal */}
      {deleteConfirmProjectId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3">
              <h2 className="text-xl font-bold text-slate-900">Delete Project Folder?</h2>
              <p className="mt-2 text-sm text-slate-600">
                Are you sure you want to delete this project folder? All UX tasks inside will be moved to your general history.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProjectId(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:-translate-y-[1px] hover:shadow"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProject(deleteConfirmProjectId)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#991b1b] transition hover:-translate-y-[1px] hover:shadow-[0_5px_0_#991b1b]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Modal */}
      <PromoModal
        isOpen={showPromoModal}
        onClose={handlePromoModalClose}
        onSuccess={() => {
          // Modal will close automatically after success message
        }}
      />
    </div>
  );
}
