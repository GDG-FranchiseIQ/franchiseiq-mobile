import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, type FirebaseApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import { hasFirebaseConfig, getExtra } from "./config";

let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) return null;
  if (getApps().length) return getApp();
  const cfg = getExtra().firebase!;
  return initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  });
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (auth) return auth;
  try {
    auth = initializeAuth(a, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(a);
  }
  return auth;
}

/** Returns Firebase ID token or dev placeholder when Firebase is not configured. */
export async function getIdTokenForBackend(): Promise<string> {
  const a = getFirebaseAuth();
  if (!a?.currentUser) {
    return "dev-anonymous-token";
  }
  return a.currentUser.getIdToken();
}
