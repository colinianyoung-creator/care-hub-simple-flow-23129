import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalkthrough } from './WalkthroughProvider';
import { cn } from '@/lib/utils';

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const WalkthroughStep = () => {
  const { t } = useTranslation();
  const {
    isActive,
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    skipWalkthrough,
    getCurrentStepData
  } = useWalkthrough();
  
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const stepData = getCurrentStepData();
  
  useEffect(() => {
    if (!isActive || !stepData) {
      setTargetPosition(null);
      setPopoverPosition(null);
      return;
    }
    
    const findAndHighlight = () => {
      const element = document.querySelector(stepData.elementSelector);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        
        setTargetPosition({
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2
        });
        
        // Calculate popover position
        const popoverWidth = 300;
        const popoverHeight = 150;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let top = rect.bottom + 12 + window.scrollY;
        let left = rect.left + rect.width / 2 - popoverWidth / 2;
        
        // Adjust if overflowing right
        if (left + popoverWidth > viewportWidth - 16) {
          left = viewportWidth - popoverWidth - 16;
        }
        
        // Adjust if overflowing left
        if (left < 16) {
          left = 16;
        }
        
        // If overflowing bottom, show above
        if (rect.bottom + popoverHeight + 24 > viewportHeight) {
          top = rect.top - popoverHeight - 12 + window.scrollY;
        }
        
        setPopoverPosition({ top, left });
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetPosition(null);
        setPopoverPosition(null);
      }
    };
    
    // Initial find
    findAndHighlight();
    
    // Set up observer for DOM changes
    const observer = new MutationObserver(findAndHighlight);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also listen for resize
    window.addEventListener('resize', findAndHighlight);
    window.addEventListener('scroll', findAndHighlight);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', findAndHighlight);
      window.removeEventListener('scroll', findAndHighlight);
    };
  }, [isActive, stepData, currentStep]);
  
  if (!isActive || !stepData) return null;
  
  return createPortal(
    <>
      {/* Overlay with cutout */}
      <div 
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: targetPosition 
            ? `radial-gradient(ellipse 100% 100% at ${targetPosition.left + targetPosition.width / 2}px ${targetPosition.top + targetPosition.height / 2 - window.scrollY}px, transparent ${Math.max(targetPosition.width, targetPosition.height)}px, rgba(0, 0, 0, 0.5) ${Math.max(targetPosition.width, targetPosition.height) + 50}px)`
            : 'rgba(0, 0, 0, 0.5)'
        }}
      />
      
      {/* Highlight ring */}
      {targetPosition && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
          style={{
            top: targetPosition.top - window.scrollY,
            left: targetPosition.left,
            width: targetPosition.width,
            height: targetPosition.height
          }}
        />
      )}
      
      {/* Popover */}
      {popoverPosition && (
        <div
          ref={popoverRef}
          className={cn(
            "fixed z-[10000] w-[300px] bg-popover text-popover-foreground rounded-lg shadow-lg border p-4",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
          style={{
            top: popoverPosition.top - window.scrollY,
            left: popoverPosition.left
          }}
        >
          {/* Close button */}
          <button
            onClick={skipWalkthrough}
            className="absolute top-2 right-2 p-1 hover:bg-muted rounded-md transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
          
          {/* Content */}
          <div className="pr-6 mb-4">
            <p className="text-sm font-medium mb-1">
              {t('instructions.common.step')} {currentStep + 1} / {totalSteps}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(stepData.textKey)}
            </p>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={previousStep}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('common.previous')}
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={nextStep}
              className="gap-1"
            >
              {currentStep === totalSteps - 1 ? t('common.done') : t('common.next')}
              {currentStep < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Skip link */}
          <button
            onClick={skipWalkthrough}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
          >
            {t('instructions.common.skipTour')}
          </button>
        </div>
      )}
    </>,
    document.body
  );
};
