import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Lexend } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: '--font-jakarta',
});

const lexend = Lexend({
    subsets: ["latin"],
    variable: '--font-lexend',
});

export const metadata: Metadata = {
    title: "EcoDefill Platform",
    description: "Unified Sustainability Hub",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "EcoDefill",
    },
};

export const viewport: Viewport = {
    themeColor: "#11d452",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${jakarta.variable} ${lexend.variable} font-sans`}>
                {children}
            </body>
        </html>
    );
}
