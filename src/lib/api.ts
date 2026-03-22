// A simple wrapper around fetch to automatically handle auth headers and JSON parsing.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

    const getAuthToken = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("token");
        }
        return null;
    };

    const token = getAuthToken();

    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

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
        if (response.status === 401 && typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        throw new Error(body.message || body || "API Request Failed");
    }

    return body as T;
}
