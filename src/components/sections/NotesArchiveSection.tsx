import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Heart, Frown, Meh, Smile, Laugh, Trash2 } from "lucide-react";
import { format, subDays, addDays, startOfDay, endOfDay } from 'date-fns';

interface CareNote {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  activity_support?: string;
  activity_tags?: string[];
  observations?: string;
  outcome_response?: string;
  next_steps?: string;
  mood?: string;
  eating_drinking?: string;
  eating_drinking_notes?: string;
  bathroom_usage?: string;
  incidents?: string;
  is_incident?: boolean;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface NotesArchiveSectionProps {
  familyId: string;
  userRole: string;
  currentUserId: string | null;
}

export const NotesArchiveSection = ({ familyId, userRole, currentUserId }: NotesArchiveSectionProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadNotesForDate = async (date: Date) => {
    try {
      if (!familyId) return;

      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const { data, error } = await supabase
        .from('care_notes')
        .select('*')
        .eq('family_id', familyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profile names for authors using safe profile lookup
      const notesWithProfiles = await Promise.all(
        (data || []).map(async (note) => {
          let authorProfile = null;
          
          try {
            const { data: profileData } = await supabase
              .rpc('get_profile_safe', { profile_user_id: note.author_id });
            authorProfile = profileData && profileData.length > 0 ? 
              { full_name: profileData[0].full_name || 'Unknown User' } : null;
          } catch (profileError) {
            console.warn('Failed to load author profile:', profileError);
          }

          return {
            ...note,
            profiles: authorProfile
          };
        })
      );

      setNotes(notesWithProfiles);
    } catch (error) {
      console.error('Error loading notes for date:', error);
      toast({
        title: "Error loading notes",
        description: "There was an error loading the care notes for this date.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('care_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      loadNotesForDate(selectedDate);
      
      toast({
        title: "Note deleted",
        description: "The care note has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error deleting note",
        description: "There was an error deleting the care note.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadNotesForDate(selectedDate);
  }, [familyId, selectedDate]);

  const canDeleteNote = (note: CareNote) => {
    return note.author_id === currentUserId || userRole === 'family_admin' || userRole === 'disabled_person';
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return <Smile className="h-4 w-4 text-green-500" />;
      case 'calm': return <Meh className="h-4 w-4 text-blue-500" />;
      case 'upset': return <Frown className="h-4 w-4 text-red-500" />;
      case 'anxious': return <Heart className="h-4 w-4 text-orange-500" />;
      case 'tired': return <Meh className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <CardTitle className="text-lg">
                {format(selectedDate, 'MMMM d, yyyy')}
              </CardTitle>
              {!isToday && (
                <Button variant="link" size="sm" onClick={goToToday}>
                  Go to today
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Notes for Selected Date */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Loading notes...</p>
            </CardContent>
          </Card>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No care notes for {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className={note.is_incident ? "border-red-200" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {note.profiles?.full_name || 'Unknown User'}
                      </p>
                      {note.is_incident && (
                        <Badge variant="destructive" className="text-xs">Incident</Badge>
                      )}
                      {note.mood && getMoodIcon(note.mood)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), 'h:mm a')}
                    </p>
                  </div>
                  {canDeleteNote(note) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Activity and Tags */}
                {note.activity_support && (
                  <div>
                    <h4 className="text-sm font-medium">Activity/Support</h4>
                    <p className="text-sm">{note.activity_support}</p>
                    {note.activity_tags && note.activity_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.activity_tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))
                      }
                      </div>
                    )}
                  </div>
                )}

                {/* Other sections remain the same as in original NotesSection */}
                {note.observations && (
                  <div>
                    <h4 className="text-sm font-medium">Observations</h4>
                    <p className="text-sm">{note.observations}</p>
                  </div>
                )}

                {note.outcome_response && (
                  <div>
                    <h4 className="text-sm font-medium">Outcome</h4>
                    <p className="text-sm">{note.outcome_response}</p>
                  </div>
                )}

                {note.next_steps && (
                  <div>
                    <h4 className="text-sm font-medium">Next Steps</h4>
                    <p className="text-sm">{note.next_steps}</p>
                  </div>
                )}

                {/* Wellbeing Trackers */}
                {(note.mood || note.eating_drinking || note.bathroom_usage) && (
                  <div className="border-t pt-2">
                    <h4 className="text-sm font-medium mb-2">Wellbeing</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {note.mood && (
                        <div className="flex items-center gap-1">
                          {getMoodIcon(note.mood)}
                          <span className="capitalize">{note.mood}</span>
                        </div>
                      )}
                      {note.eating_drinking && (
                        <div>
                          <span className="font-medium">Eating:</span> {note.eating_drinking?.replace('_', ' ') || note.eating_drinking}
                          {note.eating_drinking_notes && <span> - {note.eating_drinking_notes}</span>}
                        </div>
                      )}
                      {note.bathroom_usage && (
                        <div>
                          <span className="font-medium">Bathroom:</span> {note.bathroom_usage}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Incidents */}
                {note.is_incident && note.incidents && (
                  <div className="border-t pt-2 border-red-200">
                    <h4 className="text-sm font-medium text-red-600">Incident Details</h4>
                    <p className="text-sm">{note.incidents}</p>
                  </div>
                )}

                {/* Fallback for old notes */}
                {!note.activity_support && note.content && (
                  <div>
                    <h4 className="text-sm font-medium">Note</h4>
                    <p className="text-sm">{note.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
