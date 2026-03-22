import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

let cachedToken: string | null = null;
let cachedUser: string | null = null;
let hydrated = false;

const canUseBrowserStorage = () => typeof window !== "undefined";

const readKey = async (key: string): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }

  if (!canUseBrowserStorage()) return null;
  return localStorage.getItem(key);
};

const writeKey = async (key: string, value: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key, value });
    return;
  }

  if (!canUseBrowserStorage()) return;
  localStorage.setItem(key, value);
};

const removeKey = async (key: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key });
    return;
  }

  if (!canUseBrowserStorage()) return;
  localStorage.removeItem(key);
};

export interface StoredUser {
  id: string;
  email: string;
  role: string;
  balance: number;
}

export async function hydrateStoredAuth(): Promise<{
  token: string | null;
  user: StoredUser | null;
}> {
  if (!hydrated) {
    const [token, user] = await Promise.all([readKey(TOKEN_KEY), readKey(USER_KEY)]);
    cachedToken = token;
    cachedUser = user;
    hydrated = true;
  }

  if (!cachedUser) {
    return { token: cachedToken, user: null };
  }

  try {
    return { token: cachedToken, user: JSON.parse(cachedUser) as StoredUser };
  } catch {
    cachedUser = null;
    await removeKey(USER_KEY);
    return { token: cachedToken, user: null };
  }
}

export async function setStoredAuth(token: string, user: StoredUser): Promise<void> {
  const serializedUser = JSON.stringify(user);
  cachedToken = token;
  cachedUser = serializedUser;
  hydrated = true;

  await Promise.all([
    writeKey(TOKEN_KEY, token),
    writeKey(USER_KEY, serializedUser),
  ]);
}

export async function setStoredUser(user: StoredUser): Promise<void> {
  const serializedUser = JSON.stringify(user);
  cachedUser = serializedUser;
  hydrated = true;
  await writeKey(USER_KEY, serializedUser);
}

export async function clearStoredAuth(): Promise<void> {
  cachedToken = null;
  cachedUser = null;
  hydrated = true;

  await Promise.all([removeKey(TOKEN_KEY), removeKey(USER_KEY)]);
}

export function getCachedToken(): string | null {
  return cachedToken;
}
