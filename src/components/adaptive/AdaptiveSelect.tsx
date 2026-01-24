import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { isIOSPWA } from '@/lib/platformUtils';
import { IOSSelectSheet, type SelectOption } from '@/components/ios/IOSSelectSheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdaptiveSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  title?: string;
}

export const AdaptiveSelect: React.FC<AdaptiveSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  triggerClassName,
  title,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Get the selected option's label
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  // Use iOS sheet on iOS PWA, standard Select otherwise
  if (isIOSPWA()) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          onClick={() => setSheetOpen(true)}
          // Prevent keyboard from appearing when tapping the button
          inputMode="none"
          className={cn(
            "w-full justify-between font-normal touch-manipulation",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <IOSSelectSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          value={value}
          onValueChange={onValueChange}
          options={options}
          title={title}
          placeholder={placeholder}
        />
      </div>
    );
  }

  // Standard Radix Select for non-iOS platforms
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn(className, triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Re-export the option type for convenience
export type { SelectOption };
