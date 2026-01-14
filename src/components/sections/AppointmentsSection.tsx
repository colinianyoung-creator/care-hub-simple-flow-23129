import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Calendar, Clock, MapPin, AlertCircle, Loader2, CalendarCheck, Archive } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isPast, isToday, isFuture } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  appointment_date: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  created_by: string;
}

interface AppointmentsSectionProps {
  familyId: string | undefined;
  userRole: string;
}

export const AppointmentsSection = ({ familyId, userRole }: AppointmentsSectionProps) => {
  const { t } = useTranslation();
  console.log('[AppointmentsSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('sectionsUI.appointments.emptyStates.noFamily')}
        </AlertDescription>
      </Alert>
    );
  }

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    appointment_date: '',
    appointment_time: '09:00',
    location: ''
  });

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    const appointmentDate = new Date(appointment.appointment_date);
    setNewAppointment({
      title: appointment.title,
      description: appointment.description || '',
      appointment_date: format(appointmentDate, 'yyyy-MM-dd'),
      appointment_time: format(appointmentDate, 'HH:mm'),
      location: appointment.location || ''
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingAppointment(null);
    setNewAppointment({
      title: '',
      description: '',
      appointment_date: '',
      appointment_time: '09:00',
      location: ''
    });
    setShowAddForm(false);
  };

  const loadAppointments = async (signal?: AbortSignal) => {
    try {
      if (!familyId) {
        console.error('No familyId provided to loadAppointments');
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('family_id', familyId)
        .order('appointment_date', { ascending: true })
        .abortSignal(signal);

      if (error) throw error;
      
      if (!error && data?.length === 0) {
        console.warn("⚠️ [AppointmentsSection] Empty result - likely RLS restriction or sync delay");
      }
      
      setAppointments(data as any || []);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading appointments:', error);
        toast({
          title: "Error loading appointments",
          description: "There was an error loading the appointments.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.title.trim() || !newAppointment.appointment_date) return;

    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please wait for authentication to complete",
        variant: "destructive",
      });
      return;
    }

    try {
      const appointmentDateTime = new Date(`${newAppointment.appointment_date}T${newAppointment.appointment_time}`);
      
      if (editingAppointment) {
        // Update existing appointment
        const { error } = await supabase
          .from('appointments')
          .update({
            title: newAppointment.title,
            description: newAppointment.description || null,
            appointment_date: appointmentDateTime.toISOString(),
            location: newAppointment.location || null
          })
          .eq('id', editingAppointment.id);

        if (error) throw error;

        toast({
          title: "Appointment updated",
          description: "The appointment has been updated successfully.",
        });
      } else {
        // Insert new appointment
        const { error } = await supabase
          .from('appointments')
          .insert([{
            family_id: familyId,
            title: newAppointment.title,
            description: newAppointment.description || null,
            appointment_date: appointmentDateTime.toISOString(),
            location: newAppointment.location || null,
            created_by: currentUserId
          }]);

        if (error) throw error;

        toast({
          title: "Appointment added",
          description: "The appointment has been added successfully.",
        });
      }

      handleCancelEdit();
      loadAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: "Error",
        description: "There was an error saving the appointment.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      loadAppointments();
      
      toast({
        title: "Appointment deleted",
        description: "The appointment has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error deleting appointment",
        description: "There was an error deleting the appointment.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    const loadData = async () => {
      setLoading(true);

      try {
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            abortController.abort();
            setLoading(false);
            console.warn("⏱️ [AppointmentsSection] load timeout after 8s");
          }
        }, 5000);

        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setCurrentUserId(user?.id || null);

        if (!cancelled) {
          await loadAppointments(abortController.signal);
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError' && !cancelled) {
          console.error('Unexpected error:', error);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
      abortController.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [familyId]);


  const getAppointmentStatus = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    if (isPast(appointmentDate) && !isToday(appointmentDate)) {
      return 'past';
    } else if (isToday(appointmentDate)) {
      return 'today';
    } else {
      return 'upcoming';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'today':
        return <Badge variant="default">Today</Badge>;
      case 'upcoming':
        return <Badge variant="outline">Upcoming</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const upcomingAppointments = appointments.filter(apt => getAppointmentStatus(apt) === 'upcoming' || getAppointmentStatus(apt) === 'today');
  const pastAppointments = appointments.filter(apt => getAppointmentStatus(apt) === 'past');


  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin w-4 h-4" />
              Loading appointments…
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Appointment Form */}
      {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Appointment title"
              value={newAppointment.title}
              onChange={(e) => setNewAppointment(prev => ({ ...prev, title: e.target.value }))}
            />
            
            <Textarea
              placeholder="Description (optional)"
              value={newAppointment.description}
              onChange={(e) => setNewAppointment(prev => ({ ...prev, description: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date:</label>
                <Input
                  type="date"
                  value={newAppointment.appointment_date}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, appointment_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time:</label>
                <Input
                  type="time"
                  value={newAppointment.appointment_time}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, appointment_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Location:</label>
              <Input
                placeholder="Location (optional)"
                value={newAppointment.location}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAddAppointment} 
                disabled={!newAppointment.title.trim() || !newAppointment.appointment_date || !currentUserId}
                className="h-12 md:h-10 px-4 py-3 md:px-6 md:py-2 min-h-[44px]"
              >
                {editingAppointment ? 'Update Appointment' : 'Add Appointment'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelEdit}
                className="h-12 md:h-10 px-4 py-3 md:px-6 md:py-2 min-h-[44px]"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : familyId ? (
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="add-button w-full h-12 md:h-10 text-sm md:text-base px-4 py-3 md:px-6 md:py-2 min-h-[44px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Appointment
        </Button>
      ) : null}

      {/* Tabs for Upcoming and Archive */}
      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            {isMobile ? <CalendarCheck className="h-5 w-5" /> : <><CalendarCheck className="h-4 w-4" /> Upcoming ({upcomingAppointments.length})</>}
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            {isMobile ? <Archive className="h-5 w-5" /> : <><Archive className="h-4 w-4" /> Archive ({pastAppointments.length})</>}
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Appointments Tab */}
        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No upcoming appointments</p>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="font-medium text-base leading-tight">{appointment.title}</h4>
                            {getStatusBadge(getAppointmentStatus(appointment))}
                          </div>
                          
                          {appointment.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{appointment.description}</p>
                          )}
                          
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span className="leading-tight">{format(new Date(appointment.appointment_date), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="leading-tight">{format(new Date(appointment.appointment_date), 'h:mm a')}</span>
                            </div>
                            {appointment.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="leading-tight">{appointment.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {appointment.notes && (
                            <p className="text-sm p-2 bg-muted rounded leading-relaxed">{appointment.notes}</p>
                          )}
                        </div>
                        
                        {familyId && (
                          <div className="flex flex-col md:flex-row gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAppointment(appointment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAppointment(appointment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive Tab (Past Appointments) */}
        <TabsContent value="archive" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {pastAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No past appointments</p>
              ) : (
                <div className="space-y-4">
                  {pastAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4 opacity-60">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="font-medium text-base leading-tight">{appointment.title}</h4>
                            {getStatusBadge(getAppointmentStatus(appointment))}
                          </div>
                          
                          {appointment.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{appointment.description}</p>
                          )}
                          
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span className="leading-tight">{format(new Date(appointment.appointment_date), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="leading-tight">{format(new Date(appointment.appointment_date), 'h:mm a')}</span>
                            </div>
                            {appointment.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="leading-tight">{appointment.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Archive is READ-ONLY - only show delete for cleanup */}
                        {familyId && (userRole === 'family_admin' || userRole === 'disabled_person') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAppointment(appointment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};