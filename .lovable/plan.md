## Goal

Give the current **Family Admin** a safe way to hand over the admin role. Today this is impossible — the rules enforce "one Family Admin per family" and "can't remove the last admin," which deadlock any manual attempt. This adds a dedicated, atomic transfer that requires the successor to accept.

## Decisions (from you)

- Only the **current Family Admin** can start a transfer.
- The outgoing admin **chooses** what role they become (Carer or Family Viewer).
- The new admin **must accept** before anything changes.
- Existing shifts are **left untouched**.

## How it works

```text
1. Family Admin opens Manage Care Team → picks a member → "Make Family Admin (transfer)"
2. Chooses their own new role (Carer / Family Viewer) → confirms
3. A pending transfer request is created (nothing changes yet)
4. The chosen member sees a banner/request: "You've been asked to become Family Admin"
5. They Accept  → roles swap atomically (new person = Family Admin, old admin = chosen role)
   They Decline → request closed, no change
```

Because the swap happens inside one database function, it never hits the "already has an admin" / "last admin" blocks — both role changes commit together or not at all.

## What gets built

### 1. Database (new migration)

**New table `admin_transfer_requests`** — tracks a pending handover:
- family, the initiating admin, the nominated new admin, the role the outgoing admin will take, and status (pending / accepted / declined / cancelled).
- Full GRANTs + RLS: only members of the family can see their family's transfer requests; only the nominee or initiator act on them (enforced in the functions below).

**`request_admin_transfer(_family_id, _to_user_id, _outgoing_role)`** (security definer):
- Caller must be the family's current `family_admin`.
- Target must be an existing member of the family and not already the admin.
- `_outgoing_role` limited to `carer` or `family_viewer`.
- Rejects if a pending transfer already exists for the family.
- Inserts a pending row. No role changes yet.

**`respond_admin_transfer(_request_id, _accept)`** (security definer):
- Caller must be the nominated `to_user_id`.
- On accept, atomically: set the nominee's membership to `family_admin` and the outgoing admin's membership to the chosen role.
- On decline, mark declined. Marks status + reviewer/time either way.

**`cancel_admin_transfer(_request_id)`** (security definer): lets the initiating admin withdraw a still-pending request.

### 2. Frontend — `ManageCareTeamDialog.tsx`

- On each member row (visible only to the current Family Admin), add a **"Transfer admin"** action. It opens a small confirm dialog that asks which role the current admin will drop to (Carer / Family Viewer) and warns the change needs the other person's acceptance.
- Show any **outgoing pending transfer** the admin started, with a **Cancel** button.
- For the **nominated user**, surface an **incoming transfer** prompt (a banner at the top of the dialog, plus an entry in the existing Requests tab) with **Accept** / **Decline**.
- Reload team data after any action; keep existing shift-handling untouched.

## What this does NOT change

- No changes to the existing member-initiated `role_change_requests` flow or the carer shift dialog.
- Shifts, invites, and placeholder carers are unaffected.
- The "one admin per family" rule stays intact for every other path — only the atomic transfer function is allowed to swap both roles at once.

## Verify after

- As Family Admin, start a transfer to another member, confirm nothing changes until they accept.
- As the nominee, accept → confirm you become Family Admin and the previous admin holds the role they chose.
- Confirm decline and cancel both leave roles unchanged, and that non-admins never see the transfer action.
