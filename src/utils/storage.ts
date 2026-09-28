import { Debtor, Transaction, StoreSettings, Supplier, SupplierTransaction, AppUser } from '../types';
import { initialDebtors, initialTransactions, initialSettings, initialSuppliers, initialSupplierTransactions } from '../data/initialData';
import { generateUniqueAccountCode } from './accountCode';

const DEBTORS_KEY = 'supermarket_debtors_v1';
const TRANSACTIONS_KEY = 'supermarket_transactions_v1';
const SETTINGS_KEY = 'supermarket_settings_v1';
const SUPPLIERS_KEY = 'supermarket_suppliers_v1';
const SUPPLIER_TRANSACTIONS_KEY = 'supermarket_supplier_transactions_v1';
const APP_USER_KEY = 'supermarket_app_user_v1';

export function loadDebtors(): Debtor[] {
  try {
    const raw = localStorage.getItem(DEBTORS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load debtors from localStorage', e);
    return [];
  }
}

export function saveDebtors(debtors: Debtor[]): void {
  try {
    localStorage.setItem(DEBTORS_KEY, JSON.stringify(debtors));
  } catch (e) {
    console.error('Failed to save debtors', e);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load transactions from localStorage', e);
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions', e);
  }
}

// Suppliers Persistence
export function loadSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(SUPPLIERS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load suppliers from localStorage', e);
    return [];
  }
}

export function saveSuppliers(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
  } catch (e) {
    console.error('Failed to save suppliers', e);
  }
}

export function loadSupplierTransactions(): SupplierTransaction[] {
  try {
    const raw = localStorage.getItem(SUPPLIER_TRANSACTIONS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load supplier transactions from localStorage', e);
    return [];
  }
}

export function saveSupplierTransactions(transactions: SupplierTransaction[]): void {
  try {
    localStorage.setItem(SUPPLIER_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save supplier transactions', e);
  }
}

export function loadSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      saveSettings(initialSettings);
      return initialSettings;
    }
    const parsed = JSON.parse(raw);
    const resolvedCurrency = (parsed.currency && parsed.currency !== 'د.ع' && parsed.currency !== '$') 
      ? parsed.currency 
      : 'دينار عراقي';
    
    const userShopCode =
      parsed.shopCode && parsed.shopCode !== 'G781011'
        ? parsed.shopCode
        : generateUniqueAccountCode(parsed.ownerEmail || parsed.phone || undefined);

    let localSessions = Array.isArray(parsed.deviceSessions) && parsed.deviceSessions.length > 0
      ? parsed.deviceSessions
      : [];
    if (localSessions.length === 0) {
      try {
        const rawLocal = localStorage.getItem('supermarket_device_sessions_v1');
        if (rawLocal) {
          const parsedLocal = JSON.parse(rawLocal);
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
            localSessions = parsedLocal;
          }
        }
      } catch {
        // ignore
      }
    }

    const mergedSettings: StoreSettings = { 
      ...initialSettings, 
      ...parsed, 
      deviceSessions: localSessions,
      mainDeviceId: parsed.mainDeviceId || undefined,
      ownerEmail: parsed.ownerEmail || initialSettings.ownerEmail || 'example@gmail.com',
      ownerPasswordCode: parsed.ownerPasswordCode || initialSettings.ownerPasswordCode || '123123',
      shopCode: userShopCode,
      telegramBotToken: parsed.telegramBotToken || '8804502479:AAEpAGxY53toTCSoIKiMdMs9yGR8arahR-Q',
      telegramBotUsername: parsed.telegramBotUsername || 'deptstbot',
      telegramChatId: parsed.telegramChatId || '',
      telegramOwnerName: parsed.telegramOwnerName || '',
      enableTelegramAlerts: parsed.enableTelegramAlerts ?? true,
      enableDailyMidnightReport: parsed.enableDailyMidnightReport ?? true,
      currency: resolvedCurrency,
      customCurrencyName: 'د.ع'
    };
    return mergedSettings;
  } catch (e) {
    console.error('Failed to load settings', e);
    return initialSettings;
  }
}

export function saveSettings(settings: StoreSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

// App User (Phone & Password Login)
const CURRENT_SESSION_KEY = 'supermarket_current_session_v1';
const SESSION_HISTORY_KEY = 'supermarket_session_history_v1';

export function loadCurrentSessionName(): string {
  try {
    const saved = localStorage.getItem(CURRENT_SESSION_KEY);
    return saved && saved.trim() ? saved.trim() : 'الجلسة 1';
  } catch {
    return 'الجلسة 1';
  }
}

export function saveCurrentSessionName(name: string): void {
  try {
    const clean = name.trim() || 'الجلسة 1';
    localStorage.setItem(CURRENT_SESSION_KEY, clean);

    const history = loadSessionHistory();
    if (!history.includes(clean)) {
      const updated = [clean, ...history.filter((h) => h !== clean)].slice(0, 10);
      localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to save session name', e);
  }
}

export function loadSessionHistory(): string[] {
  try {
    const raw = localStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return ['الجلسة 1', 'جلسة الصباح', 'جلسة المساء', 'كاشير 1'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : ['الجلسة 1', 'جلسة الصباح', 'جلسة المساء', 'كاشير 1'];
  } catch {
    return ['الجلسة 1', 'جلسة الصباح', 'جلسة المساء', 'كاشير 1'];
  }
}

export function loadAppUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(APP_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAppUser(user: AppUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(APP_USER_KEY);
    } else {
      localStorage.setItem(APP_USER_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Failed to save user', e);
  }
}

export function logoutAppUser(): void {
  saveAppUser(null);
}

export function clearAllLocalStoreData(): void {
  try {
    localStorage.removeItem(DEBTORS_KEY);
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(SUPPLIERS_KEY);
    localStorage.removeItem(SUPPLIER_TRANSACTIONS_KEY);
    localStorage.removeItem(APP_USER_KEY);
  } catch (e) {
    console.error('Failed to clear local store data', e);
  }
}

export function exportBackupData(): string {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    settings: loadSettings(),
    debtors: loadDebtors(),
    transactions: loadTransactions(),
    suppliers: loadSuppliers(),
    supplierTransactions: loadSupplierTransactions(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.debtors || !Array.isArray(parsed.debtors) || !parsed.transactions || !Array.isArray(parsed.transactions)) {
      return { success: false, message: 'ملف النسخة الاحتياطية غير صالح أو ناقص البيانات.' };
    }
    saveDebtors(parsed.debtors);
    saveTransactions(parsed.transactions);
    if (parsed.suppliers && Array.isArray(parsed.suppliers)) {
      saveSuppliers(parsed.suppliers);
    }
    if (parsed.supplierTransactions && Array.isArray(parsed.supplierTransactions)) {
      saveSupplierTransactions(parsed.supplierTransactions);
    }
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }
    return { success: true, message: 'تم استرجاع النسخة الاحتياطية بنجاح!' };
  } catch (e) {
    return { success: false, message: 'تعذر قراءة الملف، تأكد من سلامة ملف JSON.' };
  }
}

export function resetToSampleData(): void {
  clearAllLocalStoreData();
  saveDebtors([]);
  saveTransactions([]);
  saveSuppliers([]);
  saveSupplierTransactions([]);
  saveSettings(initialSettings);
}
