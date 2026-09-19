import { Debtor, Transaction, StoreSettings, Supplier, SupplierTransaction, AppUser } from '../types';
import { initialDebtors, initialTransactions, initialSettings, initialSuppliers, initialSupplierTransactions } from '../data/initialData';

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
    
    const mergedSettings: StoreSettings = { 
      ...initialSettings, 
      ...parsed, 
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
