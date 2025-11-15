import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ShiftViewToggleProps {
  viewMode: 'single-family' | 'all-families';
  onViewModeChange: (mode: 'single-family' | 'all-families') => void;
  familyCount: number;
}

export const ShiftViewToggle = ({ viewMode, onViewModeChange, familyCount }: ShiftViewToggleProps) => {
  // Only show toggle if carer belongs to 2+ families
  if (familyCount < 2) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <span className="text-sm font-medium">Show:</span>
      <Button
        variant={viewMode === 'single-family' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('single-family')}
      >
        My shifts (this family)
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'all-families' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('all-families')}
            >
              All my shifts
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
