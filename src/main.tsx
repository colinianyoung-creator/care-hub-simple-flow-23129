import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import App from './App.tsx'
import './index.css'
import './lib/i18n' // Initialize i18n
import { registerSW } from 'virtual:pwa-register'

// Register service worker with auto-update
registerSW({
  onRegistered(registration) {
    console.log('SW registered:', registration);
  },
  onRegisterError(error) {
    // Graceful failure - app works without SW
    console.log('SW registration failed:', error);
  }
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <App />
  </ThemeProvider>
);
