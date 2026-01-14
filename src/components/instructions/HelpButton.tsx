import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, BookOpen, Play, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InstructionModal } from './InstructionModal';
import { useWalkthrough } from './WalkthroughProvider';
import { InstructionSection, getSectionDisplayNameKey } from '@/lib/instructions';
import { cn } from '@/lib/utils';

interface HelpButtonProps {
  section: InstructionSection;
  variant?: 'icon' | 'full';
  className?: string;
}

export const HelpButton = ({ section, variant = 'icon', className }: HelpButtonProps) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const { startWalkthrough, isSectionCompleted } = useWalkthrough();
  
  const handleStartTour = () => {
    startWalkthrough(section);
  };
  
  const handleOpenGuide = () => {
    setModalOpen(true);
  };

  const isCompleted = isSectionCompleted(section);
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={variant === 'icon' ? 'icon' : 'sm'}
            className={cn(
              "relative",
              variant === 'icon' ? 'h-8 w-8' : '',
              className
            )}
            aria-label={t('instructions.common.help')}
          >
            <HelpCircle className={cn("text-muted-foreground", variant === 'icon' ? 'h-4 w-4' : 'h-4 w-4 mr-1')} />
            {variant === 'full' && t('instructions.common.help')}
            {!isCompleted && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleOpenGuide} className="gap-2 cursor-pointer">
            <BookOpen className="h-4 w-4" />
            <span className="flex-1">{t('instructions.common.viewGuide')}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleStartTour} className="gap-2 cursor-pointer">
            <Play className="h-4 w-4" />
            <span className="flex-1">
              {isCompleted 
                ? t('instructions.common.replayTour') 
                : t('instructions.common.startTour')}
            </span>
            {!isCompleted && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {t('instructions.common.new')}
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <InstructionModal
        section={section}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
};

// Simple inline help icon that just opens the modal
interface SimpleHelpButtonProps {
  section: InstructionSection;
  className?: string;
}

export const SimpleHelpButton = ({ section, className }: SimpleHelpButtonProps) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-6 w-6", className)}
        onClick={() => setModalOpen(true)}
        aria-label={t('instructions.common.help')}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </Button>
      
      <InstructionModal
        section={section}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
};
