# Fix Schedule Issues: Delete, Edit, and Leave Request Bundling

## ✅ COMPLETED

All 5 issues have been fixed:

### Issue 1: "Delete this and all future shifts" - FIXED ✅
Changed `handleDelete()` in `UnifiedShiftForm.tsx` to delete ALL future shifts for the carer across ALL their assignments (not just the specific recurring pattern).

### Issue 2: Single-instance editing - FIXED ✅
Editing a recurring shift now creates/updates a `time_entry` linked to that specific `shift_instance`, leaving the `shift_assignment` unchanged. This "materializes" the instance as an override.

### Issue 3: Instant refresh - VERIFIED ✅
The `loadSchedulingData()` is already called in all `onSuccess` callbacks and `window.dispatchEvent(new Event('shift-updated'))` is dispatched after edits.

### Issue 4: Admin date range editing - FIXED ✅
When admin edits with a date range:
1. Updates existing `time_entries` in the range
2. Creates `time_entries` for `shift_instances` that don't have them
3. Creates new entries for any remaining dates

### Issue 5: Bundle carer leave requests - FIXED ✅
- Added `bundle_id` column to `shift_change_requests` table
- Bulk carer leave requests now share a `bundle_id`
- UI groups bundled requests and displays as single card with date range
- Approve/deny/delete actions apply to all requests in the bundle

## Files Modified

| File | Changes |
|------|---------|
| `src/components/forms/UnifiedShiftForm.tsx` | Fixed delete future logic, single-instance edit, admin date range edit, added bundle_id to bulk requests |
| `src/components/sections/SchedulingSection.tsx` | Added logic to group bundled requests in Requests tab |
| `src/components/ChangeRequestCard.tsx` | Added support for displaying bundled date range requests with count |
| Database migration | Added `bundle_id` column to `shift_change_requests` |
