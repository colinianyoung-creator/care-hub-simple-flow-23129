import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAsyncDataOptions {
  timeout?: number;
  retries?: number;
  onError?: (error: Error) => void;
}

/**
 * A reusable hook for loading async data with automatic:
 * - Cancellation on unmount
 * - Timeout protection (default 10s)
 * - Loading state management
 * - Error handling with recovery
 * 
 * @example
 * const { data, loading, error, retry } = useAsyncData(
 *   async (signal) => {
 *     const { data } = await supabase
 *       .from('table')
 *       .select('*')
 *       .abortSignal(signal);
 *     return data;
 *   },
 *   [familyId]
 * );
 */
export function useAsyncData<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  deps: any[] = [],
  options: UseAsyncDataOptions = {}
) {
  const { timeout = 10000, retries = 0, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const loadData = async (retryCount = 0) => {
    let cancelled = false;
    const abortController = new AbortController();

    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        abortController.abort();
        const timeoutError = new Error('Request timeout');
        setError(timeoutError);
        toast({
          title: "Loading timeout",
          description: "Taking longer than expected. Please try again.",
          variant: "destructive"
        });
      }
    }, timeout);

    try {
      if (cancelled || abortController.signal.aborted) return;

      const result = await fetchFn(abortController.signal);

      clearTimeout(timeoutId);

      if (!cancelled) {
        setData(result);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (!cancelled && err.name !== 'AbortError') {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        if (onError) {
          onError(error);
        }

        // Retry logic
        if (retryCount < retries) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`⏳ Retrying in ${delay}ms (attempt ${retryCount + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadData(retryCount + 1);
        }
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
      abortController.abort();
      setLoading(false);
    };
  };

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const executeLoad = async () => {
      if (cancelled) return;

      setLoading(true);
      setError(null);

      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          abortController.abort();
          const timeoutError = new Error('Request timeout');
          setError(timeoutError);
          toast({
            title: "Loading timeout",
            description: "Taking longer than expected. Please try again.",
            variant: "destructive"
          });
        }
      }, timeout);

      try {
        if (cancelled || abortController.signal.aborted) return;

        const result = await fetchFn(abortController.signal);

        clearTimeout(timeoutId);

        if (!cancelled) {
          setData(result);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (!cancelled && err.name !== 'AbortError') {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);

          if (onError) {
            onError(error);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    executeLoad();

    return () => {
      cancelled = true;
      abortController.abort();
      setLoading(false); // ✅ Immediate UI reset
    };
  }, deps);

  return { 
    data, 
    loading, 
    error,
    retry: () => loadData()
  };
}
