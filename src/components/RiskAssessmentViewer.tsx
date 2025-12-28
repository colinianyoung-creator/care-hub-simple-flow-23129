import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Copy, 
  Printer, 
  CheckCircle,
  Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RiskAssessmentViewerProps {
  title: string;
  content: string;
  residualRiskLevel: string;
  isApproved: boolean;
  nextReviewDate: string | null;
  onBack: () => void;
  onSave: (updates: {
    title: string;
    content: string;
    residualRiskLevel: string;
    isApproved: boolean;
    nextReviewDate: string | null;
  }) => Promise<void>;
  canEdit: boolean;
  isSaving: boolean;
}

export const RiskAssessmentViewer = ({
  title,
  content,
  residualRiskLevel,
  isApproved,
  nextReviewDate,
  onBack,
  onSave,
  canEdit,
  isSaving
}: RiskAssessmentViewerProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content);
  const [editRiskLevel, setEditRiskLevel] = useState(residualRiskLevel);
  const [editApproved, setEditApproved] = useState(isApproved);
  const [editReviewDate, setEditReviewDate] = useState(nextReviewDate || '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Risk assessment copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2, h3 { color: #374151; margin-top: 1.5em; }
            ul { padding-left: 20px; }
            li { margin-bottom: 0.5em; }
            .disclaimer { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${content.replace(/\n/g, '<br>').replace(/#{1,6}\s/g, '<h3>').replace(/<h3>(.+?)(<br>|$)/g, '<h3>$1</h3>')}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSave = async () => {
    await onSave({
      title: editTitle,
      content: editContent,
      residualRiskLevel: editRiskLevel,
      isApproved: editApproved,
      nextReviewDate: editReviewDate || null
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(title);
    setEditContent(content);
    setEditRiskLevel(residualRiskLevel);
    setEditApproved(isApproved);
    setEditReviewDate(nextReviewDate || '');
    setIsEditing(false);
  };

  const getRiskBadgeClass = (level: string) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-2 flex-wrap">
          {!isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </>
          )}
          {isEditing && (
            <>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status badges and controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {isEditing ? (
          <>
            <div className="flex items-center gap-2">
              <Label htmlFor="riskLevel" className="text-sm">Risk Level:</Label>
              <Select value={editRiskLevel} onValueChange={setEditRiskLevel}>
                <SelectTrigger id="riskLevel" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="reviewDate" className="text-sm">Review by:</Label>
              <Input
                id="reviewDate"
                type="date"
                value={editReviewDate}
                onChange={(e) => setEditReviewDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              variant={editApproved ? "default" : "outline"}
              size="sm"
              onClick={() => setEditApproved(!editApproved)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {editApproved ? "Approved" : "Mark Approved"}
            </Button>
          </>
        ) : (
          <>
            <Badge className={getRiskBadgeClass(residualRiskLevel)}>
              {residualRiskLevel.charAt(0).toUpperCase() + residualRiskLevel.slice(1)} Residual Risk
            </Badge>
            {isApproved && (
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
            {nextReviewDate && (
              <Badge variant="outline">
                Review by: {new Date(nextReviewDate).toLocaleDateString()}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Title and content */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editTitle">Title</Label>
            <Input
              id="editTitle"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editContent">Assessment Content</Label>
            <Textarea
              id="editContent"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};
