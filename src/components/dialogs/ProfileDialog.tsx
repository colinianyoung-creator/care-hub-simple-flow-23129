import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AdaptiveSelect } from '@/components/adaptive';
import { User, Camera, ShieldCheck, Clock } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  carer: 'Carer',
  family_viewer: 'Family Viewer',
  family_admin: 'Family Admin',
  disabled_person: 'Care Recipient',
};

const ROLE_OPTIONS = [
  { value: 'carer', label: 'Carer' },
  { value: 'family_viewer', label: 'Family Viewer' },
  { value: 'family_admin', label: 'Family Admin' },
  { value: 'disabled_person', label: 'Care Recipient' },
];

const ADMIN_ROLES = ['family_admin', 'disabled_person'];
import { ImageCropDialog } from './ImageCropDialog';
import { validateImageFile, resizeImage, compressImage } from '@/lib/imageUtils';
import { uploadFile } from '@/lib/storage';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFamilyId?: string;
  onProfileUpdate?: (newRole?: string) => void;
}

export const ProfileDialog = ({ isOpen, onClose, currentFamilyId, onProfileUpdate }: ProfileDialogProps) => {
  const [profile, setProfile] = useState({
    full_name: '',
    contact_email: '',
    contact_phone: '',
    care_recipient_name: '',
    profile_picture_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { remove: removeProfilePicture } = useFileUpload('profile_pictures');

  // Role change state
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [requestedRole, setRequestedRole] = useState<string>('');
  const [roleReason, setRoleReason] = useState('');
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const [submittingRole, setSubmittingRole] = useState(false);

  const loadRoleInfo = async () => {
    if (!currentFamilyId) {
      setCurrentRole(null);
      setPendingRequest(null);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('user_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('family_id', currentFamilyId)
        .maybeSingle();
      setCurrentRole(membership?.role ?? null);

      const { data: request } = await supabase
        .from('role_change_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', currentFamilyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .maybeSingle();
      setPendingRequest(request ?? null);
    } catch (error) {
      console.error('Error loading role info:', error);
    }
  };

  const handleRequestRoleChange = async () => {
    if (!currentFamilyId || !requestedRole) return;
    setSubmittingRole(true);
    try {
      const { data, error } = await supabase.rpc('request_role_change', {
        _family_id: currentFamilyId,
        _requested_role: requestedRole as any,
        _reason: roleReason.trim() || null,
      });
      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        toast({
          title: 'Could not submit request',
          description: result?.error || 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Request submitted',
        description: 'A family admin will review your role change request.',
      });
      setRequestedRole('');
      setRoleReason('');
      await loadRoleInfo();
    } catch (error: any) {
      console.error('Error requesting role change:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit role change request',
        variant: 'destructive',
      });
    } finally {
      setSubmittingRole(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (isOpen && !cancelled) {
        await loadProfile(() => cancelled);
        await loadRoleInfo();
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentFamilyId]);

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  const loadProfile = async (checkCancelled?: () => boolean) => {
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
      if (!checkCancelled?.()) {
        toast({
          title: "Loading timeout",
          description: "Taking longer than expected to load profile.",
          variant: "destructive"
        });
      }
    }, 5000);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      if (checkCancelled?.()) return;

      const { data: profileData, error: profileError } = await supabase.rpc('get_profile_safe');
      
      if (profileError) throw profileError;
      
      if (checkCancelled?.()) return;

      if (profileData && profileData.length > 0) {
        const data = profileData[0];
        setProfile({
          full_name: data.full_name || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          care_recipient_name: data.care_recipient_name || '',
          profile_picture_url: data.profile_picture_url || ''
        });
      }

      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (!checkCancelled?.()) {
        console.error('Error loading profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      }
    } finally {
      if (!checkCancelled?.()) {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.user.id,
          ...profile
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify we have an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Delete profile picture from storage if exists
      if (profile.profile_picture_url) {
        try {
          await removeProfilePicture(profile.profile_picture_url);
        } catch (storageError) {
          console.warn('Could not delete profile picture:', storageError);
        }
      }

      // Call edge function to delete user with empty body to ensure POST
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {}
      });

      if (error) {
        console.error('Edge function error:', error);
        // Try to extract actual error message from response body
        let errorMessage = 'Delete failed';
        try {
          const errorData = await (error as any)?.context?.json?.();
          if (errorData?.error) {
            errorMessage = errorData.error;
            if (errorData.details) errorMessage += `: ${errorData.details}`;
          }
        } catch {
          // If we can't parse the body, use what we have
          const statusCode = (error as any)?.context?.response?.status;
          errorMessage = statusCode ? `Delete failed (${statusCode})` : (error.message || 'Delete failed');
        }
        throw new Error(errorMessage);
      }
      
      if (data?.error) {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
        throw new Error(errorMessage);
      }

      // Sign out (user is already deleted on the backend)
      await supabase.auth.signOut();

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      navigate('/');
    } catch (error: any) {
      console.error('❌ Error deleting account:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Unable to delete account. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid image",
        description: validation.error,
        variant: "destructive",
      });
      return null;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
    return null; // Will be handled by crop complete
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingPicture(true);
    try {
      const resized = await resizeImage(croppedBlob, 400, 400);
      const compressed = await compressImage(resized, 0.8);
      
      const file = new File([compressed], 'profile-picture.jpg', { type: 'image/jpeg' });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (profile.profile_picture_url) {
        try {
          await removeProfilePicture(profile.profile_picture_url);
        } catch (err) {
          console.warn('Could not delete old profile picture:', err);
        }
      }

      const url = await uploadFile('profile_pictures', file, user.id);
      
      await supabase
        .from('profiles')
        .update({ profile_picture_url: url })
        .eq('id', user.id);

      setProfile(prev => ({ ...prev, profile_picture_url: url }));
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      // Notify parent to refresh
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
      setShowCropDialog(false);
    }
  };

  const handleRemovePicture = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (profile.profile_picture_url) {
        await removeProfilePicture(profile.profile_picture_url);
      }

      await supabase
        .from('profiles')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      setProfile(prev => ({ ...prev, profile_picture_url: '' }));
      
      toast({
        title: "Success",
        description: "Profile picture removed",
      });

      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error: any) {
      console.error('Error removing profile picture:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove profile picture",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading profile...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center gap-4 py-4">
                <ProfileAvatar 
                  profilePicturePath={profile.profile_picture_url}
                  fallbackIcon={<User className="h-12 w-12" />}
                  className="h-24 w-24"
                />
                <div className="flex gap-2">
                  <ImageUpload
                    onUpload={handleImageUpload}
                    uploading={uploadingPicture}
                    label=""
                  />
                  {profile.profile_picture_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePicture}
                      disabled={uploadingPicture}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Profile Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={profile.contact_email}
                    onChange={(e) => setProfile(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={profile.contact_phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+44 123 456 7890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="care_recipient_name">Care Recipient Name (if applicable)</Label>
                  <Input
                    id="care_recipient_name"
                    value={profile.care_recipient_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, care_recipient_name: e.target.value }))}
                    placeholder="Name of person you care for"
                  />
                </div>
              </div>

              {/* My Role Section */}
              {currentFamilyId && currentRole && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">My Role</h4>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Current role:</span>
                    <Badge variant="secondary">{ROLE_LABELS[currentRole] || currentRole}</Badge>
                  </div>

                  {pendingRequest ? (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-sm">
                      <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Request pending review</div>
                        <div className="text-muted-foreground">
                          {ROLE_LABELS[pendingRequest.from_role] || pendingRequest.from_role} →{' '}
                          {ROLE_LABELS[pendingRequest.requested_role] || pendingRequest.requested_role}
                        </div>
                      </div>
                    </div>
                  ) : ADMIN_ROLES.includes(currentRole) ? (
                    <p className="text-sm text-muted-foreground">
                      As an admin you can change any member's role from the Manage Care Team screen.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Request a different role</Label>
                        <AdaptiveSelect
                          value={requestedRole}
                          onValueChange={setRequestedRole}
                          options={ROLE_OPTIONS.filter(o => o.value !== currentRole)}
                          placeholder="Select a role"
                          title="Request a role"
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role_reason">Reason (optional)</Label>
                        <Textarea
                          id="role_reason"
                          value={roleReason}
                          onChange={(e) => setRoleReason(e.target.value)}
                          placeholder="Why are you requesting this change?"
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRequestRoleChange}
                        disabled={!requestedRole || submittingRole}
                      >
                        {submittingRole ? 'Submitting...' : 'Request role change'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Requests to become a Family Admin or Care Recipient need the current holder to change first.
                      </p>
                    </div>
                  )}
                </div>
              )}


              
              {/* Delete Profile Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-destructive">Delete Profile</h4>
                    <p className="text-sm text-muted-foreground">
                      This will permanently remove your profile and sign you out
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete My Profile
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Profile Deletion</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently delete your profile and all associated data immediately. This action cannot be undone.</p>
              <div className="bg-muted p-3 rounded-lg border-l-4 border-destructive">
                <p className="font-medium text-sm">
                  This action will immediately:
                </p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li>Delete your account permanently</li>
                  <li>Sign you out</li>
                  <li>Remove you from all families</li>
                  <li>This cannot be undone</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete My Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageCropDialog
        isOpen={showCropDialog}
        onClose={() => setShowCropDialog(false)}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};