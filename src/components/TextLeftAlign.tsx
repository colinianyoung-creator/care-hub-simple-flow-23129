import { cn } from '@/lib/utils';

// Global text alignment utility
export const textLeftAlign = 'text-left';

// Apply to all text elements globally
export const applyLeftAlignment = () => {
  const style = document.createElement('style');
  style.textContent = `
    * {
      text-align: left !important;
    }
    .text-center {
      text-align: left !important;
    }
  `;
  document.head.appendChild(style);
};