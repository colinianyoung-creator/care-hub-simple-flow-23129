import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Heart, Frown, Meh, Smile, Archive, AlertCircle, Loader2, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfDay, endOfDay } from 'date-fns';
import { NotesArchiveSection } from './NotesArchiveSection';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sanitizeError } from "@/lib/errorHandler";
import { BodyMapTracker } from '@/components/BodyMapTracker';
import UnifiedNoteForm from '@/components/forms/UnifiedNoteForm';
import { IncidentReportSummary } from '@/components/IncidentReportSummary';

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

interface NotesSectionProps {
  familyId: string | undefined;
  userRole: string;
}

export const NotesSection = ({ familyId, userRole }: NotesSectionProps) => {
  const { t } = useTranslation();
  console.log('[NotesSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('sectionsUI.notes.emptyStates.noFamily')}
        </AlertDescription>
      </Alert>
    );
  }

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<CareNote | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const loadNotes = async (signal?: AbortSignal) => {
    try {
      if (!familyId) {
        console.error('No familyId provided to loadNotes');
        return;
      }

      // Load only today's notes for the main view
      const today = new Date();
      const startDate = startOfDay(today);
      const endDate = endOfDay(today);

      const { data, error } = await supabase
        .from('care_notes')
        .select('*')
        .eq('family_id', familyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;

      if (!error && data?.length === 0) {
        console.warn("⚠️ [NotesSection] Empty result - likely RLS restriction or sync delay");
      }

      // Get unique author IDs
      const authorIds = [...new Set(data?.map(note => note.author_id) || [])];

      // Fetch profiles for all authors
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles_secure')
        .select('id, full_name')
        .in('id', authorIds);

      if (profilesError) console.warn('Error fetching profiles:', profilesError);

      // Create a map of profile data
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.id, profile]) || []
      );

      // Merge profiles with notes
      const notesWithProfiles = data?.map(note => ({
        ...note,
        profiles: profilesMap.get(note.author_id) || null
      })) || [];

      setNotes(notesWithProfiles);
    } catch (error) {
      const sanitized = sanitizeError(error);
      toast({
        title: sanitized.title,
        description: sanitized.description,
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
      loadNotes();
      
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
            console.warn("⏱️ [NotesSection] load timeout after 8s");
          }
        }, 5000);

        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setCurrentUserId(user?.id || null);

        if (!cancelled) {
          await loadNotes(abortController.signal);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
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


  const canDeleteNote = (note: CareNote) => {
    return familyId && currentUserId && userRole !== 'family_viewer';
  };

  const canEdit = userRole !== 'family_viewer';

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


  if (!familyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please join or create a family to view care notes.
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin w-4 h-4" />
              Loading notes…
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Tabs defaultValue="today" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="today" className="flex items-center gap-2">
          {isMobile ? <FileText className="h-5 w-5" /> : <><FileText className="h-4 w-4" /> Today's Notes</>}
        </TabsTrigger>
        <TabsTrigger value="body-map" className="flex items-center gap-2">
          {isMobile ? <span className="text-xl">🩹</span> : <>🩹 Body Map</>}
        </TabsTrigger>
        <TabsTrigger value="archive" className="flex items-center gap-2">
          {isMobile ? <Archive className="h-5 w-5" /> : <><Archive className="h-4 w-4" /> Archive</>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="space-y-6">
        {/* Inline Note Form */}
        {showNoteForm ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {selectedNote ? (selectedNote.is_incident ? 'Edit Incident Record' : 'Edit Daily Note') : 'Add Note'}
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedNoteForm
                familyId={familyId}
                editData={selectedNote}
                onSuccess={() => {
                  setShowNoteForm(false);
                  setSelectedNote(null);
                  loadNotes();
                }}
                onCancel={() => {
                  setShowNoteForm(false);
                  setSelectedNote(null);
                }}
                onDelete={selectedNote ? () => {
                  handleDeleteNote(selectedNote.id);
                  setShowNoteForm(false);
                } : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Add Note Button */}
            {familyId && canEdit && (
              <Button 
                onClick={() => {
                  setSelectedNote(null);
                  setShowNoteForm(true);
                }} 
                className="add-button w-full h-12 md:h-10 text-sm md:text-base px-4 py-3 md:px-6 md:py-2 min-h-[44px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Daily Note
              </Button>
            )}

            {/* Notes List */}
            <div className="space-y-4">
              {notes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No care notes for today</p>
                  </CardContent>
                </Card>
              ) : (
                notes.map((note) => (
                  <Card 
                    key={note.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${note.is_incident ? "border-red-200" : ""}`}
                    onClick={() => {
                      setSelectedNote(note);
                      setShowNoteForm(true);
                    }}
                  >
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
                            {format(new Date(note.created_at), 'MMM d, yyyy')} at {format(new Date(note.created_at), 'h:mm a')}
                          </p>
                        </div>
                        {canDeleteNote(note) && (
                          <div className="mobile-button-stack md:absolute md:top-4 md:right-4 md:mt-0 md:border-t-0 md:pt-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note.id);
                              }}
                              className="mobile-section-button md:w-auto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="note-content">
                        {/* Activity and Tags */}
                        {note.activity_support && (
                          <div>
                            <h4 className="text-sm font-medium">Activity/Support</h4>
                            <p className="text-sm">{note.activity_support}</p>
                            {note.activity_tags && note.activity_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {note.activity_tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Observations */}
                        {note.observations && (
                          <div>
                            <h4 className="text-sm font-medium">Observations</h4>
                            <p className="text-sm">{note.observations}</p>
                          </div>
                        )}

                        {/* Outcome */}
                        {note.outcome_response && (
                          <div>
                            <h4 className="text-sm font-medium">Outcome</h4>
                            <p className="text-sm">{note.outcome_response}</p>
                          </div>
                        )}

                        {/* Next Steps */}
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
                            <h4 className="text-sm font-medium text-red-600">Incident Notes</h4>
                            <p className="text-sm">{note.incidents}</p>
                          </div>
                        )}

                        {/* Incident Record Summary */}
                        {note.is_incident && (
                          <div className="border-t pt-3 border-red-200 mt-2">
                            <IncidentReportSummary
                              careNoteId={note.id}
                              familyId={familyId}
                              canEdit={canEdit}
                              onUpdate={() => loadNotes()}
                            />
                          </div>
                        )}

                        {/* Fallback for old notes without new fields */}
                        {!note.activity_support && !note.observations && note.content && (
                          <div>
                            <h4 className="text-sm font-medium">Note</h4>
                            <p className="text-sm">{note.content}</p>
                          </div>
                        )}
                      </div>

                      {/* Click to view/edit hint */}
                      <div className="text-xs text-muted-foreground text-right mt-2">
                        Click to view/edit
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="body-map">
        <BodyMapTracker 
          familyId={familyId!} 
          userRole={userRole}
        />
      </TabsContent>

      <TabsContent value="archive">
        <NotesArchiveSection 
          familyId={familyId} 
          userRole={userRole} 
          currentUserId={currentUserId}
        />
      </TabsContent>
    </Tabs>
  );
};