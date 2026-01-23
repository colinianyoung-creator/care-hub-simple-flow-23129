

# Cross-Platform Refresh Strategy for CareHub PWA

## Overview
Implement a robust refresh mechanism that provides iOS PWA users with custom pull-to-refresh (since native PTR is unsupported), while preserving Android's native behavior. All platforms will also have a header refresh button and automatic refresh on app focus.

---

## Architecture

The solution uses a centralized approach with three refresh triggers:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     REFRESH TRIGGERS                            │
├──────────────────┬──────────────────┬──────────────────────────┤
│  Pull-to-Refresh │  Header Button   │  Visibility/Focus        │
│  (iOS PWA only)  │  (All platforms) │  (All platforms)         │
└────────┬─────────┴────────┬─────────┴────────────┬─────────────┘
         │                  │                      │
         └──────────────────┴──────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   useAppRefresh Hook        │
              │   - Single refresh function │
              │   - Debouncing (2s window)  │
              │   - Loading state           │
              │   - Cross-view event        │
              └─────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   window.dispatchEvent()    │
              │   'app-refresh-requested'   │
              └─────────────────────────────┘
                            │
                            ▼
         ┌──────────────────┴───────────────────┐
         │  Each section listens and refetches  │
         │  (SchedulingSection, TasksSection,   │
         │   NotesSection, etc.)                │
         └──────────────────────────────────────┘
```

---

## New Files to Create

### 1. `src/hooks/useAppRefresh.ts`
Central refresh hook providing:
- `triggerRefresh()` - debounced function to trigger refresh
- `isRefreshing` - loading state for UI feedback
- `lastRefreshTime` - for preventing excessive refetches
- Dispatches a custom `app-refresh-requested` event

### 2. `src/hooks/useIOSPullToRefresh.ts`
iOS-specific pull-to-refresh gesture handler:
- Detects iOS PWA standalone mode using existing `usePWAInstall` hook
- Tracks touch gestures only when scroll position is at top
- Shows pull indicator (spinner with "Release to refresh" text)
- 60px pull threshold before activating
- Uses CSS transforms for smooth animation without blocking scroll
- Calls `triggerRefresh()` from `useAppRefresh`

### 3. `src/components/PullToRefreshIndicator.tsx`
Visual indicator component for iOS pull-to-refresh:
- Positioned fixed at top of viewport
- Shows spinner animation during refresh
- Displays pull distance indicator before release
- Animates smoothly with CSS transitions

---

## Files to Modify

### 1. `src/components/DashboardHeader.tsx`
Add refresh button to header:
- Import `RefreshCw` icon from lucide-react
- Add refresh button next to menu button
- Button spins during refresh (using CSS animation)
- Accessible with `aria-label` and keyboard focus
- Calls `triggerRefresh()` from `useAppRefresh`

### 2. `src/pages/Dashboard.tsx`
Integrate the pull-to-refresh for iOS:
- Wrap content with pull-to-refresh gesture handler
- Add visibility/focus listeners for automatic refresh
- Ensure the main scroll container has proper ID for gesture detection

### 3. `src/components/CarerDashboard.tsx`
- Add event listener for `app-refresh-requested`
- Call existing data load functions when event fires

### 4. `src/components/FamilyDashboard.tsx`
- Add event listener for `app-refresh-requested`
- Reload care recipient data and trigger section refreshes

### 5. `src/components/DisabledPersonDashboard.tsx`
- Add event listener for `app-refresh-requested`
- Call `loadDashboardData()` when event fires

### 6. `src/components/sections/SchedulingSection.tsx`
- Already has visibility change handling (lines 635-648)
- Add listener for `app-refresh-requested` event
- Use existing `loadSchedulingData()` with `isBackgroundRefresh=true` flag

### 7. `src/components/sections/TasksSection.tsx`
- Add listener for `app-refresh-requested` event
- Call `loadTasks()` on refresh

### 8. `src/index.css`
Add CSS for iOS pull-to-refresh indicator:
- Pull indicator positioning
- Spinner animation styles
- Smooth transform transitions

### 9. `src/locales/*.json` (all locale files)
Add translation keys:
- `refresh.pullToRefresh`: "Pull to refresh"
- `refresh.releaseToRefresh`: "Release to refresh"
- `refresh.refreshing`: "Refreshing..."
- `refresh.refreshButton`: "Refresh data"
- `refresh.lastUpdated`: "Last updated: {{time}}"

---

## Technical Implementation Details

### Pull-to-Refresh Gesture Logic (iOS Only)
```text
1. Detect iOS PWA: Check (navigator.standalone === true) OR 
   matchMedia('(display-mode: standalone)')
   
2. On touchstart:
   - If scroll position > 0, do nothing
   - Record start Y position
   - Set tracking = true

3. On touchmove:
   - If not tracking, return
   - Calculate pull distance (currentY - startY)
   - If pulling down and distance > 0:
     - Apply CSS transform to indicator (translateY)
     - Update pull state for visual feedback
   - If distance > 60px: show "Release to refresh"

4. On touchend:
   - If distance > 60px: trigger refresh
   - Animate indicator back to hidden
   - Reset tracking state
```

### Debouncing Strategy
```text
const REFRESH_COOLDOWN = 2000; // 2 seconds

function triggerRefresh() {
  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    return; // Skip if within cooldown
  }
  lastRefreshTime = now;
  setIsRefreshing(true);
  window.dispatchEvent(new CustomEvent('app-refresh-requested'));
  // Sections handle their own loading states
  setTimeout(() => setIsRefreshing(false), 1000);
}
```

### Visibility Change Handling
```text
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Check if enough time has passed since last refresh
    if (Date.now() - lastRefreshTime > 30000) { // 30 seconds
      triggerRefresh();
    }
  }
});
```

### Header Refresh Button Styling
```text
<Button
  variant="ghost"
  size="sm"
  onClick={triggerRefresh}
  disabled={isRefreshing}
  aria-label={t('refresh.refreshButton')}
>
  <RefreshCw 
    className={cn(
      "h-4 w-4",
      isRefreshing && "animate-spin"
    )} 
  />
</Button>
```

---

## Platform-Specific Behavior

| Feature | iOS PWA | iOS Browser | Android | Desktop |
|---------|---------|-------------|---------|---------|
| Custom pull-to-refresh | Yes | No | No | No |
| Native pull-to-refresh | No | No | Yes | N/A |
| Header refresh button | Yes | Yes | Yes | Yes |
| Auto-refresh on focus | Yes | Yes | Yes | Yes |

---

## Accessibility Considerations

1. **Header refresh button**
   - Has `aria-label="Refresh data"`
   - Focusable with keyboard (Tab)
   - Shows loading state visually (spinning icon)
   - Disabled during refresh to prevent double-tap

2. **Pull-to-refresh indicator**
   - Uses `aria-live="polite"` to announce state changes
   - Text labels describe current state
   - Does not interfere with VoiceOver navigation

3. **Reduced motion**
   - Respects `prefers-reduced-motion` media query
   - Animations are minimal or disabled for users who prefer it

---

## Scroll Container Strategy

The app already handles iOS viewport containment in `src/index.css` (lines 183-196):

```css
@supports (-webkit-touch-callout: none) {
  html, body {
    position: fixed;
    overflow: hidden;
  }
  #root {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

The pull-to-refresh handler will:
- Target `#root` as the scroll container
- Check `scrollTop === 0` before enabling gesture
- Not interfere with normal scrolling behavior

---

## Testing Checklist

1. **iOS Safari PWA (Add to Home Screen)**
   - Pull gesture activates only at scroll top
   - Visual feedback appears during pull
   - Release triggers refresh
   - Normal scrolling unaffected

2. **Android Chrome PWA**
   - Native pull-to-refresh works
   - Header button works
   - No double-refresh from custom handler

3. **Desktop browsers**
   - Header button refreshes data
   - Tab focus refreshes data (with debounce)

4. **Edge cases**
   - Rapid refresh attempts debounced
   - Network errors handled gracefully
   - No memory leaks from event listeners

---

## Implementation Order

1. Create `useAppRefresh` hook (central refresh logic)
2. Create `useIOSPullToRefresh` hook (gesture handling)
3. Create `PullToRefreshIndicator` component
4. Add header refresh button to `DashboardHeader`
5. Integrate pull-to-refresh in `Dashboard.tsx`
6. Add refresh event listeners to all dashboard components
7. Add refresh event listeners to section components
8. Add CSS styles for indicator
9. Add translation keys
10. Test on all platforms

