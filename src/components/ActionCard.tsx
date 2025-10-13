import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "warm" | "outline" | "success";
  disabled?: boolean;
  loading?: boolean;
}

export const ActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick,
  variant = "outline",
  disabled = false,
  loading = false
}: ActionCardProps) => {
  return (
    <Card className="card-interactive h-full">
      <CardContent className="p-0 h-full">
        <Button
          onClick={onClick}
          variant={variant}
          disabled={disabled || loading}
          className={cn(
            "w-full h-full min-h-[120px] flex-col space-y-3 p-6 text-left justify-start",
            "hover:shadow-elevated hover:-translate-y-1 transition-all duration-200"
          )}
        >
          <div className="p-3 bg-care-primary/10 rounded-lg w-fit">
            <Icon className="w-6 h-6 text-care-primary" />
          </div>
          <div className="space-y-1 text-left w-full">
            <h3 className="font-semibold text-base leading-tight">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};