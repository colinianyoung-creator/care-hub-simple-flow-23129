
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ExpandableDashboardSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

export const ExpandableDashboardSection = ({ 
  id, 
  title, 
  children, 
  defaultOpen = false,
  icon 
}: ExpandableDashboardSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors p-3 sm:p-4 md:p-6"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center justify-center h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px]">
            {isOpen ? (
              <ChevronDown className="h-5 w-5 md:h-4 md:w-4" />
            ) : (
              <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
            )}
          </div>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0 px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
