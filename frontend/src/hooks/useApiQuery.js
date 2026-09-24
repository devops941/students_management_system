import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Small fetch wrapper for read views: tracks loading/error and exposes a
 * stable refetch so pages can refresh after mutations.
 */
export function useApiQuery(fetcher, deps = [], { immediate = true, onError } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err);
        if (onError) onError(err);
        else toast.error(err.message || 'Something went wrong');
        return null;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  return { data, loading, error, refetch: run, setData };
}

export default useApiQuery;
