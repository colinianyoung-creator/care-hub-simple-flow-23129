
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  CheckSquare, 
  Pill, 
  FileText, 
  Calendar,
  Plus 
} from "lucide-react";

interface DashboardActionsProps {
  userRole: string;
}

export const DashboardActions = ({ userRole }: DashboardActionsProps) => {
  const canEditPreferences = userRole === 'disabled_person' || userRole === 'family_admin';
  
  const actions = [
    {
      title: "My Preferences",
      description: "Care plans and settings",
      icon: Settings,
      color: "bg-blue-500",
      disabled: !canEditPreferences,
      adminOnly: true
    },
    {
      title: "Tasks",
      description: "Manage care tasks",
      icon: CheckSquare,
      color: "bg-green-500",
      disabled: false,
      adminOnly: false
    },
    {
      title: "Medication Notes",
      description: "Track medications and reminders",
      icon: Pill,
      color: "bg-purple-500",
      disabled: false,
      adminOnly: false
    },
    {
      title: "Notes",
      description: "Care notes and observations",
      icon: FileText,
      color: "bg-orange-500",
      disabled: false,
      adminOnly: false
    },
    {
      title: "Appointments",
      description: "Schedule and manage appointments",
      icon: Calendar,
      color: "bg-pink-500",
      disabled: false,
      adminOnly: false
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Care Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center relative"
                disabled={action.disabled}
              >
                <div className={`p-2 rounded-full ${action.color} text-white mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
                {action.adminOnly && !canEditPreferences && (
                  <Badge className="absolute top-1 right-1 text-xs" variant="secondary">
                    Admin Only
                  </Badge>
                )}
                <Plus className="absolute top-2 left-2 w-4 h-4 opacity-50" />
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
