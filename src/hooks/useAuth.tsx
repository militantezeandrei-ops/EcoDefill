"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearStoredAuth, hydrateStoredAuth, setStoredAuth, setStoredUser } from "@/lib/auth-storage";

interface User {
    id: string;
    email: string;
    role: string;
    balance: number;
    hasSeenGuide?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUserBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            const { token: storedToken, user: storedUser } = await hydrateStoredAuth();
            if (!isMounted) return;

            if (storedToken) {
                setToken(storedToken);
            }
            if (storedUser) {
                setUser(storedUser);
            }
            setIsLoading(false);
        };

        init();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = async (newToken: string, newUser: User, redirectPath: string = "/dashboard") => {
        await setStoredAuth(newToken, newUser);
        setToken(newToken);
        setUser(newUser);

        // Redirect logic
        router.push(redirectPath);
    };

    const logout = async () => {
        await clearStoredAuth();
        setToken(null);
        setUser(null);
        router.push("/login");
    };

    const updateUserBalance = useCallback((newBalance: number) => {
        setUser((prev) => {
            if (!prev) return null;
            if (prev.balance === newBalance) return prev; // Avoid triggering re-renders if nothing changed
            
            const updatedUser = { ...prev, balance: newBalance };
            void setStoredUser(updatedUser);
            return updatedUser;
        });
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, token, isAuthenticated: !!token, isLoading, login, logout, updateUserBalance }
            }
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
