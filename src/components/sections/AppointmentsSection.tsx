import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Clock, MapPin, AlertCircle, Loader2 } from "lucide-react";
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
  console.log('[AppointmentsSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please connect to a family to access appointments.
        </AlertDescription>
      </Alert>
    );
  }

  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    appointment_date: '',
    appointment_time: '09:00',
    duration_minutes: 60,
    location: '',
    notes: ''
  });

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
      
      const { error } = await supabase
        .from('appointments')
        .insert([{
          family_id: familyId,
          title: newAppointment.title,
          description: newAppointment.description || null,
          appointment_date: appointmentDateTime.toISOString(),
          duration_minutes: newAppointment.duration_minutes,
          location: newAppointment.location || null,
          notes: newAppointment.notes || null,
          created_by: currentUserId
        }]);

      if (error) throw error;

      setNewAppointment({
        title: '',
        description: '',
        appointment_date: '',
        appointment_time: '09:00',
        duration_minutes: 60,
        location: '',
        notes: ''
      });
      setShowAddForm(false);
      loadAppointments();
      
      toast({
        title: "Appointment added",
        description: "The appointment has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast({
        title: "Error adding appointment",
        description: "There was an error adding the appointment.",
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
            <CardTitle>Add New Appointment</CardTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Duration (minutes):</label>
                <Input
                  type="number"
                  value={newAppointment.duration_minutes}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location:</label>
                <Input
                  placeholder="Location (optional)"
                  value={newAppointment.location}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            <Textarea
              placeholder="Notes (optional)"
              value={newAppointment.notes}
              onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
            />

            <div className="flex gap-2">
              <Button 
                onClick={handleAddAppointment} 
                disabled={!newAppointment.title.trim() || !newAppointment.appointment_date || !currentUserId}
                className="h-12 md:h-10 px-4 py-3 md:px-6 md:py-2 min-h-[44px]"
              >
                Add Appointment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
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

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments ({upcomingAppointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No upcoming appointments</p>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="appointment-content">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{appointment.title}</h4>
                      {getStatusBadge(getAppointmentStatus(appointment))}
                    </div>
                    
                    {appointment.description && (
                      <p className="text-sm text-muted-foreground mb-2">{appointment.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(appointment.appointment_date), 'h:mm a')}
                        <span>({appointment.duration_minutes} min)</span>
                      </div>
                      {appointment.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {appointment.location}
                        </div>
                      )}
                    </div>
                    
                    {appointment.notes && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded">{appointment.notes}</p>
                    )}
                  </div>
                  
                  {familyId && (
                    <div className="mobile-button-stack md:absolute md:top-4 md:right-4 md:mt-0 md:border-t-0 md:pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAppointment(appointment.id)}
                        className="mobile-section-button md:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Appointments ({pastAppointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 space-y-3 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{appointment.title}</h4>
                        {getStatusBadge(getAppointmentStatus(appointment))}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                    
                    {familyId && (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};