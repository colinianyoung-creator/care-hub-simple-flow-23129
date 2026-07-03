## Goal

Make everything load again after the security hardening migration, without weakening the new security posture.

## Full audit result

I checked every path the migration could have broken:

1. **All 17 database functions the app calls** (`get_profile_safe`, `generate_invite`, `review_role_change_request`, `mark_dose`, `redeem_invite`, `admin_change_member_role`, shift/MAR/change-request functions, etc.) — confirmed **all still executable by signed-in users**. The revoke of `PUBLIC`/`anon` execute did not strip `authenticated`, because these keep explicit `authenticated` grants. Nothing to fix here.

2. **Every profile lookup in the app** — all already use the safe paths (`profiles_limited` view or `get_profile_safe`) except one. `profiles_limited` exposes only `id`, `full_name`, `profile_picture_url`, which are all still readable. Preference reads/writes only touch allowed columns. Confirmed working.

3. **The one broken query** — `ManageCareTeamDialog.loadTeamData()` requests `email` and `contact_email` from the `profiles` table via the members join. The migration made those columns unreadable for signed-in users (verified directly: `email`, `phone`, `contact_email`, `contact_phone` all denied; `id`, `full_name`, `profile_picture_url` allowed). The rejected column read fails the whole query, so the dialog shows "Failed to load team data" and members, invites, placeholder carers, and pending role-change requests all vanish.

The member list UI only ever displays `full_name` — the blocked columns were fetched but never shown.

## Fix

Frontend-only, one query change in `src/components/dialogs/ManageCareTeamDialog.tsx` (`loadTeamData`): drop the blocked contact columns from the members join, keeping the displayed/permitted fields.

```text
profiles!user_memberships_user_id_fkey ( id, full_name, email, contact_email )
  ->
profiles!user_memberships_user_id_fkey ( id, full_name )
```

## What this does NOT change

- No database migration, no RLS change, no grant change — the new column-level security stays exactly as hardened.
- Placeholder-carer emails in the dialog come from the separate `placeholder_carers` table and are unaffected.
- If admins should later see registered members' contact details, that is added through the existing authorized `get_profile_safe(profile_id)` function (owner/same-family gated) — out of scope now since the UI does not display it.

## Verify after

Open Manage Care Team and confirm members, invites, placeholder carers, and pending role-change requests all load with no error toast. Spot-check the dashboard and scheduling still load normally.
