import { useState, useEffect } from "react";
import { apiClient } from "../lib/api"; // Using relative path to clear IDE false-positive lint error

const globalCache: Record<string, any> = {};

export function useCachedFetch<T>(url: string) {
    const [data, setData] = useState<T | null>(globalCache[url] || null);
    const [loading, setLoading] = useState<boolean>(!globalCache[url]);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            // ONLY show loading state if we don't have cached data for this specific URL
            if (!globalCache[url]) {
                setLoading(true);
            }

            try {
                const res = await apiClient<T>(url);
                globalCache[url] = res;
                if (isMounted) {
                    setData(res);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [url]);

    const mutate = async () => {
        try {
            const res = await apiClient<T>(url);
            globalCache[url] = res;
            setData(res);
        } catch (e) {
            console.error(e);
        }
    };

    return { data, loading, error, mutate };
}
