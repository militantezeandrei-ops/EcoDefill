import { Capacitor } from "@capacitor/core";
import { clearStoredAuth, getCachedToken, hydrateStoredAuth } from "@/lib/auth-storage";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const NATIVE_FALLBACK_BASE_URL = "https://eco-defill.vercel.app";

function isOfflineError(error: unknown) {
    if (!(error instanceof Error)) return false;
    return (
        error.name === "TypeError" &&
        /Failed to fetch|NetworkError|Load failed/i.test(error.message)
    );
}

function resolveUrl(endpoint: string) {
    if (endpoint.startsWith("http")) return endpoint;
    const isNative = Capacitor.isNativePlatform();

    // In browser/web builds, prefer same-origin API routes to avoid CORS.
    if (!isNative) {
        return endpoint;
    }

    if (!endpoint.startsWith("/api")) {
        return endpoint;
    }

    const originBase =
        typeof window !== "undefined" && /^https?:/i.test(window.location.origin)
            ? window.location.origin.replace(/\/+$/, "")
            : "";

    const nativeBase = BASE_URL || originBase || NATIVE_FALLBACK_BASE_URL;
    return `${nativeBase}${endpoint}`;
}

export async function apiClient<T>(
    endpoint: string,
    options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<T> {
    const { skipAuthRedirect, ...requestOptions } = options;
    const url = resolveUrl(endpoint);
    let token = getCachedToken();
    if (!token) {
        const hydrated = await hydrateStoredAuth();
        token = hydrated.token;
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
        response = await fetch(url, {
            ...requestOptions,
            headers,
        });
    } catch (error) {
        if (isOfflineError(error)) {
            if (typeof navigator !== "undefined" && navigator.onLine) {
                throw new Error("Cannot reach server right now. Please try again.");
            }
            throw new Error("No internet connection. Please reconnect and try again.");
        }
        throw error;
    }

    const contentType = response.headers.get("Content-Type");
    const isJson = contentType && contentType.includes("application/json");

    let body;
    if (isJson) {
        body = await response.json();
    } else {
        body = await response.text();
    }

    if (!response.ok) {
        // If 401, clear stale auth and redirect to login
        if (
            response.status === 401 &&
            typeof window !== "undefined" &&
            !skipAuthRedirect &&
            (typeof navigator === "undefined" || navigator.onLine)
        ) {
            await clearStoredAuth();
            window.location.href = "/login";
        }

        const message =
            body?.message ||
            body?.error ||
            (typeof body === "string" ? body : null) ||
            "API Request Failed";
        throw new Error(message);
    }

    return body as T;
}
