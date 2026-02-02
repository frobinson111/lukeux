/**
 * Accessibility Audit Service
 *
 * Orchestrates the full accessibility audit workflow:
 * 1. Validate and parse URLs
 * 2. Run Playwright + axe-core scans
 * 3. Aggregate and deduplicate violations
 * 4. Build WCAG + Section 508 scorecards
 * 5. Format the 8-section report
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AccessibilityConfig,
  AccessibilityReport,
  AuditRequest,
  AuditResponse,
  AuditStatus,
  AuditSummary,
  AxePageResult,
  AxeViolation,
  ManualCheckItem,
  NormalizedIssue,
  Section508ScorecardEntry,
  ViolationImpact,
  WcagScorecardEntry,
} from './types';
import { scanPages, parseUrls, isValidUrl, isAccessibilityScanningAvailable } from './playwright-runner';
import { formatAccessibilityReport, generateRecommendation } from './format-report';
import {
  getWcagForRule,
  getSection508ForRule,
  getWcagAACriteria,
  WCAG_CRITERIA,
  SECTION_508_PROVISIONS,
} from './standards-mapping';

// Default configuration
const DEFAULT_CONFIG: AccessibilityConfig = {
  maxPages: 3,
  timeout: 25000,
};

/**
 * Run a complete accessibility audit
 */
export async function runAccessibilityAudit(
  request: AuditRequest
): Promise<AuditResponse> {
  const startTime = Date.now();
  const auditId = uuidv4();

  // Check if scanning is available
  const scanningStatus = isAccessibilityScanningAvailable();
  if (!scanningStatus.available) {
    throw new Error(scanningStatus.reason || 'Accessibility scanning is not available');
  }

  // Validate URLs
  const urls = request.urls.filter(isValidUrl);
  if (urls.length === 0) {
    throw new Error('No valid URLs provided for accessibility audit');
  }

  const config = { ...DEFAULT_CONFIG, ...request.config };

  // Run scans
  const { results, successfulScans, failedScans } = await scanPages(urls, config);

  // Build the report
  const report = buildReport(auditId, urls, results, successfulScans, failedScans, startTime);

  // Format the output
  const content = formatAccessibilityReport(report);
  const recommendation = generateRecommendation(report);

  return {
    content,
    recommendation,
    taskId: auditId,
    threadId: auditId, // Use same ID for simplicity in MVP
    auditMetadata: {
      urlsScanned: successfulScans,
      overallStatus: report.overallStatus,
      totalViolations: report.summary.totalViolations,
      duration: report.duration,
    },
  };
}

/**
 * Build the complete accessibility report from scan results
 */
function buildReport(
  auditId: string,
  urls: string[],
  results: AxePageResult[],
  successfulScans: number,
  failedScans: string[],
  startTime: number
): AccessibilityReport {
  // Aggregate all violations
  const allViolations: Array<{ violation: AxeViolation; url: string }> = [];
  for (const result of results) {
    for (const violation of result.violations) {
      allViolations.push({ violation, url: result.url });
    }
  }

  // Deduplicate and normalize issues
  const issues = deduplicateViolations(allViolations);

  // Calculate summary
  const summary = calculateSummary(results);

  // Determine overall status
  const overallStatus = determineStatus(summary);

  // Build scorecards
  const wcagScorecard = buildWcagScorecard(results);
  const section508Scorecard = buildSection508Scorecard(results);

  // Get manual checks
  const manualChecks = getDefaultManualChecks();

  const duration = Date.now() - startTime;

  return {
    auditId,
    timestamp: new Date().toISOString(),
    duration,
    urls,
    successfulScans,
    failedScans,
    overallStatus,
    summary,
    wcagScorecard,
    section508Scorecard,
    issues,
    rawResults: results,
    manualChecks,
  };
}

/**
 * Deduplicate violations across pages and normalize to NormalizedIssue format
 */
function deduplicateViolations(
  violations: Array<{ violation: AxeViolation; url: string }>
): NormalizedIssue[] {
  const issueMap = new Map<string, NormalizedIssue>();

  for (const { violation, url } of violations) {
    // Create fingerprint from rule ID (violations with same rule are same root cause)
    const fingerprint = violation.id;

    if (issueMap.has(fingerprint)) {
      // Update existing issue
      const existing = issueMap.get(fingerprint)!;
      existing.instanceCount += violation.nodes.length;
      if (!existing.affectedUrls.includes(url)) {
        existing.affectedUrls.push(url);
      }
      // Add more sample nodes (up to 5 total)
      if (existing.sampleNodes.length < 5) {
        const nodesToAdd = violation.nodes.slice(0, 5 - existing.sampleNodes.length);
        existing.sampleNodes.push(...nodesToAdd);
      }
    } else {
      // Create new issue
      const wcagCriteria = getWcagForRule(violation.id);
      const section508Refs = getSection508ForRule(violation.id);

      issueMap.set(fingerprint, {
        ruleId: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        wcagCriteria,
        section508Refs,
        instanceCount: violation.nodes.length,
        affectedUrls: [url],
        sampleNodes: violation.nodes.slice(0, 5),
        fingerprint,
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<ViolationImpact, number> = {
    critical: 0,
    serious: 1,
    moderate: 2,
    minor: 3,
  };

  return Array.from(issueMap.values()).sort(
    (a, b) => severityOrder[a.impact] - severityOrder[b.impact]
  );
}

/**
 * Calculate summary statistics from scan results
 */
function calculateSummary(results: AxePageResult[]): AuditSummary {
  let critical = 0;
  let serious = 0;
  let moderate = 0;
  let minor = 0;
  let totalPasses = 0;
  let totalIncomplete = 0;
  let totalInapplicable = 0;

  for (const result of results) {
    for (const violation of result.violations) {
      switch (violation.impact) {
        case 'critical':
          critical += violation.nodes.length;
          break;
        case 'serious':
          serious += violation.nodes.length;
          break;
        case 'moderate':
          moderate += violation.nodes.length;
          break;
        case 'minor':
          minor += violation.nodes.length;
          break;
      }
    }
    totalPasses += result.passes.length;
    totalIncomplete += result.incomplete.length;
    totalInapplicable += result.inapplicable.length;
  }

  return {
    critical,
    serious,
    moderate,
    minor,
    totalViolations: critical + serious + moderate + minor,
    totalPasses,
    totalIncomplete,
    totalInapplicable,
  };
}

/**
 * Determine overall audit status based on violation severity
 */
function determineStatus(summary: AuditSummary): AuditStatus {
  if (summary.critical > 0 || summary.serious > 0) {
    return 'Fail';
  }
  if (summary.moderate > 0 || summary.minor > 0) {
    return 'Conditional Pass';
  }
  return 'Pass';
}

/**
 * Build WCAG 2.x AA scorecard
 */
function buildWcagScorecard(results: AxePageResult[]): WcagScorecardEntry[] {
  // Track pass/fail counts per criterion
  const criteriaStats = new Map<string, { passed: number; failed: number }>();

  // Initialize all AA criteria
  for (const criterion of getWcagAACriteria()) {
    criteriaStats.set(criterion.id, { passed: 0, failed: 0 });
  }

  // Aggregate from all results
  for (const result of results) {
    // Count passes
    for (const pass of result.passes) {
      const wcagRefs = getWcagForRule(pass.id);
      for (const ref of wcagRefs) {
        const stats = criteriaStats.get(ref.id);
        if (stats) {
          stats.passed += 1;
        }
      }
    }

    // Count failures
    for (const violation of result.violations) {
      const wcagRefs = getWcagForRule(violation.id);
      for (const ref of wcagRefs) {
        const stats = criteriaStats.get(ref.id);
        if (stats) {
          stats.failed += violation.nodes.length;
        }
      }
    }
  }

  // Build scorecard entries
  const scorecard: WcagScorecardEntry[] = [];
  for (const [id, stats] of criteriaStats) {
    const criterion = WCAG_CRITERIA[id];
    if (!criterion) continue;

    let status: 'pass' | 'fail' | 'partial';
    if (stats.failed > 0 && stats.passed === 0) {
      status = 'fail';
    } else if (stats.failed > 0 && stats.passed > 0) {
      status = 'partial';
    } else {
      status = 'pass';
    }

    scorecard.push({
      criterion,
      passed: stats.passed,
      failed: stats.failed,
      status,
    });
  }

  // Sort by criterion ID
  return scorecard.sort((a, b) => {
    const [aMajor, aMinor, aSub] = a.criterion.id.split('.').map(Number);
    const [bMajor, bMinor, bSub] = b.criterion.id.split('.').map(Number);
    return aMajor - bMajor || aMinor - bMinor || aSub - bSub;
  });
}

/**
 * Build Section 508 scorecard
 */
function buildSection508Scorecard(results: AxePageResult[]): Section508ScorecardEntry[] {
  // Track pass/fail counts per provision
  const provisionStats = new Map<string, { passed: number; failed: number }>();

  // Initialize all provisions
  for (const provision of Object.keys(SECTION_508_PROVISIONS)) {
    provisionStats.set(provision, { passed: 0, failed: 0 });
  }

  // Aggregate from all results
  for (const result of results) {
    // Count passes
    for (const pass of result.passes) {
      const s508Refs = getSection508ForRule(pass.id);
      for (const ref of s508Refs) {
        const stats = provisionStats.get(ref);
        if (stats) {
          stats.passed += 1;
        }
      }
    }

    // Count failures
    for (const violation of result.violations) {
      const s508Refs = getSection508ForRule(violation.id);
      for (const ref of s508Refs) {
        const stats = provisionStats.get(ref);
        if (stats) {
          stats.failed += violation.nodes.length;
        }
      }
    }
  }

  // Build scorecard entries
  const scorecard: Section508ScorecardEntry[] = [];
  for (const [provision, stats] of provisionStats) {
    const description = SECTION_508_PROVISIONS[provision];
    if (!description) continue;

    let status: 'pass' | 'fail' | 'partial';
    if (stats.failed > 0 && stats.passed === 0) {
      status = 'fail';
    } else if (stats.failed > 0 && stats.passed > 0) {
      status = 'partial';
    } else {
      status = 'pass';
    }

    scorecard.push({
      provision,
      description,
      passed: stats.passed,
      failed: stats.failed,
      status,
    });
  }

  return scorecard;
}

/**
 * Get default manual verification checklist
 */
function getDefaultManualChecks(): ManualCheckItem[] {
  return [
    {
      category: 'Keyboard',
      check: 'Keyboard Navigation',
      description: 'All interactive elements can be reached and operated using keyboard only.',
      wcagCriteria: ['2.1.1', '2.1.2'],
    },
    {
      category: 'Keyboard',
      check: 'Focus Visibility',
      description: 'Focus indicator is clearly visible on all interactive elements.',
      wcagCriteria: ['2.4.7'],
    },
    {
      category: 'Keyboard',
      check: 'Focus Order',
      description: 'Tab order follows a logical sequence matching visual layout.',
      wcagCriteria: ['2.4.3'],
    },
    {
      category: 'Screen Reader',
      check: 'Screen Reader Compatibility',
      description: 'Content is announced correctly and in logical order by screen readers.',
      wcagCriteria: ['1.3.1', '1.3.2', '4.1.2'],
    },
    {
      category: 'Screen Reader',
      check: 'Form Instructions',
      description: 'Form fields have clear labels and error messages are announced.',
      wcagCriteria: ['3.3.1', '3.3.2'],
    },
    {
      category: 'Visual',
      check: 'Zoom/Reflow',
      description: 'Content remains usable when zoomed to 200% without horizontal scrolling.',
      wcagCriteria: ['1.4.4', '1.4.10'],
    },
    {
      category: 'Visual',
      check: 'Text Spacing',
      description: 'Content adapts to increased text spacing without loss of functionality.',
      wcagCriteria: ['1.4.12'],
    },
    {
      category: 'Cognitive',
      check: 'Error Prevention',
      description: 'Users can review and correct submissions before final submission.',
      wcagCriteria: ['3.3.4'],
    },
  ];
}

/**
 * Parse URLs from user input string
 */
export { parseUrls, isValidUrl };
