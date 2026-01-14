import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InstructionTooltipProps {
  textKey: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
}

export const InstructionTooltip = ({
  textKey,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300
}: InstructionTooltipProps) => {
  const { t } = useTranslation();
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="max-w-[200px] text-center">
          <p className="text-xs">{t(textKey)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Utility component for elements that already exist in the DOM
interface TooltipWrapperProps {
  textKey: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const TooltipWrapper = ({ textKey, children, side = 'top' }: TooltipWrapperProps) => {
  const { t } = useTranslation();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[200px]">
          <p className="text-xs">{t(textKey)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
