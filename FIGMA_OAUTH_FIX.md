# Figma OAuth Integration Fixes

## Problems Fixed

### 1. OAuth State Error (FIXED ✅)
After Figma approval, the OAuth callback was failing with `figma_error=oauth_state`, indicating that the OAuth state validation was failing.

**Root Cause:** In Next.js App Router (Next.js 13+), the `cookies()` function returns a Promise that needs to be awaited. The code was calling `cookies().get()` without awaiting it first, which caused the cookie retrieval to fail.

### 2. Token Exchange 404 Error (FIXED ✅)
After fixing the state validation, the token exchange was failing with a 404 error.

**Root Cause:** The token exchange was using the wrong endpoint URL (`https://www.figma.com/api/oauth/token` instead of `https://api.figma.com/v1/oauth/token`).

### 3. Missing OAuth Scope Error (FIXED ✅)
After fixing the token exchange, fetching user info was failing with a 403 Forbidden error.

**Root Cause:** The OAuth scope only included `file_content:read`, but the `/me` endpoint requires `current_user:read` scope. Updated scopes to: `file_content:read,files:read,file_variables:read,current_user:read`.

## Fix Applied

### 1. Fixed Cookie Retrieval in Callback Handler
**File:** `apps/web/app/api/integrations/figma/callback/route.ts`

Changed:
```typescript
const expectedState = cookies().get("figma_oauth_state")?.value;
```

To:
```typescript
const cookieStore = await cookies();
const expectedState = cookieStore.get("figma_oauth_state")?.value;
```

### 2. Added Debug Logging
Added comprehensive logging to both the connect and callback endpoints to help diagnose issues:

- **Connect endpoint**: Logs state generation, user ID, and OAuth URL
- **Callback endpoint**: Logs received state, expected state, available cookies, and validation results

### 3. Improved Cookie Settings
Added explicit `domain: undefined` to the cookie configuration to let the browser determine the appropriate domain automatically.

## OAuth Flow

1. **User initiates connection** → `/api/integrations/figma/connect`
   - Generates random UUID state
   - Sets `figma_oauth_state` cookie (httpOnly, secure in production, 10 min expiry)
   - Redirects to Figma OAuth page

2. **User authorizes on Figma** → Figma redirects back
   - Figma redirects to: `https://lukeux.ai/api/integrations/figma/callback?code=...&state=...`

3. **Callback validates and exchanges token** → `/api/integrations/figma/callback`
   - Retrieves `figma_oauth_state` cookie (now properly awaited)
   - Validates state matches
   - Exchanges code for access token
   - Saves connection to database
   - Redirects to canvas with success message

## Environment Variables Required
```env
SESSION_SECRET="change-me-to-random-secure-string"
FIGMA_CLIENT_ID="2pQkpye98ZSoLM9gl5qfpX"
FIGMA_CLIENT_SECRET="9n220nHORzDOEPKZfQrBKsicC0OtrV"
FIGMA_REDIRECT_URI="https://lukeux.ai/api/integrations/figma/callback"
```

## Testing the Fix

1. **Deploy the changes** to production
2. **Attempt to connect Figma** from the canvas page
3. **Monitor the logs** for the debug output:
   - Check `[figma-connect]` logs for state generation
   - Check `[figma-callback]` logs for state validation
4. **Verify successful connection** - should redirect to `/app/canvas?figma_connected=true`

## Common Issues to Watch For

### Cookie Not Set
- **Symptom**: `expectedState` is undefined in callback logs
- **Possible causes**:
  - Browser blocking third-party cookies
  - Cookie expiry (set to 10 minutes)
  - Cookie path mismatch

### State Mismatch
- **Symptom**: `state !== expectedState` even though both exist
- **Possible causes**:
  - User took longer than 10 minutes (cookie expired)
  - Multiple OAuth attempts overlapping
  - Session storage issues

### Still Getting oauth_state Error
If the error persists after this fix, check:
1. Server logs for the debug output from both endpoints
2. Browser DevTools → Application → Cookies to verify cookie is being set
3. Network tab to verify the callback URL matches the Figma config exactly
4. Ensure the app is redeployed with the new code

## Testing Locally

### Prerequisites
You cannot fully test Figma OAuth locally without updating your Figma OAuth app configuration, because OAuth callbacks need to match registered redirect URIs exactly.

### Option 1: Test on Production (Recommended)
Since the fix is straightforward and non-breaking, the safest approach is to:
1. Deploy the changes to production
2. Test the OAuth flow on `https://lukeux.ai`
3. Monitor server logs for debug output

### Option 2: Test Locally (Requires Figma Config Changes)

If you want to test locally, you'll need to:

#### 1. Add Localhost Callback to Figma
Go to your Figma OAuth app settings and add a localhost redirect URI:
```
http://localhost:3000/api/integrations/figma/callback
```

#### 2. Create/Update Local Environment File
Create `apps/web/.env.local` (or update if exists) with localhost settings:
```env
# Database and existing config
DATABASE_URL="your-database-url"

# Session Secret
SESSION_SECRET="change-me-to-random-secure-string"

# Figma Integration - LOCALHOST
FIGMA_CLIENT_ID="2pQkpye98ZSoLM9gl5qfpX"
FIGMA_CLIENT_SECRET="9n220nHORzDOEPKZfQrBKsicC0OtrV"
FIGMA_REDIRECT_URI="http://localhost:3000/api/integrations/figma/callback"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### 3. Run the Development Server
```bash
cd apps/web
npm run dev
```

The app will start at: **http://localhost:3000**

#### 4. Test the OAuth Flow
1. Navigate to `http://localhost:3000` and log in
2. Go to the canvas page
3. Click "Connect to Figma"
4. Authorize on Figma
5. Should redirect back to `http://localhost:3000/app/canvas?figma_connected=true`

#### 5. Check the Logs
Watch your terminal for the debug output:
```
[figma-connect] Setting state cookie: { state: '...', userId: '...', ... }
[figma-callback] Debug info: { receivedState: '...', expectedState: '...', ... }
```

#### ⚠️ Important Notes for Local Testing
- The `secure` cookie flag is set to `false` in development (NODE_ENV !== "production")
- This allows cookies to work over HTTP on localhost
- Local testing requires both database access and Figma OAuth app configuration
- After local testing, remember to test on production before considering it fully fixed

### Option 3: Test the Fix in Isolation
You can verify the cookie handling fix without OAuth by:
1. Running `npm run dev` locally
2. Adding temporary test endpoints that set/get cookies with the same pattern
3. Verifying that `await cookies()` works correctly

## Security Notes

- The state parameter prevents CSRF attacks in the OAuth flow
- State is a cryptographically random UUID
- Cookie is httpOnly (prevents XSS access)
- Cookie is secure in production (HTTPS only)
- Cookie expires after 10 minutes
- Access tokens are encrypted before storage using AES-256-GCM
