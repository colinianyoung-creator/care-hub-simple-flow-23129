import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FamilySwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onFamilySelected: (family: any) => void;
}

export const FamilySwitcher = ({ isOpen, onClose, onFamilySelected }: FamilySwitcherProps) => {
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadUserFamilies();
    }
  }, [isOpen]);

  const loadUserFamilies = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('user_memberships')
        .select(`
          *,
          families:family_id (
            id,
            name,
            created_by
          )
        `)
        .eq('user_id', user.user.id);

      if (error) throw error;

      setFamilies(data || []);
    } catch (error) {
      console.error('Error loading families:', error);
      toast({
        title: "Error",
        description: "Failed to load families",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFamilySelect = (family: any) => {
    onFamilySelected(family);
    onClose();
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'disabled_person':
        return 'Care Recipient';
      case 'family_admin':
        return 'Family Admin';
      case 'family_viewer':
        return 'Family Viewer';
      case 'carer':
        return 'Carer';
      case 'manager':
        return 'Manager';
      default:
        return 'Member';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'disabled_person':
        return 'default';
      case 'family_admin':
        return 'default';
      case 'carer':
        return 'secondary';
      case 'family_viewer':
        return 'outline';
      case 'manager':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Switch Family
          </DialogTitle>
          <DialogDescription>
            Select which family you'd like to work with
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading families...</div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {families.map((membership) => (
              <Card 
                key={membership.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleFamilySelect(membership)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <CardTitle className="text-base">
                        {membership.families?.name || 'Unknown Family'}
                      </CardTitle>
                    </div>
                    <Badge variant={getRoleBadgeVariant(membership.role)}>
                      {getRoleDisplay(membership.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>
                    Click to switch to this family
                  </CardDescription>
                </CardContent>
              </Card>
            ))}

            {families.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No families found</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};