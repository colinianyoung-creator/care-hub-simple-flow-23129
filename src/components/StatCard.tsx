import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "success" | "accent" | "secondary";
  description?: string;
  trend?: "up" | "down" | "neutral";
}

const colorVariants = {
  primary: "text-care-primary bg-care-primary/10",
  success: "text-care-success bg-care-success/10", 
  accent: "text-care-accent bg-care-accent/10",
  secondary: "text-care-secondary bg-care-secondary/10"
};

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "primary", 
  description,
  trend 
}: StatCardProps) => {
  return (
    <Card className="hover:shadow-warm transition-all duration-200 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {trend && (
                <span className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-care-success",
                  trend === "down" && "text-destructive", 
                  trend === "neutral" && "text-muted-foreground"
                )}>
                  {trend === "up" && "↗"} 
                  {trend === "down" && "↘"}
                  {trend === "neutral" && "→"}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", colorVariants[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};