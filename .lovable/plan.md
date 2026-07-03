# Handle a carer's shifts when their role change is approved

When a **carer** requests to change to a non-carer role (Family Viewer, Family Admin, or Care Recipient) and they still have **future shifts assigned**, approving the request should first ask the admin / care recipient what to do with those shifts — instead of silently leaving shifts attached to someone who is no longer a carer.

## When this triggers

- Only when the request's current role is **carer** AND the requested role is **not** carer.
- Only when the carer actually has **future shifts** (assignments with instances dated today or later). If they have none, approval proceeds immediately as it does today (no extra step).

## What the admin is asked

A new dialog opens on **Approve**, showing the carer's name and future shift count, with these choices:

1. **Keep shifts assigned** — role changes but the person stays the carer on their existing shifts (useful if they'll still cover some care). No shift changes.
2. **Reassign all future shifts** — pick another registered carer or a pending placeholder carer to take over; future instances move to them, past instances are preserved for timesheets (same logic as removing a carer today).
3. **Reassign from a specific date** — same as above but only shifts on/after a chosen date move; earlier future shifts stay with the original carer.
4. **Delete all future shifts** — remove all upcoming instances; assignments with past history are kept as pending-export for timesheets, future-only assignments are deleted.
5. **Delete from a specific date** — remove only instances on/after a chosen date.
6. *(Suggested extra)* **Generate a carer invite** — create an invite code so a replacement carer can pick up the shifts, mirroring the existing "Remove carer" flow.

After the chosen shift action succeeds, the approval RPC runs and the request is marked approved.

## Flow

```text
Admin clicks Approve on a role-change request
        │
        ├─ request is carer → non-carer AND has future shifts?
        │        │
        │        ├─ yes → open Role-Change Shift dialog
        │        │          → admin picks option → apply shift action
        │        │          → call review_role_change_request(approve)
        │        │
        │        └─ no  → call review_role_change_request(approve) directly
```

## Technical details

- **New component** `src/components/dialogs/RoleChangeShiftDialog.tsx`, modeled on the existing `DeleteCarerDialog.tsx`. It reuses that file's proven shift-handling patterns: loading available carers/placeholders, counting future shifts, `handleReassignShifts`, `handleDeleteShifts`, and invite generation. New behavior: an optional **effective date** (AdaptiveDatePicker) so reassign/delete can be scoped to `scheduled_date >= chosenDate` instead of `>= today`, plus a "keep shifts" no-op option.
- **`ManageCareTeamDialog.tsx`** — in `handleApproveRoleChange`, before calling the RPC, check the request's `from_role`/`requested_role` and query `shift_assignments` (+ `shift_instances`) for future shifts belonging to that carer. If found, open `RoleChangeShiftDialog` and defer the approval to its confirm handler; otherwise approve as today. Refresh the schedule via the existing `onScheduleChange` callback after shift changes.
- **Approval itself is unchanged** — still uses `review_role_change_request`. No database migration or RPC change is needed; admins/care recipients already have RLS permission to modify `shift_assignments`/`shift_instances` (the same operations power `DeleteCarerDialog`).
- **Ordering** — perform the shift action first, then approve, so a failure in shift handling leaves the request pending and recoverable.
- Consider a shared helper later to de-duplicate shift logic between `DeleteCarerDialog` and the new dialog, but this plan keeps them parallel to avoid regressions.

## Out of scope

- Direct admin role changes (`handleDirectRoleChange`) are not covered here; can be added the same way if wanted. The request is specifically about the approval flow.
