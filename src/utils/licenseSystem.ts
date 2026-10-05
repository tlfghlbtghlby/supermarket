import { doc, getDoc, setDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const ADMIN_OFFICIAL_EMAIL = 'tlfghlbtghlby@gmail.com';
export const ADMIN_OFFICIAL_WHATSAPP = '+9647723489319';
export const ADMIN_OFFICIAL_WHATSAPP_CLEAN = '9647723489319';

export type LicensePlan = 'trial' | '1_month' | '2_months' | '1_year' | 'lifetime' | 'custom';

export type LicenseStatus = 'trial' | 'active' | 'expired';

export interface LicenseRecord {
  id: string; // The User ID / HWID (e.g. "HWID-A48F-992B")
  userId: string;
  status: LicenseStatus;
  trialStartDate: string; // ISO
  trialEndDate: string; // ISO (trialStartDate + 15 days)
  expiresAt: string; // ISO timestamp
  plan: LicensePlan;
  activatedAt?: string;
  activatedBy?: string; // e.g. "tlfghlbtghlby@gmail.com"
  clientName?: string;
  notes?: string;
  updatedAt: string;
}

export interface LicenseEvaluation {
  license: LicenseRecord;
  isReadOnly: boolean;
  isAdmin: boolean;
  isTrial: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  formattedExpiresAt: string;
}

const HWID_STORAGE_KEY = 'supermarket_hwid';
const LICENSE_STORAGE_KEY = 'supermarket_license_data';

/**
 * Generates an uppercase unique Hardware/Device ID (User ID / HWID)
 * Example: HWID-7A3F-9K2B
 */
export function generateHwid(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HWID-${part1}-${part2}`;
}

/**
 * Retrieves or creates a persistent unique HWID for this device/browser
 */
export function getOrCreateHwid(): string {
  if (typeof window === 'undefined') return 'HWID-DEFAULT-0001';
  try {
    let hwid = localStorage.getItem(HWID_STORAGE_KEY);
    if (!hwid || hwid.length < 8) {
      hwid = generateHwid();
      localStorage.setItem(HWID_STORAGE_KEY, hwid);
    }
    return hwid;
  } catch {
    return 'HWID-CLIENT-0001';
  }
}

/**
 * Verifies if the current logged-in user or account is the official admin
 */
export function isOfficialAdmin(
  firebaseUser?: { email?: string | null } | null,
  appUser?: { email?: string; phone?: string; role?: string } | null,
  settings?: { ownerEmail?: string } | null
): boolean {
  const target = ADMIN_OFFICIAL_EMAIL.toLowerCase().trim();
  if (firebaseUser?.email && firebaseUser.email.toLowerCase().trim() === target) {
    return true;
  }
  if (appUser?.email && appUser.email.toLowerCase().trim() === target) {
    return true;
  }
  if (appUser?.phone && appUser.phone.toLowerCase().trim() === target) {
    return true;
  }
  if (settings?.ownerEmail && settings.ownerEmail.toLowerCase().trim() === target) {
    return true;
  }
  return false;
}

/**
 * Creates default 15-day trial license record
 */
export function createDefaultTrialLicense(hwid: string): LicenseRecord {
  const now = new Date();
  const trialDays = 15;
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  return {
    id: hwid,
    userId: hwid,
    status: 'trial',
    trialStartDate: now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    expiresAt: trialEnd.toISOString(),
    plan: 'trial',
    updatedAt: now.toISOString(),
  };
}

/**
 * Loads current license from localStorage or initializes a 15-day trial
 */
export function loadLocalLicense(): LicenseRecord {
  const hwid = getOrCreateHwid();
  if (typeof window === 'undefined') {
    return createDefaultTrialLicense(hwid);
  }

  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.expiresAt) {
        // Ensure userId matches hwid if needed
        return {
          ...parsed,
          id: parsed.id || hwid,
          userId: parsed.userId || hwid,
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse local license:', e);
  }

  // Not found: create new trial and store
  const newTrial = createDefaultTrialLicense(hwid);
  saveLocalLicense(newTrial);
  return newTrial;
}

/**
 * Saves license record to localStorage and dispatches a change event
 */
export function saveLocalLicense(license: LicenseRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
    window.dispatchEvent(new CustomEvent('license_updated', { detail: license }));
  } catch (e) {
    console.error('Failed to save local license:', e);
  }
}

/**
 * Evaluates whether the application is in Read-Only mode and calculates remaining time
 */
export function evaluateLicense(license: LicenseRecord, isAdmin: boolean): LicenseEvaluation {
  const now = Date.now();
  const expiresTimestamp = new Date(license.expiresAt).getTime();
  const diffMs = expiresTimestamp - now;

  let formattedExpiresAt = '';
  try {
    const dateObj = new Date(license.expiresAt);
    formattedExpiresAt = dateObj.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    formattedExpiresAt = license.expiresAt;
  }

  // Admin always has full access
  if (isAdmin) {
    return {
      license,
      isReadOnly: false,
      isAdmin: true,
      isTrial: false,
      daysRemaining: 9999,
      hoursRemaining: 99999,
      formattedExpiresAt,
    };
  }

  const isExpired = diffMs <= 0;
  const daysRemaining = isExpired ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = isExpired ? 0 : Math.ceil(diffMs / (1000 * 60 * 60));

  const effectiveStatus: LicenseStatus = isExpired ? 'expired' : license.plan === 'trial' ? 'trial' : 'active';

  return {
    license: {
      ...license,
      status: effectiveStatus,
    },
    isReadOnly: isExpired,
    isAdmin: false,
    isTrial: license.plan === 'trial' && !isExpired,
    daysRemaining,
    hoursRemaining,
    formattedExpiresAt,
  };
}

/**
 * Syncs the local license to Firestore if not already registered
 */
export async function syncLicenseToCloud(license: LicenseRecord): Promise<void> {
  if (!db) return;
  try {
    const licenseRef = doc(db, 'licenses', license.id);
    const existing = await getDoc(licenseRef);
    if (!existing.exists()) {
      // First-time registration of this device's trial in Firestore
      await setDoc(licenseRef, {
        ...license,
        registeredAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    // If offline, fail silently; local trial still functions
    console.warn('Sync license to cloud deferred/offline:', err);
  }
}

/**
 * Subscribes in real-time to the Firestore license document for this device/user
 */
export function subscribeToRemoteLicense(
  licenseId: string,
  onUpdate: (license: LicenseRecord) => void
): () => void {
  if (!db || !licenseId) return () => {};

  try {
    const licenseRef = doc(db, 'licenses', licenseId);
    const unsubscribe = onSnapshot(
      licenseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as Partial<LicenseRecord>;
          if (remoteData.expiresAt && remoteData.status) {
            const current = loadLocalLicense();
            const merged: LicenseRecord = {
              ...current,
              id: licenseId,
              userId: licenseId,
              status: remoteData.status as LicenseStatus,
              expiresAt: remoteData.expiresAt,
              plan: (remoteData.plan as LicensePlan) || current.plan,
              activatedAt: remoteData.activatedAt || current.activatedAt,
              activatedBy: remoteData.activatedBy || current.activatedBy,
              clientName: remoteData.clientName || current.clientName,
              notes: remoteData.notes || current.notes,
              updatedAt: remoteData.updatedAt || new Date().toISOString(),
            };
            saveLocalLicense(merged);
            onUpdate(merged);
          }
        }
      },
      (error) => {
        console.warn('Real-time license listener error:', error);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Failed to attach license listener:', e);
    return () => {};
  }
}

/**
 * Admin Action: Activates or extends a user's subscription in Firestore
 * @param targetUserId The HWID or User ID entered by the admin
 * @param plan Duration option ('1_month', '2_months', '1_year', 'lifetime', or number of days)
 * @param clientName Optional store or client name
 * @param notes Optional admin notes
 * @param extendExisting Whether to add days onto current remaining expiry date or start from now
 */
export async function activateUserLicense(
  targetUserId: string,
  plan: LicensePlan | number,
  clientName?: string,
  notes?: string,
  extendExisting: boolean = true
): Promise<LicenseRecord> {
  const cleanId = targetUserId.trim().toUpperCase();
  if (!cleanId) {
    throw new Error('يرجى إدخال رمز المستخدم (User ID / HWID) بشكل صحيح.');
  }

  const now = new Date();
  let daysToAdd = 30;
  let planKey: LicensePlan = '1_month';

  if (typeof plan === 'number') {
    daysToAdd = plan;
    planKey = 'custom';
  } else if (plan === '1_month') {
    daysToAdd = 30;
    planKey = '1_month';
  } else if (plan === '2_months') {
    daysToAdd = 60;
    planKey = '2_months';
  } else if (plan === '1_year') {
    daysToAdd = 365;
    planKey = '1_year';
  } else if (plan === 'lifetime') {
    daysToAdd = 365 * 50; // 50 years
    planKey = 'lifetime';
  } else {
    daysToAdd = 30;
    planKey = 'custom';
  }

  let baseDate = now;
  // If user already exists in Firestore, check if their active subscription hasn't expired yet
  if (extendExisting && db) {
    try {
      const snap = await getDoc(doc(db, 'licenses', cleanId));
      if (snap.exists()) {
        const existingData = snap.data();
        if (existingData?.expiresAt) {
          const exp = new Date(existingData.expiresAt);
          if (exp.getTime() > now.getTime()) {
            baseDate = exp; // Extend from current expiration date!
          }
        }
      }
    } catch (e) {
      console.warn('Could not read existing doc to extend, starting from now:', e);
    }
  }

  const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  const updatedRecord: LicenseRecord = {
    id: cleanId,
    userId: cleanId,
    status: 'active',
    trialStartDate: now.toISOString(),
    trialEndDate: new Date(now.getTime() + 15 * 86400000).toISOString(),
    expiresAt: newExpiry.toISOString(),
    plan: planKey,
    activatedAt: now.toISOString(),
    activatedBy: ADMIN_OFFICIAL_EMAIL,
    clientName: clientName?.trim() || '',
    notes: notes?.trim() || '',
    updatedAt: now.toISOString(),
  };

  // 1. Write to Firestore database
  if (db) {
    const licenseRef = doc(db, 'licenses', cleanId);
    await setDoc(licenseRef, updatedRecord, { merge: true });
  }

  // 2. If the activated user is the current local machine, update local storage immediately
  const localHwid = getOrCreateHwid().toUpperCase();
  if (cleanId === localHwid) {
    saveLocalLicense(updatedRecord);
  }

  return updatedRecord;
}

/**
 * Admin Action: Fetches all license records from Firestore
 */
export async function fetchAllCloudLicenses(): Promise<LicenseRecord[]> {
  if (!db) return [];
  try {
    const colRef = collection(db, 'licenses');
    const snap = await getDocs(colRef);
    const list: LicenseRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as Partial<LicenseRecord>;
      if (data.id && data.expiresAt) {
        list.push({
          id: d.id,
          userId: data.userId || d.id,
          status: (data.status as LicenseStatus) || 'trial',
          trialStartDate: data.trialStartDate || new Date().toISOString(),
          trialEndDate: data.trialEndDate || new Date().toISOString(),
          expiresAt: data.expiresAt,
          plan: (data.plan as LicensePlan) || 'trial',
          activatedAt: data.activatedAt,
          activatedBy: data.activatedBy,
          clientName: data.clientName,
          notes: data.notes,
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    });

    // Sort by latest updated/created
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  } catch (err) {
    console.error('Failed to fetch cloud licenses:', err);
    return [];
  }
}
