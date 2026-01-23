import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppRefresh } from './useAppRefresh';

const PULL_THRESHOLD = 60; // pixels to pull before triggering refresh
const MAX_PULL = 120; // maximum pull distance

interface UseIOSPullToRefreshReturn {
  pullDistance: number;
  isPulling: boolean;
  isIOSPWA: boolean;
  shouldShowIndicator: boolean;
}

// Detect iOS PWA standalone mode
const detectIOSPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = (navigator as any).standalone === true || 
    window.matchMedia('(display-mode: standalone)').matches;
  
  return isIOS && isStandalone;
};

export const useIOSPullToRefresh = (scrollContainerId: string = 'root'): UseIOSPullToRefreshReturn => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isIOSPWA] = useState(detectIOSPWA);
  const { triggerRefresh, isRefreshing } = useAppRefresh();
  
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isIOSPWA) return;
    
    // Get the scroll container
    const container = scrollContainerRef.current || document.getElementById(scrollContainerId);
    if (!container) return;
    
    // Only track if at the top of the scroll container
    if (container.scrollTop > 0) {
      isTrackingRef.current = false;
      return;
    }
    
    startYRef.current = e.touches[0].clientY;
    isTrackingRef.current = true;
  }, [isIOSPWA, scrollContainerId]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isIOSPWA || !isTrackingRef.current || isRefreshing) return;
    
    const container = scrollContainerRef.current || document.getElementById(scrollContainerId);
    if (!container) return;
    
    // Stop tracking if user has scrolled down
    if (container.scrollTop > 0) {
      isTrackingRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    // Only track downward pulls
    if (diff > 0) {
      // Apply resistance to make it feel natural
      const resistance = 0.5;
      const adjustedDistance = Math.min(diff * resistance, MAX_PULL);
      
      setPullDistance(adjustedDistance);
      setIsPulling(true);
      
      // Prevent default scroll behavior when pulling
      if (adjustedDistance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isIOSPWA, isRefreshing, scrollContainerId]);

  const handleTouchEnd = useCallback(() => {
    if (!isIOSPWA || !isTrackingRef.current) return;
    
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      console.log('[useIOSPullToRefresh] Triggering refresh');
      triggerRefresh();
    }
    
    // Reset state
    setPullDistance(0);
    setIsPulling(false);
    isTrackingRef.current = false;
  }, [isIOSPWA, pullDistance, isRefreshing, triggerRefresh]);

  useEffect(() => {
    if (!isIOSPWA) return;
    
    // Cache the scroll container reference
    scrollContainerRef.current = document.getElementById(scrollContainerId);
    
    // Use passive: false for touchmove to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isIOSPWA, handleTouchStart, handleTouchMove, handleTouchEnd, scrollContainerId]);

  const shouldShowIndicator = isIOSPWA && (isPulling || isRefreshing);

  return {
    pullDistance,
    isPulling,
    isIOSPWA,
    shouldShowIndicator
  };
};
