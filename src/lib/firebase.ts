import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDocFromServer,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const env = (import.meta as any)?.env || {};

const activeConfig = {
  ...firebaseConfig,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    `${env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId}.firebaseapp.com`,
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    `${env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId}.firebasestorage.app`,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

export const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with multi-tab offline persistence
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId
  );
} catch {
  // If already initialized or fallback
  firestoreDb = getFirestore(app, databaseId);
}

export const db = firestoreDb;

// Standard Firestore Error Handling conforming to Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3500)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise,
    ]);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is currently in offline mode.');
    }
    return false;
  }
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      // User tapped outside or closed the popup; handle gracefully without console.error
      console.warn('Google sign-in popup closed by user.');
      return null;
    }
    console.error('Google popup login error:', error);
    if (error?.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectError) {
        throw redirectError;
      }
    }
    throw error;
  }
}

export async function checkRedirectAuthResult() {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error) {
    console.warn('Redirect auth result check:', error);
    return null;
  }
}

export async function loginAnonymously() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Anonymous login error:', error);
    throw error;
  }
}

export function normalizeArabicDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}

export function normalizePhoneNumber(input: string): string {
  let digits = normalizeArabicDigits(input).replace(/[^0-9]/g, '');
  if (digits.startsWith('00964')) digits = digits.substring(5);
  else if (digits.startsWith('964')) digits = digits.substring(3);
  if (digits.startsWith('0')) digits = digits.substring(1);
  return digits;
}

export function formatAuthEmail(input: string): string {
  const trimmed = normalizeArabicDigits(input.trim());
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  // User entered phone number or account ID
  const phoneDigits = normalizePhoneNumber(trimmed);
  if (phoneDigits.length >= 6) {
    return `phone_${phoneDigits}@supermarket.app`;
  }
  const clean = trimmed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${clean || 'user'}@supermarket.app`;
}

export async function loginWithEmailOrPhone(identifier: string, password: string) {
  const email = formatAuthEmail(identifier);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmailOrPhone(
  identifier: string,
  password: string,
  displayName?: string
) {
  const email = formatAuthEmail(identifier);
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

export async function resetPasswordForUser(identifier: string) {
  const email = formatAuthEmail(identifier);
  await sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

export { enableNetwork, disableNetwork };
