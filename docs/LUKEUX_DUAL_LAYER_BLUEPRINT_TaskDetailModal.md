# LukeUX Dual-Layer Blueprint Mode — Task Detail Modal
## Focus Flow: Task Detail Modal with Config Attachments and Gating Logic

**Generated:** 2026-02-12  
**Blueprint Version:** LUKEUX_BLUEPRINTS_V1  
**Concepts:** 5 structurally distinct mid-fidelity concepts  
**Rendering:** Deterministic only  

---

## Artifact Sources (Inferred from Codebase)

| Artifact | Reference |
|---|---|
| Transcript | Canvas page.tsx — task generation flow, template selection, asset upload, iteration |
| Inspiration | Existing `template-task-list.tsx` modal + `StructuredAnalysisOutput` card pattern |
| Existing Wireframe | Current modal: header + close btn, scrollable body, Field components with colored borders |
| Known Constraints | CommAlarm gating on AutoApply; assertCanGenerate plan/usage guard; max 20 lines per block; Upload > Applying > Verified strip required |

---

## Concept 1 — Stacked Config Drawer

### Analyst Layer

- Modal opens as right-anchored drawer (480px) with pinned header showing task title + framework badge
- Config attachments rendered as collapsible accordion rows: Model, Mode, Detail, Assets
- CommAlarm gate: AutoApply button disabled until all required configs pass validation
- Progressive strip at drawer footer: `Upload → Applying → Verified` with step indicators
- File attachments use existing drag+click pattern; inline warnings surface below each asset row
- Submit triggers assertCanGenerate; failure renders inline 402 banner, not a redirect

[[LUKEUX_BLUEPRINTS_V1]]
concept_id: C1_STACKED_CONFIG_DRAWER
layout: drawer-right-480px
structure: header | accordion-body | footer-strip
header: [task-title, framework-badge, close-btn]
accordion_rows: [model-select, mode-select, detail-select, asset-upload]
accordion_default: model-select=open, rest=collapsed
asset_row: [file-icon, filename, size, remove-btn, warning-inline]
gating_logic: CommAlarm → validate(all-required-configs) → enable(auto-apply-btn)
gating_fallback: auto-apply-btn.disabled + tooltip="Complete all config fields"
progressive_strip: [Upload|pending, Applying|pending, Verified|pending]
strip_transitions: Upload.complete → Applying.active → Verified.active
strip_visual: 3-step horizontal bar, active=brand-yellow, complete=green, pending=slate-200
submit_action: assertCanGenerate(userId, plan, planStatus, generationLimit)
submit_error: inline-banner-402 "Generation limit reached"
submit_success: collapse-drawer → scroll-to-response
accessibility: aria-expanded on accordions, role=progressbar on strip
focus_trap: drawer-scope, ESC=close
responsive: full-width overlay below md breakpoint
[[/LUKEUX_BLUEPRINTS_V1]]

---

## Concept 2 — Tabbed Config Modal with Gated Submit

### Analyst Layer

- Centered modal (max-w-lg) with horizontal tab bar: Details | Attachments | Config
- Each tab is a self-contained form section; tab switching preserves state
- CommAlarm gate: Submit button shows lock icon until all three tabs validated
- Progressive strip runs horizontally above submit as a 3-segment status bar
- Attachment tab supports multi-file with deduplication and inline type-check warnings
- Gating error state replaces submit text with "Upgrade Plan" CTA on 402

[[LUKEUX_BLUEPRINTS_V1]]
concept_id: C2_TABBED_CONFIG_MODAL
layout: modal-centered-max-w-lg
structure: tab-bar | tab-content | strip | submit-row
tab_bar: [Details, Attachments, Config]
tab_Details: [task-title-readonly, framework-label, prompt-preview]
tab_Attachments: [file-dropzone, file-list, inline-warnings]
tab_Config: [model-dropdown, mode-radio, detail-radio]
tab_state: preserved-on-switch, validated-per-tab
gating_logic: CommAlarm → allTabs.valid → unlock(submit-btn)
gating_visual: lock-icon on submit when gated, tab-badges(checkmark|warning)
progressive_strip: [Upload|segmented, Applying|segmented, Verified|segmented]
strip_position: above-submit-row
strip_visual: segmented-bar, active=brand-yellow-pulse, done=green-check
submit_action: assertCanGenerate → POST /api/tasks/generate
submit_402: replace-label "Upgrade Plan" + link(/billing)
submit_success: close-modal → setLastResponse → addToHistory
accessibility: role=tablist, aria-selected, focus-visible ring
[[/LUKEUX_BLUEPRINTS_V1]]

---

## Concept 3 — Wizard Stepper with Inline Gating

### Analyst Layer

- Full-width modal with 3-step wizard: 1) Task Details → 2) Attach Config → 3) Review & Run
- Each step has a Next button gated by step-level validation (CommAlarm per step)
- Progressive strip is the wizard stepper itself: Upload=Step1, Applying=Step2, Verified=Step3
- Step 2 combines file upload + model/mode/detail config in a two-column layout
- Final step shows read-only summary card; AutoApply only enabled after CommAlarm clears all steps
- Back navigation allowed; re-editing a completed step resets subsequent step states

[[LUKEUX_BLUEPRINTS_V1]]
concept_id: C3_WIZARD_STEPPER
layout: modal-full-width-max-w-2xl
structure: stepper-header | step-content | nav-footer
stepper_steps: [TaskDetails, AttachConfig, ReviewRun]
step1_TaskDetails: [title, framework, prompt-textarea]
step2_AttachConfig: [col-left:file-upload+list, col-right:model+mode+detail]
step3_ReviewRun: [summary-card-readonly, auto-apply-btn]
gating_logic: CommAlarm → per-step-validation → next-btn.enabled
gating_cascade: edit(step1) → reset(step2.valid, step3.valid)
progressive_strip: stepper-header doubles as strip
strip_mapping: Step1=Upload, Step2=Applying, Step3=Verified
strip_visual: circle-number + label, active=yellow-ring, done=green-fill
auto_apply_gate: step3.visible AND allSteps.valid → enable
submit_action: assertCanGenerate → POST /api/tasks/generate
submit_error: step3-inline-alert "Limit reached"
nav_footer: [Back-btn, Next-btn|Submit-btn]
accessibility: aria-current=step, disabled-nav announcement
[[/LUKEUX_BLUEPRINTS_V1]]

---

## Concept 4 — Split-Pane Detail + Live Preview

### Analyst Layer

- Modal uses horizontal split: left pane (60%) for config form, right pane (40%) for live preview
- Left pane stacks: task header, config fields (model/mode/detail), attachment zone
- Right pane renders real-time summary of selections + attachment thumbnails as config changes
- CommAlarm gate: AutoApply floats at bottom-right of left pane, locked until preview validates
- Progressive strip renders vertically along the left edge of the right pane
- File thumbnails in preview pane show processing state: Upload spinner → Applying badge → Verified check

[[LUKEUX_BLUEPRINTS_V1]]
concept_id: C4_SPLIT_PANE_PREVIEW
layout: modal-split-60-40-max-w-3xl
structure: left-config-pane | right-preview-pane
left_pane: [task-header, config-fields, attachment-zone, auto-apply-btn]
config_fields: [model-dropdown, mode-toggle, detail-toggle]
attachment_zone: [dropzone, file-list-with-thumbs, inline-warnings]
right_pane: [selection-summary, attachment-thumbnails, vertical-strip]
preview_updates: reactive-on-config-change
gating_logic: CommAlarm → preview.allValid → auto-apply-btn.enabled
gating_visual: auto-apply-btn opacity-50 + lock-icon when gated
progressive_strip: vertical-left-edge of right-pane
strip_states: [Upload|spinner, Applying|badge, Verified|check]
strip_per_file: each attachment has own strip instance
submit_action: assertCanGenerate → POST /api/tasks/generate
submit_success: close-modal → scroll-to-response
responsive: stack-vertical below lg breakpoint
accessibility: aria-live=polite on preview-pane, role=status on strip
[[/LUKEUX_BLUEPRINTS_V1]]

---

## Concept 5 — Bottom Sheet with Staged Reveal

### Analyst Layer

- Modal slides up as bottom sheet (mobile-first); staged reveal: header → config → attachments → submit
- Each stage animates in only after the previous stage is completed (CommAlarm per stage)
- Progressive strip is a thin horizontal bar fixed at the top of the sheet showing Upload > Applying > Verified
- Config section uses pill toggles for mode/detail and a compact model selector
- Attachment section uses a horizontal scroll of file cards with status badges
- AutoApply button reveals only after final stage clears; disabled until CommAlarm passes all stages

[[LUKEUX_BLUEPRINTS_V1]]
concept_id: C5_BOTTOM_SHEET_STAGED
layout: bottom-sheet-full-width-max-h-85vh
structure: top-strip | staged-sections | submit-reveal
top_strip: fixed-horizontal-bar [Upload, Applying, Verified]
strip_visual: thin-bar-4px, active=brand-yellow, done=green, pending=slate-200
stage_order: [header, config, attachments, submit]
stage_header: [task-title, framework-pill, close-btn]
stage_config: [model-compact-select, mode-pill-toggles, detail-pill-toggles]
stage_attachments: [horizontal-scroll-file-cards, status-badge-per-card]
stage_reveal: next-stage.hidden until current-stage.CommAlarm.pass
gating_logic: CommAlarm → per-stage-gate → reveal-next-stage
gating_final: all-stages-revealed → auto-apply-btn.visible + enabled
submit_action: assertCanGenerate → POST /api/tasks/generate
submit_error: shake-animation + inline-error "Limit reached"
submit_success: sheet-dismiss-down → setLastResponse
responsive: native-bottom-sheet on mobile, centered-modal on desktop
accessibility: role=dialog, aria-modal, trap-focus, swipe-to-dismiss
[[/LUKEUX_BLUEPRINTS_V1]]

---

## Cross-Concept Constraints Checklist

| Constraint | C1 | C2 | C3 | C4 | C5 |
|---|---|---|---|---|---|
| Max 6 analyst bullets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Max 20 lines per blueprint block | ✅ | ✅ | ✅ | ✅ | ✅ |
| No prose inside blueprint blocks | ✅ | ✅ | ✅ | ✅ | ✅ |
| CommAlarm gating on AutoApply | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload > Applying > Verified strip | ✅ | ✅ | ✅ | ✅ | ✅ |
| Deterministic rendering only | ✅ | ✅ | ✅ | ✅ | ✅ |
| Required key order enforced | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Implementation Notes

- **CommAlarm Gating**: All concepts route through `assertCanGenerate(userId, plan, planStatus, generationLimit)` before any AutoApply action fires. UI-level gating prevents premature clicks; server-side gating catches bypass attempts.
- **Progressive Strip**: The `Upload → Applying → Verified` strip maps to the file/config lifecycle: file accepted (Upload), config validated and request in-flight (Applying), server 200 + response rendered (Verified).
- **Existing Pattern Alignment**: All concepts extend the existing `template-task-list.tsx` modal and `StructuredAnalysisOutput` card patterns already in the LukeUX codebase.
