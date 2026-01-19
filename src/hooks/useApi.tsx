// hooks/useApi.ts
import { useState } from "react";

interface ApiOptions {
  onSuccess?: (data?: any) => void;
  onError?: (err: any) => void;
  silent?: boolean; // nếu không truyền sẽ dựa vào method
}

export function useApi<T = any>(apiFunc: (...args: any[]) => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);

  const callApi = async (
    params?: any, // có thể là object hoặc params thông thường
    options: ApiOptions = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result: any = await apiFunc(params);
      // Access 'code' property only if it exists
      const status = (result as any)?.code ?? 200;
      if (status >= 200 && status < 300) {
        setData(result);
        options?.onSuccess?.(result);
        return result;
      }
    } catch (err: any) {
      setError(err);
      options?.onError?.(err);
      console.log({ err });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { callApi, loading, data, error };
}
