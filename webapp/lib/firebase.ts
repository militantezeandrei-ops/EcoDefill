import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only if config is present (or handle gracefully)
let app;
let auth: Auth;
let db: Firestore;

try {
    const isConfigValid = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

    if (!isConfigValid) {
        throw new Error("Missing Firebase configuration environment variables. Please check your .env.local file.");
    }

    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization failed:", error);
    // We still need to export something to avoid import errors, 
    // but we should probably handle this better in the UI components
    // @ts-ignore
    auth = new Proxy({}, {
        get: () => {
            throw new Error("Firebase Auth accessed before initialization. Check your environment variables.");
        }
    });
    // @ts-ignore
    db = new Proxy({}, {
        get: () => {
            throw new Error("Firestore accessed before initialization. Check your environment variables.");
        }
    });
}

export { app, auth, db };
