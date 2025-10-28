import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Image as ImageIcon, Receipt, AlertCircle, Loader2 } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { MoneyArchiveSection } from './MoneyArchiveSection';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MoneyEntry {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
}

interface FamilyMember {
  id: string;
  full_name: string;
}

interface MoneySectionProps {
  familyId?: string;
  userRole?: string;
}

export const MoneySection: React.FC<MoneySectionProps> = ({ familyId, userRole }) => {
  console.log('[MoneySection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Create your personal care space or join a family to track money and expenses.
        </AlertDescription>
      </Alert>
    );
  }

  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [showRefresh, setShowRefresh] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paid_by: '',
    notes: '',
    photo_url: ''
  });

  const { toast } = useToast();
  const { upload, uploading } = useFileUpload('money_receipts');

  useEffect(() => {
    getCurrentUser();
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
            console.warn("⏱️ [MoneySection] load timeout after 8s");
          }
        }, 8000);

        await Promise.all([
          loadEntries(abortController.signal),
          loadFamilyMembers(abortController.signal)
        ]);
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
  }, [familyId, currentUserId]);

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
      setFormData(prev => ({ ...prev, paid_by: user.id }));
    }
  };

  const loadFamilyMembers = async (signal?: AbortSignal) => {
    if (!familyId) return;

    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('user_id, profiles(id, full_name)')
        .eq('family_id', familyId)
        .abortSignal(signal);

      if (error) throw error;

      const members = data
        .map(m => ({
          id: m.user_id,
          full_name: (m.profiles as any)?.full_name || 'Unknown'
        }))
        .filter(m => m.id);

      setFamilyMembers(members);
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const loadEntries = async (signal?: AbortSignal) => {
    if (!familyId) return;

    try {
      const { data, error } = await supabase
        .from('money_records')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(50)
        .abortSignal(signal) as any;

      if (error) throw error;
      
      if (!error && data?.length === 0) {
        console.warn("⚠️ [MoneySection] Empty result - likely RLS restriction or sync delay");
      }
      
      setEntries((data || []) as any);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading money entries:', error);
        toast({
          title: "Error",
          description: "Failed to load money entries",
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
        .from('money_records')
        .insert({
          family_id: familyId,
          created_by: currentUserId,
          description: formData.description,
          amount: parseFloat(formData.amount),
          type: 'expense',
          category: 'general',
          receipt_url: formData.photo_url || null
        }) as any;

      if (error) throw error;

      toast({
        title: "Success",
        description: "Money entry added successfully"
      });

      setFormData({
        description: '',
        amount: '',
        paid_by: currentUserId,
        notes: '',
        photo_url: ''
      });
      setShowForm(false);
      loadEntries();
    } catch (error) {
      console.error('Error adding money entry:', error);
      toast({
        title: "Error",
        description: "Failed to add money entry",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('money_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Money entry deleted"
      });
      loadEntries();
    } catch (error) {
      console.error('Error deleting money entry:', error);
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

  const canDelete = (entry: MoneyEntry) => {
    return familyId && currentUserId;
  };

  const getMemberName = (userId: string) => {
    return familyMembers.find(m => m.id === userId)?.full_name || 'Unknown';
  };

  const today = startOfDay(new Date());
  const todaysEntries = entries.filter(entry => {
    const entryDate = startOfDay(new Date(entry.created_at));
    return entryDate.getTime() === today.getTime();
  });
  const totalSpent = todaysEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);

  if (!familyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please join or create a family to track expenses.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="recent">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Total Spent</span>
                <span className="text-2xl">£{totalSpent.toFixed(2)}</span>
              </CardTitle>
            </CardHeader>
          </Card>

      {familyId && !showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      )}

      {familyId && showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Item/Service</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What was purchased..."
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Amount (£)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Paid By</label>
                <Select
                  value={formData.paid_by}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paid_by: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {familyMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <ImageUpload
                onUpload={handlePhotoUpload}
                onRemove={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                currentImageUrl={formData.photo_url}
                uploading={uploading}
                label="Receipt Photo (optional)"
              />

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
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Loading money entries…
                </div>
                {showRefresh && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                  >
                    Force Refresh
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No expenses recorded yet
          </p>
        ) : (
          entries.map(entry => (
            <Card key={entry.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
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
                    <p className="text-lg font-semibold text-primary">
                      £{Number(entry.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Paid by: {getMemberName(entry.paid_by)}
                    </p>
                    {entry.notes && (
                      <p className="text-sm">{entry.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'PPp')}
                    </p>
                  </div>
                  {canDelete(entry) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

          <ImageViewer
            imageUrl={viewerImage}
            isOpen={!!viewerImage}
            onClose={() => setViewerImage(null)}
            alt="Receipt photo"
          />
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          <MoneyArchiveSection 
            familyId={familyId} 
            userRole={userRole}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
