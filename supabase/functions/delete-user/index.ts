import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, recordRateLimitAttempt, createRateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit config: 3 delete attempts per hour per user (critical operation)
const RATE_LIMIT_CONFIG = { maxAttempts: 3, windowMinutes: 60 };

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔄 delete-user function invoked');

  try {
    // Step 1: Require Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid authorization header',
          code: 'UNAUTHORIZED',
          status: 401
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token received, validating...');

    // Step 2: Create user-scoped client to validate token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Validate the token by getting the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error('❌ Token validation failed:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          status: 401,
          details: userError?.message
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Token valid for user: ${user.id} (${user.email})`);

    // Step 3: Check rate limit before proceeding with deletion
    const rateLimitResult = await checkRateLimit(user.id, 'delete_user', RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      console.warn('❌ Rate limit exceeded for user:', user.id);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Step 4: Create admin client with service role for deletion
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log(`🗑️ Attempting to delete user: ${user.id}`);

    // Step 5: Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('❌ Delete user error:', JSON.stringify(deleteError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: deleteError.message || 'Failed to delete user',
          code: (deleteError as any).code || 'DELETE_FAILED',
          status: 500,
          details: (deleteError as any).cause || (deleteError as any).stack
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ User deleted successfully: ${user.id}`);

    // Record successful deletion attempt
    await recordRateLimitAttempt(user.id, 'delete_user', true);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: 'INTERNAL_ERROR',
        status: 500,
        details: errorStack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
