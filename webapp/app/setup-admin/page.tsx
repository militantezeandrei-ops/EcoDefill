"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function SetupAdminPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const makeAdmin = async () => {
        if (!user) return;
        setStatus("Updating...");
        try {
            await updateDoc(doc(db, "users", user.uid), {
                role: "admin"
            });
            setStatus("Success! You are now an Admin. You can now login at /admin/login.");
        } catch (error: any) {
            console.error(error);
            setStatus("Error: " + error.message);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md p-8 shadow-lg">
                <h1 className="text-2xl font-bold mb-4 text-gray-900">Admin Setup Utility</h1>

                {!user ? (
                    <p className="text-red-500">Please register or log in as a student first before using this page.</p>
                ) : (
                    <div className="space-y-4">
                        <p className="text-gray-700">Currently logged in as: <br /><span className="font-mono text-sm">{user.email}</span></p>
                        <Button onClick={makeAdmin} className="w-full">Make Me Admin</Button>
                        {status && (
                            <p className={`mt-4 p-3 rounded ${status.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {status}
                            </p>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
