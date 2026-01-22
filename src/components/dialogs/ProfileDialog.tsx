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
import { User, Camera } from 'lucide-react';
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

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (isOpen && !cancelled) {
        await loadProfile(() => cancelled);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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