
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleBasedDashboard } from "@/components/RoleBasedDashboard";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("User");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");
  const [currentFamilyId, setCurrentFamilyId] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    let isSubscribed = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }
      
      if (isSubscribed) {
        setUser(session.user);
        await loadUserData(session.user.id);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      } else if (session?.user && isSubscribed) {
        setUser(session.user);
        await loadUserData(session.user.id);
      }
    });

    checkAuth();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Track current family ID for role updates (must be before any conditional returns)
  useEffect(() => {
    const currentFamily = families.length > 0 ? families[0] : null;
    if (currentFamily?.family_id) {
      setCurrentFamilyId(currentFamily.family_id);
    }
  }, [families]);

  const loadUserData = async (userId: string, retryCount = 0) => {
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

      // Load user's family memberships with better error handling
      console.log('🔍 Loading family memberships...');
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
        .eq('user_id', userId) as any;

      console.log('📊 Memberships query result:', { 
        memberships, 
        error: membershipError,
        count: memberships?.length || 0 
      });

      if (membershipError) {
        console.error('❌ Error loading memberships:', membershipError);
        toast({
          title: "Error loading families",
          description: membershipError.message || "Could not load your family memberships",
          variant: "destructive",
        });
        setDataLoaded(true);
        setLoading(false);
        return;
      }

      setFamilies(memberships || []);
      console.log('✅ Families set:', memberships?.length || 0);
      
      // Set user role from first membership, or use preferred_role as fallback
      if (memberships && memberships.length > 0) {
        console.log('✅ Setting role from membership:', memberships[0].role);
        setUserRole(memberships[0].role);
      } else {
        const fallbackRole = profileData?.preferred_role || 'carer';
        console.log('⚠️ No memberships found, using preferred_role:', fallbackRole);
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

    // Auto-create family for existing admin users who don't have one
    const userRole = profileData?.preferred_role;
    const { data: existingMemberships } = await supabase
      .from('user_memberships')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    const hasMemberships = existingMemberships && existingMemberships.length > 0;
    
    if (!hasMemberships && (userRole === 'family_admin' || userRole === 'disabled_person')) {
      try {
        console.log('🏠 Creating personal family for existing admin user...');
        
        // Extract first name
        const fullName = profileData?.full_name || 'User';
        const firstName = fullName.split(' ')[0];
        
        // Create family
        const { data: newFamily, error: familyError } = await supabase
          .from('families')
          .insert({
            name: `${firstName}'s Care Space`,
            created_by: userId
          })
          .select()
          .single();
        
        if (familyError) throw familyError;
        
        // Add membership
        const { error: membershipError } = await supabase
          .from('user_memberships')
          .insert({
            user_id: userId,
            family_id: newFamily.id,
            role: userRole
          });
        
        if (membershipError) throw membershipError;
        
        console.log('✅ Personal family created successfully');
        
        toast({
          title: "Welcome!",
          description: "Your personal care space has been created.",
        });
      } catch (error) {
        console.error('Error creating personal family:', error);
        // Don't show error toast - may have been created by trigger
      }
    }
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
  const currentFamily = families.length > 0 ? families[0] : null;

  return (
    <RoleBasedDashboard
      user={user}
      currentFamily={currentFamily}
      onSignOut={handleSignOut}
      userRole={userRole}
      userName={userName}
      profilePictureUrl={profilePictureUrl}
      currentFamilyId={currentFamilyId}
      onProfileUpdate={async (newRole) => {
        if (newRole && user) {
          setUserRole(newRole);
          // Reload all user data to reflect membership changes
          await loadUserData(user.id);
        }
      }}
    />
  );
};

export default Dashboard;
