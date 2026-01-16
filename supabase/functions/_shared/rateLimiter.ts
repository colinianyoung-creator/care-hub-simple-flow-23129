import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a given identifier and action type
 * Uses the existing rate_limit_attempts table
 */
export async function checkRateLimit(
  identifier: string,
  actionType: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);
  
  // Count recent attempts within the time window
  const { count, error } = await supabase
    .from('rate_limit_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .gte('attempted_at', windowStart.toISOString());
  
  if (error) {
    console.error('Rate limit check error:', error);
    // Fail open but log the error - don't block legitimate users due to DB issues
    return { allowed: true, remaining: config.maxAttempts, resetAt: new Date() };
  }
  
  const attemptCount = count || 0;
  const allowed = attemptCount < config.maxAttempts;
  const remaining = Math.max(0, config.maxAttempts - attemptCount);
  
  const resetAt = new Date();
  resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes);
  
  return { allowed, remaining, resetAt };
}

/**
 * Record a rate limit attempt
 */
export async function recordRateLimitAttempt(
  identifier: string,
  actionType: string,
  success: boolean = true,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { error } = await supabase
    .from('rate_limit_attempts')
    .insert({
      identifier,
      action_type: actionType,
      success,
      metadata
    });
  
  if (error) {
    console.error('Failed to record rate limit attempt:', error);
  }
}

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': result.resetAt.toISOString()
      } 
    }
  );
}
