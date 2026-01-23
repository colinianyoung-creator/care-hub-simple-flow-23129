

# iOS PWA Stability Overhaul Plan

## Problem Summary

iOS PWAs have well-documented platform limitations that cause unreliable behavior with tap-outside-to-close overlays, dropdowns, popovers, and nested interactive layers. The current implementation uses Radix UI primitives (DropdownMenu, Select, Popover) that rely on these problematic interaction patterns, causing UI freezes and glitches on iOS PWA.

## Architecture Overview

The solution replaces problematic overlay interactions with stable alternatives for iOS PWA users while preserving the current experience for other platforms.

```text
Platform Detection
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                  iOS PWA Detected?                  │
├──────────────────────┬──────────────────────────────┤
│         YES          │              NO              │
│                      │                              │
│  Use Alternative UI  │   Use Current Radix UI      │
│  - Full-screen       │   - DropdownMenu            │
│    selection screens │   - Select                  │
│  - Bottom sheets     │   - Popover                 │
│  - Explicit actions  │                             │
└──────────────────────┴──────────────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Create iOS PWA Utility and Alternative Components

**New Files to Create:**

1. **`src/lib/platformUtils.ts`** - Centralized platform detection utility
   - Export `isIOSPWA()` function (consolidate from current duplicates in ui/dialog.tsx, ui/sheet.tsx, ui/alert-dialog.tsx)
   - Export `isIOS()` function
   - Export `isMobilePWA()` function

2. **`src/components/ios/IOSSelectSheet.tsx`** - Bottom sheet alternative to Select
   - Full-screen sheet sliding from bottom
   - Explicit close button (Done)
   - List of selectable options
   - Lock background scrolling when open
   - Single scroll container (the sheet content itself)

3. **`src/components/ios/IOSDatePickerSheet.tsx`** - Bottom sheet alternative to Calendar Popover
   - Full-screen sheet with calendar embedded
   - Explicit Done/Cancel buttons
   - Replaces all date picker popovers on iOS PWA

4. **`src/components/ios/IOSMenuSheet.tsx`** - Bottom sheet alternative to DropdownMenu
   - Full-screen sheet for menu items
   - Explicit close button
   - Replaces header menu on iOS PWA

### Phase 2: Create Wrapper Components for Conditional Rendering

**New Files to Create:**

5. **`src/components/adaptive/AdaptiveSelect.tsx`** - Wrapper that renders:
   - Standard Radix `Select` on non-iOS platforms
   - `IOSSelectSheet` on iOS PWA
   - Same API as current Select

6. **`src/components/adaptive/AdaptiveDatePicker.tsx`** - Wrapper that renders:
   - Standard Popover/Calendar on non-iOS platforms
   - `IOSDatePickerSheet` on iOS PWA
   - Same API as current date picker pattern

7. **`src/components/adaptive/AdaptiveMenu.tsx`** - Wrapper that renders:
   - Standard DropdownMenu on non-iOS platforms
   - `IOSMenuSheet` on iOS PWA

### Phase 3: Update Existing Components

**Files to Modify:**

#### Core UI Components
| File | Changes |
|------|---------|
| `src/lib/platformUtils.ts` (new) | Centralize `isIOSPWA()` detection |
| `src/components/ui/dialog.tsx` | Import `isIOSPWA` from platformUtils |
| `src/components/ui/sheet.tsx` | Import `isIOSPWA` from platformUtils, add background scroll lock |
| `src/components/ui/alert-dialog.tsx` | Import `isIOSPWA` from platformUtils |
| `src/components/ui/popover.tsx` | Add iOS PWA handling to prevent use on iOS PWA |
| `src/components/ui/select.tsx` | Add iOS PWA detection warning (usage should be replaced) |
| `src/components/ui/dropdown-menu.tsx` | Add iOS PWA handling |

#### Header Menu
| File | Changes |
|------|---------|
| `src/components/DashboardHeader.tsx` | Replace DropdownMenu with AdaptiveMenu, use IOSMenuSheet on iOS PWA |

#### Date Pickers (High Priority - Used Extensively)
| File | Changes |
|------|---------|
| `src/components/ui/DateRangePicker.tsx` | Replace Popover with AdaptiveDatePicker |
| `src/components/forms/UnifiedShiftForm.tsx` | Replace Popover calendar with AdaptiveDatePicker |
| `src/components/sections/AIReportsSection.tsx` | Replace Popover calendars with AdaptiveDatePicker |
| `src/components/sections/MARDashboard.tsx` | Replace Popover calendar with AdaptiveDatePicker |
| `src/components/sections/DietArchiveSection.tsx` | Replace Popover calendar with AdaptiveDatePicker |
| `src/components/sections/NotesArchiveSection.tsx` | Replace Popover calendar with AdaptiveDatePicker |
| `src/components/sections/MoneyArchiveSection.tsx` | Replace Popover calendar with AdaptiveDatePicker |
| `src/components/sections/BodyMapArchiveSection.tsx` | Replace Popover calendar with AdaptiveDatePicker |
| `src/components/AdminMARDashboard.tsx` | Replace Popover calendar with AdaptiveDatePicker |
| `src/components/sections/TimePayrollSection.tsx` | Replace Popover calendars with AdaptiveDatePicker |

#### Select Components (High Priority - Used in Forms)
| File | Changes |
|------|---------|
| `src/components/forms/UnifiedShiftForm.tsx` | Replace Select with AdaptiveSelect |
| `src/components/forms/UnifiedNoteForm.tsx` | Replace Select with AdaptiveSelect |
| `src/components/forms/IncidentReportForm.tsx` | Replace Select with AdaptiveSelect |
| `src/components/forms/CareNoteForm.tsx` | Replace Select with AdaptiveSelect |
| `src/components/forms/MAREntryForm.tsx` | Replace Select with AdaptiveSelect |
| `src/components/sections/DietSection.tsx` | Replace Select with AdaptiveSelect |
| `src/components/sections/TasksSection.tsx` | Replace Select with AdaptiveSelect |
| `src/components/settings/DisplaySettings.tsx` | Replace Select with AdaptiveSelect |
| `src/components/settings/LanguageSettings.tsx` | Replace Select with AdaptiveSelect |
| `src/components/dialogs/ManageCareTeamDialog.tsx` | Replace Select with AdaptiveSelect |

#### Other Dropdowns
| File | Changes |
|------|---------|
| `src/components/chat/ConversationList.tsx` | Replace DropdownMenu with explicit delete button on iOS PWA |
| `src/components/instructions/HelpButton.tsx` | Replace DropdownMenu with AdaptiveMenu |

---

## Technical Implementation Details

### Platform Detection Utility

```text
src/lib/platformUtils.ts:

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isIOSPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isIOSDevice = isIOS();
  const isStandalone = (window.navigator as any).standalone === true;
  return isIOSDevice && isStandalone;
};
```

### IOSSelectSheet Component Structure

```text
- Sheet component (from vaul, bottom position)
- SheetContent with max-h-[85vh]
- Fixed header with title and Done button
- ScrollArea for options list
- Each option as large touchable button (min-h-[48px])
- Selected state indicated with checkmark
- onSelect callback closes sheet automatically
- Background scroll locked via Sheet overlay
```

### IOSDatePickerSheet Component Structure

```text
- Sheet component (from vaul, bottom position)
- Fixed header with Cancel/Done buttons
- Calendar component embedded in content
- Quick actions (Today, This Week, This Month) as buttons
- Optional range mode toggle
- onDateSelect closes sheet after selection
```

### IOSMenuSheet Component Structure

```text
- Sheet component (from vaul, bottom position)
- Fixed header with close X button
- Menu items as large touchable buttons
- Each item has icon + label
- Separators between groups
- Red destructive styling for sign out
```

### AdaptiveSelect Wrapper Pattern

```text
interface AdaptiveSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const AdaptiveSelect = (props: AdaptiveSelectProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  
  if (isIOSPWA()) {
    return (
      <>
        <Button onClick={() => setSheetOpen(true)}>
          {selectedLabel || placeholder}
        </Button>
        <IOSSelectSheet 
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          {...props}
        />
      </>
    );
  }
  
  return <RadixSelect {...props} />;
};
```

---

## Sheet Component Enhancement

The existing `src/components/ui/sheet.tsx` needs these enhancements for iOS PWA:

1. **Lock Background Scroll** - Prevent body scrolling when sheet is open
2. **Disable Modal Focus Trap Issues** - Already partially implemented
3. **Ensure Single Scroll Container** - Content scrolls, background does not

---

## Testing Requirements

| Scenario | Expected Behavior |
|----------|------------------|
| iOS Safari PWA - Open header menu | IOSMenuSheet slides up, background locked |
| iOS Safari PWA - Tap Done | Sheet closes, no freeze |
| iOS Safari PWA - Select carer dropdown | IOSSelectSheet opens instead of dropdown |
| iOS Safari PWA - Pick date | IOSDatePickerSheet opens with full calendar |
| iOS Safari PWA - Rapid open/close | No glitches, responsive |
| Android Chrome | Standard Radix components used |
| Desktop | Standard Radix components used |
| iOS Safari (browser, not PWA) | Can use either - currently will use standard |

---

## Implementation Order

1. Create `src/lib/platformUtils.ts` (centralize detection)
2. Create `src/components/ios/IOSSelectSheet.tsx`
3. Create `src/components/ios/IOSDatePickerSheet.tsx`
4. Create `src/components/ios/IOSMenuSheet.tsx`
5. Create `src/components/adaptive/AdaptiveSelect.tsx`
6. Create `src/components/adaptive/AdaptiveDatePicker.tsx`
7. Create `src/components/adaptive/AdaptiveMenu.tsx`
8. Update `src/components/DashboardHeader.tsx` (highest visibility)
9. Update all date picker usages (archive sections, forms)
10. Update all select usages (forms, settings)
11. Update remaining dropdown usages
12. Clean up duplicate `isIOSPWA` functions in UI components

---

## Success Criteria

After implementation:
- No UI freezes when tapping outside elements on iOS PWA
- No glitching when opening/closing menus on iOS PWA
- No lost taps or delayed responses on iOS PWA
- All interactive surfaces have visible close/confirm buttons on iOS PWA
- Android and desktop users retain current behavior
- Only one interactive layer exists at a time on iOS PWA
- No background scrolling while sheets are open

---

## Risk Mitigation

- **Fallback behavior**: If iOS PWA detection fails, standard components still work
- **Progressive enhancement**: Non-iOS users unaffected
- **Component API compatibility**: Adaptive components match original APIs for easy migration
- **No breaking changes**: All changes are additive, existing functionality preserved for other platforms

