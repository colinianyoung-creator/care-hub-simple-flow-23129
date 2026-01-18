import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookieBanner from "./components/CookieBanner";
import { WalkthroughProvider, WalkthroughStep } from "./components/instructions";
import "./App.css";

const queryClient = new QueryClient();

// Global touch handler to help close Radix menus on mobile
const useGlobalTouchHandler = () => {
  useEffect(() => {
    const handleDocumentTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if touch is outside any Radix popover/dropdown/select content
      const isInsideRadixContent = target.closest(
        '[data-radix-popper-content-wrapper], [data-radix-dropdown-menu-content], [data-radix-select-content], [data-radix-popover-content], [role="dialog"], [role="menu"], [role="listbox"]'
      );
      
      // If touching outside radix content, dispatch escape to close any open menus
      if (!isInsideRadixContent) {
        // Small delay to allow the touch to register first
        setTimeout(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'Escape', 
            code: 'Escape',
            bubbles: true,
            cancelable: true
          }));
        }, 10);
      }
    };

    document.addEventListener('touchstart', handleDocumentTouch, { passive: true });
    return () => document.removeEventListener('touchstart', handleDocumentTouch);
  }, []);
};

function App() {
  // Initialize global touch handler for PWA responsiveness
  useGlobalTouchHandler();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalkthroughProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CookieBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
            </Routes>
          </BrowserRouter>
          <WalkthroughStep />
        </WalkthroughProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

