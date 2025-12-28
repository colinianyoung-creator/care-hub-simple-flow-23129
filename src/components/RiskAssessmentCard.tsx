import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, CheckCircle, Calendar } from "lucide-react";
import { format } from "date-fns";

interface RiskAssessment {
  id: string;
  title: string;
  activity: string;
  setting: string;
  location: string;
  residual_risk_level: string | null;
  is_approved: boolean;
  next_review_date: string | null;
  created_at: string;
}

interface RiskAssessmentCardProps {
  assessment: RiskAssessment;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export const RiskAssessmentCard = ({ 
  assessment, 
  onView, 
  onDelete,
  canDelete 
}: RiskAssessmentCardProps) => {
  const getRiskBadgeVariant = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRiskBadgeClass = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return '';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {assessment.title}
          </CardTitle>
          <div className="flex gap-1 flex-shrink-0">
            {assessment.is_approved && (
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
            {assessment.residual_risk_level && (
              <Badge 
                variant={getRiskBadgeVariant(assessment.residual_risk_level)}
                className={getRiskBadgeClass(assessment.residual_risk_level)}
              >
                {assessment.residual_risk_level.charAt(0).toUpperCase() + assessment.residual_risk_level.slice(1)} Risk
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Activity:</strong> {assessment.activity}</p>
          <p><strong>Setting:</strong> {assessment.setting}</p>
          <p><strong>Location:</strong> {assessment.location}</p>
          <p><strong>Created:</strong> {format(new Date(assessment.created_at), 'dd MMM yyyy')}</p>
          {assessment.next_review_date && (
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <strong>Review by:</strong> {format(new Date(assessment.next_review_date), 'dd MMM yyyy')}
            </p>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onView(assessment.id)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          {canDelete && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDelete(assessment.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
