import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Lightbulb,
  CheckSquare,
  FileText,
  Calendar,
  UtensilsCrossed,
  Pill,
  CalendarClock,
  Clock,
  ArrowLeft,
  Play
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  instructions, 
  InstructionSection, 
  getAllSections,
  getSectionDisplayNameKey 
} from '@/lib/instructions';
import { cn } from '@/lib/utils';
import { useWalkthrough } from './WalkthroughProvider';

interface HelpCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SectionCardData {
  id: InstructionSection;
  icon: React.ElementType;
  descriptionKey: string;
}

const sectionCards: SectionCardData[] = [
  { id: 'tasks', icon: CheckSquare, descriptionKey: 'instructions.helpCenter.tasks.description' },
  { id: 'notes', icon: FileText, descriptionKey: 'instructions.helpCenter.notes.description' },
  { id: 'scheduling', icon: Calendar, descriptionKey: 'instructions.helpCenter.scheduling.description' },
  { id: 'diet', icon: UtensilsCrossed, descriptionKey: 'instructions.helpCenter.diet.description' },
  { id: 'medications', icon: Pill, descriptionKey: 'instructions.helpCenter.medications.description' },
  { id: 'appointments', icon: CalendarClock, descriptionKey: 'instructions.helpCenter.appointments.description' },
  { id: 'timePayroll', icon: Clock, descriptionKey: 'instructions.helpCenter.timePayroll.description' },
];

export const HelpCenterModal = ({ open, onOpenChange }: HelpCenterModalProps) => {
  const { t } = useTranslation();
  const { startWalkthrough } = useWalkthrough();
  const [selectedSection, setSelectedSection] = useState<InstructionSection | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleClose = () => {
    setSelectedSection(null);
    setCurrentStep(0);
    onOpenChange(false);
  };

  const handleSectionClick = (sectionId: InstructionSection) => {
    setSelectedSection(sectionId);
    setCurrentStep(0);
  };

  const handleBackToSections = () => {
    setSelectedSection(null);
    setCurrentStep(0);
  };

  const handleStartTour = () => {
    if (selectedSection) {
      handleClose();
      startWalkthrough(selectedSection);
    }
  };

  const handleNext = () => {
    if (selectedSection) {
      const modalSteps = instructions[selectedSection].modal;
      if (currentStep < modalSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Section Grid View
  const renderSectionGrid = () => (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t('instructions.helpCenter.subtitle')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sectionCards.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                  "hover:bg-accent hover:border-accent-foreground/20",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
              >
                <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm">
                    {t(getSectionDisplayNameKey(section.id))}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {t(section.descriptionKey)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );

  // Section Guide View
  const renderSectionGuide = () => {
    if (!selectedSection) return null;
    
    const sectionInstructions = instructions[selectedSection];
    const modalSteps = sectionInstructions.modal;
    const currentInstruction = modalSteps[currentStep];
    const hasWalkthrough = sectionInstructions.walkthrough.length > 0;

    return (
      <div className="flex flex-col h-full">
        {/* Back button */}
        <button
          onClick={handleBackToSections}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('instructions.helpCenter.backToSections')}
        </button>

        <div className="flex-1 overflow-y-auto space-y-4">
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
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t mt-4">
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
            <div className="flex gap-2">
              {hasWalkthrough && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartTour}
                  className="gap-1"
                >
                  <Play className="h-3 w-3" />
                  {t('instructions.helpCenter.startTour')}
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleClose}
              >
                {t('common.done')}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {selectedSection 
              ? `${t(getSectionDisplayNameKey(selectedSection))} - ${t('instructions.common.guide')}`
              : t('instructions.helpCenter.title')
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden py-2">
          {selectedSection ? renderSectionGuide() : renderSectionGrid()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
