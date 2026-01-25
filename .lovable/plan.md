
# Complete iOS PWA Adaptive Component Migration

## Problem Summary

1. **Medications frequency dropdown** in `MedicationsSection.tsx` still uses old Radix `Select`
2. **Keyboards appearing on selectors** - The `role="combobox"` attribute on `AdaptiveSelect` trigger button is causing iOS to show a keyboard, and `inputMode="none"` on a `<div>` wrapper in `AdaptiveMenu` is invalid HTML
3. **Multiple forms and components** still import and use old Radix UI `Select` directly instead of `AdaptiveSelect`

## Root Causes

### Keyboard Issue
- In `AdaptiveSelect.tsx`, the trigger button has `role="combobox"` which signals to iOS that it should show a keyboard for text input
- In `AdaptiveMenu.tsx`, `inputMode="none"` is applied to a `<div>` element, but `inputMode` is only valid on form input elements
- The trigger buttons need to explicitly set `type="button"` and remove `role="combobox"`

### Remaining Old-Style Dropdowns
Files still using legacy `Select` from `@/components/ui/select`:

| File | Dropdowns |
|------|-----------|
| `MedicationsSection.tsx` | Frequency per day |
| `MAREntryForm.tsx` | Medication, Status |
| `ShiftRequestForm.tsx` | Carer, Request/Shift Type |
| `ShiftAssignmentForm.tsx` | Shift Type |
| `RiskAssessmentForm.tsx` | Setting/Environment |
| `RiskAssessmentViewer.tsx` | Risk Level |
| `IncidentReportForm.tsx` | Incident Type |
| `BodyLogForm.tsx` | Type/Severity |

---

## Implementation Plan

### Phase 1: Fix Keyboard Appearing on Selectors

**1. Update `AdaptiveSelect.tsx`**
- Remove `role="combobox"` from the iOS PWA trigger button
- Add `type="button"` explicitly to prevent form submission behavior
- Keep `inputMode="none"` (valid on button elements)

**2. Update `AdaptiveMenu.tsx`**
- Replace the wrapper `<div>` with a proper `<button>` element that has:
  - `type="button"`
  - `inputMode="none"`
  - Proper accessibility attributes
- Alternatively, clone the trigger element and inject the click handler

**3. Update `AdaptiveDatePicker.tsx`**
- Ensure `type="button"` is set on the iOS PWA trigger
- Verify `inputMode="none"` is present

### Phase 2: Migrate Medications Section

**4. Update `MedicationsSection.tsx`**
- Replace `Select` import with `AdaptiveSelect` import from `@/components/adaptive`
- Convert frequency dropdown to `AdaptiveSelect` with options array:
  - `{ value: "1", label: "Once daily (09:00)" }`
  - `{ value: "2", label: "Twice daily (09:00, 18:00)" }`
  - `{ value: "3", label: "3 times daily (09:00, 13:00, 18:00)" }`
  - `{ value: "4", label: "4 times daily (09:00, 13:00, 18:00, 21:00)" }`

### Phase 3: Migrate Form Components

**5. Update `MAREntryForm.tsx`**
- Replace `Select` with `AdaptiveSelect`
- Convert medication dropdown (dynamic options from props)
- Convert status dropdown with options: Pending, Administered, Missed, Refused

**6. Update `ShiftRequestForm.tsx`**
- Replace carer dropdown with `AdaptiveSelect`
- Replace request/shift type dropdown with `AdaptiveSelect`

**7. Update `ShiftAssignmentForm.tsx`**
- Replace shift type dropdown with `AdaptiveSelect`

**8. Update `RiskAssessmentForm.tsx`**
- Replace setting/environment dropdown with `AdaptiveSelect`
- Options: Home - Indoor, Home - Garden/Outdoor, Community - Indoor, etc.

**9. Update `RiskAssessmentViewer.tsx`**
- Replace risk level dropdown with `AdaptiveSelect`
- Options: Low, Medium, High

**10. Update `IncidentReportForm.tsx`**
- Replace incident type dropdown with `AdaptiveSelect`
- Options: Fall, Injury, Medication Error, Behavioural, Safeguarding, Other

**11. Update `BodyLogForm.tsx`**
- Replace type/severity dropdown with `AdaptiveSelect`
- Convert SEVERITY_OPTIONS array to options format

---

## Technical Details

### Fixing Keyboard in AdaptiveSelect

```text
Current (problematic):
<Button
  role="combobox"        // ← Triggers keyboard
  inputMode="none"
  ...
>

Fixed:
<Button
  type="button"          // ← Explicit button type
  inputMode="none"       // ← Prevent keyboard
  aria-haspopup="listbox"  // ← Proper accessibility
  aria-expanded={sheetOpen}
  ...
>
```

### Fixing Keyboard in AdaptiveMenu

```text
Current (invalid HTML):
<div onClick={...} role="button" tabIndex={0} inputMode="none">
  {trigger}
</div>

Fixed approach - wrap trigger with proper handler:
<span 
  onClick={() => setIsOpen(true)} 
  onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
  role="button"
  tabIndex={0}
  style={{ display: 'contents' }}
>
  {trigger}
</span>
```

### Migration Pattern for Select → AdaptiveSelect

```text
// Before
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>

// After
import { AdaptiveSelect } from "@/components/adaptive";

<AdaptiveSelect
  value={value}
  onValueChange={onChange}
  placeholder="Select..."
  title="Field Name"
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
  ]}
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/adaptive/AdaptiveSelect.tsx` | Remove `role="combobox"`, add `type="button"` |
| `src/components/adaptive/AdaptiveMenu.tsx` | Fix wrapper to use valid keyboard prevention |
| `src/components/adaptive/AdaptiveDatePicker.tsx` | Ensure `type="button"` is set |
| `src/components/sections/MedicationsSection.tsx` | Migrate frequency Select |
| `src/components/forms/MAREntryForm.tsx` | Migrate medication & status Selects |
| `src/components/forms/ShiftRequestForm.tsx` | Migrate carer & type Selects |
| `src/components/forms/ShiftAssignmentForm.tsx` | Migrate shift type Select |
| `src/components/forms/RiskAssessmentForm.tsx` | Migrate setting Select |
| `src/components/RiskAssessmentViewer.tsx` | Migrate risk level Select |
| `src/components/forms/IncidentReportForm.tsx` | Migrate incident type Select |
| `src/components/forms/BodyLogForm.tsx` | Migrate severity Select |

---

## Expected Outcome

After implementation:
- No keyboards will appear when tapping any selector/dropdown on iOS PWA
- All dropdowns will use the bottom sheet pattern on iOS PWA
- Each sheet has an explicit "Done" button for closing
- Background is locked when sheets are open
- Android and desktop users continue to see standard dropdowns
- All form functionality remains identical
