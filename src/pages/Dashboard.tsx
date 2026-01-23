import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleBasedDashboard } from "@/components/RoleBasedDashboard";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { useIOSPullToRefresh } from "@/hooks/useIOSPullToRefresh";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("User");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");
  const [careRecipientPictureUrl, setCareRecipientPictureUrl] = useState<string>("");
  const [currentFamilyId, setCurrentFamilyId] = useState<string | undefined>(undefined);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const { toast } = useToast();
  const isLoadingDataRef = useRef(false);
  
  // Initialize iOS pull-to-refresh (hook handles detection internally)
  useIOSPullToRefresh('root');

  // Add timeout for loading state
  useEffect(() => {
    if (!loading || dataLoaded) {
      setLoadingTimeout(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (loading && !dataLoaded) {
        console.error('❌ Loading timeout - forcing error state');
        setLoadingTimeout(true);
        setLoadingMessage("error");
        setLoading(false);
        toast({
          title: "Loading timed out",
          description: "Please refresh the page or sign out and back in.",
          variant: "destructive",
        });
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [loading, dataLoaded]);

  useEffect(() => {
    let isSubscribed = true;

    const checkAuth = async () => {
      try {
        setLoadingMessage("Checking authentication...");
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth error:', error);
          navigate('/');
          return;
        }
        
        if (!session) {
          console.log('⚠️ No session found, redirecting to login');
          navigate('/');
          return;
        }
        
        console.log('✅ Session valid, loading user data');
        if (isSubscribed) {
          setUser(session.user);
          await loadUserData(session.user.id);
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        navigate('/');
      }
    };

    // Listen for auth state changes (CRITICAL: NOT async to prevent deadlock)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      } else if (session?.user && isSubscribed) {
        setUser(session.user);
        // Use setTimeout to defer async work and prevent deadlock
        setTimeout(() => {
          if (isSubscribed) {
            loadUserData(session.user.id);
          }
        }, 0);
      }
    });

    checkAuth();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Track current family ID for role updates and initialize selected family
  useEffect(() => {
    if (families.length > 0) {
      // Find selected family or default to first
      const currentFamily = selectedFamilyId 
        ? families.find(f => f.family_id === selectedFamilyId)
        : families[0];
      
      const familyToUse = currentFamily || families[0];
      
      if (familyToUse?.family_id) {
        setCurrentFamilyId(familyToUse.family_id);
        // Initialize selected family if not set
        if (!selectedFamilyId) {
          setSelectedFamilyId(familyToUse.family_id);
        }
      }
    }
  }, [families, selectedFamilyId]);

  const loadUserData = async (userId: string, retryCount = 0) => {
    // Prevent multiple simultaneous loads
    if (isLoadingDataRef.current) {
      console.log('⏭️ Skipping loadUserData - already loading');
      return;
    }
    
    isLoadingDataRef.current = true;
    
    try {
      console.log('🔍 Loading user data for:', userId);
      setLoadingMessage("Loading your profile...");
      
      // Load user profile to get default role using secure function
      const { data: profile, error: profileError } = await supabase.rpc('get_profile_safe') as any;
      
      // If profile doesn't exist and we haven't retried yet, wait and retry
      if (!profile?.[0] && retryCount < 3) {
        console.log(`⏳ Profile not found, retrying... (attempt ${retryCount + 1})`);
        setLoadingMessage(`Setting up your account... (${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return loadUserData(userId, retryCount + 1);
      }
      
      if (profileError) {
        console.error('❌ Profile loading error:', profileError);
      }
      
      const profileData = profile?.[0];
      console.log('👤 Profile data:', profileData);
      
      // If still no profile after retries, try to create it
      if (!profileData) {
        console.log('🔧 Attempting to create missing profile...');
        setLoadingMessage('Creating your profile...');
        
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase.rpc('ensure_user_profile') as any;
            
            // Retry loading after profile creation
            await new Promise(resolve => setTimeout(resolve, 500));
            return loadUserData(userId, 0);
          }
        } catch (createError) {
          console.error('❌ Failed to create profile:', createError);
        }
        
        console.error('❌ No profile found after retries');
        toast({
          title: "Profile Not Found",
          description: "We couldn't load your profile. Please try signing out and back in.",
          variant: "destructive",
        });
        setLoadingMessage("error");
        setLoading(false);
        return;
      }

      // Set user name and profile picture
      if (profileData?.full_name) {
        setUserName(profileData.full_name);
      }
      const profileDataAny = profileData as any;
      if (profileDataAny?.profile_picture_url) {
        setProfilePictureUrl(profileDataAny.profile_picture_url);
      }

      setLoadingMessage("Loading family information...");

      // Auto-create family for first-time admin users
      await handleFirstTimeUser(userId, profileData);

      // Load user's family memberships - simple single query
      console.log('🔍 Loading family memberships...');
      setLoadingMessage("Loading your family...");

      const { data: memberships, error: membershipError } = await supabase
        .from('user_memberships')
        .select(`
          id,
          family_id,
          role,
          families (
            id,
            name
          )
        `)
        .eq('user_id', userId);

      console.log('📊 Memberships result:', { 
        memberships, 
        error: membershipError,
        count: memberships?.length || 0
      });

      if (membershipError) {
        console.error('❌ Error loading memberships:', membershipError);
        toast({
          title: "Error loading data",
          description: membershipError.message,
          variant: "destructive",
        });
        setDataLoaded(true);
        setLoading(false);
        return;
      }

      // Check if admin user has no memberships (trigger may not have completed)
      const expectedRole = profileData?.preferred_role || profileData?.ui_preference;
      if (expectedRole === 'family_admin' || expectedRole === 'disabled_person') {
        if (!memberships || memberships.length === 0) {
          if (retryCount < 3) {
            console.log(`⏳ Admin user has no memberships, retrying... (${retryCount + 1}/3)`);
            setLoadingMessage(`Setting up your family space... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            isLoadingDataRef.current = false; // Release lock before retry
            return loadUserData(userId, retryCount + 1);
          } else {
            console.error('❌ Admin user still has no memberships after retries');
            toast({
              title: 'Setup Issue',
              description: 'Unable to create your family space. Please contact support.',
              variant: 'destructive'
            });
          }
        }
      }

      // Set families (even if empty)
      setFamilies(memberships || []);
      console.log('✅ Families set:', memberships?.length || 0);

      // Load care recipient picture for hero banner - use selected family or first
      if (memberships && memberships.length > 0) {
        const targetFamilyId = selectedFamilyId || memberships[0].family_id;
        await loadCareRecipientPicture(targetFamilyId);
      }

      // Set role from membership OR fall back to profile ui_preference
      if (memberships && memberships.length > 0) {
        console.log('✅ Setting role from membership:', memberships[0].role);
        setUserRole(memberships[0].role);
      } else {
        // For unconnected users, use ui_preference
        const fallbackRole = profileData?.ui_preference || 'carer';
        console.log('⚠️ No memberships, using profile ui_preference:', fallbackRole);
        
        // Add warning for admin roles without memberships (should not happen after trigger fix)
        if (fallbackRole === 'family_admin' || fallbackRole === 'disabled_person') {
          console.warn('🚨 Admin user has no memberships - family creation may have failed');
        }
        
        setUserRole(fallbackRole);
      }

      setDataLoaded(true);
      
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
      setDataLoaded(true);
    } finally {
      setLoading(false);
      isLoadingDataRef.current = false;
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loadCareRecipientPicture = async (targetFamilyId: string) => {
    try {
      console.log('🖼️ Loading care recipient picture for family:', targetFamilyId);
      
      // Step 1: Get user_id of disabled_person or family_admin
      const { data: members } = await supabase
        .from('user_memberships')
        .select('user_id, role')
        .eq('family_id', targetFamilyId)
        .in('role', ['disabled_person', 'family_admin'])
        .limit(2);
      
      // Prefer disabled_person, fallback to family_admin
      const careRecipient = members?.find(m => m.role === 'disabled_person') || members?.[0];
      
      if (!careRecipient) {
        setCareRecipientPictureUrl('');
        console.log('⚠️ No care recipient or admin found');
        return;
      }
      
      // Step 2: Fetch profile picture from profiles_limited view
      const { data: profile } = await supabase
        .from('profiles_limited')
        .select('profile_picture_url')
        .eq('id', careRecipient.user_id)
        .single();
      
      setCareRecipientPictureUrl(profile?.profile_picture_url || '');
      console.log('✅ Set care recipient picture from profiles_limited');
    } catch (error) {
      console.error('❌ Error loading care recipient picture:', error);
      setCareRecipientPictureUrl('');
    }
  };

  const handleFamilySelected = async (familyId: string) => {
    console.log('🔄 Switching to family:', familyId);
    setSelectedFamilyId(familyId);
    
    // Load care recipient picture for the newly selected family
    await loadCareRecipientPicture(familyId);
  };

  const handleFirstTimeUser = async (userId: string, profileData: any) => {
    // Check for pending invite code from user metadata
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const pendingInviteCode = currentUser?.user_metadata?.pending_invite_code;
    
    if (pendingInviteCode) {
      try {
        console.log('🎟️ Processing pending invite code...');
        await supabase.rpc('redeem_invite', {
          _code: pendingInviteCode
        });
        
        // Clear the pending invite code from user metadata
        await supabase.auth.updateUser({
          data: { pending_invite_code: null }
        });
        
        toast({
          title: "Welcome!",
          description: "You've been added to the care network.",
        });
      } catch (error) {
        console.error('Error redeeming invite:', error);
        // Clear the invite code even on error to prevent retry loops
        await supabase.auth.updateUser({
          data: { pending_invite_code: null }
        });
      }
    }
    
    // NOTE: No longer auto-creating families here
    // The change_user_role RPC handles family creation
    // Main membership loading (with retry logic) happens after this
  };

  const handleFamilyCreated = () => {
    if (user) {
      loadUserData(user.id);
    }
  };

  if (loading || !dataLoaded) {
    if (loadingMessage === "error") {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
          <div className="text-lg font-medium text-destructive">Unable to load your profile</div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            We're having trouble loading your account. This may be a temporary issue.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 border border-border rounded-md hover:bg-accent"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-lg">{loadingMessage}</div>
        <div className="text-sm text-muted-foreground">This may take a few moments...</div>
      </div>
    );
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Please sign in</div>;
  }

  // Always show role-based dashboard, even if no family yet
  // Find the selected family, or default to first
  const currentFamily = selectedFamilyId 
    ? families.find(f => f.family_id === selectedFamilyId) || families[0]
    : families[0];

  return (
    <div className="min-h-screen flex flex-col">
      {/* iOS Pull-to-Refresh Indicator */}
      <PullToRefreshIndicator />
      
      <div className="flex-1">
        <RoleBasedDashboard
          user={user}
          currentFamily={currentFamily}
          onSignOut={handleSignOut}
          userRole={userRole}
          userName={userName}
          profilePictureUrl={profilePictureUrl}
          careRecipientPictureUrl={careRecipientPictureUrl}
          currentFamilyId={currentFamilyId}
          onProfileUpdate={async () => {
            // Only refresh profile picture URL, not all data
            try {
              const { data: profile } = await supabase.rpc('get_profile_safe') as any;
              const profileData = profile?.[0];
              if (profileData?.profile_picture_url) {
                setProfilePictureUrl(profileData.profile_picture_url);
              }
            } catch (error) {
              console.error('Error refreshing profile picture:', error);
            }
          }}
          onFamilySelected={handleFamilySelected}
        />
      </div>
      <Footer />
      <PWAInstallPrompt />
    </div>
  );
};

export default Dashboard;
