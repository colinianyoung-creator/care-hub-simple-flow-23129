import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { InstructionSection, instructions } from '@/lib/instructions';

interface WalkthroughContextType {
  isActive: boolean;
  currentSection: InstructionSection | null;
  currentStep: number;
  totalSteps: number;
  startWalkthrough: (section: InstructionSection) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipWalkthrough: () => void;
  endWalkthrough: () => void;
  getCurrentStepData: () => {
    elementSelector: string;
    elementLabel: string;
    textKey: string;
  } | null;
  markSectionCompleted: (section: InstructionSection) => void;
  isSectionCompleted: (section: InstructionSection) => boolean;
}

const WalkthroughContext = createContext<WalkthroughContextType | null>(null);

const WALKTHROUGH_STORAGE_KEY = 'carehub_completed_walkthroughs';

interface WalkthroughProviderProps {
  children: ReactNode;
}

export const WalkthroughProvider = ({ children }: WalkthroughProviderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentSection, setCurrentSection] = useState<InstructionSection | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<InstructionSection>>(() => {
    try {
      const stored = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored) as InstructionSection[]);
      }
    } catch {
      // Ignore localStorage errors
    }
    return new Set();
  });

  const totalSteps = currentSection ? instructions[currentSection].walkthrough.length : 0;

  // Persist completed sections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        WALKTHROUGH_STORAGE_KEY, 
        JSON.stringify(Array.from(completedSections))
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [completedSections]);

  const startWalkthrough = useCallback((section: InstructionSection) => {
    setCurrentSection(section);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentSection && currentStep < instructions[currentSection].walkthrough.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentSection) {
      // Walkthrough complete
      markSectionCompleted(currentSection);
      endWalkthrough();
    }
  }, [currentSection, currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipWalkthrough = useCallback(() => {
    if (currentSection) {
      markSectionCompleted(currentSection);
    }
    endWalkthrough();
  }, [currentSection]);

  const endWalkthrough = useCallback(() => {
    setIsActive(false);
    setCurrentSection(null);
    setCurrentStep(0);
  }, []);

  const getCurrentStepData = useCallback(() => {
    if (!currentSection || !isActive) return null;
    
    const walkthrough = instructions[currentSection].walkthrough;
    const step = walkthrough[currentStep];
    
    if (!step) return null;
    
    return {
      elementSelector: step.elementSelector,
      elementLabel: step.elementLabel,
      textKey: step.textKey
    };
  }, [currentSection, currentStep, isActive]);

  const markSectionCompleted = useCallback((section: InstructionSection) => {
    setCompletedSections(prev => new Set([...prev, section]));
  }, []);

  const isSectionCompleted = useCallback((section: InstructionSection) => {
    return completedSections.has(section);
  }, [completedSections]);

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        currentSection,
        currentStep,
        totalSteps,
        startWalkthrough,
        nextStep,
        previousStep,
        skipWalkthrough,
        endWalkthrough,
        getCurrentStepData,
        markSectionCompleted,
        isSectionCompleted
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  return context;
};

// Safe hook that returns null values if not within provider
export const useWalkthroughSafe = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    return {
      isActive: false,
      currentSection: null,
      currentStep: 0,
      totalSteps: 0,
      startWalkthrough: () => {},
      nextStep: () => {},
      previousStep: () => {},
      skipWalkthrough: () => {},
      endWalkthrough: () => {},
      getCurrentStepData: () => null,
      markSectionCompleted: () => {},
      isSectionCompleted: () => false
    };
  }
  return context;
};
