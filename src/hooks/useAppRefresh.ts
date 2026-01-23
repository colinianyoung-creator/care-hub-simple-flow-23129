import { useState, useCallback, useRef, useEffect } from 'react';

const REFRESH_COOLDOWN = 2000; // 2 seconds between refreshes
const VISIBILITY_REFRESH_COOLDOWN = 30000; // 30 seconds before auto-refresh on visibility

// Custom event for cross-component refresh coordination
export const APP_REFRESH_EVENT = 'app-refresh-requested';

export interface UseAppRefreshReturn {
  triggerRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshTime: number;
}

export const useAppRefresh = (): UseAppRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshTimeRef = useRef<number>(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const triggerRefresh = useCallback(() => {
    const now = Date.now();
    
    // Debounce: Skip if within cooldown period
    if (now - lastRefreshTimeRef.current < REFRESH_COOLDOWN) {
      console.log('[useAppRefresh] Skipping refresh - within cooldown');
      return;
    }
    
    console.log('[useAppRefresh] Triggering refresh');
    lastRefreshTimeRef.current = now;
    setLastRefreshTime(now);
    setIsRefreshing(true);
    
    // Dispatch custom event for all listening components
    window.dispatchEvent(new CustomEvent(APP_REFRESH_EVENT, {
      detail: { timestamp: now }
    }));
    
    // Reset refreshing state after a short delay
    // (individual sections handle their own loading states)
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  }, []);

  // Handle visibility change for auto-refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        
        // Only auto-refresh if enough time has passed
        if (timeSinceLastRefresh > VISIBILITY_REFRESH_COOLDOWN) {
          console.log('[useAppRefresh] Auto-refreshing on visibility change');
          triggerRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerRefresh]);

  // Handle window focus for auto-refresh (desktop browsers)
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      // Only auto-refresh if enough time has passed
      if (timeSinceLastRefresh > VISIBILITY_REFRESH_COOLDOWN) {
        console.log('[useAppRefresh] Auto-refreshing on window focus');
        triggerRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [triggerRefresh]);

  return {
    triggerRefresh,
    isRefreshing,
    lastRefreshTime
  };
};
