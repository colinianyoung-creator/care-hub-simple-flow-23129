import { FileBarChart, Sparkles, Calendar, Download } from 'lucide-react';

const AIReportsDemo = () => {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileBarChart className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">AI Reports</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded-full">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-primary font-medium">AI Powered</span>
        </div>
      </div>
      
      {/* Report preview */}
      <div className="bg-background/60 rounded-md p-2 border border-border/50 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium">Weekly Care Summary</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>7 days</span>
          </div>
        </div>
        
        {/* Simulated report content */}
        <div className="space-y-1">
          <div className="h-2 bg-muted/50 rounded w-full" />
          <div className="h-2 bg-muted/50 rounded w-4/5" />
          <div className="h-2 bg-muted/50 rounded w-3/4" />
        </div>
        
        <div className="pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="font-medium">Highlights:</span>
          </div>
          <ul className="text-[10px] text-muted-foreground space-y-0.5 mt-0.5">
            <li>• 12 care notes recorded</li>
            <li>• Medication compliance: 98%</li>
            <li>• Mood trend: Stable</li>
          </ul>
        </div>
      </div>
      
      {/* Generate button hint */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-primary">
        <Download className="h-3 w-3" />
        <span>Generate &amp; export reports</span>
      </div>
    </div>
  );
};

export default AIReportsDemo;
