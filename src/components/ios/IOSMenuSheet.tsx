import React from 'react';
import { X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export interface MenuGroup {
  items: MenuItem[];
}

interface IOSMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  groups: MenuGroup[];
}

export const IOSMenuSheet: React.FC<IOSMenuSheetProps> = ({
  open,
  onOpenChange,
  title,
  groups,
}) => {
  const { t } = useTranslation();

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    onOpenChange(false);
    // Small delay to allow sheet close animation
    setTimeout(() => {
      item.onClick();
    }, 150);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[85vh] rounded-t-xl p-0 flex flex-col"
      >
        {/* Fixed header with close button */}
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b flex flex-row items-center justify-between">
          <SheetTitle className="text-base font-semibold">
            {title || t('menu.menu')}
          </SheetTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onOpenChange(false)}
            className="touch-manipulation min-h-[44px] min-w-[44px]"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">{t('common.close')}</span>
          </Button>
        </SheetHeader>

        {/* Scrollable menu items */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="py-2">
            {groups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {groupIndex > 0 && <Separator className="my-2" />}
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation min-h-[48px]",
                      "hover:bg-muted active:bg-muted",
                      item.destructive && "text-destructive hover:bg-destructive/10",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1 text-base">{item.label}</span>
                    {item.badge && (
                      <span className="flex-shrink-0">{item.badge}</span>
                    )}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
