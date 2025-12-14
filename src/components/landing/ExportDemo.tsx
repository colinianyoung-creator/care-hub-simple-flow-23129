import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Check } from 'lucide-react';

const ExportDemo = () => {
  const [state, setState] = useState<'idle' | 'downloading' | 'complete'>('idle');

  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => {
        if (prev === 'idle') return 'downloading';
        if (prev === 'downloading') return 'complete';
        return 'idle';
      });
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Document Preview */}
      <div className="relative">
        <div className="w-28 h-36 bg-background rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center">
          <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
          <div className="text-xs font-medium">Timesheet</div>
          <div className="text-xs text-muted-foreground">Dec 2024</div>
        </div>
        
        {/* Download animation */}
        <div className={`absolute -bottom-2 -right-2 p-2 rounded-full transition-all duration-300 ${
          state === 'complete' 
            ? 'bg-green-500' 
            : state === 'downloading'
            ? 'bg-primary animate-pulse'
            : 'bg-muted'
        }`}>
          {state === 'complete' ? (
            <Check className="h-4 w-4 text-white animate-scale-in" />
          ) : (
            <Download className={`h-4 w-4 ${state === 'downloading' ? 'text-white animate-bounce' : 'text-muted-foreground'}`} />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="w-full space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Basic Hours</span>
          <span className="font-medium">32.5 hrs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Cover Hours</span>
          <span className="font-medium">8.0 hrs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Leave</span>
          <span className="font-medium">16.0 hrs</span>
        </div>
        <div className="h-px bg-border my-1" />
        <div className="flex justify-between text-xs font-medium">
          <span>Total</span>
          <span className="text-primary">56.5 hrs</span>
        </div>
      </div>
    </div>
  );
};

export default ExportDemo;
