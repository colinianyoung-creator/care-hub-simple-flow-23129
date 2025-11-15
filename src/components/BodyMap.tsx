import { useState } from 'react';
import { frontRegions, backRegions, getSeverityColor, BodyRegion } from '@/lib/bodyMapRegions';
import { AlertCircle } from 'lucide-react';

interface BodyLog {
  id: string;
  body_region_code: string;
  body_location: string;
  type_severity: string;
  view_type: 'front' | 'back';
  incident_datetime: string;
}

interface BodyMapProps {
  viewType: 'front' | 'back';
  existingLogs: BodyLog[];
  onRegionClick: (region: BodyRegion) => void;
}

export const BodyMap = ({ viewType, existingLogs, onRegionClick }: BodyMapProps) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const regions = viewType === 'front' ? frontRegions : backRegions;
  
  // Filter logs for current view
  const currentViewLogs = existingLogs.filter(log => log.view_type === viewType);

  // Get logs for a specific region
  const getRegionLogs = (regionId: string) => {
    return currentViewLogs.filter(log => log.body_region_code === regionId);
  };

  const handleRegionClick = (region: BodyRegion) => {
    onRegionClick(region);
  };

  const handleRegionHover = (regionId: string | null, event?: React.MouseEvent) => {
    setHoveredRegion(regionId);
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  };

  const renderRegion = (region: BodyRegion) => {
    const isHovered = hoveredRegion === region.id;
    const regionLogs = getRegionLogs(region.id);
    const hasInjury = regionLogs.length > 0;
    
    // Get the most severe injury color for this region
    const injuryColor = hasInjury 
      ? getSeverityColor(regionLogs[0].type_severity)
      : undefined;

    const baseProps = {
      onMouseEnter: (e: React.MouseEvent) => handleRegionHover(region.id, e),
      onMouseLeave: () => handleRegionHover(null),
      onClick: () => handleRegionClick(region),
      className: 'cursor-pointer transition-all',
      style: {
        fill: hasInjury ? injuryColor : isHovered ? 'hsl(var(--accent))' : 'hsl(var(--muted))',
        stroke: isHovered ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        strokeWidth: isHovered ? 2 : 1,
        opacity: hasInjury ? 0.8 : isHovered ? 0.7 : 0.5,
      }
    };

    // Render circle regions
    if (region.cx && region.cy && region.r) {
      return (
        <circle
          key={region.id}
          cx={region.cx}
          cy={region.cy}
          r={region.r}
          {...baseProps}
        />
      );
    }

    // Render rectangle regions
    if (region.x !== undefined && region.y !== undefined && region.width && region.height) {
      return (
        <rect
          key={region.id}
          x={region.x}
          y={region.y}
          width={region.width}
          height={region.height}
          rx={4}
          {...baseProps}
        />
      );
    }

    // Render path regions (if needed in future)
    if (region.path) {
      return (
        <path
          key={region.id}
          d={region.path}
          {...baseProps}
        />
      );
    }

    return null;
  };

  const renderInjuryMarker = (log: BodyLog) => {
    const region = regions.find(r => r.id === log.body_region_code);
    if (!region) return null;

    // Calculate center position for the marker
    let cx = 0, cy = 0;
    if (region.cx && region.cy) {
      cx = region.cx;
      cy = region.cy;
    } else if (region.x !== undefined && region.y !== undefined && region.width && region.height) {
      cx = region.x + region.width / 2;
      cy = region.y + region.height / 2;
    }

    return (
      <g key={log.id}>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={getSeverityColor(log.type_severity)}
          stroke="white"
          strokeWidth={2}
          className="pointer-events-none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="none"
          stroke={getSeverityColor(log.type_severity)}
          strokeWidth={1}
          opacity={0.5}
          className="pointer-events-none animate-pulse"
        />
      </g>
    );
  };

  const hoveredRegionData = regions.find(r => r.id === hoveredRegion);
  const hoveredRegionLogs = hoveredRegion ? getRegionLogs(hoveredRegion) : [];

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg
        viewBox="0 0 300 600"
        className="w-full h-auto"
        style={{ maxHeight: '600px' }}
      >
        {/* Body outline for context */}
        <g opacity={0.1}>
          <ellipse cx={150} cy={40} rx={30} ry={35} fill="hsl(var(--foreground))" />
          <rect x={120} y={75} width={60} height={150} rx={10} fill="hsl(var(--foreground))" />
          <rect x={120} y={225} width={25} height={235} rx={8} fill="hsl(var(--foreground))" />
          <rect x={155} y={225} width={25} height={235} rx={8} fill="hsl(var(--foreground))" />
          <rect x={85} y={95} width={20} height={165} rx={6} fill="hsl(var(--foreground))" />
          <rect x={195} y={95} width={20} height={165} rx={6} fill="hsl(var(--foreground))" />
        </g>

        {/* Clickable regions */}
        {regions.map(renderRegion)}

        {/* Injury markers */}
        {currentViewLogs.map(renderInjuryMarker)}
      </svg>

      {/* Tooltip */}
      {hoveredRegionData && (
        <div
          className="absolute z-10 bg-popover text-popover-foreground text-sm px-3 py-2 rounded-md shadow-lg border pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 10}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="font-medium">{hoveredRegionData.label}</p>
          {hoveredRegionLogs.length > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>{hoveredRegionLogs.length} injury log{hoveredRegionLogs.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {hoveredRegionLogs.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Click to record injury</p>
          )}
        </div>
      )}

      {/* View label */}
      <div className="text-center mt-2 text-sm text-muted-foreground font-medium">
        {viewType === 'front' ? 'Front View' : 'Back View'}
      </div>
    </div>
  );
};
