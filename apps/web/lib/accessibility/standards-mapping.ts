/**
 * Mapping of axe-core rule IDs to WCAG 2.x Success Criteria and Section 508 references
 *
 * Based on axe-core rules: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
 */

import type { WcagCriterion } from './types';

// WCAG Success Criteria database
export const WCAG_CRITERIA: Record<string, WcagCriterion> = {
  '1.1.1': { id: '1.1.1', level: 'A', title: 'Non-text Content' },
  '1.2.1': { id: '1.2.1', level: 'A', title: 'Audio-only and Video-only (Prerecorded)' },
  '1.2.2': { id: '1.2.2', level: 'A', title: 'Captions (Prerecorded)' },
  '1.2.3': { id: '1.2.3', level: 'A', title: 'Audio Description or Media Alternative (Prerecorded)' },
  '1.2.4': { id: '1.2.4', level: 'AA', title: 'Captions (Live)' },
  '1.2.5': { id: '1.2.5', level: 'AA', title: 'Audio Description (Prerecorded)' },
  '1.3.1': { id: '1.3.1', level: 'A', title: 'Info and Relationships' },
  '1.3.2': { id: '1.3.2', level: 'A', title: 'Meaningful Sequence' },
  '1.3.3': { id: '1.3.3', level: 'A', title: 'Sensory Characteristics' },
  '1.3.4': { id: '1.3.4', level: 'AA', title: 'Orientation' },
  '1.3.5': { id: '1.3.5', level: 'AA', title: 'Identify Input Purpose' },
  '1.4.1': { id: '1.4.1', level: 'A', title: 'Use of Color' },
  '1.4.2': { id: '1.4.2', level: 'A', title: 'Audio Control' },
  '1.4.3': { id: '1.4.3', level: 'AA', title: 'Contrast (Minimum)' },
  '1.4.4': { id: '1.4.4', level: 'AA', title: 'Resize Text' },
  '1.4.5': { id: '1.4.5', level: 'AA', title: 'Images of Text' },
  '1.4.10': { id: '1.4.10', level: 'AA', title: 'Reflow' },
  '1.4.11': { id: '1.4.11', level: 'AA', title: 'Non-text Contrast' },
  '1.4.12': { id: '1.4.12', level: 'AA', title: 'Text Spacing' },
  '1.4.13': { id: '1.4.13', level: 'AA', title: 'Content on Hover or Focus' },
  '2.1.1': { id: '2.1.1', level: 'A', title: 'Keyboard' },
  '2.1.2': { id: '2.1.2', level: 'A', title: 'No Keyboard Trap' },
  '2.1.4': { id: '2.1.4', level: 'A', title: 'Character Key Shortcuts' },
  '2.2.1': { id: '2.2.1', level: 'A', title: 'Timing Adjustable' },
  '2.2.2': { id: '2.2.2', level: 'A', title: 'Pause, Stop, Hide' },
  '2.3.1': { id: '2.3.1', level: 'A', title: 'Three Flashes or Below Threshold' },
  '2.4.1': { id: '2.4.1', level: 'A', title: 'Bypass Blocks' },
  '2.4.2': { id: '2.4.2', level: 'A', title: 'Page Titled' },
  '2.4.3': { id: '2.4.3', level: 'A', title: 'Focus Order' },
  '2.4.4': { id: '2.4.4', level: 'A', title: 'Link Purpose (In Context)' },
  '2.4.5': { id: '2.4.5', level: 'AA', title: 'Multiple Ways' },
  '2.4.6': { id: '2.4.6', level: 'AA', title: 'Headings and Labels' },
  '2.4.7': { id: '2.4.7', level: 'AA', title: 'Focus Visible' },
  '2.5.1': { id: '2.5.1', level: 'A', title: 'Pointer Gestures' },
  '2.5.2': { id: '2.5.2', level: 'A', title: 'Pointer Cancellation' },
  '2.5.3': { id: '2.5.3', level: 'A', title: 'Label in Name' },
  '2.5.4': { id: '2.5.4', level: 'A', title: 'Motion Actuation' },
  '3.1.1': { id: '3.1.1', level: 'A', title: 'Language of Page' },
  '3.1.2': { id: '3.1.2', level: 'AA', title: 'Language of Parts' },
  '3.2.1': { id: '3.2.1', level: 'A', title: 'On Focus' },
  '3.2.2': { id: '3.2.2', level: 'A', title: 'On Input' },
  '3.2.3': { id: '3.2.3', level: 'AA', title: 'Consistent Navigation' },
  '3.2.4': { id: '3.2.4', level: 'AA', title: 'Consistent Identification' },
  '3.3.1': { id: '3.3.1', level: 'A', title: 'Error Identification' },
  '3.3.2': { id: '3.3.2', level: 'A', title: 'Labels or Instructions' },
  '3.3.3': { id: '3.3.3', level: 'AA', title: 'Error Suggestion' },
  '3.3.4': { id: '3.3.4', level: 'AA', title: 'Error Prevention (Legal, Financial, Data)' },
  '4.1.1': { id: '4.1.1', level: 'A', title: 'Parsing' },
  '4.1.2': { id: '4.1.2', level: 'A', title: 'Name, Role, Value' },
  '4.1.3': { id: '4.1.3', level: 'AA', title: 'Status Messages' },
};

// Section 508 provisions (1194.22 - Web-based Intranet and Internet Information)
export const SECTION_508_PROVISIONS: Record<string, string> = {
  '(a)': 'Text equivalent for non-text elements',
  '(b)': 'Multimedia alternatives (audio descriptions, captions)',
  '(c)': 'Color-coded information alternatives',
  '(d)': 'Readable without style sheets',
  '(e)': 'Redundant text links for server-side image maps',
  '(f)': 'Client-side image maps with text alternatives',
  '(g)': 'Row and column headers for data tables',
  '(h)': 'Markup for data table structure',
  '(i)': 'Frame titles',
  '(j)': 'Flicker-free pages (2-55 Hz)',
  '(k)': 'Text-only alternative page',
  '(l)': 'Script accessibility (screen readers)',
  '(m)': 'Applet/plug-in accessibility',
  '(n)': 'Accessible electronic forms',
  '(o)': 'Skip navigation mechanism',
  '(p)': 'Timed response user control',
};

// axe-core rule to WCAG/508 mapping
export interface RuleMapping {
  wcag: string[];        // WCAG SC IDs
  section508: string[];  // 508 provision IDs
}

export const AXE_RULE_MAPPING: Record<string, RuleMapping> = {
  // Images and non-text content
  'image-alt': { wcag: ['1.1.1'], section508: ['(a)'] },
  'input-image-alt': { wcag: ['1.1.1', '4.1.2'], section508: ['(a)', '(n)'] },
  'area-alt': { wcag: ['1.1.1', '2.4.4'], section508: ['(a)'] },
  'object-alt': { wcag: ['1.1.1'], section508: ['(a)', '(m)'] },
  'svg-img-alt': { wcag: ['1.1.1'], section508: ['(a)'] },
  'role-img-alt': { wcag: ['1.1.1'], section508: ['(a)'] },

  // Color and contrast
  'color-contrast': { wcag: ['1.4.3'], section508: ['(c)'] },
  'color-contrast-enhanced': { wcag: ['1.4.6'], section508: ['(c)'] },
  'link-in-text-block': { wcag: ['1.4.1'], section508: ['(c)'] },

  // Forms
  'label': { wcag: ['1.3.1', '3.3.2', '4.1.2'], section508: ['(n)'] },
  'label-title-only': { wcag: ['3.3.2'], section508: ['(n)'] },
  'input-button-name': { wcag: ['4.1.2'], section508: ['(n)'] },
  'select-name': { wcag: ['4.1.2', '3.3.2'], section508: ['(n)'] },
  'autocomplete-valid': { wcag: ['1.3.5'], section508: ['(n)'] },

  // Document structure
  'document-title': { wcag: ['2.4.2'], section508: [] },
  'html-has-lang': { wcag: ['3.1.1'], section508: [] },
  'html-lang-valid': { wcag: ['3.1.1'], section508: [] },
  'html-xml-lang-mismatch': { wcag: ['3.1.1'], section508: [] },
  'valid-lang': { wcag: ['3.1.2'], section508: [] },

  // Headings and landmarks
  'heading-order': { wcag: ['1.3.1', '2.4.6'], section508: [] },
  'empty-heading': { wcag: ['1.3.1', '2.4.6'], section508: [] },
  'page-has-heading-one': { wcag: ['1.3.1'], section508: [] },
  'landmark-one-main': { wcag: ['1.3.1', '2.4.1'], section508: ['(o)'] },
  'landmark-unique': { wcag: ['1.3.1'], section508: [] },
  'region': { wcag: ['1.3.1'], section508: [] },
  'bypass': { wcag: ['2.4.1'], section508: ['(o)'] },

  // Links
  'link-name': { wcag: ['2.4.4', '4.1.2'], section508: ['(a)'] },
  'identical-links-same-purpose': { wcag: ['2.4.4'], section508: [] },

  // Tables
  'td-headers-attr': { wcag: ['1.3.1'], section508: ['(g)', '(h)'] },
  'th-has-data-cells': { wcag: ['1.3.1'], section508: ['(g)', '(h)'] },
  'scope-attr-valid': { wcag: ['1.3.1'], section508: ['(g)'] },
  'table-fake-caption': { wcag: ['1.3.1'], section508: ['(g)'] },

  // Focus and keyboard
  'focus-order-semantics': { wcag: ['2.4.3'], section508: [] },
  'focusable-no-name': { wcag: ['4.1.2'], section508: [] },
  'tabindex': { wcag: ['2.4.3'], section508: [] },
  'accesskeys': { wcag: ['2.1.4'], section508: [] },

  // ARIA
  'aria-allowed-attr': { wcag: ['4.1.2'], section508: ['(l)'] },
  'aria-allowed-role': { wcag: ['4.1.2'], section508: ['(l)'] },
  'aria-hidden-body': { wcag: ['4.1.2'], section508: ['(l)'] },
  'aria-hidden-focus': { wcag: ['4.1.2', '1.3.1'], section508: ['(l)'] },
  'aria-input-field-name': { wcag: ['4.1.2'], section508: ['(l)', '(n)'] },
  'aria-required-attr': { wcag: ['4.1.2'], section508: ['(l)'] },
  'aria-required-children': { wcag: ['1.3.1'], section508: ['(l)'] },
  'aria-required-parent': { wcag: ['1.3.1'], section508: ['(l)'] },
  'aria-roles': { wcag: ['4.1.2'], section508: ['(l)'] },
  'aria-toggle-field-name': { wcag: ['4.1.2'], section508: ['(l)'] },
  'aria-valid-attr': { wcag: ['4.1.2'], section508: ['(l)'] },
  'aria-valid-attr-value': { wcag: ['4.1.2'], section508: ['(l)'] },

  // Buttons
  'button-name': { wcag: ['4.1.2'], section508: ['(a)', '(l)'] },

  // Frames
  'frame-title': { wcag: ['2.4.1', '4.1.2'], section508: ['(i)'] },
  'frame-title-unique': { wcag: ['4.1.2'], section508: ['(i)'] },

  // Lists
  'definition-list': { wcag: ['1.3.1'], section508: [] },
  'dlitem': { wcag: ['1.3.1'], section508: [] },
  'list': { wcag: ['1.3.1'], section508: [] },
  'listitem': { wcag: ['1.3.1'], section508: [] },

  // Other
  'duplicate-id': { wcag: ['4.1.1'], section508: [] },
  'duplicate-id-active': { wcag: ['4.1.1'], section508: [] },
  'duplicate-id-aria': { wcag: ['4.1.1'], section508: [] },
  'meta-refresh': { wcag: ['2.2.1', '2.2.4', '3.2.5'], section508: ['(p)'] },
  'meta-viewport': { wcag: ['1.4.4', '1.4.10'], section508: [] },
  'scrollable-region-focusable': { wcag: ['2.1.1'], section508: [] },
  'server-side-image-map': { wcag: ['2.1.1'], section508: ['(e)', '(f)'] },
  'nested-interactive': { wcag: ['4.1.2'], section508: ['(l)'] },
  'no-autoplay-audio': { wcag: ['1.4.2'], section508: ['(b)'] },
  'video-caption': { wcag: ['1.2.2'], section508: ['(b)'] },
  'audio-caption': { wcag: ['1.2.1'], section508: ['(b)'] },
  'blink': { wcag: ['2.2.2'], section508: ['(j)'] },
  'marquee': { wcag: ['2.2.2'], section508: ['(j)'] },
};

/**
 * Get WCAG criteria for an axe rule
 */
export function getWcagForRule(ruleId: string): WcagCriterion[] {
  const mapping = AXE_RULE_MAPPING[ruleId];
  if (!mapping) return [];

  return mapping.wcag
    .map(id => WCAG_CRITERIA[id])
    .filter((c): c is WcagCriterion => c !== undefined);
}

/**
 * Get Section 508 provisions for an axe rule
 */
export function getSection508ForRule(ruleId: string): string[] {
  const mapping = AXE_RULE_MAPPING[ruleId];
  if (!mapping) return [];
  return mapping.section508;
}

/**
 * Get all WCAG criteria that apply to Level A and AA
 */
export function getWcagAACriteria(): WcagCriterion[] {
  return Object.values(WCAG_CRITERIA).filter(c => c.level === 'A' || c.level === 'AA');
}
