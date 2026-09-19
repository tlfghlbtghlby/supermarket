import { useState, useEffect, useCallback, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  loginWithGoogle,
  loginWithEmailOrPhone,
  registerWithEmailOrPhone,
  resetPasswordForUser,
  logoutUser,
  testFirestoreConnection,
} from '../lib/firebase';
import { Debtor, Transaction, StoreSettings } from '../types';
import { initialSettings } from '../data/initialData';
import {
  subscribeToDebtors,
  subscribeToTransactions,
  subscribeToSettings,
  syncDebtor,
  removeDebtor,
  syncTransaction,
  removeTransaction,
  updateTransactionNotesInFirestore,
  updateTransactionGroupInFirestore,
  syncStoreSettings,
  uploadLocalDataToCloud,
} from '../services/firebaseSync';
import {
  loadDebtors,
  saveDebtors,
  loadTransactions,
  saveTransactions,
  loadSettings,
  saveSettings,
  clearAllLocalStoreData,
} from '../utils/storage';

export function useFirebaseSync() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Local state - starts zeroed/clean
  const [debtors, setDebtors] = useState<Debtor[]>(() => loadDebtors());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [settings, setSettings] = useState<StoreSettings>(() => loadSettings());

  const isCloudSynced = Boolean(user);
  const initialUploadDoneRef = useRef(false);

  // Monitor online / offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncedAt(new Date());
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Test connection
        testFirestoreConnection().catch(() => {});
      } else {
        // When not logged in, clear in-memory state to ensure zeroed out view
        setDebtors([]);
        setTransactions([]);
        clearAllLocalStoreData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time updates when user is authenticated
  useEffect(() => {
    if (!user) {
      setDebtors([]);
      setTransactions([]);
      return;
    }

    setIsSyncing(true);
    let unsubDebtors: (() => void) | null = null;
    let unsubTransactions: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    try {
      unsubDebtors = subscribeToDebtors(
        user.uid,
        (cloudDebtors) => {
          // Always synchronize cloud state directly
          setDebtors(cloudDebtors);
          saveDebtors(cloudDebtors);
          setLastSyncedAt(new Date());
          setIsSyncing(false);
        },
        (err) => {
          console.warn('Firestore debtors sync note:', err.message);
          setSyncError(err.message);
          setIsSyncing(false);
        }
      );

      unsubTransactions = subscribeToTransactions(
        user.uid,
        (cloudTransactions) => {
          setTransactions(cloudTransactions);
          saveTransactions(cloudTransactions);
          setLastSyncedAt(new Date());
          setIsSyncing(false);
        },
        (err) => {
          console.warn('Firestore transactions sync note:', err.message);
          setSyncError(err.message);
          setIsSyncing(false);
        }
      );

      unsubSettings = subscribeToSettings(
        user.uid,
        (cloudSettings) => {
          if (cloudSettings && cloudSettings.storeName) {
            setSettings(cloudSettings);
            saveSettings(cloudSettings);
          } else {
            // First time login - initialize settings with user's name if available
            const defaultSet: StoreSettings = {
              ...initialSettings,
              ownerName: user.displayName || '',
              storeName: user.displayName ? `سوبرماركت ${user.displayName}` : 'دفتر ديون السوبرماركت',
            };
            syncStoreSettings(defaultSet, user.uid).catch(() => {});
          }
          setLastSyncedAt(new Date());
          setIsSyncing(false);
        },
        (err) => {
          console.warn('Firestore settings sync note:', err.message);
          setSyncError(err.message);
          setIsSyncing(false);
        }
      );
    } catch (e: any) {
      setSyncError(e.message);
      setIsSyncing(false);
    }

    return () => {
      unsubDebtors?.();
      unsubTransactions?.();
      unsubSettings?.();
    };
  }, [user]);

  // Operations: Debtor
  const saveDebtor = useCallback(
    async (debtorData: Omit<Debtor, 'id' | 'createdAt'>, existingId?: string) => {
      let targetDebtor: Debtor;

      if (existingId) {
        const existing = debtors.find((d) => d.id === existingId);
        targetDebtor = {
          ...debtorData,
          id: existingId,
          createdAt: existing ? existing.createdAt : new Date().toISOString(),
        };
        const updated = debtors.map((d) => (d.id === existingId ? targetDebtor : d));
        setDebtors(updated);
        saveDebtors(updated);
      } else {
        targetDebtor = {
          ...debtorData,
          id: `deb-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        const updated = [targetDebtor, ...debtors];
        setDebtors(updated);
        saveDebtors(updated);
      }

      // Sync to cloud if user is logged in
      if (user) {
        try {
          setIsSyncing(true);
          await syncDebtor(targetDebtor, user.uid);
          setLastSyncedAt(new Date());
        } catch (err: any) {
          console.warn('Debtor cloud sync queued / error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
      return targetDebtor;
    },
    [debtors, user]
  );

  const deleteDebtor = useCallback(
    async (debtorId: string) => {
      const updatedDebtors = debtors.filter((d) => d.id !== debtorId);
      const updatedTx = transactions.filter((t) => t.debtorId !== debtorId);
      setDebtors(updatedDebtors);
      saveDebtors(updatedDebtors);
      setTransactions(updatedTx);
      saveTransactions(updatedTx);

      if (user) {
        try {
          setIsSyncing(true);
          await removeDebtor(debtorId, user.uid);
          setLastSyncedAt(new Date());
        } catch (err: any) {
          console.warn('Delete debtor cloud sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [debtors, transactions, user]
  );

  // Operations: Transaction
  const addTransaction = useCallback(
    async (data: {
      debtorId: string;
      type: 'DEBT' | 'PAYMENT';
      amount: number;
      description: string;
      notes?: string;
      paymentMethod?: any;
      invoiceNumber?: string;
      date: string;
    }) => {
      const newTx: Transaction = {
        id: `trx-${Date.now()}`,
        debtorId: data.debtorId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        notes: data.notes || undefined,
        paymentMethod: data.paymentMethod,
        invoiceNumber: data.invoiceNumber,
        date: data.date,
      };

      const updatedTx = [...transactions, newTx];
      setTransactions(updatedTx);
      saveTransactions(updatedTx);

      if (user) {
        try {
          setIsSyncing(true);
          await syncTransaction(newTx, user.uid);
          setLastSyncedAt(new Date());
        } catch (err: any) {
          console.warn('Transaction cloud sync queued / error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
      return newTx;
    },
    [transactions, user]
  );

  const updateTransactionNotes = useCallback(
    async (transactionId: string, newNotes: string) => {
      const trimmed = newNotes.trim();
      const updated = transactions.map((t) =>
        t.id === transactionId ? { ...t, notes: trimmed ? trimmed : undefined } : t
      );
      setTransactions(updated);
      saveTransactions(updated);

      if (user) {
        try {
          setIsSyncing(true);
          await updateTransactionNotesInFirestore(transactionId, trimmed);
          setLastSyncedAt(new Date());
        } catch (err: any) {
          console.warn('Transaction notes cloud sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [transactions, user]
  );

  const updateTransactionGroup = useCallback(
    async (transactionId: string, groupName: string) => {
      const trimmed = groupName.trim();
      const updated = transactions.map((t) =>
        t.id === transactionId ? { ...t, groupName: trimmed ? trimmed : undefined } : t
      );
      setTransactions(updated);
      saveTransactions(updated);

      if (user) {
        try {
          setIsSyncing(true);
          await updateTransactionGroupInFirestore(transactionId, trimmed);
          setLastSyncedAt(new Date());
        } catch (err: any) {
          console.warn('Transaction group cloud sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [transactions, user]
  );

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      const updated = transactions.filter((t) => t.id !== transactionId);
      setTransactions(updated);
      saveTransactions(updated);

      if (user) {
        try {
          setIsSyncing(true);
          await removeTransaction(transactionId);
          setLastSyncedAt(new Date());
        } catch (err: any) {
          console.warn('Delete transaction cloud sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [transactions, user]
  );

  // Operations: Settings
  const saveStoreSettings = useCallback(
    async (newSettings: StoreSettings) => {
      setSettings(newSettings);
      saveSettings(newSettings);

      if (user) {
        try {
          setIsSyncing(true);
          await syncStoreSettings(newSettings, user.uid);
          setLastSyncedAt(new Date());
        } catch (err: any) {
          console.warn('Settings cloud sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [user]
  );

  // Manual Sync trigger
  const forceSyncToCloud = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await uploadLocalDataToCloud(debtors, transactions, settings, user.uid);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      console.error('Force sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, debtors, transactions, settings]);

  const reloadDataFromStorage = useCallback(() => {
    setDebtors(loadDebtors());
    setTransactions(loadTransactions());
    setSettings(loadSettings());
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
      setDebtors([]);
      setTransactions([]);
      setSettings(initialSettings);
      clearAllLocalStoreData();
    } catch (e) {
      console.error('Logout error', e);
    }
  }, []);

  return {
    user,
    authLoading,
    isOnline,
    isSyncing,
    isCloudSynced,
    lastSyncedAt,
    syncError,
    debtors,
    transactions,
    settings,
    saveDebtor,
    deleteDebtor,
    addTransaction,
    updateTransactionNotes,
    updateTransactionGroup,
    deleteTransaction,
    saveStoreSettings,
    forceSyncToCloud,
    reloadDataFromStorage,
    loginWithGoogle,
    loginWithEmailOrPhone,
    registerWithEmailOrPhone,
    resetPasswordForUser,
    logoutUser: logout,
  };
}
