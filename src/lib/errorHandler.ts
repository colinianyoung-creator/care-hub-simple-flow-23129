/**
 * Centralized error handling utility
 * Maps database and system errors to user-friendly messages
 * Prevents information leakage while maintaining good UX
 */

export interface ErrorResponse {
  title: string;
  description: string;
  shouldLog: boolean;
}

/**
 * Sanitize error messages to prevent information disclosure
 * Maps technical errors to user-friendly messages
 */
export function sanitizeError(error: any): ErrorResponse {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return {
      title: 'Connection Error',
      description: 'Unable to connect to the server. Please check your internet connection and try again.',
      shouldLog: true
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('jwt') || errorMessage.includes('unauthorized') || errorMessage.includes('not authenticated')) {
    return {
      title: 'Authentication Required',
      description: 'Your session has expired. Please sign in again.',
      shouldLog: false
    };
  }
  
  // Permission errors (RLS)
  if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('row-level security')) {
    return {
      title: 'Access Denied',
      description: 'You don\'t have permission to perform this action.',
      shouldLog: true
    };
  }
  
  // Validation errors
  if (errorMessage.includes('violates') || errorMessage.includes('constraint') || errorMessage.includes('invalid')) {
    return {
      title: 'Invalid Data',
      description: 'Please check your input and try again.',
      shouldLog: true
    };
  }
  
  // Duplicate errors
  if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
    return {
      title: 'Duplicate Entry',
      description: 'This record already exists.',
      shouldLog: false
    };
  }
  
  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return {
      title: 'Not Found',
      description: 'The requested item could not be found.',
      shouldLog: false
    };
  }
  
  // Rate limit errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
    return {
      title: 'Too Many Requests',
      description: 'Please wait a moment before trying again.',
      shouldLog: true
    };
  }
  
  // Generic fallback - never expose raw error messages
  console.error('Unhandled error:', error); // Log to server console only
  return {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    shouldLog: true
  };
}

/**
 * Helper to determine if an error should be logged to analytics/monitoring
 */
export function shouldLogError(error: any): boolean {
  return sanitizeError(error).shouldLog;
}
