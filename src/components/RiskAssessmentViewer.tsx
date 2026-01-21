import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
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
  Loader2,
  Archive,
  ArchiveRestore 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface RiskAssessmentViewerProps {
  title: string;
  content: string;
  residualRiskLevel: string;
  isApproved: boolean;
  isArchived: boolean;
  nextReviewDate: string | null;
  onBack: () => void;
  onSave: (updates: {
    title: string;
    content: string;
    residualRiskLevel: string;
    isApproved: boolean;
    nextReviewDate: string | null;
  }) => Promise<void>;
  onArchive: (archive: boolean) => void;
  canEdit: boolean;
  isSaving: boolean;
}

export const RiskAssessmentViewer = ({
  title,
  content,
  residualRiskLevel,
  isApproved,
  isArchived,
  nextReviewDate,
  onBack,
  onSave,
  onArchive,
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

  const convertMarkdownToHtml = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="main-title">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Unordered lists
      .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // Wrap consecutive list items
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      // Paragraphs (lines that aren't already wrapped)
      .replace(/^(?!<[hul]|<li)(.+)$/gm, '<p>$1</p>')
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, '')
      // Line breaks
      .replace(/\n\n/g, '\n');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const rawHtmlContent = convertMarkdownToHtml(content);
      // Sanitize HTML content to prevent XSS attacks
      const htmlContent = DOMPurify.sanitize(rawHtmlContent, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
        ALLOWED_ATTR: ['class']
      });
      // Sanitize the title as well
      const safeTitle = DOMPurify.sanitize(title, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${safeTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1.main-title { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; font-size: 1.5rem; }
            h2 { color: #1f2937; font-size: 1.25rem; margin-top: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5em; }
            h3 { color: #374151; font-size: 1.1rem; margin-top: 1.25em; }
            h4 { color: #4b5563; font-size: 1rem; margin-top: 1em; }
            p { margin: 0.75em 0; color: #374151; }
            ul { padding-left: 24px; margin: 0.75em 0; }
            li { margin-bottom: 0.5em; color: #374151; }
            strong { color: #1f2937; }
            @media print { 
              body { padding: 0; } 
              h2 { page-break-before: auto; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
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
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onArchive(!isArchived)}
                    title={isArchived ? "Restore from archive" : "Archive"}
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </>
                    )}
                  </Button>
                  {!isArchived && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </>
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
            {isArchived && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <Archive className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            )}
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
          <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 p-6 rounded-lg border">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold text-foreground border-b border-border pb-2 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-semibold text-foreground mt-3 mb-2">{children}</h4>,
                p: ({ children }) => <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                table: ({ children }) => <table className="w-full border-collapse border border-border my-4">{children}</table>,
                th: ({ children }) => <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">{children}</th>,
                td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
