import React, { useState, useEffect } from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const shifts = [
  { day: 0, color: 'bg-blue-500', label: '9-5' },
  { day: 1, color: 'bg-blue-500', label: '9-5' },
  { day: 2, color: 'bg-yellow-500', label: 'Leave' },
  { day: 3, color: 'bg-blue-500', label: '9-5' },
  { day: 4, color: 'bg-cyan-500', label: 'Cover' },
  { day: 5, color: 'bg-blue-500', label: '10-4' },
  { day: 6, color: 'bg-red-500', label: 'Sick' },
];

const ScheduleDemo = () => {
  const [visibleShifts, setVisibleShifts] = useState<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleShifts(prev => {
        if (prev.length >= shifts.length) {
          return [];
        }
        return [...prev, prev.length];
      });
    }, 600);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground">
        {days.map(day => (
          <div key={day} className="font-medium">{day}</div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {shifts.map((shift, index) => (
          <div
            key={index}
            className={`h-12 rounded-md flex items-center justify-center text-xs font-medium transition-all duration-300 ${
              visibleShifts.includes(index)
                ? `${shift.color} text-white scale-100 opacity-100`
                : 'bg-muted scale-95 opacity-50'
            }`}
          >
            {visibleShifts.includes(index) && (
              <span className="animate-fade-in">{shift.label}</span>
            )}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs pt-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Basic</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-muted-foreground">Cover</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">Leave</span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDemo;
