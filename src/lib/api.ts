import { clearStoredAuth, getCachedToken, hydrateStoredAuth } from "@/lib/auth-storage";

function isOfflineError(error: unknown) {
    if (!(error instanceof Error)) return false;
    return (
        error.name === "TypeError" &&
        /Failed to fetch|NetworkError|Load failed/i.test(error.message)
    );
}

function resolveUrl(endpoint: string) {
    return endpoint;
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
            // Redirect to admin login if current path is admin, otherwise to regular login
            const isAdminPath = window.location.pathname.startsWith("/admin");
            window.location.href = isAdminPath ? "/admin/login" : "/login";
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
