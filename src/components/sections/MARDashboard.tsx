import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DoseCard } from "@/components/DoseCard";
import { DoseActionModal } from "@/components/DoseActionModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, Calendar as CalendarListIcon, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MARDashboardProps {
  familyId: string;
  userRole: string;
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

interface GroupedDoses {
  [medicationId: string]: {
    name: string;
    dosage: string;
    doses: Dose[];
  };
}

export const MARDashboard = ({ familyId, userRole }: MARDashboardProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [doses, setDoses] = useState<Dose[]>([]);
  const [archiveDoses, setArchiveDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedDose, setSelectedDose] = useState<Dose | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<string>("all");

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

  const loadArchiveDoses = async () => {
    setArchiveLoading(true);
    try {
      const { data, error } = await supabase
        .from('mar_doses')
        .select(`
          id,
          due_date,
          due_time,
          status,
          administered_at,
          note,
          given_by,
          medication_id,
          medications!inner(name, dosage),
          profiles!mar_doses_given_by_fkey(full_name)
        `)
        .eq('family_id', familyId)
        .lt('due_date', format(new Date(), 'yyyy-MM-dd'))
        .order('due_date', { ascending: false })
        .order('due_time', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((d: any) => ({
        dose_id: d.id,
        medication_id: d.medication_id,
        medication_name: d.medications?.name || 'Unknown',
        medication_dosage: d.medications?.dosage || '',
        due_date: d.due_date,
        due_time: d.due_time,
        status: d.status,
        given_by_id: d.given_by,
        given_by_name: d.profiles?.full_name,
        administered_at: d.administered_at,
        note: d.note,
      }));

      setArchiveDoses(formatted);
    } catch (error) {
      console.error('Error loading archive doses:', error);
      toast({
        title: "Error",
        description: "Failed to load archived doses",
        variant: "destructive",
      });
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    loadDoses();
  }, [familyId, selectedDate]);

  const groupedDoses: GroupedDoses = doses.reduce((acc, dose) => {
    if (!acc[dose.medication_id]) {
      acc[dose.medication_id] = {
        name: dose.medication_name,
        dosage: dose.medication_dosage,
        doses: [],
      };
    }
    acc[dose.medication_id].doses.push(dose);
    return acc;
  }, {} as GroupedDoses);

  const handleDoseClick = (dose: Dose) => {
    if (dose.status !== 'pending') {
      // View only for non-pending doses
      toast({
        title: dose.medication_name,
        description: `Status: ${dose.status}${dose.note ? `\nNote: ${dose.note}` : ''}`,
      });
      return;
    }
    setSelectedDose(dose);
    setModalOpen(true);
  };

  const handleMarkGiven = async (dose: Dose) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('mark_dose', {
        _dose_id: dose.dose_id,
        _new_status: 'given',
        _carer_id: user.id,
        _note: null
      });

      if (error) throw error;

      toast({
        title: "Dose recorded",
        description: `${dose.medication_name} marked as given`,
      });

      loadDoses(selectedDate);
    } catch (error: any) {
      console.error('Error marking dose:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record dose",
        variant: "destructive",
      });
    }
  };

  const handleMarkRefused = (dose: Dose) => {
    setSelectedDose(dose);
    setModalOpen(true);
  };

  const stats = {
    total: doses.length,
    given: doses.filter(d => d.status === 'given').length,
    pending: doses.filter(d => d.status === 'pending').length,
    missed: doses.filter(d => d.status === 'missed').length,
    refused: doses.filter(d => d.status === 'refused').length,
  };

  const filteredArchiveDoses = archiveDoses.filter(dose => {
    if (archiveFilter === "all") return true;
    if (archiveFilter === "missed") return dose.status === "missed";
    if (archiveFilter === "refused") return dose.status === "refused";
    return true;
  });

  // Group archive doses by date
  const groupedArchiveDoses = filteredArchiveDoses.reduce((acc, dose) => {
    const date = dose.due_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(dose);
    return acc;
  }, {} as Record<string, Dose[]>);

  return (
    <div className="space-y-6">
      <div className={cn(
        "flex justify-between items-start gap-4",
        isMobile ? "flex-col" : "flex-row items-center"
      )}>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Medication Administration Record</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track and record medication doses
          </p>
        </div>
        <div className={cn("flex gap-2", isMobile && "w-full")}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", isMobile && "flex-1")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, isMobile ? 'MMM d' : 'PPP')}
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
            size="icon"
            onClick={() => loadDoses()}
            disabled={loading}
            title="Refresh doses"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-2" : "md:grid-cols-5")}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Doses</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">{stats.given}</div>
            <p className="text-xs text-green-600">Given</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
            <p className="text-xs text-yellow-600">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-700">{stats.missed}</div>
            <p className="text-xs text-red-600">Missed</p>
          </CardContent>
        </Card>
        <Card className={cn("border-blue-200 bg-blue-50", isMobile && "col-span-2")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">{stats.refused}</div>
            <p className="text-xs text-blue-600">Refused</p>
          </CardContent>
        </Card>
      </div>

      {/* Doses by Medication */}
      <Tabs defaultValue="today" className="w-full" onValueChange={(val) => val === "archive" && loadArchiveDoses()}>
        <TabsList className={cn("grid w-full grid-cols-2", isMobile && "h-12")}>
          <TabsTrigger value="today" className={cn("flex items-center gap-2", isMobile && "min-h-[44px]")}>
            {isMobile ? <CalendarListIcon className="h-5 w-5" /> : <><CalendarListIcon className="h-4 w-4" /> Today's Schedule</>}
          </TabsTrigger>
          <TabsTrigger value="archive" className={cn("flex items-center gap-2", isMobile && "min-h-[44px]")}>
            {isMobile ? <Archive className="h-5 w-5" /> : <><Archive className="h-4 w-4" /> Archive</>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading doses...
              </CardContent>
            </Card>
          ) : Object.keys(groupedDoses).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No doses scheduled for {format(selectedDate, 'MMMM d, yyyy')}
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedDoses).map(([medId, med]) => (
              <Card key={medId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{med.name}</h3>
                      <p className="text-sm text-muted-foreground font-normal">{med.dosage}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn("grid gap-3", isMobile ? "grid-cols-1 gap-4" : "md:grid-cols-2 lg:grid-cols-4")}>
                    {med.doses.map((dose) => (
                      <DoseCard
                        key={dose.dose_id}
                        dueTime={dose.due_time}
                        status={dose.status as any}
                        givenBy={dose.given_by_name}
                        administeredAt={dose.administered_at}
                        note={dose.note}
                        onClick={() => handleDoseClick(dose)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="archive" className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Past Doses</h3>

          {archiveLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading archive...
              </CardContent>
            </Card>
          ) : Object.keys(groupedArchiveDoses).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No archived doses found
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedArchiveDoses).map(([date, dateDoses]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-4")}>
                    {dateDoses.map((dose) => (
                      <DoseCard
                        key={dose.dose_id}
                        dueTime={dose.due_time}
                        status={dose.status as any}
                        givenBy={dose.given_by_name}
                        administeredAt={dose.administered_at}
                        note={dose.note}
                        onClick={() => {
                          toast({
                            title: dose.medication_name,
                            description: `${dose.medication_dosage} at ${dose.due_time}\nStatus: ${dose.status}${dose.note ? `\nNote: ${dose.note}` : ''}`,
                          });
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dose Action Modal */}
      {selectedDose && (
        <DoseActionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          dose={{
            id: selectedDose.dose_id,
            medicationName: selectedDose.medication_name,
            dosage: selectedDose.medication_dosage,
            dueTime: selectedDose.due_time,
            status: selectedDose.status,
          }}
          onSuccess={() => loadDoses()}
        />
      )}
    </div>
  );
};
