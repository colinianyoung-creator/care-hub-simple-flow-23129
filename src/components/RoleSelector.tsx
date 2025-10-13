import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Heart } from "lucide-react";

interface RoleSelectorProps {
  onRoleSelect: (role: 'carer' | 'family') => void;
}

export const RoleSelector = ({ onRoleSelect }: RoleSelectorProps) => {
  return (
    <div className="min-h-screen bg-[var(--gradient-soft)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[var(--gradient-primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Care Hub</h1>
          <p className="text-muted-foreground">Choose your role to continue</p>
        </div>

        <div className="space-y-4">
          <Card className="p-0 overflow-hidden shadow-[var(--shadow-card)]">
            <Button
              variant="ghost"
              className="w-full h-auto p-6 flex-col gap-4 hover:bg-care-primary-light/50 transition-all duration-200"
              onClick={() => onRoleSelect('carer')}
            >
              <div className="w-12 h-12 bg-care-primary rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">I'm a Carer</h3>
                <p className="text-sm text-muted-foreground">Log hours, complete tasks, add notes</p>
              </div>
            </Button>
          </Card>

          <Card className="p-0 overflow-hidden shadow-[var(--shadow-card)]">
            <Button
              variant="ghost"
              className="w-full h-auto p-6 flex-col gap-4 hover:bg-care-secondary/50 transition-all duration-200"
              onClick={() => onRoleSelect('family')}
            >
              <div className="w-12 h-12 bg-care-accent rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">I'm Family/Admin</h3>
                <p className="text-sm text-muted-foreground">Manage tasks, view reports, set rates</p>
              </div>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};