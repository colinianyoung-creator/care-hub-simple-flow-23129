# Fix "Join Family" Invite Flow

## Problems (root causes found in code)

**Issue 1 — Accept link only opens the dashboard, doesn't join.**
The invite email links to `/auth?invite=CODE&email=…&role=…`. On `src/pages/Auth.tsx`, when the recipient is *already signed in*, the `checkAuth` effect (and the `onAuthStateChange` SIGNED_IN listener) immediately runs `navigate('/dashboard')` and never redeems the code. The URL's `invite` param is only used to pre-fill the sign-up form, so an existing logged-in user never joins the family. (New-signup users work because the code is stored as `pending_invite_code` metadata and redeemed later in `Dashboard.handleFirstTimeUser`.)

**Issue 2 — Entering the code joins, but sections stay on "loading/holding" until manual refresh.**
`JoinFamilyButton` → `DashboardHeader.onSuccess` → `Dashboard.handleFamilySelected(familyId)`. That handler only calls `setSelectedFamilyId` and reloads the care-recipient picture — it never re-queries `user_memberships`. So the freshly joined family isn't in the `families` array; `currentFamily` resolves to the old value (or undefined), and the sections have no valid `familyId` until a full page reload re-runs `loadUserData`.

## Changes

### 1. Redeem invite from URL for already-authenticated users (`src/pages/Auth.tsx`)
- In the auth-check flow, before redirecting a logged-in user to `/dashboard`, read the `invite` param from the URL. If present, call the existing `redeem_invite` RPC (code normalized to lowercase, matching current convention), show a success/failure toast, then navigate to `/dashboard`.
- Apply the same redemption in the `onAuthStateChange` `SIGNED_IN` branch so it also covers a recipient who signs in (existing account) via the invite link rather than signing up.
- Guard against double-redemption (redeem once), and always navigate even if redemption fails (e.g. already a member / expired), so the user isn't stuck on the auth screen.

### 2. Reload memberships after a successful join (`src/pages/Dashboard.tsx` + `src/components/DashboardHeader.tsx`)
- Add a dedicated "family joined" handler in `Dashboard` that re-runs `loadUserData(user.id)` to refetch `user_memberships`, then sets `selectedFamilyId` to the newly joined family so the dashboard sections render immediately with a valid `familyId`.
- Wire `JoinFamilyButton.onSuccess` (in `DashboardHeader`) to this new handler instead of the plain `handleFamilySelected`, passing the handler down via props (reuse the existing `onFamilySelected` prop chain or add a parallel `onFamilyJoined` prop).
- Keep `handleFamilySelected` as-is for normal family switching between families already in the list.

## Technical notes
- `redeem_invite(_code)` is an existing SECURITY DEFINER RPC that inserts the membership and is idempotent (`ON CONFLICT DO NOTHING`), so calling it for an already-joined user is safe.
- No database or edge-function changes are required; the email function already builds a correct `/auth?invite=…` URL.
- After redemption on the Auth page, the Dashboard's own `loadUserData` will pick up the new membership on mount, so sections render correctly for the email-link path too.

## Expected outcome
- Clicking "Accept Invitation" in the email joins the family (whether the user is already logged in, signs in, or signs up) and lands on the dashboard already a member.
- Entering an invite code manually immediately shows the joined family's sections with no manual refresh.
