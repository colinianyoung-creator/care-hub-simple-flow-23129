import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Home, Users } from "lucide-react";

interface ShiftViewToggleProps {
  viewMode: 'single-family' | 'all-families';
  onViewModeChange: (mode: 'single-family' | 'all-families') => void;
  familyCount: number;
}

export const ShiftViewToggle = ({ viewMode, onViewModeChange, familyCount }: ShiftViewToggleProps) => {
  const isMobile = useIsMobile();
  
  console.log('🔘 ShiftViewToggle render:', { viewMode, familyCount });
  
  // Only show toggle if carer belongs to 2+ families
  if (familyCount < 2) {
    console.log('🚫 Toggle hidden: familyCount < 2');
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <span className="text-sm font-medium flex-shrink-0">Show:</span>
      <Button
        variant={viewMode === 'single-family' ? 'default' : 'ghost'}
        size="sm"
        className={isMobile ? "px-2" : ""}
        onClick={() => onViewModeChange('single-family')}
      >
        <Home className="h-4 w-4 mr-1" />
        {isMobile ? "This family" : "My shifts (this family)"}
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'all-families' ? 'default' : 'ghost'}
              size="sm"
              className={isMobile ? "px-2" : ""}
              onClick={() => onViewModeChange('all-families')}
            >
              <Users className="h-4 w-4 mr-1" />
              {isMobile ? "All" : "All my shifts"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Shows every shift assigned to you across all families you belong to</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
