
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  checkClientRateLimit,
  recordClientAttempt,
  clearClientAttempts,
  getRemainingAttempts,
  getTimeUntilReset,
  formatTimeRemaining,
  RATE_LIMITS
} from "@/lib/rateLimiter";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<'disabled_person' | 'family_admin' | 'family_viewer' | 'carer' | 'manager'>('carer');
  const [careRecipientName, setCareRecipientName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [loginRateLimited, setLoginRateLimited] = useState(false);
  const [loginAttemptsRemaining, setLoginAttemptsRemaining] = useState<number>(RATE_LIMITS.login.maxAttempts);
  const [resetRateLimited, setResetRateLimited] = useState(false);
  const [rateLimitTimeRemaining, setRateLimitTimeRemaining] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("signin");

  useEffect(() => {
    // Check URL params for invite pre-fill
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    const emailParam = params.get('email');
    const roleParam = params.get('role');
    
    if (inviteParam) {
      setInviteCode(inviteParam);
      setActiveTab("signup");
    }
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (roleParam && ['disabled_person', 'family_admin', 'family_viewer', 'carer', 'manager'].includes(roleParam)) {
      setSelectedRole(roleParam as any);
    }
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard');
      } else if (event === 'PASSWORD_RECOVERY') {
        setShowResetForm(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            selected_role: selectedRole,
            care_recipient_name: careRecipientName || null,
            pending_invite_code: inviteCode || null
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          // Email confirmation required
          setAwaitingVerification(true);
          setVerificationEmail(email);
          toast({
            title: 'Verify Your Email',
            description: 'Please check your inbox for a verification link.',
          });
        } else {
          // Email confirmation disabled or already verified
          const roleMessages = {
            family_admin: 'Welcome to CareHub! Your Family Admin account has been created.',
            disabled_person: 'Welcome to CareHub! Your personal care space has been created.',
            carer: 'Welcome to CareHub! Your Carer account has been created.',
            family_viewer: 'Welcome to CareHub! Your Family Viewer account has been created.',
          };
          
          toast({
            title: 'Success!',
            description: roleMessages[selectedRole as keyof typeof roleMessages] || 'Your account has been created.',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLoginRateLimitState = (emailToCheck: string) => {
    const remaining = getRemainingAttempts('login', emailToCheck, RATE_LIMITS.login.maxAttempts, RATE_LIMITS.login.windowMs);
    setLoginAttemptsRemaining(remaining);
    
    const isLimited = !checkClientRateLimit('login', emailToCheck, RATE_LIMITS.login.maxAttempts, RATE_LIMITS.login.windowMs);
    setLoginRateLimited(isLimited);
    
    if (isLimited) {
      const timeRemaining = getTimeUntilReset('login', emailToCheck, RATE_LIMITS.login.windowMs);
      setRateLimitTimeRemaining(formatTimeRemaining(timeRemaining));
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check client-side rate limit
    if (!checkClientRateLimit('login', email, RATE_LIMITS.login.maxAttempts, RATE_LIMITS.login.windowMs)) {
      const timeRemaining = getTimeUntilReset('login', email, RATE_LIMITS.login.windowMs);
      setLoginRateLimited(true);
      setRateLimitTimeRemaining(formatTimeRemaining(timeRemaining));
      toast({
        title: "Too many attempts",
        description: `Please try again in ${formatTimeRemaining(timeRemaining)}.`,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed attempt
        recordClientAttempt('login', email);
        updateLoginRateLimitState(email);
        throw error;
      }
      
      // Clear attempts on successful login
      clearClientAttempts('login', email);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    // Check client-side rate limit for password reset
    if (!checkClientRateLimit('passwordReset', email, RATE_LIMITS.passwordReset.maxAttempts, RATE_LIMITS.passwordReset.windowMs)) {
      const timeRemaining = getTimeUntilReset('passwordReset', email, RATE_LIMITS.passwordReset.windowMs);
      setResetRateLimited(true);
      toast({
        title: "Too many reset attempts",
        description: `Please try again in ${formatTimeRemaining(timeRemaining)}.`,
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    try {
      // Record the attempt
      recordClientAttempt('passwordReset', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: "Check your email for a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: 'Email Sent',
        description: 'Check your inbox for a new verification link.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      
      setShowResetForm(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Care Hub</span>
          </div>
          <p className="text-muted-foreground">Welcome to your care coordination hub</p>
        </div>

        {awaitingVerification ? (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Check Your Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We sent a verification link to <strong>{verificationEmail}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Click the link in your email to activate your account. The link expires in 24 hours.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleResendVerification} disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Resend Email'}
                </Button>
                <Button variant="ghost" onClick={() => setAwaitingVerification(false)}>
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{showResetForm ? "Reset Password" : "Get Started"}</CardTitle>
              <CardDescription>
                {showResetForm ? "Enter your new password" : "Sign in to your account or create a new one"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showResetForm ? (
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowResetForm(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-4">
                    {loginRateLimited && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Too many login attempts. Please try again in {rateLimitTimeRemaining}.
                        </AlertDescription>
                      </Alert>
                    )}
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loginRateLimited}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loginRateLimited}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading || loginRateLimited}>
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                      {loginAttemptsRemaining < RATE_LIMITS.login.maxAttempts && loginAttemptsRemaining > 0 && (
                        <p className="text-sm text-muted-foreground text-center">
                          {loginAttemptsRemaining} attempt{loginAttemptsRemaining !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          className="text-sm p-0 h-auto"
                          onClick={handleForgotPassword}
                          disabled={resetLoading || resetRateLimited}
                        >
                          {resetLoading ? "Sending..." : "Forgot Password?"}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showSignUpPassword ? "text" : "password"}
                            placeholder="Choose a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          >
                            {showSignUpPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">I am a...</Label>
                        <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="disabled_person">Disabled Person (Care Recipient)</SelectItem>
                            <SelectItem value="family_admin">Family Member (Admin)</SelectItem>
                            <SelectItem value="family_viewer">Family Member (Viewer)</SelectItem>
                            <SelectItem value="carer">Carer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(selectedRole === 'disabled_person' || selectedRole === 'family_admin') && (
                        <div className="space-y-2">
                          <Label htmlFor="care-recipient-name">
                            {selectedRole === 'disabled_person' ? 'Your Name (for care records)' : 'Care Recipient Name'}
                          </Label>
                          <Input
                            id="care-recipient-name"
                            type="text"
                            value={careRecipientName}
                            onChange={(e) => setCareRecipientName(e.target.value)}
                            placeholder="Name for care documentation"
                            required
                          />
                        </div>
                      )}

                      {(selectedRole === 'carer' || selectedRole === 'family_viewer') && (
                        <div className="space-y-2">
                          <Label htmlFor="invite-code">Invite Code (Optional)</Label>
                          <Input
                            id="invite-code"
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Have an invite code? Enter it here"
                          />
                          <p className="text-xs text-muted-foreground">
                            You can join a family later from your dashboard
                          </p>
                        </div>
                      )}
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
