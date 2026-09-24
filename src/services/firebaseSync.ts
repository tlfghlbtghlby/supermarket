import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Debtor, Transaction, StoreSettings } from '../types';

export interface SyncState {
  isOnline: boolean;
  hasPendingWrites: boolean;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  authReady: boolean;
}

// Subscribe to Debtors in real-time
export function subscribeToDebtors(
  userId: string,
  onUpdate: (debtors: Debtor[]) => void,
  onError?: (error: Error) => void
) {
  const path = 'debtors';
  const q = query(collection(db, path), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const debtors: Debtor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Debtor;
        debtors.push({
          id: data.id,
          name: data.name,
          phone: data.phone || '',
          address: data.address || '',
          notes: data.notes || '',
          creditLimit: data.creditLimit,
          createdAt: data.createdAt,
        });
      });
      onUpdate(debtors);
    },
    (error) => {
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore debtors snapshot note:', e);
      }
    }
  );
}

// Subscribe to Transactions in real-time
export function subscribeToTransactions(
  userId: string,
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void
) {
  const path = 'transactions';
  const q = query(collection(db, path), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const transactions: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Transaction;
        transactions.push({
          id: data.id,
          debtorId: data.debtorId,
          type: data.type,
          amount: data.amount,
          date: data.date,
          description: data.description,
          notes: data.notes || undefined,
          paymentMethod: data.paymentMethod,
          invoiceNumber: data.invoiceNumber,
        });
      });
      onUpdate(transactions);
    },
    (error) => {
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore transactions snapshot note:', e);
      }
    }
  );
}

// Subscribe to Settings in real-time
export function subscribeToSettings(
  userId: string,
  onUpdate: (settings: StoreSettings | null) => void,
  onError?: (error: Error) => void
) {
  const path = `settings/${userId}`;
  const docRef = doc(db, 'settings', userId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as StoreSettings);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore settings snapshot note:', e);
      }
    }
  );
}

// Add or Update Debtor
export async function syncDebtor(debtor: Debtor, userId: string): Promise<void> {
  const path = `debtors/${debtor.id}`;
  try {
    const docRef = doc(db, 'debtors', debtor.id);
    const payload: any = {
      id: debtor.id,
      userId,
      name: debtor.name,
      createdAt: debtor.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (debtor.phone) payload.phone = debtor.phone;
    if (debtor.address) payload.address = debtor.address;
    if (debtor.notes) payload.notes = debtor.notes;
    if (debtor.creditLimit !== undefined && debtor.creditLimit !== null) {
      payload.creditLimit = Number(debtor.creditLimit);
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete Debtor and cascade transactions
export async function removeDebtor(debtorId: string, userId: string): Promise<void> {
  const path = `debtors/${debtorId}`;
  try {
    await deleteDoc(doc(db, 'debtors', debtorId));

    // Also remove transactions associated with this debtor
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('debtorId', '==', debtorId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Add or Update Transaction
export async function syncTransaction(tx: Transaction, userId: string): Promise<void> {
  const path = `transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'transactions', tx.id);
    const payload: any = {
      id: tx.id,
      userId,
      debtorId: tx.debtorId,
      type: tx.type,
      amount: Number(tx.amount),
      date: tx.date || new Date().toISOString(),
      description: tx.description || '',
      createdAt: new Date().toISOString(),
    };
    if (tx.notes) payload.notes = tx.notes;
    if (tx.paymentMethod) payload.paymentMethod = tx.paymentMethod;
    if (tx.invoiceNumber) payload.invoiceNumber = tx.invoiceNumber;
    if (tx.groupName) payload.groupName = tx.groupName;

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete Transaction
export async function removeTransaction(txId: string): Promise<void> {
  const path = `transactions/${txId}`;
  try {
    await deleteDoc(doc(db, 'transactions', txId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Update Transaction Notes
export async function updateTransactionNotesInFirestore(
  txId: string,
  notes: string
): Promise<void> {
  const path = `transactions/${txId}`;
  try {
    const docRef = doc(db, 'transactions', txId);
    await setDoc(docRef, { notes: notes.trim() || '' }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Update Transaction Group Name
export async function updateTransactionGroupInFirestore(
  txId: string,
  groupName: string
): Promise<void> {
  const path = `transactions/${txId}`;
  try {
    const docRef = doc(db, 'transactions', txId);
    await setDoc(docRef, { groupName: groupName.trim() || '' }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Save Settings
export async function syncStoreSettings(settings: StoreSettings, userId: string): Promise<void> {
  const path = `settings/${userId}`;
  try {
    const docRef = doc(db, 'settings', userId);
    await setDoc(
      docRef,
      {
        id: userId,
        userId,
        storeName: settings.storeName,
        ownerName: settings.ownerName || '',
        ownerEmail: settings.ownerEmail || 'example@gmail.com',
        ownerPasswordCode: settings.ownerPasswordCode || '123123',
        shopCode: settings.shopCode || 'G781011',
        phone: settings.phone || '',
        address: settings.address || '',
        currency: settings.currency || 'د.ع',
        customCurrencyName: settings.customCurrencyName || 'دينار عراقي',
        customWhatsAppMessage: settings.customWhatsAppMessage || '',
        telegramBotToken: settings.telegramBotToken || '8804502479:AAEpAGxY53toTCSoIKiMdMs9yGR8arahR-Q',
        telegramBotUsername: settings.telegramBotUsername || 'deptstbot',
        telegramChatId: settings.telegramChatId || '',
        telegramOwnerName: settings.telegramOwnerName || '',
        enableTelegramAlerts: settings.enableTelegramAlerts ?? true,
        enableDailyMidnightReport: settings.enableDailyMidnightReport ?? true,
        lastDailyMidnightReportDate: settings.lastDailyMidnightReportDate || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Initial upload/merge of local data into user's Firestore cloud storage
export async function uploadLocalDataToCloud(
  debtors: Debtor[],
  transactions: Transaction[],
  settings: StoreSettings,
  userId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Settings
    const settingsRef = doc(db, 'settings', userId);
    batch.set(
      settingsRef,
      {
        id: userId,
        userId,
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Debtors
    for (const d of debtors) {
      const dRef = doc(db, 'debtors', d.id);
      const payload: any = {
        id: d.id,
        userId,
        name: d.name,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (d.phone) payload.phone = d.phone;
      if (d.address) payload.address = d.address;
      if (d.notes) payload.notes = d.notes;
      if (d.creditLimit) payload.creditLimit = Number(d.creditLimit);
      batch.set(dRef, payload, { merge: true });
    }

    // Transactions
    for (const t of transactions) {
      const tRef = doc(db, 'transactions', t.id);
      const payload: any = {
        id: t.id,
        userId,
        debtorId: t.debtorId,
        type: t.type,
        amount: Number(t.amount),
        date: t.date,
        description: t.description,
        createdAt: new Date().toISOString(),
      };
      if (t.notes) payload.notes = t.notes;
      if (t.paymentMethod) payload.paymentMethod = t.paymentMethod;
      if (t.invoiceNumber) payload.invoiceNumber = t.invoiceNumber;
      batch.set(tRef, payload, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `batch-upload/${userId}`);
  }
}
