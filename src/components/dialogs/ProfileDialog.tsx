import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [familyId, setFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRoleChangeForm, setShowRoleChangeForm] = useState(false);
  const [familyMembersCount, setFamilyMembersCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState(false);
  const [hasFamilyMembership, setHasFamilyMembership] = useState(false);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isSoleMember, setIsSoleMember] = useState(false);
  const [requestedRole, setRequestedRole] = useState<'disabled_person' | 'family_admin' | 'family_viewer' | 'carer' | 'manager'>('carer');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { remove: removeProfilePicture } = useFileUpload('profile_pictures');

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Load profile using secure function
      const { data: profileData, error: profileError } = await supabase.rpc('get_profile_safe');

      if (profileError) {
        throw profileError;
      }

      if (profileData?.[0]) {
        const profileInfo = profileData[0] as any;
        setProfile({
          full_name: profileInfo.full_name || '',
          contact_email: profileInfo.contact_email || '',
          contact_phone: profileInfo.contact_phone || '',
          care_recipient_name: profileInfo.care_recipient_name || '',
          profile_picture_url: profileInfo.profile_picture_url || ''
        });
      }

      // Load current user role and family info
      const { data: membershipData, error: membershipError } = await supabase
        .from('user_memberships')
        .select('role, family_id, created_at')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.error('Error loading membership:', membershipError);
      } else if (membershipData) {
        setCurrentUserRole(membershipData.role);
        setFamilyId(membershipData.family_id);
        setHasFamilyMembership(true);
        setIsAdminRole(membershipData.role === 'family_admin' || membershipData.role === 'disabled_person');
      } else {
        setHasFamilyMembership(false);
        setIsAdminRole(false);
      }

      // Get family members count if user is in a family
      if (membershipData) {
        const { data: membersData } = await supabase
          .from('user_memberships')
          .select('id')
          .eq('family_id', membershipData.family_id);
        
        const memberCount = membersData?.length || 0;
        setFamilyMembersCount(memberCount);
        setIsSoleMember(memberCount === 1);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const handleRoleChangeRequest = async () => {
    console.log('🔍 handleRoleChangeRequest called', { 
      hasFamilyMembership, 
      requestedRole, 
      isAdminRole,
      isSoleMember,
      currentRole: currentUserRole 
    });

    // If no family membership, user must create/join a family first
    if (!hasFamilyMembership && requestedRole) {
      try {
        setSaving(true);
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          console.error('❌ No user found');
          return;
        }

        // Create a new family for the user
        const familyName = `${profile.full_name || 'Personal'}'s Network`;
        const { data: newFamily, error: familyError } = await supabase
          .from('families')
          .insert({ name: familyName, created_by: user.user.id })
          .select()
          .single();
        
        if (familyError) throw familyError;
        const newFamilyId = newFamily.id;
        setFamilyId(newFamilyId);
        console.log('✅ Created new family:', newFamilyId);
        
        // Create membership with requested role
        const { error: membershipError } = await supabase
          .from('user_memberships')
          .insert({ user_id: user.user.id, family_id: newFamilyId, role: requestedRole });
        
        if (membershipError) throw membershipError;

        console.log('✅ Role set successfully for new family');
        setCurrentUserRole(requestedRole);
        setHasFamilyMembership(true);

        toast({
          title: "Family Created & Role Set",
          description: `Your family network has been created with role: ${requestedRole.replace(/_/g, ' ')}`,
        });

        setShowRoleChangeForm(false);
        setShowRoleChangeConfirm(false);
        onProfileUpdate?.(requestedRole);
      } catch (error: any) {
        console.error('❌ Error creating family and setting role:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to create family and set role",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // If sole member OR admin role, use RPC function for safe role update
    if ((isSoleMember || isAdminRole) && requestedRole) {
      try {
        setSaving(true);
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          console.error('❌ No user found');
          return;
        }

        console.log('📝 Calling update_own_role_safe RPC with role:', requestedRole, 'familyId:', familyId);

        // Call the secure RPC function with both parameters
        const { data: rawResult, error: rpcError } = await supabase
          .rpc('update_own_role_safe' as any, { 
            _family_id: familyId, 
            _new_role: requestedRole 
          });

        // Cast the result to the expected type
        const result = rawResult as { success: boolean; error?: string; new_role?: string; family_id?: string };
        console.log('📊 RPC result:', result);

        if (rpcError) {
          console.error('❌ RPC error:', rpcError);
          throw rpcError;
        }

        if (!result.success) {
          console.error('❌ RPC returned failure:', result.error);
          throw new Error(result.error || 'Failed to update role');
        }

        // Verify the update by querying the database
        const { data: verifyData, error: verifyError } = await supabase
          .from('user_memberships')
          .select('role')
          .eq('user_id', user.user.id)
          .eq('family_id', result.family_id || familyId)
          .single();

        if (verifyError) {
          console.error('⚠️ Could not verify update:', verifyError);
        } else {
          console.log('✅ Verified role in database:', verifyData.role);
          if (verifyData.role !== requestedRole) {
            throw new Error('Role update verification failed - database does not reflect the change');
          }
        }

        console.log('✅ Role updated successfully');
        setCurrentUserRole(requestedRole);

        toast({
          title: "Role Updated",
          description: `Your role has been updated to ${requestedRole.replace(/_/g, ' ')}`,
        });

        setShowRoleChangeForm(false);
        setShowRoleChangeConfirm(false);
        onProfileUpdate?.(requestedRole);
      } catch (error: any) {
        console.error('❌ Error updating role:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to update role",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // Non-admin submits request
    if (!roleChangeReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the role change",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('role_change_requests')
        .insert({
          user_id: user.user.id,
          family_id: familyId,
          from_role: currentUserRole as any,
          requested_role: requestedRole as any,
          reason: roleChangeReason
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your role change request has been sent to family administrators for approval",
      });

      setShowRoleChangeForm(false);
      setShowRoleChangeConfirm(false);
      setRoleChangeReason('');
    } catch (error) {
      console.error('Error submitting role change request:', error);
      toast({
        title: "Error",
        description: "Failed to submit role change request",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If no family membership, delete profile immediately
      if (!hasFamilyMembership) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        
        toast({
          title: "Profile Deleted",
          description: "Your profile has been deleted successfully",
        });
        
        navigate('/');
        return;
      }

      // If carer or viewer, allow immediate deletion
      if (currentUserRole === 'carer' || currentUserRole === 'family_viewer') {
        // Remove from family first
        const { error: membershipError } = await supabase
          .from('user_memberships')
          .delete()
          .eq('user_id', user.id)
          .eq('family_id', familyId);

        if (membershipError) throw membershipError;

        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;

        toast({
          title: "Profile Deleted",
          description: "You have been removed from the family and your profile has been deleted",
        });

        navigate('/');
        return;
      }

      // If admin/disabled person/manager, check if sole admin
      const { data: adminData } = await supabase
        .from('user_memberships')
        .select('id')
        .eq('family_id', familyId)
        .in('role', ['family_admin', 'disabled_person']);

      if (adminData && adminData.length <= 1) {
        toast({
          title: "Cannot Delete",
          description: "You are the only administrator. Please transfer admin rights first or delete the entire family network.",
          variant: "destructive",
        });
        setShowDeleteConfirm(false);
        return;
      }

      // Admin can delete if not sole admin
      const { error: membershipError } = await supabase
        .from('user_memberships')
        .delete()
        .eq('user_id', user.id)
        .eq('family_id', familyId);

      if (membershipError) throw membershipError;

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      toast({
        title: "Profile Deleted",
        description: "You have been removed from the family and your profile has been deleted",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = async (file: File) => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid Image",
        description: validation.error,
        variant: "destructive",
      });
      return '';
    }

    // Create object URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropDialog(true);
    return '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingPicture(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Resize to 512x512
      const resizedBlob = await resizeImage(croppedBlob, 512, 512);
      
      // Compress if still too large
      let finalBlob = resizedBlob;
      if (resizedBlob.size > 500 * 1024) {
        finalBlob = await compressImage(resizedBlob, 0.8);
      }

      // Convert blob to file for upload
      const file = new File([finalBlob], 'profile-picture.jpg', { type: 'image/jpeg' });
      
      // Upload to storage
      const imageUrl = await uploadFile('profile_pictures', file, user.user.id);

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture_url: imageUrl })
        .eq('id', user.user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, profile_picture_url: imageUrl }));
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
      onProfileUpdate?.();
      
      // Cleanup
      URL.revokeObjectURL(selectedImage);
      setSelectedImage('');
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile picture",
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleProfilePictureRemove = async () => {
    if (!profile.profile_picture_url) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await removeProfilePicture(profile.profile_picture_url);
    
    const { error } = await supabase
      .from('profiles')
      .update({ profile_picture_url: null })
      .eq('id', user.user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove profile picture",
        variant: "destructive",
      });
    } else {
      setProfile(prev => ({ ...prev, profile_picture_url: '' }));
      toast({
        title: "Success",
        description: "Profile picture removed",
      });
      onProfileUpdate?.();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>
              Update your personal information and preferences.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 px-1">
              <div className="space-y-4">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.profile_picture_url} alt={profile.full_name} />
                    <AvatarFallback>
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file);
                        e.target.value = ''; // Reset input
                      }}
                      id="profile-picture-input"
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('profile-picture-input')?.click()}
                        disabled={uploadingPicture}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {uploadingPicture ? 'Uploading...' : 'Change Picture'}
                      </Button>
                      {profile.profile_picture_url && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleProfilePictureRemove}
                          disabled={uploadingPicture}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Max 5MB • JPEG, PNG, or WEBP • Will be cropped to square
                    </p>
                  </div>
                </div>
              </div>

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

              {hasFamilyMembership && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Role Change</h4>
                      <p className="text-sm text-muted-foreground">
                        {isAdminRole || isSoleMember
                          ? 'Change your role within this family'
                          : 'Request a role change - requires admin approval'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setRequestedRole(currentUserRole as any || 'carer');
                      setShowRoleChangeForm(true);
                    }}
                  >
                    {isAdminRole || isSoleMember ? 'Change Role' : 'Submit Request'}
                  </Button>
                </div>
              )}
              
              {!hasFamilyMembership && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Default Role</h4>
                      <p className="text-sm text-muted-foreground">
                        Change your role immediately - no approval needed
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setRequestedRole(currentUserRole as any || 'carer');
                      setShowRoleChangeForm(true);
                    }}
                  >
                    Change Role
                  </Button>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-destructive">Delete Profile</h4>
                    <p className="text-sm text-muted-foreground">
                      {hasFamilyMembership 
                        ? isAdminRole && familyMembersCount <= 1
                          ? 'You are the only member of this family'
                          : 'This will permanently remove your profile and sign you out'
                        : 'This action will delete your account and cannot be undone'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={hasFamilyMembership && isAdminRole && familyMembersCount <= 1}
                >
                  Delete My Profile
                </Button>
              </div>

              {/* Family Membership Section */}
              {!familyId && (
                <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                  <Label>Family Membership</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    You're not currently part of any family. You can create a new family or join an existing one.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        onClose();
                        window.location.reload();
                      }}
                    >
                      Join/Create Family
                    </Button>
                  </div>
                </div>
              )}

              {/* Role Change Request Form */}
              {showRoleChangeForm && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="role">
                      {hasFamilyMembership ? 'Requested Role' : 'Default Role'}
                    </Label>
                    <Select value={requestedRole} onValueChange={(value: any) => setRequestedRole(value)}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carer">Carer</SelectItem>
                        <SelectItem value="family_admin">Family Admin</SelectItem>
                        <SelectItem value="disabled_person">Disabled Person</SelectItem>
                        <SelectItem value="family_viewer">Family Viewer</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   
                  {hasFamilyMembership && !isAdminRole && !isSoleMember && (
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for Change</Label>
                      <textarea
                        id="reason"
                        value={roleChangeReason}
                        onChange={(e) => setRoleChangeReason(e.target.value)}
                        placeholder="Explain why you want to change your role..."
                        className="w-full p-2 border rounded text-sm resize-none"
                        rows={3}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                     <Button 
                      size="sm" 
                      onClick={() => {
                        console.log('🔘 Update Role button clicked', { requestedRole, hasFamilyMembership, isAdminRole, isSoleMember });
                        if (!hasFamilyMembership || isAdminRole || isSoleMember) {
                          setShowRoleChangeConfirm(true);
                        } else {
                          if (!roleChangeReason.trim()) {
                            toast({
                              title: "Error",
                              description: "Please provide a reason for the role change",
                              variant: "destructive",
                            });
                            return;
                          }
                          setShowRoleChangeConfirm(true);
                        }
                      }}
                      disabled={!requestedRole || (hasFamilyMembership && !isAdminRole && !isSoleMember && !roleChangeReason.trim())}
                     >
                       {hasFamilyMembership ? (isAdminRole || isSoleMember ? 'Change Role' : 'Submit Request') : 'Change Role'}
                     </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setShowRoleChangeForm(false);
                        setRoleChangeReason('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

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
              {hasFamilyMembership && isAdminRole && familyMembersCount <= 1 ? (
                <p>You are the only administrator of this family. You cannot delete your profile unless you either assign another administrator or leave the family first.</p>
              ) : (
                <>
                  <p>This will permanently delete your profile and all associated data immediately. This action cannot be undone.</p>
                  <div className="bg-muted p-3 rounded-lg border-l-4 border-destructive">
                    <p className="font-medium text-sm">
                      This action will immediately:
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Delete your account permanently</li>
                      <li>Sign you out</li>
                      {hasFamilyMembership && <li>Remove you from your family</li>}
                      <li>This cannot be undone</li>
                    </ul>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!(hasFamilyMembership && isAdminRole && familyMembersCount <= 1) && (
              <AlertDialogAction
                onClick={handleDeleteProfile}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete My Profile
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={showRoleChangeConfirm} onOpenChange={setShowRoleChangeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasFamilyMembership && !isAdminRole && !isSoleMember ? 'Confirm Role Change Request' : 'Confirm Role Change'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!hasFamilyMembership || isSoleMember ? (
                <p>Your role will be changed immediately. You can change it again anytime from this profile page.</p>
              ) : isAdminRole ? (
                <p>Your role will be changed immediately within the family. This action takes effect right away.</p>
              ) : (
                <p>Your request will be sent to family administrators for approval. They will review and decide whether to approve your role change.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChangeRequest}>
              {hasFamilyMembership && !isAdminRole && !isSoleMember ? 'Submit Request' : 'Change Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        isOpen={showCropDialog}
        onClose={() => {
          setShowCropDialog(false);
          URL.revokeObjectURL(selectedImage);
          setSelectedImage('');
        }}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};