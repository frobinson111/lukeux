/**
 * Type definitions for WCAG 2.x AA + Section 508 Accessibility Audit
 */

// axe-core violation severity levels
export type ViolationImpact = 'critical' | 'serious' | 'moderate' | 'minor';

// Individual violation node (element instance)
export interface AxeViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

// axe-core violation structure
export interface AxeViolation {
  id: string;
  impact: ViolationImpact;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AxeViolationNode[];
}

// Raw axe-core result for a single page
export interface AxePageResult {
  url: string;
  timestamp: string;
  violations: AxeViolation[];
  passes: { id: string; description: string }[];
  incomplete: { id: string; description: string }[];
  inapplicable: { id: string; description: string }[];
}

// Deduplicated issue (aggregated across pages)
export interface NormalizedIssue {
  ruleId: string;
  impact: ViolationImpact;
  description: string;
  help: string;
  helpUrl: string;
  wcagCriteria: WcagCriterion[];
  section508Refs: string[];
  instanceCount: number;
  affectedUrls: string[];
  sampleNodes: AxeViolationNode[]; // Limit to first 3-5 samples
  fingerprint: string; // For deduplication
}

// WCAG success criterion reference
export interface WcagCriterion {
  id: string;      // e.g., "1.4.3"
  level: 'A' | 'AA' | 'AAA';
  title: string;   // e.g., "Contrast (Minimum)"
}

// Summary statistics
export interface AuditSummary {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  totalViolations: number;
  totalPasses: number;
  totalIncomplete: number;
  totalInapplicable: number;
}

// WCAG scorecard entry
export interface WcagScorecardEntry {
  criterion: WcagCriterion;
  passed: number;
  failed: number;
  status: 'pass' | 'fail' | 'partial';
}

// Section 508 scorecard entry
export interface Section508ScorecardEntry {
  provision: string;
  description: string;
  passed: number;
  failed: number;
  status: 'pass' | 'fail' | 'partial';
}

// Overall audit status
export type AuditStatus = 'Pass' | 'Conditional Pass' | 'Fail';

// Complete accessibility report
export interface AccessibilityReport {
  // Metadata
  auditId: string;
  timestamp: string;
  duration: number; // ms

  // URLs scanned
  urls: string[];
  successfulScans: number;
  failedScans: string[]; // URLs that failed to load

  // Overall result
  overallStatus: AuditStatus;
  summary: AuditSummary;

  // Scorecards
  wcagScorecard: WcagScorecardEntry[];
  section508Scorecard: Section508ScorecardEntry[];

  // Detailed findings
  issues: NormalizedIssue[];

  // Raw data (for exports)
  rawResults: AxePageResult[];

  // Manual verification checklist
  manualChecks: ManualCheckItem[];
}

// Manual verification checklist item
export interface ManualCheckItem {
  category: string;
  check: string;
  description: string;
  wcagCriteria: string[];
}

// Accessibility audit configuration
export interface AccessibilityConfig {
  maxPages: number;
  timeout?: number; // ms per page
  includeScreenshots?: boolean;
  excludePatterns?: string[];
}

// Audit request input
export interface AuditRequest {
  urls: string[];
  config?: AccessibilityConfig;
}

// Audit response (matches LukeUX generate response structure)
export interface AuditResponse {
  content: string;           // Formatted markdown with 8 sections
  recommendation: string;    // Summary action item
  taskId: string;
  threadId: string;
  auditMetadata: {
    urlsScanned: number;
    overallStatus: AuditStatus;
    totalViolations: number;
    duration: number;
  };
}
