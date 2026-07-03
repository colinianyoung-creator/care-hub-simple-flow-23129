# Enable Role Changes for Users

Add the ability for members to change their care-team role, in two ways (as chosen):

1. **Members request a change** from their **Profile** dialog → a family admin / care recipient approves it (using the existing "Requests" tab that already exists in Manage Care Team).
2. **Admins set roles directly** on any member from the **Manage Care Team** members list — no approval needed.

All 4 roles are selectable — **Carer, Family Admin, Family Viewer, Care Recipient** — with the rule that **Family Admin** and **Care Recipient** stay limited to **one person each** per family, and a family can never be left without an admin.

## What already exists (reused, not rebuilt)

- The `role_change_requests` table and the admin **Requests** tab (approve/deny) in Manage Care Team.
- Nothing lets a member *create* a request today — that is the main gap.

## Access-control logic

- **Requesting** a role: any member can request a different role for themselves. Blocked if they already have a pending request or pick their current role. If they request Family Admin / Care Recipient while that slot is already taken, they're warned it needs the current holder to change first.
- **Approving / direct-setting**: allowed for family admins **and** care recipients (co-admins). On approval or direct change, the system enforces:
  - Only one Family Admin and one Care Recipient per family.
  - The last remaining admin cannot be demoted (prevents an orphaned family).
- Authorization always uses the membership role in the database, never client state.

## Backend changes (one migration)

New SECURITY DEFINER functions (existing functions untouched):

- `request_role_change(_family_id, _requested_role, _reason)` — verifies the caller is a member, rejects duplicates / same-role, inserts a `pending` row with `from_role` = current role.
- `admin_change_member_role(_family_id, _target_user_id, _new_role)` — verifies caller via `can_manage_family`, enforces the single-admin / single-recipient rule and the "keep at least one admin" rule, then updates the membership. Used by both the direct dropdown and the approval action.
- `review_role_change_request(_request_id, _approve, _reviewer_note)` — wraps `admin_change_member_role` for approvals and marks the request `approved`/`rejected`.

Update `role_change_requests` RLS so **care recipients** (not only family admins) can view and review requests — change the SELECT/UPDATE policies from `is_family_admin(...)` to `can_manage_family(...)`.

## Frontend changes

**`src/components/dialogs/ProfileDialog.tsx`**
- Load the user's current membership role for `currentFamilyId`.
- Add a "My Role" section: shows current role, a role `AdaptiveSelect`, an optional reason field, and a "Request role change" button calling `request_role_change`.
- If a pending request exists, show its status instead of the form. If the user is already an admin, show a hint that they can manage roles from the care team screen.

**`src/components/dialogs/ManageCareTeamDialog.tsx`**
- In the members list, add a role `AdaptiveSelect` per registered member (except the caller) that calls `admin_change_member_role` and refreshes.
- Route the existing `handleApproveRoleChange` through `review_role_change_request` so the single-admin rules are enforced; surface a clear toast if a rule blocks it.

## Technical notes

- `app_role` enum also contains `manager`/`agency`, but per project convention only the 4 canonical roles are offered in the UI.
- No changes to auto-generated files; types regenerate after the migration runs.
- Verify with a typecheck and by exercising request → approve and direct-change flows in the preview.
