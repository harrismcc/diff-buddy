# GitHub App OAuth Setup for Private Repository Access

## Current Issue
The application migrated from GitHub PATs to OAuth tokens but cannot access private repository `Infilla/infilla-app`. Getting "User not found" and "Not Found" errors.

## What We've Done
✅ **OAuth Token Infrastructure Setup:**
- Updated `src/serverActions/getGithubToken.ts` to retrieve OAuth tokens from `Account` table
- Changed database query from `prisma.user.findFirst()` to `prisma.account.findFirst()`
- Removed `githubPersonalAccessToken` field from User model

✅ **OAuth Configuration:**
- Configured `src/lib/auth/auth.ts` with scopes: `["repo", "read:user", "user:email"]`
- Set `disableDefaultScope: true`
- GitHub App permissions configured: Contents (Read), Pull Requests (Read), Email Addresses (Read)

❌ **Current Problem:**
- GitHub OAuth flow only requests email permissions, not private repo access
- Database shows empty `scope` field after authentication
- Private repository access still fails with "Not Found"

## Files Modified
1. `src/serverActions/getGithubToken.ts` - OAuth token retrieval from Account table
2. `src/lib/auth/auth.ts` - GitHub OAuth with `["repo", "read:user", "user:email"]` scopes
3. `prisma/schema.prisma` - Removed `githubPersonalAccessToken` from User model

## Current OAuth Configuration
```typescript
export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      disableDefaultScope: true,
      scope: ["repo", "read:user", "user:email"],
    },
  },
});
```

## GitHub App Setup
- **Type**: GitHub App (not OAuth App)
- **Permissions**: Contents (Read), Pull Requests (Read), Email Addresses (Read)
- **Callback URL**: `http://localhost:3123/api/auth/callback/github`

## Test Targets
- Private repo: `https://github.com/Infilla/infilla-app`
- Specific PR: `https://github.com/Infilla/infilla-app/pull/1892`
- App URLs: `http://localhost:3123/Infilla/infilla-app/pulls`, `http://localhost:3123/Infilla/infilla-app/pull/1892`

## Debug Commands
```bash
# Clear auth data
sqlite3 prisma/dev.db "DELETE FROM Session; DELETE FROM Account;"

# Check database state
sqlite3 prisma/dev.db "SELECT providerId, scope, createdAt FROM Account WHERE providerId = 'github';"

# Test private repo access via browser
# Navigate to: http://localhost:3123/Infilla/infilla-app/pull/1892
```

## Next Steps Needed
1. **Confirm which auth model we want** (OAuth App user tokens vs GitHub App user tokens + installation permissions)
2. **If using a GitHub App**, verify the app is installed on the target org/user and has access to `Infilla/infilla-app`
3. **If using an OAuth App**, switch the client ID/secret to an OAuth App and re-auth to get the `repo` scope
4. **Re-auth after any change** (tokens are minted with the app type/permissions at login time)

## Key Question
Does better-auth's GitHub social provider support GitHub Apps, or does it only work with OAuth Apps? The empty scope field suggests the OAuth flow isn't working as expected for GitHub Apps.

## Root Cause
`better-auth`'s GitHub provider is built for **OAuth Apps**. It always uses the OAuth App endpoints and `scope` handling, which works for OAuth Apps but is **ignored by GitHub Apps**. When you plug GitHub App credentials into this flow:
- The returned `scope` is empty (expected for GitHub Apps).
- Access to private repos depends entirely on **GitHub App installation** permissions.
- A 404 from `GET /repos/{owner}/{repo}/pulls` usually means the app is **not installed** on that repo/org or lacks permission.

## Fix Options
Choose one path and stick to it (mixing them causes confusing results).

### Option A: Use an OAuth App (recommended for user-level `repo` access)
1. Create a GitHub OAuth App and use its client ID/secret.
2. Keep `scope: ["repo"]` (or `["repo", "read:user", "user:email"]`) in `src/lib/auth/auth.ts`.
3. Re-authenticate (delete Account/Session rows if needed) to mint a new token with `repo` scope.

### Option B: Use a GitHub App (installation-based access)
1. Ensure the GitHub App is installed on the owner/org that hosts `Infilla/infilla-app` and that the repo is selected.
2. Confirm app permissions include `Contents: Read` and `Pull requests: Read`.
3. Re-authenticate so the user token is tied to the installation.
4. Expect `scope` to stay empty; rely on installation access instead.

## Quick Diagnostic
- If `GET /user` succeeds but `GET /repos/Infilla/infilla-app` returns 404, the token lacks access.
- For GitHub App flow, verify installation access first; for OAuth App flow, verify `repo` scope.

## Install Page
A simple install helper page is available at:
- `http://localhost:3123/auth/github-app`

It uses one of these environment variables to build the install URL:
- `GITHUB_APP_INSTALL_URL` (full URL, overrides slug)
- `GITHUB_APP_SLUG` (used as `https://github.com/apps/<slug>/installations/new`)
