import React from 'react';
import { Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface IOSSelectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  title?: string;
  placeholder?: string;
}

export const IOSSelectSheet: React.FC<IOSSelectSheetProps> = ({
  open,
  onOpenChange,
  value,
  onValueChange,
  options,
  title,
  placeholder,
}) => {
  const { t } = useTranslation();

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] max-h-[600px] rounded-t-xl p-0 flex flex-col [&>button]:hidden"
      >
        {/* Fixed header with explicit Done button - hide default close */}
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b">
          <div className="flex items-center justify-between w-full">
            <SheetTitle className="text-base font-semibold flex-1 pr-4">
              {title || placeholder || t('common.select')}
            </SheetTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-primary font-medium touch-manipulation min-h-[44px] min-w-[60px]"
            >
              {t('common.done')}
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable options list */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-2">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => !option.disabled && handleSelect(option.value)}
                disabled={option.disabled}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors touch-manipulation min-h-[48px]",
                  value === option.value 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted active:bg-muted",
                  option.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-base">{option.label}</span>
                {value === option.value && (
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
