import { Smartphone, Download, Wifi, Bell, Zap } from 'lucide-react';

const PWAInstallDemo = () => {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Smartphone className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Install CareHub</span>
        </div>
      </div>
      
      {/* Phone mockup with app icon */}
      <div className="flex justify-center">
        <div className="relative bg-background border-2 border-border rounded-xl p-3 w-24 shadow-sm">
          {/* App icon grid simulation */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="aspect-square bg-primary/20 rounded-lg flex items-center justify-center border-2 border-primary border-dashed">
              <Download className="h-3 w-3 text-primary" />
            </div>
            <div className="aspect-square bg-muted rounded-lg" />
          </div>
          {/* Home button */}
          <div className="mt-2 mx-auto w-6 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
      
      {/* Benefits */}
      <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-amber-500" />
          <span>Fast</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi className="h-3 w-3 text-green-500" />
          <span>Offline</span>
        </div>
        <div className="flex items-center gap-1">
          <Bell className="h-3 w-3 text-blue-500" />
          <span>Alerts</span>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallDemo;
