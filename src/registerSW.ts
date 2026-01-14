/**
 * Service Worker Registration
 * Registers the PWA service worker with graceful failure handling.
 * Only caches static assets - no API responses, auth tokens, or user data.
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registered:', registration.scope);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, will be used on next reload
                  console.log('New content available; please refresh.');
                }
              });
            }
          });
        })
        .catch((error) => {
          // Graceful failure - app works without SW
          console.log('ServiceWorker registration failed:', error);
        });
    });
  }
}
