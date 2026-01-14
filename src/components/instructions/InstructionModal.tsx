import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X, HelpCircle, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { instructions, InstructionSection, getSectionDisplayNameKey } from '@/lib/instructions';
import { cn } from '@/lib/utils';

interface InstructionModalProps {
  section: InstructionSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InstructionModal = ({ section, open, onOpenChange }: InstructionModalProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  
  const sectionInstructions = instructions[section];
  const modalSteps = sectionInstructions.modal;
  const currentInstruction = modalSteps[currentStep];
  
  const handleNext = () => {
    if (currentStep < modalSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleClose = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t(getSectionDisplayNameKey(section))} - {t('instructions.common.guide')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Step indicator */}
          <div className="flex justify-center gap-1.5">
            {modalSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep 
                    ? "bg-primary w-6" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Image placeholder */}
          <div className="bg-muted/50 rounded-lg p-6 flex flex-col items-center justify-center min-h-[140px] border border-dashed border-muted-foreground/20">
            <Lightbulb className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground text-center max-w-[280px]">
              {currentInstruction.imageDescription}
            </p>
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {t(currentInstruction.titleKey)}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {t(currentInstruction.textKey)}
            </p>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.previous')}
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} / {modalSteps.length}
          </span>
          
          {currentStep < modalSteps.length - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="gap-1"
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleClose}
            >
              {t('common.done')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
