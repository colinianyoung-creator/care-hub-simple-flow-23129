
# Fix iOS PWA Components Not Using Adaptive Wrappers

## Problem Analysis

The screenshot shows the **Leave Section** filter dropdown displaying as a standard Radix UI floating overlay (showing "All types", "Annual Leave", "Sickness", "Public Holiday") instead of the new iOS bottom sheet system.

**Root Cause**: While the adaptive wrapper components (`AdaptiveSelect`, `AdaptiveMenu`, `AdaptiveDatePicker`) were created correctly, **the existing components throughout the app are still importing and using the old Radix UI primitives directly** instead of the new adaptive wrappers.

The core infrastructure (platform detection + iOS sheet components + adaptive wrappers) is complete and working, but **Phase 3 of the implementation** (updating existing components to use the wrappers) was not completed.

---

## Current State

Files **correctly updated**:
- `DashboardHeader.tsx` - Uses `AdaptiveMenu` (line 300)

Files **still using old Select** (18 files found):
1. `src/components/sections/LeaveSection.tsx` (the one in screenshot)
2. `src/components/sections/TasksSection.tsx`
3. `src/components/sections/SchedulingSection.tsx`
4. `src/components/forms/UnifiedShiftForm.tsx`
5. `src/components/forms/UnifiedNoteForm.tsx`
6. `src/components/forms/MAREntryForm.tsx`
7. `src/components/forms/ShiftAssignmentForm.tsx`
8. `src/components/forms/ShiftRequestForm.tsx`
9. `src/components/forms/RiskAssessmentForm.tsx`
10. `src/components/settings/DisplaySettings.tsx`
11. `src/components/settings/LanguageSettings.tsx`
12. `src/components/dialogs/ManageCareTeamDialog.tsx`
13. `src/components/dialogs/ExportTimesheetDialog.tsx`
14. `src/components/AttendanceModeSelector.tsx`
15. `src/components/RiskAssessmentViewer.tsx`
16. And more...

Files **still using old DropdownMenu**:
- `src/components/sections/LeaveSection.tsx` (also has DropdownMenu for row actions)

---

## Implementation Plan

### Phase 1: High-Priority Components (User-Facing)

**1. LeaveSection.tsx** (shown in screenshot)
- Replace `Select` import with `AdaptiveSelect` import
- Convert carer filter dropdown to use `AdaptiveSelect`
- Convert type filter dropdown to use `AdaptiveSelect`  
- Replace row action `DropdownMenu` with explicit buttons for iOS PWA

**2. SchedulingSection.tsx**
- Replace carer filter Select with `AdaptiveSelect`
- Replace shift type filter Select with `AdaptiveSelect`

**3. TasksSection.tsx**
- Replace any Select components with `AdaptiveSelect`

### Phase 2: Form Components

**4. UnifiedShiftForm.tsx**
- Replace all Select dropdowns with `AdaptiveSelect`
- Replace date picker popovers with `AdaptiveDatePicker`

**5. UnifiedNoteForm.tsx**
- Replace Select components with `AdaptiveSelect`

**6. MAREntryForm.tsx**
- Replace Select components with `AdaptiveSelect`

**7. ShiftAssignmentForm.tsx**
- Replace Select components with `AdaptiveSelect`

**8. ShiftRequestForm.tsx**
- Replace Select components with `AdaptiveSelect`

**9. RiskAssessmentForm.tsx**
- Replace Select components with `AdaptiveSelect`

### Phase 3: Settings and Dialogs

**10. LanguageSettings.tsx**
- Replace language selector with `AdaptiveSelect`

**11. DisplaySettings.tsx**
- Replace any Select components with `AdaptiveSelect`

**12. ManageCareTeamDialog.tsx**
- Replace role selector with `AdaptiveSelect`

**13. ExportTimesheetDialog.tsx**
- Replace carer selector with `AdaptiveSelect`
- Replace date pickers with `AdaptiveDatePicker`

### Phase 4: Other Components

**14. AttendanceModeSelector.tsx**
- Replace mode selector with `AdaptiveSelect`

**15. RiskAssessmentViewer.tsx**
- Replace any Select components with `AdaptiveSelect`

---

## Technical Details

### Pattern for Converting Select to AdaptiveSelect

**Before (old pattern):**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={filters.type} onValueChange={(value) => setFilters({...})}>
  <SelectTrigger>
    <SelectValue placeholder="All types" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all-types">All types</SelectItem>
    <SelectItem value="annual_leave">Annual Leave</SelectItem>
  </SelectContent>
</Select>
```

**After (new pattern):**
```tsx
import { AdaptiveSelect } from "@/components/adaptive";

<AdaptiveSelect
  value={filters.type}
  onValueChange={(value) => setFilters({...})}
  placeholder="All types"
  title="Filter by Type"
  options={[
    { value: "all-types", label: "All types" },
    { value: "annual_leave", label: "Annual Leave" },
    { value: "sickness", label: "Sickness" },
    { value: "public_holiday", label: "Public Holiday" },
  ]}
/>
```

### Handling Dynamic Options

For components with dynamically populated options (like carer lists), the options array must be built from the data:

```tsx
const carerOptions = [
  { value: "all-carers", label: "All carers" },
  ...carers.map(carer => ({ 
    value: carer.id, 
    label: carer.name 
  }))
];

<AdaptiveSelect
  value={filters.carer}
  onValueChange={...}
  options={carerOptions}
  title="Filter by Carer"
/>
```

---

## Expected Outcome

After implementation:
- All Select dropdowns on iOS PWA will open as bottom sheets instead of floating overlays
- Each sheet will have an explicit "Done" close button
- Background will be locked when sheets are open
- No tap-outside-to-close behavior that could freeze the UI
- Android and desktop users will continue to see standard dropdowns
- All filter functionality remains identical

---

## Implementation Order (Priority)

1. **LeaveSection.tsx** - Immediate fix for the issue shown in screenshot
2. **SchedulingSection.tsx** - High visibility section
3. **TasksSection.tsx** - High visibility section
4. **UnifiedShiftForm.tsx** - Most complex form, used frequently
5. **Settings dialogs** - User account settings
6. **Remaining forms** - Complete coverage

This approach ensures the most visible user-facing issues are fixed first, then progressively covers all remaining Select usages.
