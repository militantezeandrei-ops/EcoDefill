import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { NativeMobileShell } from "@/components/native/NativeMobileShell";
import { OfflineOverlay } from "@/components/native/OfflineOverlay";
import { Inter } from "next/font/google";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "EcoDefill Dashboard",
    description: "EcoDefill System Management",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={inter.variable}>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            </head>
            <body>
                <AuthProvider>
                    <NativeMobileShell />
                    <OfflineOverlay />
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
