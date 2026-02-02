# Build Plan: Hide UX Guidance When Loading from History

## Problem Statement
When users load a historical task from the sidebar, the UX Guidance section displays below the template selector dropdown. This creates confusion because:
- The guidance is meant for creating NEW tasks
- Historical tasks already have completed analysis
- Users see guidance for a task they've already completed
- The UI appears cluttered with unnecessary information

## Proposed Solution
Conditionally hide the UX Guidance section when viewing historical tasks while keeping the "Define Your UX Objective" dropdown visible for easy access to start a new task.

## Technical Implementation Plan

### 1. State Management (High Priority)
**Location:** `apps/web/app/(app)/app/canvas/page.tsx`

**Changes Required:**
- Add new state variable: `isViewingHistoryItem: boolean`
- Initialize to `false` (default is creating new tasks)
- Update when loading history
- Reset when starting new tasks

**Implementation:**
```typescript
const [isViewingHistoryItem, setIsViewingHistoryItem] = useState(false);
```

### 2. Update `loadHistory` Function (High Priority)
**Location:** `apps/web/app/(app)/app/canvas/page.tsx` (line ~1135-1160)

**Current Behavior:**
- Loads historical content and template index
- Sets response data
- Fetches existing feedbacks

**Required Changes:**
- Set `isViewingHistoryItem` to `true` when history is loaded
- This signals the UI that we're viewing a completed task

**Implementation:**
```typescript
async function loadHistory(id: string) {
  const item = history.find((h) => h.id === id);
  if (!item) return;
  
  setTemplateIndex(item.templateIndex);
  setLastResponse(item.content);
  setStatus("Loaded from history");
  setHistoryMenu(null);
  setIsViewingHistoryItem(true); // NEW: Flag that we're viewing history
  
  // ... existing feedback fetching logic
}
```

### 3. Update "New UX Task" Button (High Priority)
**Location:** `apps/web/app/(app)/app/canvas/page.tsx` (sidebar navigation, line ~900-920)

**Current Behavior:**
- Resets template, response, and status
- Clears files and inputs

**Required Changes:**
- Add `setIsViewingHistoryItem(false)` to reset the flag
- This signals we're starting a fresh task

**Implementation:**
```typescript
onClick={() => {
  if (proj === "New UX Task") {
    setTemplateIndex(null);
    setLastResponse(null);
    setLastRecommendation(null);
    setStatus(null);
    setInputsCollapsed(false);
    setFiles([]);
    setTaskId(null);
    setThreadId(null);
    setEditablePrompt("");
    setPromptEditing(false);
    setIsViewingHistoryItem(false); // NEW: Reset history flag
  }
}}
```

### 4. Update Template Selection Handler (High Priority)
**Location:** `apps/web/app/(app)/app/canvas/page.tsx` (SearchableCategoryDropdown onSelect, line ~1030-1050)

**Current Behavior:**
- Resets all task-related state when new template selected
- Clears previous response and files

**Required Changes:**
- Add `setIsViewingHistoryItem(false)` to reset when selecting new template
- This ensures starting a new task clears history view mode

**Implementation:**
```typescript
onSelect={(idx) => {
  setTemplateIndex(idx);
  // ... existing logic
  setIsViewingHistoryItem(false); // NEW: Clear history flag when selecting new template
}}
```

### 5. Conditional UX Guidance Rendering (High Priority)
**Location:** `apps/web/app/(app)/app/canvas/page.tsx` (line ~1080-1150)

**Current Condition:**
```typescript
{template && (
  <>
    <div className="flex items-center justify-between px-5 py-2">
      <span className="text-xs font-semibold text-slate-700">UX Guidance</span>
      // ... collapse button
    </div>
    // ... guidance sections
  </>
)}
```

**Required Changes:**
```typescript
{template && !isViewingHistoryItem && (
  <>
    <div className="flex items-center justify-between px-5 py-2">
      <span className="text-xs font-semibold text-slate-700">UX Guidance</span>
      // ... collapse button
    </div>
    // ... guidance sections
  </>
)}
```

### 6. Conditional Input Sections Rendering (Medium Priority)
**Location:** `apps/web/app/(app)/app/canvas/page.tsx` (various sections)

**Sections to Conditionally Hide:**
- URL Input section (line ~1200-1230)
- Accessibility Audit URL Input (line ~1235-1260)
- File Upload section (line ~1265-1310)
- Generate/Analyze button (line ~1315-1330)
- Admin AI Prompt editor (line ~1180-1195)

**Required Changes:**
All these sections should be hidden when viewing history:
```typescript
{template && !inputsCollapsed && !isViewingHistoryItem && (
  // ... URL Input / File Upload / Generate button sections
)}
```

### 7. Keep Visible When Viewing History (High Priority)
**Sections That Should ALWAYS Display:**
- "Define Your UX Objective" dropdown (template selector)
- Analysis results section (lastResponse)
- Save/Download buttons
- "Refine the Analysis" section (allows iteration on historical tasks)
- "Generate Mockups" section (allows mockup generation from history)

**No Changes Needed** - These sections should remain as-is

## Edge Cases & Considerations

### Edge Case 1: User Loads History, Then Selects New Template
**Expected Behavior:** 
- UX Guidance should reappear
- All input sections should become visible
- `isViewingHistoryItem` should be set to `false`

**Handled By:** Template selection handler update (#4)

### Edge Case 2: User Loads History, Then Clicks "New UX Task"
**Expected Behavior:**
- Clear all loaded history data
- Reset to fresh task creation mode
- UX Guidance should be visible (if template selected)
- `isViewingHistoryItem` should be set to `false`

**Handled By:** New UX Task button update (#3)

### Edge Case 3: User Loads History, Then Refines Analysis
**Expected Behavior:**
- Keep history view mode active
- Show new results
- UX Guidance remains hidden
- `isViewingHistoryItem` remains `true`

**Handled By:** No changes needed - refine analysis doesn't affect this flag

### Edge Case 4: User Loads History Without Template Index
**Expected Behavior:**
- History item might not have a template (templateIndex: null)
- Don't show UX Guidance (nothing to guide)
- Allow template selection to start fresh

**Handled By:** Existing `template &&` condition combined with new `!isViewingHistoryItem` check

### Edge Case 5: User Generates New Analysis
**Expected Behavior:**
- After clicking "Analyze" button, results show
- Should NOT be considered "viewing history"
- If user wants to create another task, they'd select new template or click "New UX Task"

**Handled By:** `handleGenerate` doesn't set `isViewingHistoryItem` flag

## Testing Checklist

### Functional Testing
- [ ] Load a history item → UX Guidance is hidden
- [ ] Load a history item → Template dropdown is visible
- [ ] Load a history item → Results are displayed
- [ ] Load a history item → Save/Download buttons work
- [ ] Load a history item → Refine Analysis section visible and functional
- [ ] Load a history item → Generate Mockups section visible and functional
- [ ] Click "New UX Task" after loading history → UX Guidance reappears (if template selected)
- [ ] Select a new template after loading history → UX Guidance reappears
- [ ] Generate a new analysis → UX Guidance visible before generation
- [ ] Generate a new analysis → Input sections visible before generation

### Regression Testing
- [ ] Creating a new task from scratch → All sections visible as expected
- [ ] Uploading files for new task → Works as before
- [ ] URL input for new task → Works as before
- [ ] Accessibility audit for new task → Works as before
- [ ] Admin prompt editing → Hidden when viewing history, visible for new tasks
- [ ] Collapsible sections → Collapse/expand behavior unchanged

### UX Testing
- [ ] Flow feels natural when switching between history and new tasks
- [ ] No confusion about whether user is viewing history or creating new task
- [ ] Clear path to start a new task from history view
- [ ] Visual distinction between history view and new task mode (optional enhancement)

## Implementation Order

### Phase 1: Core State Management
1. Add `isViewingHistoryItem` state variable
2. Update `loadHistory` to set flag to `true`
3. Update "New UX Task" button to reset flag to `false`
4. Update template selection to reset flag to `false`

### Phase 2: UI Conditional Rendering
5. Update UX Guidance section condition
6. Update input sections conditions (URL, file upload, generate button)
7. Update admin prompt editor condition

### Phase 3: Testing & Validation
8. Manual testing of all edge cases
9. Regression testing of existing functionality
10. UX testing for flow naturalness

## Rollback Plan

If issues arise:
1. **Quick Fix:** Remove `&& !isViewingHistoryItem` from all conditions → Reverts to original behavior
2. **State Cleanup:** Remove `isViewingHistoryItem` state variable and all references
3. **Git Revert:** Revert commit if changes were committed

## Performance Impact

**Minimal Impact:**
- Adding one boolean state variable
- Simple condition checks (no heavy computation)
- No API calls affected
- No database queries affected

## Accessibility Considerations

- All sections remain keyboard navigable
- Screen reader announcements unchanged
- Focus management not affected
- No ARIA changes needed

## Security Considerations

- No security implications
- Client-side UI change only
- No data exposure risks
- No authentication changes

## Scalability Considerations

- Solution scales with any number of history items
- No performance degradation with large history lists
- Memory footprint negligible (one boolean)

## Alternative Solutions Considered

### Alternative 1: Separate Route for History View
**Pros:** Clear separation, distinct URL
**Cons:** Major refactor, breaks existing flow, requires routing changes
**Decision:** Rejected - Too complex for the benefit

### Alternative 2: History Modal/Overlay
**Pros:** Visual distinction, doesn't affect main canvas
**Cons:** Extra navigation, feels disconnected, modal fatigue
**Decision:** Rejected - Adds friction to user workflow

### Alternative 3: Visual Indicator (Badge/Banner)
**Pros:** Keeps sections visible, adds context
**Cons:** Doesn't solve core problem (confusion), UI clutter
**Decision:** Could be complementary enhancement for future

## Post-Implementation Enhancements (Future)

1. **Visual Indicator:** Add subtle badge/banner showing "Viewing History Item"
2. **Quick Actions:** Add "Create Similar Task" button in history view
3. **Comparison Mode:** Allow comparing current task with historical task
4. **History Metadata:** Show when task was completed, who created it

## Success Criteria

✅ UX Guidance section hidden when viewing historical tasks
✅ Template dropdown remains visible for starting new tasks
✅ All existing functionality preserved (regression-free)
✅ Clear user flow between history view and new task creation
✅ No performance degradation
✅ All edge cases handled gracefully

## Estimated Implementation Time

- **Phase 1 (Core State):** 15 minutes
- **Phase 2 (UI Updates):** 30 minutes
- **Phase 3 (Testing):** 45 minutes
- **Total:** ~90 minutes

## Risk Assessment

**Low Risk Changes:**
- Boolean state variable (isolated)
- Conditional rendering (non-breaking)
- No data structure changes
- No API changes

**Mitigation:**
- Comprehensive testing checklist
- Clear rollback plan
- Incremental implementation
- Version control (git)

---

## Approval Required

This plan requires explicit approval before implementation. Please review and confirm:

1. ✅ The approach aligns with user needs
2. ✅ Edge cases are adequately covered
3. ✅ Testing plan is comprehensive
4. ✅ No conflicts with other features/work
5. ✅ Ready to proceed with implementation

**Status:** ⏳ Awaiting Approval
