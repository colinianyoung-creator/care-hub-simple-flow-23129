/**
 * Platform detection utilities for iOS PWA stability
 * Centralized functions to detect platform and PWA mode
 */

/**
 * Detects if the current device is running iOS
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Detects if the app is running as a standalone PWA (installed to home screen)
 */
export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
};

/**
 * Detects if the app is running as an iOS PWA (installed to home screen on iOS)
 * This is the critical check for applying iOS PWA-specific workarounds
 */
export const isIOSPWA = (): boolean => {
  return isIOS() && isStandalonePWA();
};

/**
 * Detects if the app is running as a mobile PWA (any platform)
 */
export const isMobilePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isMobile && isStandalonePWA();
};

/**
 * Detects if the device is Android
 */
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};
