import React, { useState, useEffect } from 'react';

const injuries = [
  { x: 50, y: 25, label: 'Head', color: 'bg-yellow-500' },
  { x: 30, y: 45, label: 'Arm', color: 'bg-orange-500' },
  { x: 50, y: 55, label: 'Back', color: 'bg-red-500' },
  { x: 65, y: 75, label: 'Leg', color: 'bg-yellow-500' },
];

const BodyMapDemo = () => {
  const [visibleInjuries, setVisibleInjuries] = useState<number[]>([]);
  const [view, setView] = useState<'front' | 'back'>('front');

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleInjuries(prev => {
        if (prev.length >= injuries.length) {
          setView(v => v === 'front' ? 'back' : 'front');
          return [];
        }
        return [...prev, prev.length];
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* View Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            view === 'front' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Front
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            view === 'back' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Back
        </button>
      </div>
      
      {/* Body Silhouette */}
      <div className="relative w-24 h-40">
        {/* Simple body shape */}
        <svg viewBox="0 0 100 160" className="w-full h-full">
          {/* Head */}
          <circle cx="50" cy="20" r="15" className="fill-muted stroke-border stroke-2" />
          {/* Body */}
          <ellipse cx="50" cy="65" rx="25" ry="35" className="fill-muted stroke-border stroke-2" />
          {/* Arms */}
          <ellipse cx="20" cy="55" rx="8" ry="25" className="fill-muted stroke-border stroke-2" />
          <ellipse cx="80" cy="55" rx="8" ry="25" className="fill-muted stroke-border stroke-2" />
          {/* Legs */}
          <ellipse cx="38" cy="125" rx="10" ry="35" className="fill-muted stroke-border stroke-2" />
          <ellipse cx="62" cy="125" rx="10" ry="35" className="fill-muted stroke-border stroke-2" />
        </svg>
        
        {/* Injury Markers */}
        {injuries.map((injury, index) => (
          <div
            key={index}
            className={`absolute w-4 h-4 rounded-full ${injury.color} transition-all duration-500 ${
              visibleInjuries.includes(index) 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-0'
            }`}
            style={{
              left: `${injury.x}%`,
              top: `${injury.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {visibleInjuries.includes(index) && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-75" 
                style={{ backgroundColor: 'inherit' }} 
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex gap-2 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">Minor</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Severe</span>
        </div>
      </div>
    </div>
  );
};

export default BodyMapDemo;
