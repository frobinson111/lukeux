/**
 * Format accessibility audit results into LukeUX 5-section markdown output
 *
 * Uses the "### Concept N — Title" + "**A) Concept Summary**" format
 * to match LukeUX's parseNumberedFindings() pattern.
 */

import type {
  AccessibilityReport,
  AuditSummary,
  NormalizedIssue,
  WcagScorecardEntry,
  Section508ScorecardEntry,
  ManualCheckItem,
} from './types';
import { ACCESSIBILITY_DISCLAIMER } from './disclaimer';

/**
 * Generate the complete formatted report
 */
export function formatAccessibilityReport(report: AccessibilityReport): string {
  const sections = [
    formatDisclaimerSection(),
    formatSection1_FindingsSummary(report),
    formatSection2_WcagScorecard(report),
    formatSection3_DetailedIssues(report),
    formatSection4_ManualVerification(report),
    formatSection5_ExportOptions(report),
  ];

  // Join sections with double newlines (no --- separators which can interfere with parsing)
  return sections.join('\n\n');
}

/**
 * Disclaimer Section (Section 0)
 */
function formatDisclaimerSection(): string {
  return `### Concept 0 — Disclaimer

**A) Concept Summary**

${ACCESSIBILITY_DISCLAIMER}`;
}

/**
 * Section 1: Findings Summary
 */
function formatSection1_FindingsSummary(report: AccessibilityReport): string {
  const { overallStatus, summary, urls, successfulScans, failedScans } = report;

  const statusEmoji =
    overallStatus === 'Pass' ? '✅' : overallStatus === 'Conditional Pass' ? '⚠️' : '❌';

  const statusExplanation =
    overallStatus === 'Pass'
      ? 'No automated accessibility violations detected.'
      : overallStatus === 'Conditional Pass'
        ? 'Only moderate or minor issues found. Manual review recommended.'
        : 'Critical or serious accessibility barriers detected. Immediate action required.';

  return `### Concept 1 — Findings Summary

**A) Concept Summary**

${statusEmoji} **Overall Status: ${overallStatus}**

${statusExplanation}

| Metric | Value |
|--------|-------|
| **URLs Scanned** | ${successfulScans} of ${urls.length} |
| **Total Issues** | ${summary.totalViolations} |
| **Rules Passed** | ${summary.totalPasses} |
| **Needs Review** | ${summary.totalIncomplete} |

**Issues by Severity:**

| Severity | Count | Priority |
|----------|-------|----------|
| Critical | ${summary.critical} | ${summary.critical > 0 ? '🔴 Immediate' : '—'} |
| Serious | ${summary.serious} | ${summary.serious > 0 ? '🟠 High' : '—'} |
| Moderate | ${summary.moderate} | ${summary.moderate > 0 ? '🟡 Medium' : '—'} |
| Minor | ${summary.minor} | ${summary.minor > 0 ? '🟢 Low' : '—'} |

${failedScans.length > 0 ? `\n**Note:** ${failedScans.length} URL(s) could not be scanned.` : ''}`;
}

/**
 * Section 2: WCAG + Section 508 Scorecard
 */
function formatSection2_WcagScorecard(report: AccessibilityReport): string {
  const wcagRows = report.wcagScorecard
    .filter((entry) => entry.failed > 0 || entry.passed > 0)
    .slice(0, 15) // Limit to prevent overwhelming output
    .map((entry) => {
      const statusIcon = entry.status === 'pass' ? '✅' : entry.status === 'fail' ? '❌' : '⚠️';
      return `| ${entry.criterion.id} | ${entry.criterion.title} | ${entry.criterion.level} | ${statusIcon} | ${entry.passed} | ${entry.failed} |`;
    })
    .join('\n');

  const section508Rows = report.section508Scorecard
    .filter((entry) => entry.failed > 0 || entry.passed > 0)
    .slice(0, 10)
    .map((entry) => {
      const statusIcon = entry.status === 'pass' ? '✅' : entry.status === 'fail' ? '❌' : '⚠️';
      return `| ${entry.provision} | ${entry.description.substring(0, 40)}... | ${statusIcon} | ${entry.failed} |`;
    })
    .join('\n');

  return `### Concept 2 — WCAG + Section 508 Scorecard

**A) Concept Summary**

**WCAG 2.x AA Compliance:**

| SC | Title | Level | Status | Passed | Failed |
|----|-------|-------|--------|--------|--------|
${wcagRows || '| — | No criteria tested | — | — | — | — |'}

${
  section508Rows
    ? `**Section 508 Compliance:**

| Provision | Description | Status | Issues |
|-----------|-------------|--------|--------|
${section508Rows}`
    : ''
}

*Note: Only criteria with test results are shown. Some criteria require manual verification.*`;
}

/**
 * Section 3: Detailed Issues (Deduplicated)
 */
function formatSection3_DetailedIssues(report: AccessibilityReport): string {
  if (report.issues.length === 0) {
    return `### Concept 3 — Detailed Issues

**A) Concept Summary**

No accessibility issues were detected by automated testing.

**Important:** This does not guarantee full compliance. Please complete the manual verification checklist in Section 4.`;
  }

  // Sort by severity
  const sortedIssues = [...report.issues].sort((a, b) => {
    const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return severityOrder[a.impact] - severityOrder[b.impact];
  });

  // Format top 10 issues (to prevent overwhelming output)
  const issueDetails = sortedIssues
    .slice(0, 10)
    .map((issue, idx) => {
      const wcagRefs = issue.wcagCriteria.map((c) => `${c.id}`).join(', ') || 'N/A';
      const s508Refs = issue.section508Refs.join(', ') || 'N/A';

      return `**${idx + 1}. ${issue.description}**
- **Severity:** ${issue.impact.toUpperCase()}
- **Instances:** ${issue.instanceCount} occurrence(s) across ${issue.affectedUrls.length} page(s)
- **WCAG:** ${wcagRefs}
- **Section 508:** ${s508Refs}
- **Fix:** ${issue.help}
- **Learn more:** ${issue.helpUrl}`;
    })
    .join('\n\n');

  const remaining = sortedIssues.length - 10;

  return `### Concept 3 — Detailed Issues (Deduplicated)

**A) Concept Summary**

**${report.issues.length} unique issue(s) identified:**

${issueDetails}

${remaining > 0 ? `\n*...and ${remaining} more issue(s). Export the full report for complete details.*` : ''}`;
}

/**
 * Section 4: Manual Verification Required
 */
function formatSection4_ManualVerification(report: AccessibilityReport): string {
  const checks = report.manualChecks || getDefaultManualChecks();

  const checklistItems = checks
    .map((check) => {
      const wcagRefs = check.wcagCriteria.join(', ');
      return `- [ ] **${check.check}** (${check.category})
  ${check.description}
  *WCAG: ${wcagRefs}*`;
    })
    .join('\n\n');

  return `### Concept 4 — Manual Verification Required

**A) Concept Summary**

Automated testing catches approximately 30-40% of accessibility issues. The following checks **require human evaluation**:

${checklistItems}

**Testing recommendations:**
1. Navigate using keyboard only (Tab, Shift+Tab, Enter, Escape, Arrow keys)
2. Test with screen readers: NVDA (Windows), VoiceOver (Mac/iOS), TalkBack (Android)
3. Test at 200% zoom and verify content reflows properly
4. Verify focus indicators are visible on all interactive elements
5. Check that all functionality works without relying on color alone`;
}

/**
 * Section 5: Export Options
 */
function formatSection5_ExportOptions(report: AccessibilityReport): string {
  return `### Concept 5 — Export Options

**A) Concept Summary**

Your accessibility audit report is available in multiple formats:

**Available exports:**
- **JSON** — Machine-readable format with full violation details
- **HTML** — Formatted report for sharing with stakeholders
- **CSV** — Spreadsheet-compatible issue list

**Audit metadata:**
- **Audit ID:** ${report.auditId}
- **Timestamp:** ${report.timestamp}
- **Duration:** ${Math.round(report.duration / 1000)}s
- **URLs scanned:** ${report.urls.join(', ')}

Use the export buttons above to download your preferred format.

**Tip:** Schedule regular audits to track accessibility improvements over time.`;
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
 * Generate a one-line recommendation based on audit results
 */
export function generateRecommendation(report: AccessibilityReport): string {
  if (report.overallStatus === 'Pass') {
    return 'Your pages passed automated accessibility checks. Complete the manual verification checklist to ensure full WCAG 2.x AA compliance.';
  }

  if (report.overallStatus === 'Fail') {
    const criticalCount = report.summary.critical;
    const seriousCount = report.summary.serious;

    if (criticalCount > 0) {
      return `Address ${criticalCount} critical accessibility issue(s) immediately. These barriers prevent users with disabilities from accessing your content.`;
    }

    return `Fix ${seriousCount} serious accessibility issue(s) to remove significant barriers for users with disabilities.`;
  }

  // Conditional Pass
  return `Review and address ${report.summary.moderate + report.summary.minor} moderate/minor accessibility issue(s) to improve the experience for all users.`;
}
