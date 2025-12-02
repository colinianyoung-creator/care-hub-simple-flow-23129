import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, FileText, Copy, Download, Save, Trash2, Loader2, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { canViewOnly, canManage } from '@/lib/permissions';

interface AIReportsSectionProps {
  familyId?: string;
  userRole: string;
  careRecipientName?: string;
}

interface SavedReport {
  id: string;
  care_recipient_name: string;
  report_text: string;
  date_range_start: string;
  date_range_end: string;
  created_at: string;
  report_type: string;
}

export const AIReportsSection = ({ familyId, userRole, careRecipientName }: AIReportsSectionProps) => {
  const [activeTab, setActiveTab] = useState('generate');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [reportMetadata, setReportMetadata] = useState<any>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [familyName, setFamilyName] = useState(careRecipientName || '');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (familyId) {
      loadFamilyName();
      loadSavedReports();
    }
  }, [familyId]);

  const loadFamilyName = async () => {
    if (!familyId) return;
    
    // Try to get care recipient name first
    const { data: careRecipient } = await supabase
      .from('care_recipients')
      .select('name')
      .eq('family_id', familyId)
      .limit(1)
      .single();
    
    if (careRecipient?.name) {
      setFamilyName(careRecipient.name);
      return;
    }
    
    // Fallback to family name
    const { data: family } = await supabase
      .from('families')
      .select('name')
      .eq('id', familyId)
      .single();
    
    if (family?.name) {
      setFamilyName(family.name.replace("'s Care Space", ''));
    }
  };

  const loadSavedReports = async () => {
    if (!familyId) return;
    setLoadingSaved(true);
    
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading saved reports:', error);
    } else {
      setSavedReports(data || []);
    }
    setLoadingSaved(false);
  };

  const handleGenerateReport = async () => {
    if (!familyId) {
      toast({
        title: 'Error',
        description: 'No family selected',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedReport(null);
    setReportMetadata(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          familyId,
          dateRangeStart: format(startDate, 'yyyy-MM-dd'),
          dateRangeEnd: format(endDate, 'yyyy-MM-dd'),
          careRecipientName: familyName || 'Care Recipient',
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedReport(data.report);
      setReportMetadata(data.metadata);
      
      toast({
        title: 'Report Generated',
        description: 'Your care report has been generated successfully.',
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const text = selectedReport?.report_text || generatedReport;
    if (!text) return;
    
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Report copied to clipboard',
    });
  };

  const handleDownloadPDF = () => {
    const text = selectedReport?.report_text || generatedReport;
    if (!text) return;
    
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Please allow pop-ups to download the report',
        variant: 'destructive',
      });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Care Report - ${familyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 24px; }
          p { color: #4b5563; }
          hr { margin: 20px 0; border: none; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        ${text.replace(/\n/g, '<br>').replace(/## /g, '<h2>').replace(/# /g, '<h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSaveReport = async () => {
    if (!familyId || !generatedReport) return;
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from('reports').insert({
      family_id: familyId,
      care_recipient_name: familyName || 'Care Recipient',
      report_text: generatedReport,
      date_range_start: format(startDate, 'yyyy-MM-dd'),
      date_range_end: format(endDate, 'yyyy-MM-dd'),
      created_by: user.user.id,
      report_type: 'care_summary',
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save report',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Report saved successfully',
      });
      loadSavedReports();
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete report',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Report deleted successfully',
      });
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
      loadSavedReports();
    }
  };

  const isReadOnly = canViewOnly(userRole);

  if (!familyId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Join a family to generate AI reports</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            {isMobile ? <Sparkles className="h-4 w-4" /> : <><Sparkles className="h-4 w-4" /> Generate</>}
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            {isMobile ? <FileText className="h-4 w-4" /> : <><FileText className="h-4 w-4" /> Saved Reports</>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          {!isReadOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generate Care Report</CardTitle>
                <CardDescription>
                  Create a professional care summary report using AI based on your logged care data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !startDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !endDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Person Supported:</span> {familyName || 'Loading...'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Report will include: Care Notes, Body Logs, Diet Entries, Medication Records, Tasks
                  </p>
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || !startDate || !endDate}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyzing care data and generating report...</p>
                  <p className="text-xs text-muted-foreground">This may take a few moments</p>
                </div>
              </CardContent>
            </Card>
          )}

          {generatedReport && !isGenerating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Generated Report</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                      <Copy className="h-4 w-4 mr-1" />
                      {!isMobile && 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                      <Download className="h-4 w-4 mr-1" />
                      {!isMobile && 'Print/PDF'}
                    </Button>
                    <Button variant="default" size="sm" onClick={handleSaveReport}>
                      <Save className="h-4 w-4 mr-1" />
                      {!isMobile && 'Save'}
                    </Button>
                  </div>
                </div>
                {reportMetadata && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{reportMetadata.careNotesCount} Care Notes</Badge>
                    <Badge variant="secondary">{reportMetadata.bodyLogsCount} Body Logs</Badge>
                    <Badge variant="secondary">{reportMetadata.dietEntriesCount} Diet Entries</Badge>
                    <Badge variant="secondary">{reportMetadata.marDosesCount} MAR Records</Badge>
                    <Badge variant="secondary">{reportMetadata.tasksCount} Tasks</Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    {generatedReport}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {loadingSaved ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : savedReports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No saved reports yet</p>
                {!isReadOnly && <p className="text-sm mt-1">Generate a report and save it to view it here</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {savedReports.map((report) => (
                <Card
                  key={report.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/50',
                    selectedReport?.id === report.id && 'ring-2 ring-primary'
                  )}
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{report.care_recipient_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(report.date_range_start), 'dd MMM yyyy')} - {format(new Date(report.date_range_end), 'dd MMM yyyy')}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(report.created_at), 'dd MMM yyyy, HH:mm')}
                        </div>
                      </div>
                      {canManage(userRole) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(report.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedReport && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Report Details</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                      <Copy className="h-4 w-4 mr-1" />
                      {!isMobile && 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                      <Download className="h-4 w-4 mr-1" />
                      {!isMobile && 'Print/PDF'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    {selectedReport.report_text}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
