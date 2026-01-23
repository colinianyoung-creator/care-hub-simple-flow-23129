
# Fix Schedule Issues: Delete, Edit, and Leave Request Bundling

## Issues Identified

### Issue 1: "Delete this and all future shifts" only deletes single occurrence
**Location:** `src/components/forms/UnifiedShiftForm.tsx` lines 797-830

**Current behavior:** When selecting "future" deletion, the code deletes all shift_instances for that assignment from the `start_date` onwards, but this only affects instances of that specific recurring pattern, not ALL shifts assigned to that person.

**User expectation:** Delete all future shifts for that specific carer across all their assignments.

---

### Issue 2: Editing a recurring shift updates the assignment (all instances) instead of single instance
**Location:** `src/components/forms/UnifiedShiftForm.tsx` lines 573-596

**Current behavior:** When editing a shift that has a `shift_assignment_id`, the code updates the `shift_assignments` table, which affects ALL instances of that recurring shift.

**User expectation:** Editing a single instance (e.g., changing basic to annual_leave) should only update that specific instance, not the whole series.

---

### Issue 3: Shift type changes not reflecting instantly across all views
**Location:** Multiple - the `window.dispatchEvent(new Event('shift-updated'))` is fired but views may not be listening or refreshing properly.

**Current behavior:** After editing, views may not update immediately.

**User expectation:** All schedule views (weekly, monthly, mobile) should update instantaneously.

---

### Issue 4: Date range edits not updating all shifts in period
**Location:** `src/components/forms/UnifiedShiftForm.tsx` lines 661-703 (admin bulk creation)

**Current behavior:** Admin date range creates NEW time_entries but doesn't update existing shifts in that range.

**User expectation:** When editing with a date range, all existing shifts in that period should be updated to the new type.

---

### Issue 5: Carer leave requests with date range showing as multiple separate requests
**Location:** `src/components/forms/UnifiedShiftForm.tsx` lines 266-288

**Current behavior:** When a carer submits a leave request with start_date and end_date, ONE `leave_request` record is created with the date range. However, when they submit change requests for existing shifts with a date range, multiple `shift_change_requests` are created (one per shift).

The confusion: `leave_requests` table already stores start_date and end_date as a range in a single record. The issue is that `shift_change_requests` are created per-shift when modifying existing shifts.

**User expectation:** A single bundled request should appear in the Pending Requests tab with the full date range.

---

## Technical Solutions

### Fix 1: "Delete future shifts" should delete all assignments for that carer
**Change:** In `handleDelete()`, when `deleteOption === 'future'`, instead of filtering by `shift_assignment_id`, delete all shift_instances for the carer from the start date:

```text
Current logic:
- Get instances WHERE shift_assignment_id = X AND scheduled_date >= Y

New logic:
- Get all shift_assignments for this carer in this family
- Delete all shift_instances WHERE shift_assignment_id IN (those assignments) AND scheduled_date >= Y
- Also delete time_entries for this carer from start_date onwards
```

### Fix 2: Single-instance editing should create/update time_entry, not shift_assignment
**Change:** When editing a recurring shift instance:
1. If it doesn't already have a time_entry, create one linked to the shift_instance
2. Update the time_entry's `shift_type`, not the shift_assignment
3. This "materializes" the instance as an override

```text
Current flow (wrong):
Edit recurring shift → Update shift_assignments → All instances change

New flow (correct):
Edit recurring shift → Create/find time_entry for that instance → Update time_entry only
```

### Fix 3: Ensure instant refresh across all views
**Change:** 
- After edit operations, call `loadSchedulingData()` from the onSuccess callback
- Ensure the `shift-updated` event listener in ScheduleCalendar and MonthCalendarView triggers a re-fetch
- Add refresh handling in MobileDayView if not present

### Fix 4: Admin date range edit should update existing shifts
**Change:** When admin edits with end_date set:
1. Query existing time_entries in the date range for that carer
2. Update their shift_type
3. Query shift_instances in the date range for that carer
4. Create/update time_entries for those instances with the new shift_type
5. Don't create new shifts that would duplicate existing ones

### Fix 5: Bundle carer shift change requests with date range
**Change:** Instead of creating multiple `shift_change_requests` (one per shift), create a SINGLE request with:
- A new `bundle_id` field or use `parent_request_id` to link them
- Store the date range in the request metadata
- In the Requests tab, group requests by `bundle_id` and display as a single card showing the date range

**Alternative simpler approach:** 
- Add `start_date` and `end_date` columns to `shift_change_requests` to indicate it's a range request
- Store affected `time_entry_ids` as a JSON array
- Display as single bundled request in UI

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/forms/UnifiedShiftForm.tsx` | Fix delete future logic, fix single-instance edit, fix admin date range edit |
| `src/components/sections/SchedulingSection.tsx` | Ensure proper refresh after edits, update request grouping logic |
| `src/components/ChangeRequestCard.tsx` | Support displaying bundled date range requests |
| Database migration | Add columns for bundled requests (optional - can use JSON for simpler approach) |

---

## Implementation Order

1. **Fix 2 first** - Single instance editing (most impactful, affects daily usage)
2. **Fix 4** - Admin date range editing (related to Fix 2)
3. **Fix 1** - Delete future shifts logic
4. **Fix 3** - Instant refresh verification
5. **Fix 5** - Bundle leave requests (requires more thought on data model)

---

## Database Considerations

For Fix 5, two options:

**Option A (Simpler, no migration):**
- Keep current behavior where multiple `shift_change_requests` are created
- Add a `bundle_id` UUID column to group related requests
- In UI, group by `bundle_id` and show as single card with date range

**Option B (Cleaner, requires migration):**
- Add `start_date`, `end_date` columns to `shift_change_requests`
- Add `affected_entries` JSONB column to store array of time_entry_ids
- Create single request record per date range submission
