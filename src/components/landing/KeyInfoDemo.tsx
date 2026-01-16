import { Users, Phone, AlertTriangle, FileText } from 'lucide-react';

const KeyInfoDemo = () => {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Key Information</span>
        </div>
      </div>
      
      {/* Info cards grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-background/60 rounded-md p-2 border border-border/50">
          <div className="flex items-center gap-1 mb-1">
            <Phone className="h-3 w-3 text-blue-500" />
            <span className="text-[10px] font-medium">Emergency</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Dr. Smith</p>
          <p className="text-[10px] text-muted-foreground">020 1234 5678</p>
        </div>
        
        <div className="bg-background/60 rounded-md p-2 border border-border/50">
          <div className="flex items-center gap-1 mb-1">
            <Phone className="h-3 w-3 text-green-500" />
            <span className="text-[10px] font-medium">Family</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Jane Doe</p>
          <p className="text-[10px] text-muted-foreground">079 8765 4321</p>
        </div>
      </div>
      
      {/* Risk assessment card */}
      <div className="bg-amber-500/10 rounded-md p-2 border border-amber-500/20">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          <span className="text-[10px] font-medium text-amber-700">Risk Assessment</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">Falls risk - moderate</p>
      </div>
      
      {/* Documents hint */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <FileText className="h-3 w-3" />
        <span>Medical history, care plan, and more...</span>
      </div>
    </div>
  );
};

export default KeyInfoDemo;
