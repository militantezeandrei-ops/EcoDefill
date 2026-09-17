import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../lib/api"; // Using relative path to clear IDE false-positive lint error

const globalCache: Record<string, any> = {};

export function setCachedData<T = any>(url: string, data: T) {
    globalCache[url] = data;
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ecodefill-cache-update", { detail: { url, data } }));
    }
}

export function invalidateCache(url?: string) {
    if (url) {
        delete globalCache[url];
    } else {
        Object.keys(globalCache).forEach((k) => delete globalCache[k]);
    }
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ecodefill-cache-invalidate", { detail: { url } }));
    }
}

export function useCachedFetch<T>(url: string) {
    const [data, setData] = useState<T | null>(globalCache[url] || null);
    const [loading, setLoading] = useState<boolean>(!globalCache[url]);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent && !globalCache[url]) {
            setLoading(true);
        }

        try {
            const res = await apiClient<T>(url);
            globalCache[url] = res;
            setData(res);
            setError(null);
            return res;
        } catch (err: any) {
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        let isMounted = true;

        if (globalCache[url]) {
            setData(globalCache[url]);
        }

        void fetchData(Boolean(globalCache[url]));

        const handleCacheUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<{ url: string; data: any }>;
            if (customEvent.detail && customEvent.detail.url === url && isMounted) {
                setData(customEvent.detail.data);
                setError(null);
            }
        };

        const handleCacheInvalidate = (e: Event) => {
            const customEvent = e as CustomEvent<{ url?: string }>;
            if ((!customEvent.detail?.url || customEvent.detail.url === url) && isMounted) {
                void fetchData(true);
            }
        };

        window.addEventListener("ecodefill-cache-update", handleCacheUpdate);
        window.addEventListener("ecodefill-cache-invalidate", handleCacheInvalidate);

        return () => {
            isMounted = false;
            window.removeEventListener("ecodefill-cache-update", handleCacheUpdate);
            window.removeEventListener("ecodefill-cache-invalidate", handleCacheInvalidate);
        };
    }, [url, fetchData]);

    const mutate = async () => {
        return fetchData(true);
    };

    return { data, loading, error, mutate };
}
