import React, { useState } from 'react';
import { isIOSPWA } from '@/lib/platformUtils';
import { IOSMenuSheet, type MenuItem, type MenuGroup } from '@/components/ios/IOSMenuSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AdaptiveMenuProps {
  trigger: React.ReactNode;
  groups: MenuGroup[];
  title?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
  contentClassName?: string;
  // For controlling open state externally
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // iOS-specific props
  triggerRef?: React.RefObject<HTMLButtonElement>;
  contentRef?: React.RefObject<HTMLDivElement>;
  modal?: boolean;
}

export const AdaptiveMenu: React.FC<AdaptiveMenuProps> = ({
  trigger,
  groups,
  title,
  align = 'end',
  className,
  contentClassName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerRef,
  contentRef,
  modal = true,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  // Use iOS sheet on iOS PWA
  if (isIOSPWA()) {
    return (
      <div className={className}>
        <span 
          onClick={() => setIsOpen(true)} 
          onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
          role="button"
          tabIndex={0}
          style={{ display: 'contents' }}
        >
          {trigger}
        </span>
        <IOSMenuSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          title={title}
          groups={groups}
        />
      </div>
    );
  }

  // Standard Dropdown for non-iOS platforms
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={modal}>
      <DropdownMenuTrigger asChild ref={triggerRef}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        ref={contentRef} 
        align={align} 
        className={cn("min-w-[200px]", contentClassName)}
      >
        {groups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => {
                  if (!item.disabled) {
                    setIsOpen(false);
                    item.onClick();
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  item.destructive && "text-destructive focus:text-destructive"
                )}
              >
                {item.icon && (
                  <span className="mr-2 h-4 w-4 flex items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
                {item.badge}
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Re-export types for convenience
export type { MenuItem, MenuGroup };
