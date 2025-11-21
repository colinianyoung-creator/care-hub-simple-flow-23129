import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, Download, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminMARDashboardProps {
  familyId: string;
}

interface Dose {
  dose_id: string;
  medication_id: string;
  medication_name: string;
  medication_dosage: string;
  due_date: string;
  due_time: string;
  status: string;
  given_by_id?: string;
  given_by_name?: string;
  administered_at?: string;
  note?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'given':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'refused':
      return <XCircle className="h-4 w-4 text-blue-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'missed':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { label: string; className: string }> = {
    given: { label: 'Given', className: 'bg-green-100 text-green-800 border-green-200' },
    refused: { label: 'Refused', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    missed: { label: 'Missed', className: 'bg-red-100 text-red-800 border-red-200' },
  };

  const variant = variants[status] || variants.pending;
  
  return (
    <Badge variant="outline" className={cn("font-medium", variant.className)}>
      <span className="flex items-center gap-1">
        {getStatusIcon(status)}
        {variant.label}
      </span>
    </Badge>
  );
};

export const AdminMARDashboard = ({ familyId }: AdminMARDashboardProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const loadDoses = async (date: Date = selectedDate) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_todays_mar_log', {
        _family_id: familyId,
        _date: format(date, 'yyyy-MM-dd'),
      });

      if (error) throw error;
      setDoses(data || []);
    } catch (error) {
      console.error('Error loading doses:', error);
      toast({
        title: "Error",
        description: "Failed to load medication doses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoses();
  }, [familyId, selectedDate]);

  const filterDoses = () => {
    switch (activeTab) {
      case 'today':
        return doses;
      case 'missed':
        return doses.filter(d => d.status === 'missed');
      case 'refused':
        return doses.filter(d => d.status === 'refused');
      default:
        return doses;
    }
  };

  const filteredDoses = filterDoses();
  const missedCount = doses.filter(d => d.status === 'missed').length;
  const refusedCount = doses.filter(d => d.status === 'refused').length;

  const handleExport = async () => {
    toast({
      title: "Export started",
      description: "Generating MAR report...",
    });
    // Export functionality would call the export-mar edge function
  };

  return (
    <div className="space-y-6">
      <div className={cn(
        "flex justify-between items-start gap-4",
        isMobile ? "flex-col" : "flex-row items-center"
      )}>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">MAR Administration Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor all medication administrations
          </p>
        </div>
        <div className={cn("flex gap-2", isMobile && "w-full flex-col")}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={isMobile ? "w-full" : ""}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, isMobile ? 'MMM d, yyyy' : 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size={isMobile ? "default" : "icon"}
            onClick={() => loadDoses()}
            disabled={loading}
            className={isMobile ? "w-full" : ""}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {isMobile && <span className="ml-2">Refresh</span>}
          </Button>
          <Button variant="outline" onClick={handleExport} className={isMobile ? "w-full" : ""}>
            <Download className={cn("h-4 w-4", !isMobile && "mr-2")} />
            {isMobile ? <span className="ml-2">Export</span> : "Export"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={isMobile ? "grid grid-cols-2 w-full" : ""}>
          <TabsTrigger value="all" className={isMobile ? "text-xs" : ""}>
            {isMobile ? "All" : "All Doses"}
          </TabsTrigger>
          <TabsTrigger value="today" className={isMobile ? "text-xs" : ""}>
            {isMobile ? "Today" : "Today"}
          </TabsTrigger>
          <TabsTrigger value="missed" className={isMobile ? "text-xs" : ""}>
            {isMobile ? <AlertCircle className="h-4 w-4" /> : "Missed"}
            {missedCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white text-xs">{missedCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="refused" className={isMobile ? "text-xs" : ""}>
            {isMobile ? <XCircle className="h-4 w-4" /> : "Refused"}
            {refusedCount > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white text-xs">{refusedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' && 'All Medication Doses'}
                {activeTab === 'today' && `Doses for ${format(selectedDate, 'MMMM d, yyyy')}`}
                {activeTab === 'missed' && 'Missed Doses'}
                {activeTab === 'refused' && 'Refused Doses'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading doses...
                </div>
              ) : filteredDoses.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No doses found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medication</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Due Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Given By</TableHead>
                        <TableHead>Administered</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDoses.map((dose) => (
                        <TableRow key={dose.dose_id}>
                          <TableCell className="font-medium">{dose.medication_name}</TableCell>
                          <TableCell>{dose.medication_dosage}</TableCell>
                          <TableCell>{format(new Date(`2000-01-01T${dose.due_time}`), 'h:mm a')}</TableCell>
                          <TableCell>{getStatusBadge(dose.status)}</TableCell>
                          <TableCell>{dose.given_by_name || '-'}</TableCell>
                          <TableCell>
                            {dose.administered_at 
                              ? format(new Date(dose.administered_at), 'h:mm a')
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{dose.note || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
