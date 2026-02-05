# Build Plan: Welcome Back Message for Returning Users

## Executive Summary
Modify the login experience to show "WELCOME BACK" instead of "WELCOME TO LUKE UX" for returning users, creating a more personalized experience that recognizes user loyalty and continued engagement.

---

## Current State Analysis

### Authentication Points
1. **Homepage (`apps/web/app/page.tsx`)**
   - Combined login/signup interface
   - Static heading: "WELCOME TO LUKE UX"
   - Handles both new user registration and returning user login

2. **Standalone Login Page (`apps/web/app/auth/login/page.tsx`)**
   - Separate login-only page
   - Shows "Sign in" heading
   - Used for direct login access

### User Journey
1. User registers → email verification required → redirected to login
2. User logs in → session created → `lastLoginAt` timestamp updated → redirected to `/app`
3. Subsequent logins → same flow, but user has existing `lastLoginAt` data

### Database Schema
```prisma
model User {
  lastLoginAt   DateTime?  // Updated on each successful login
  createdAt     DateTime   // Account creation timestamp
  emailVerifiedAt DateTime? // Email verification timestamp
}
```

---

## Requirements & Clarifications Needed

### Critical Questions

**1. Definition of "Returning User"**
   - **Option A**: User has logged in at least once before (has `lastLoginAt` timestamp)
   - **Option B**: User has completed email verification (has `emailVerifiedAt`)
   - **Option C**: Browser-based detection (localStorage/cookie remembers previous visit)

**2. Scope of Changes**
   - **Option A**: Both homepage AND standalone login page
   - **Option B**: Homepage only
   - **Option C**: Standalone login page only

**3. Message Variations**
   - **Option A**: Simple "WELCOME BACK" (matches existing style)
   - **Option B**: Personalized "WELCOME BACK, [FIRST NAME]"
   - **Option C**: "WELCOME BACK TO LUKE UX" (hybrid approach)

**4. Detection Timing**
   - **Option A**: Server-side detection (requires email lookup API call)
   - **Option B**: Client-side detection (localStorage/sessionStorage)
   - **Option C**: Post-login redirect with flag

---

## Recommended Approach

### Solution: Client-Side localStorage Detection

**Rationale:**
- ✅ **Stability**: No changes to authentication flow or API endpoints
- ✅ **Performance**: No additional API calls or database queries
- ✅ **Privacy**: No sensitive data stored, just a visit flag
- ✅ **Scalability**: Works across both login interfaces
- ✅ **Maintainability**: Simple, self-contained logic

### Implementation Strategy

**Phase 1: Homepage Modification**
1. Add localStorage detection on component mount
2. Set `hasVisitedBefore` flag after first successful registration/login
3. Conditionally render heading based on flag
4. Maintain existing UI structure and styling

**Phase 2: Standalone Login Page (Optional)**
1. Apply same localStorage logic
2. Change "Sign in" to "Welcome Back" for returning visitors
3. Keep subtitle text consistent

---

## Detailed Technical Design

### 1. Homepage Changes (`apps/web/app/page.tsx`)

#### New State Management
```typescript
const [hasVisitedBefore, setHasVisitedBefore] = useState(false);

useEffect(() => {
  // Check if user has visited before
  const visited = localStorage.getItem('lukeux_visited');
  if (visited === 'true') {
    setHasVisitedBefore(true);
  }
}, []);
```

#### Post-Submit Logic
```typescript
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  // ... existing logic ...
  
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  // Mark as visited after successful registration or login
  localStorage.setItem('lukeux_visited', 'true');

  if (mode === "login") {
    window.location.href = "/app";
    return;
  }
  
  // ... rest of existing logic ...
}
```

#### Conditional Heading Render
```typescript
// BEFORE:
<h1 className="text-2xl font-black text-slate-900">WELCOME TO LUKE UX</h1>

// AFTER:
<h1 className="text-2xl font-black text-slate-900">
  {hasVisitedBefore && mode === "login" ? "WELCOME BACK" : "WELCOME TO LUKE UX"}
</h1>
```

### 2. Standalone Login Page Changes (`apps/web/app/auth/login/page.tsx`)

#### Add Welcome Detection
```typescript
const [showWelcomeBack, setShowWelcomeBack] = useState(false);

useEffect(() => {
  const visited = localStorage.getItem('lukeux_visited');
  if (visited === 'true') {
    setShowWelcomeBack(true);
  }
}, []);

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  // ... existing logic ...
  
  if (!res.ok) {
    setError(data.error || "Unable to sign in");
    setLoading(false);
    return;
  }

  // Mark as visited after successful login
  localStorage.setItem('lukeux_visited', 'true');
  
  router.push("/app");
}
```

#### Update Heading
```typescript
// BEFORE:
<h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>

// AFTER:
<h1 className="text-2xl font-semibold text-slate-900">
  {showWelcomeBack ? "Welcome back" : "Sign in"}
</h1>
```

### 3. Edge Cases & Considerations

#### Browser Compatibility
- localStorage is supported in all modern browsers
- Graceful fallback: if localStorage is unavailable, shows default message

#### Privacy & Data
- No PII stored in localStorage
- Simple boolean flag only
- User can clear browser data to reset

#### Incognito/Private Browsing
- localStorage persists per session only
- Will show "WELCOME TO LUKE UX" in incognito mode (expected behavior)

#### Multiple Devices
- Each device tracks separately
- User may see "WELCOME TO LUKE UX" on new device (acceptable UX)

---

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Add localStorage detection logic to homepage
- [ ] Add localStorage setter after successful auth actions
- [ ] Update heading to conditionally render based on visitor status
- [ ] Add same logic to standalone login page (if in scope)
- [ ] Test localStorage availability and fallback behavior

### Phase 2: Testing
- [ ] Test first-time user experience (should see "WELCOME TO LUKE UX")
- [ ] Test returning user experience (should see "WELCOME BACK")
- [ ] Test registration flow → login (should see "WELCOME BACK" on subsequent visits)
- [ ] Test localStorage clearing (should reset to "WELCOME TO LUKE UX")
- [ ] Test incognito mode behavior
- [ ] Test both homepage and standalone login page
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Phase 3: Quality Assurance
- [ ] Verify no console errors
- [ ] Verify no layout shift or flicker on page load
- [ ] Verify accessibility (heading hierarchy remains intact)
- [ ] Verify mobile responsive behavior
- [ ] Verify Google OAuth flow still triggers "visited" flag
- [ ] Verify registration flow still works correctly

### Phase 4: Documentation
- [ ] Update user documentation if needed
- [ ] Add comments explaining localStorage usage
- [ ] Document edge cases and expected behaviors

---

## Alternative Approaches Considered

### Option 1: Server-Side Email Detection
**How it works:** Check if email exists in database before showing heading

**Pros:**
- More accurate (works across devices)
- No localStorage dependency

**Cons:**
- ❌ Requires new API endpoint (`/api/auth/check-email`)
- ❌ Privacy concerns (email enumeration vulnerability)
- ❌ Additional database query on every page load
- ❌ Performance impact
- ❌ Complexity increases significantly

**Verdict:** Not recommended due to stability and security concerns

### Option 2: Session-Based Detection
**How it works:** Track in session after first login, pass via URL params

**Pros:**
- Server-controlled
- More secure

**Cons:**
- ❌ Only works during active session
- ❌ Lost after logout
- ❌ Requires URL parameter passing
- ❌ More complex state management

**Verdict:** Not recommended due to complexity vs. benefit

### Option 3: Cookie-Based Detection
**How it works:** Set secure httpOnly cookie after first visit

**Pros:**
- More secure than localStorage
- Persists across tabs

**Cons:**
- ❌ Requires server-side cookie handling
- ❌ GDPR compliance considerations
- ❌ More complex implementation

**Verdict:** Overkill for this simple UX feature

---

## Risk Assessment

### Low Risk ✅
- localStorage is standard and well-supported
- Changes are isolated to UI layer only
- No authentication logic changes
- Easy to rollback if needed
- No database migrations required

### Minimal Impact
- If localStorage fails, falls back to default behavior
- No breaking changes to existing functionality
- Purely additive feature

### Testing Requirements
- Standard QA testing sufficient
- No security audit required
- No load testing required

---

## Success Criteria

1. ✅ First-time users see "WELCOME TO LUKE UX"
2. ✅ Returning users see "WELCOME BACK" on login
3. ✅ No authentication flow disruptions
4. ✅ No console errors or warnings
5. ✅ Works on both homepage and standalone login page (if in scope)
6. ✅ Graceful fallback if localStorage unavailable
7. ✅ No accessibility regressions

---

## Timeline Estimate

- **Phase 1 (Implementation)**: 30-45 minutes
- **Phase 2 (Testing)**: 30-45 minutes
- **Phase 3 (QA)**: 15-30 minutes
- **Phase 4 (Documentation)**: 15 minutes

**Total Estimated Time**: 1.5 - 2.5 hours

---

## Dependencies

- No external dependencies required
- No package installations needed
- No database changes required
- No API changes required

---

## Rollback Plan

If issues arise:
1. Remove localStorage logic
2. Revert heading to static "WELCOME TO LUKE UX"
3. No database rollback needed
4. No API rollback needed
5. Simple git revert possible

---

## Questions for Clarification Before Implementation

Please confirm the following before proceeding:

1. **Should the message change on both the homepage AND the standalone login page, or just one?**

2. **Should it only show "WELCOME BACK" in login mode, or also during signup if they've visited before?**

3. **Exact text preference:**
   - "WELCOME BACK" (matches "WELCOME TO LUKE UX" style)
   - "Welcome Back" (title case)
   - "Welcome back" (sentence case)

4. **Should the subtitle also change?** Currently: "Your second brain for UX decisions."
   - Keep same
   - Change to something different for returning users

---

## Recommendation

**Proceed with localStorage-based approach** for the following reasons:

1. ✅ Minimal code changes (highest stability)
2. ✅ No authentication flow modifications (lowest risk)
3. ✅ No new API endpoints (best scalability)
4. ✅ Simple to understand and maintain (best maintainability)
5. ✅ Fast implementation (2 hours max)
6. ✅ Easy rollback if needed

**Awaiting approval to proceed with implementation.**
