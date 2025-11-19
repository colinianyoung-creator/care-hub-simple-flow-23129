import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Heart, Frown, Meh, Smile, Laugh, Archive, AlertCircle, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay } from 'date-fns';
import { NotesArchiveSection } from './NotesArchiveSection';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sanitizeError } from "@/lib/errorHandler";
import { BodyMapTracker } from '@/components/BodyMapTracker';

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
  console.log('[NotesSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Create your personal care space or join a family to start adding care notes.
        </AlertDescription>
      </Alert>
    );
  }

  const { toast } = useToast();
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<CareNote | null>(null);
  const [showNoteDetails, setShowNoteDetails] = useState(false);
  
  
  // New note form state
  const [newNote, setNewNote] = useState({
    activity_support: '',
    activity_tags: [] as string[],
    observations: '',
    outcome_response: '',
    next_steps: '',
    mood: '',
    eating_drinking: '',
    eating_drinking_notes: '',
    bathroom_usage: '',
    incidents: '',
    is_incident: false
  });

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
        .from('profiles')
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

  const handleAddNote = async () => {
    if (!newNote.activity_support.trim()) return;

    // Verify user is authenticated before attempting save
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please wait for authentication to complete",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('care_notes')
        .insert([{
          family_id: familyId,
          content: `Activity: ${newNote.activity_support}${newNote.observations ? '\nObservations: ' + newNote.observations : ''}`,
          author_id: currentUserId,
          title: newNote.activity_support,
          category: 'Activity Support'
        }] as any);

      if (error) throw error;

      setNewNote({
        activity_support: '',
        activity_tags: [],
        observations: '',
        outcome_response: '',
        next_steps: '',
        mood: '',
        eating_drinking: '',
        eating_drinking_notes: '',
        bathroom_usage: '',
        incidents: '',
        is_incident: false
      });
      setShowAddForm(false);
      loadNotes();
      
      toast({
        title: "Note added",
        description: "The care note has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error adding note",
        description: "There was an error adding the care note.",
        variant: "destructive",
      });
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
    return familyId && currentUserId;
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

  const toggleActivityTag = (tag: string) => {
    setNewNote(prev => ({
      ...prev,
      activity_tags: prev.activity_tags.includes(tag)
        ? prev.activity_tags.filter(t => t !== tag)
        : [...prev.activity_tags, tag]
    }));
  };

  const predefinedTags = ['Personal Care', 'Meal Prep', 'Medication', 'Outing', 'Exercise', 'Social', 'Medical'];

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
    <>
    <Tabs defaultValue="today" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="today">Today's Notes</TabsTrigger>
        <TabsTrigger value="body-map" className="flex items-center gap-2">
          🩹 Body Map
        </TabsTrigger>
        <TabsTrigger value="archive" className="flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Archive
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="space-y-6">
        {/* Add Note Form */}
        {familyId && showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Add Daily Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Activity Support */}
            <div className="space-y-2">
              <Label>Activity / Support Provided *</Label>
              <Textarea
                placeholder="Describe the activities and support provided..."
                value={newNote.activity_support}
                onChange={(e) => setNewNote(prev => ({ ...prev, activity_support: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Activity Tags */}
            <div className="space-y-2">
              <Label>Quick Tags</Label>
              <div className="flex flex-wrap gap-2">
                {predefinedTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={newNote.activity_tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleActivityTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label>Observations / Behaviour</Label>
              <Textarea
                placeholder="Note any observations about behaviour, mood, or responses..."
                value={newNote.observations}
                onChange={(e) => setNewNote(prev => ({ ...prev, observations: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Outcome */}
            <div className="space-y-2">
              <Label>Outcome / Response</Label>
              <Textarea
                placeholder="How did the person respond? What was achieved?"
                value={newNote.outcome_response}
                onChange={(e) => setNewNote(prev => ({ ...prev, outcome_response: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Next Steps */}
            <div className="space-y-2">
              <Label>Next Steps / Handover</Label>
              <Textarea
                placeholder="Any important information for the next carer..."
                value={newNote.next_steps}
                onChange={(e) => setNewNote(prev => ({ ...prev, next_steps: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Wellbeing Trackers */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Wellbeing Trackers</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mood */}
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select value={newNote.mood} onValueChange={(value) => setNewNote(prev => ({ ...prev, mood: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mood" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="happy">😊 Happy</SelectItem>
                      <SelectItem value="calm">😌 Calm</SelectItem>
                      <SelectItem value="upset">😢 Upset</SelectItem>
                      <SelectItem value="anxious">😰 Anxious</SelectItem>
                      <SelectItem value="tired">😴 Tired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Eating/Drinking */}
                <div className="space-y-2">
                  <Label>Eating / Drinking</Label>
                  <Select value={newNote.eating_drinking} onValueChange={(value) => setNewNote(prev => ({ ...prev, eating_drinking: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Ate full meal</SelectItem>
                      <SelectItem value="little">Ate little</SelectItem>
                      <SelectItem value="refused">Refused food</SelectItem>
                      <SelectItem value="fluid_good">Fluid intake good</SelectItem>
                      <SelectItem value="fluid_poor">Fluid intake poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bathroom */}
                <div className="space-y-2">
                  <Label>Bathroom Usage</Label>
                  <Select value={newNote.bathroom_usage} onValueChange={(value) => setNewNote(prev => ({ ...prev, bathroom_usage: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="assistance">Needed assistance</SelectItem>
                      <SelectItem value="constipated">Constipated</SelectItem>
                      <SelectItem value="diarrhoea">Diarrhoea</SelectItem>
                      <SelectItem value="accident">Accident</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Notes for Eating */}
              {newNote.eating_drinking && (
                <div className="space-y-2">
                  <Label>Eating/Drinking Notes</Label>
                  <Input
                    placeholder="Additional details about eating/drinking..."
                    value={newNote.eating_drinking_notes}
                    onChange={(e) => setNewNote(prev => ({ ...prev, eating_drinking_notes: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Incidents */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_incident"
                  checked={newNote.is_incident}
                  onCheckedChange={(checked) => setNewNote(prev => ({ ...prev, is_incident: !!checked }))}
                />
                <Label htmlFor="is_incident">Mark as incident</Label>
              </div>
              
              {newNote.is_incident && (
                <Textarea
                  placeholder="Describe the incident in detail..."
                  value={newNote.incidents}
                  onChange={(e) => setNewNote(prev => ({ ...prev, incidents: e.target.value }))}
                  rows={3}
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddNote} disabled={!newNote.activity_support.trim() || !currentUserId}>
                Add Note
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
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
          Add Daily Note
        </Button>
      ) : null}

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
                setShowNoteDetails(true);
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
                      {format(new Date(note.created_at), 'MMM d, yyyy at h:mm a')}
                    </p>
                  </div>
                  {canDeleteNote(note) && (
                    <div className="mobile-button-stack md:absolute md:top-4 md:right-4 md:mt-0 md:border-t-0 md:pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
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
                    <h4 className="text-sm font-medium text-red-600">Incident Details</h4>
                    <p className="text-sm">{note.incidents}</p>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
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

    {/* Note Details Modal */}
    <Dialog open={showNoteDetails} onOpenChange={setShowNoteDetails}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Care Note Details</DialogTitle>
        </DialogHeader>
        {selectedNote && (
          <div className="space-y-4">
            {/* Author and Date */}
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{selectedNote.profiles?.full_name || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedNote.created_at), 'MMM d, yyyy at h:mm a')}
                </p>
              </div>
              {selectedNote.is_incident && (
                <Badge variant="destructive">Incident</Badge>
              )}
            </div>

            {/* All note fields displayed in full */}
            {selectedNote.activity_support && (
              <div>
                <h4 className="font-semibold mb-1">Activity/Support</h4>
                <p>{selectedNote.activity_support}</p>
                {selectedNote.activity_tags && selectedNote.activity_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedNote.activity_tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedNote.observations && (
              <div>
                <h4 className="font-semibold mb-1">Observations</h4>
                <p>{selectedNote.observations}</p>
              </div>
            )}

            {selectedNote.outcome_response && (
              <div>
                <h4 className="font-semibold mb-1">Outcome/Response</h4>
                <p>{selectedNote.outcome_response}</p>
              </div>
            )}

            {selectedNote.next_steps && (
              <div>
                <h4 className="font-semibold mb-1">Next Steps</h4>
                <p>{selectedNote.next_steps}</p>
              </div>
            )}

            {/* Wellbeing section */}
            {(selectedNote.mood || selectedNote.eating_drinking || selectedNote.bathroom_usage) && (
              <div className="border-t pt-3">
                <h4 className="font-semibold mb-2">Wellbeing Trackers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedNote.mood && (
                    <div className="flex items-center gap-2">
                      {getMoodIcon(selectedNote.mood)}
                      <span className="capitalize">{selectedNote.mood}</span>
                    </div>
                  )}
                  {selectedNote.eating_drinking && (
                    <div>
                      <span className="font-medium">Eating/Drinking:</span> {selectedNote.eating_drinking}
                      {selectedNote.eating_drinking_notes && <p className="text-sm text-muted-foreground mt-1">{selectedNote.eating_drinking_notes}</p>}
                    </div>
                  )}
                  {selectedNote.bathroom_usage && (
                    <div>
                      <span className="font-medium">Bathroom:</span> {selectedNote.bathroom_usage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Incidents */}
            {selectedNote.is_incident && selectedNote.incidents && (
              <div className="border-t pt-3 border-red-200">
                <h4 className="font-semibold text-red-600 mb-2">Incident Details</h4>
                <p>{selectedNote.incidents}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 border-t pt-4">
              {canDeleteNote(selectedNote) && (
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(selectedNote.id);
                    setShowNoteDetails(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Note
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowNoteDetails(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};