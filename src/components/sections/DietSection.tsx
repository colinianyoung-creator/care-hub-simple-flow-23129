import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DietArchiveSection } from './DietArchiveSection';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DietEntry {
  id: string;
  meal_type: string;
  description: string;
  portion_left: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
}

interface DietSectionProps {
  familyId?: string;
  userRole?: string;
}

export const DietSection: React.FC<DietSectionProps> = ({ familyId, userRole }) => {
  console.log('[DietSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Create your personal care space or join a family to track diet and nutrition.
        </AlertDescription>
      </Alert>
    );
  }

  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [showRefresh, setShowRefresh] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    portion_left: 'none',
    notes: '',
    photo_url: ''
  });

  const { toast } = useToast();
  const { upload, uploading } = useFileUpload('diet_photos');

  useEffect(() => {
    getCurrentUser();
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!familyId || !currentUserId) {
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
            console.warn("⏱️ [DietSection] load timeout after 8s");
          }
        }, 8000);

        await loadEntries(selectedMealType, abortController.signal);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('Unexpected error:', err);
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
  }, [familyId, selectedMealType, currentUserId]);

  // Show refresh button after 5 seconds of loading
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    if (loading) {
      refreshTimer = setTimeout(() => {
        setShowRefresh(true);
      }, 5000);
    } else {
      setShowRefresh(false);
    }
    return () => clearTimeout(refreshTimer);
  }, [loading]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadEntries = async (mealType: string, signal?: AbortSignal) => {
    if (!familyId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('diet_entries')
        .select('*')
        .eq('family_id', familyId)
        .eq('meal_type', mealType)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;
      setEntries(data as any || []);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading diet entries:', error);
        toast({
          title: "Error",
          description: "Failed to load diet entries",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('diet_entries')
          .insert([{
            family_id: familyId,
          created_by: currentUserId,
          meal_type: selectedMealType,
          description: formData.description,
          portion_left: formData.portion_left,
          notes: formData.notes,
          photo_url: formData.photo_url || null
        }] as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Diet entry added successfully"
      });

      setFormData({ description: '', portion_left: 'none', notes: '', photo_url: '' });
      setShowForm(false);
      loadEntries(selectedMealType);
    } catch (error) {
      console.error('Error adding diet entry:', error);
      toast({
        title: "Error",
        description: "Failed to add diet entry",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('diet_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Diet entry deleted"
      });
      loadEntries(selectedMealType);
    } catch (error) {
      console.error('Error deleting diet entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive"
      });
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!currentUserId) return null;
    const url = await upload(file, currentUserId);
    if (url) {
      setFormData(prev => ({ ...prev, photo_url: url }));
    }
    return url;
  };

  const canDelete = (entry: DietEntry) => {
    return familyId && currentUserId && userRole !== 'family_viewer';
  };

  const canEdit = userRole !== 'family_viewer';

  if (!familyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please join or create a family to track diet entries.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          <Tabs value={selectedMealType} onValueChange={setSelectedMealType}>
            {isMobile ? (
              <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snacks">Snacks</SelectItem>
                  <SelectItem value="drinks">Drinks</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
                <TabsTrigger value="lunch">Lunch</TabsTrigger>
                <TabsTrigger value="dinner">Dinner</TabsTrigger>
                <TabsTrigger value="snacks">Snacks</TabsTrigger>
                <TabsTrigger value="drinks">Drinks</TabsTrigger>
              </TabsList>
            )}

        {['breakfast', 'lunch', 'dinner', 'snacks', 'drinks'].map(mealType => (
          <TabsContent key={mealType} value={mealType} className="space-y-4">
            {familyId && canEdit && !showForm && (
              <Button onClick={() => setShowForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Entry
              </Button>
            )}

            {familyId && canEdit && showForm && (
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">What was eaten</label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the meal..."
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Portion left uneaten</label>
                      <Select
                        value={formData.portion_left}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, portion_left: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None - All eaten</SelectItem>
                          <SelectItem value="some">Some left</SelectItem>
                          <SelectItem value="most">Most left</SelectItem>
                          <SelectItem value="all">All left - Nothing eaten</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any additional notes..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Photo (optional)</label>
                      <ImageUpload
                        onUpload={handlePhotoUpload}
                        onRemove={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                        currentImageUrl={formData.photo_url}
                        uploading={uploading}
                        className="mt-2"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">Save Entry</Button>
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No {mealType} entries for today
                </p>
              ) : (
                entries.map(entry => (
                  <Card key={entry.id}>
                     <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.description}</span>
                            {entry.photo_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setViewerImage(entry.photo_url)}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Portion left: {entry.portion_left || 'Not specified'}
                          </p>
                          {entry.notes && (
                            <p className="text-sm">{entry.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'h:mm a')}
                          </p>
                        </div>
                        {canDelete(entry) && (
                          <div className="flex sm:flex-col gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entry.id)}
                              className="self-start"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <ImageViewer
        imageUrl={viewerImage}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        alt="Diet entry photo"
      />
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          <DietArchiveSection 
            familyId={familyId} 
            userRole={userRole}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
