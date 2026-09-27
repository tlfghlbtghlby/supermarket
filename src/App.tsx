import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Debtor,
  StoreSettings,
  DebtorWithStats,
  DebtorFilter,
  DebtorSort,
  TransactionType,
  PaymentMethod,
  Supplier,
  SupplierTransaction,
  AppUser,
  DeviceSession,
} from './types';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useTheme } from './hooks/useTheme';
import {
  downloadExcelBackup,
  downloadPowerPointBackup,
} from './utils/backupGenerators';
import {
  computeDebtorStats,
  exportToCSV,
  formatCurrency,
  generateTransactionWhatsAppUrl,
  generateTransactionWhatsAppMessage,
} from './utils/formatters';
import { sendMetaCloudMessage } from './services/whatsappBot';
import {
  DEFAULT_TELEGRAM_BOT_TOKEN,
  checkAndLinkTelegramOwner,
  sendTelegramDebtAlert,
  sendTelegramDailyBackupReport,
} from './services/telegramBot';
import {
  loadDebtors,
  loadTransactions,
  loadSuppliers,
  saveSuppliers,
  loadSupplierTransactions,
  saveSupplierTransactions,
  loadAppUser,
  saveAppUser,
  logoutAppUser,
  loadCurrentSessionName,
  saveCurrentSessionName,
} from './utils/storage';
import { getOrCreateDeviceId, getInitialDeviceSessions } from './utils/deviceSession';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { DebtorList } from './components/DebtorList';
import { RecentTransactionsList } from './components/RecentTransactionsList';
import { DebtorDetailModal } from './components/DebtorDetailModal';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { VoiceTransactionModal } from './components/VoiceTransactionModal';
import { AddDebtorModal } from './components/AddDebtorModal';
import { SettingsModal } from './components/SettingsModal';
import { PrintStatement } from './components/PrintStatement';
import { SuppliersView } from './components/SuppliersView';
import { AuthModal } from './components/AuthModal';
import { SessionModal } from './components/SessionModal';
import { LoginScreen } from './components/LoginScreen';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import {
  CheckCircle2,
  AlertCircle,
  Users,
  PlusCircle,
  ArrowDownLeft,
  UserPlus,
  MessageCircle,
  X,
  ExternalLink,
  ShieldAlert,
  BookOpen,
  RefreshCw,
  Copy,
  Check,
  LogOut,
  Mic,
  Search,
  ChevronLeft,
  Wallet,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface WhatsAppAlertPrompt {
  debtorName: string;
  phone: string;
  url: string;
  messageText: string;
  type: TransactionType;
  amount: number;
  newBalance: number;
  autoOpened?: boolean;
}

export default function App() {
  const { isDark, toggleTheme, themeMode, setThemeMode } = useTheme();

  const {
    user,
    authLoading,
    isOnline,
    isSyncing,
    lastSyncedAt,
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
    logoutUser,
  } = useFirebaseSync();

  // Active View Switcher: 'DEBTORS' (تاريخ الحركات) vs 'CUSTOMERS' (واجهة الزبائن الكاملة) vs 'DASHBOARD' vs 'SUPPLIERS'
  const [activeView, setActiveView] = useState<'DEBTORS' | 'CUSTOMERS' | 'DASHBOARD' | 'SUPPLIERS'>('DEBTORS');

  // Supplier state
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadSuppliers());
  const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransaction[]>(() =>
    loadSupplierTransactions()
  );

  // Phone Auth State
  const [appUser, setAppUser] = useState<AppUser | null>(() => loadAppUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState<DebtorFilter>('ALL');
  const [currentSort, setCurrentSort] = useState<DebtorSort>('HIGHEST_DEBT');

  // Modals state
  const [isAddDebtorOpen, setIsAddDebtorOpen] = useState(false);
  const [debtorToEdit, setDebtorToEdit] = useState<Debtor | null>(null);

  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<TransactionType>('DEBT');
  const [quickTxTargetDebtor, setQuickTxTargetDebtor] = useState<DebtorWithStats | null>(null);
  const [isVoiceTxOpen, setIsVoiceTxOpen] = useState(false);
  const [isGeminiAssistantOpen, setIsGeminiAssistantOpen] = useState(false);

  const [activeDebtorId, setActiveDebtorId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePrintDebtorId, setActivePrintDebtorId] = useState<string | null>(null);

  // Active Session State (تسمية الجلسة / المسؤول / الكاشير)
  const [currentSessionName, setCurrentSessionName] = useState<string>(() => loadCurrentSessionName());
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);

  // WhatsApp Prompt & Logout Confirm States
  const [whatsAppPrompt, setWhatsAppPrompt] = useState<WhatsAppAlertPrompt | null>(null);
  const [hasCopiedWhatsAppMsg, setHasCopiedWhatsAppMsg] = useState<boolean>(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);

  // Phone/Android Hardware & Gesture Back Button Handler
  const isPopStateRef = useRef(false);

  useEffect(() => {
    // Ensure base history state is initialized
    if (!window.history.state) {
      window.history.replaceState({ appRoot: true, view: 'DEBTORS' }, '');
    }

    const onPopState = () => {
      isPopStateRef.current = true;

      // Close topmost modal/overlay or return to main view
      if (isGeminiAssistantOpen) {
        setIsGeminiAssistantOpen(false);
      } else if (isSessionModalOpen) {
        setIsSessionModalOpen(false);
      } else if (activePrintDebtorId) {
        setActivePrintDebtorId(null);
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else if (isVoiceTxOpen) {
        setIsVoiceTxOpen(false);
      } else if (isQuickTxOpen) {
        setIsQuickTxOpen(false);
      } else if (isAddDebtorOpen) {
        setIsAddDebtorOpen(false);
        setDebtorToEdit(null);
      } else if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
      } else if (activeDebtorId) {
        setActiveDebtorId(null);
      } else if (activeView !== 'DEBTORS') {
        setActiveView('DEBTORS');
      }

      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [
    isSessionModalOpen,
    activePrintDebtorId,
    isSettingsOpen,
    isVoiceTxOpen,
    isQuickTxOpen,
    isAddDebtorOpen,
    isAuthModalOpen,
    activeDebtorId,
    activeView,
  ]);

  const handleOpenSessionModal = useCallback(() => {
    window.history.pushState({ modal: 'session' }, '');
    setIsSessionModalOpen(true);
  }, []);

  const handleCloseSessionModal = useCallback(() => {
    setIsSessionModalOpen(false);
    if (window.history.state?.modal === 'session' && !isPopStateRef.current) {
      window.history.back();
    }
  }, []);

  const handleSaveSessionName = useCallback((newName: string) => {
    const clean = newName.trim() || 'الجلسة 1';
    saveCurrentSessionName(clean);
    setCurrentSessionName(clean);

    // Update this device's session in settings.deviceSessions and save to storeSettings
    const devId = getOrCreateDeviceId();
    const existingSessions = settings.deviceSessions || [];
    let updatedSessions: DeviceSession[];

    const exists = existingSessions.some((s) => s.id === devId);
    if (exists) {
      updatedSessions = existingSessions.map((s) =>
        s.id === devId ? { ...s, name: clean, lastActiveAt: new Date().toISOString() } : s
      );
    } else {
      const initial = getInitialDeviceSessions(existingSessions, clean, settings.mainDeviceId);
      updatedSessions = initial.sessions;
    }

    const updatedSettings: StoreSettings = {
      ...settings,
      deviceSessions: updatedSessions,
    };
    saveStoreSettings(updatedSettings);

    showToast(`تم تعيين واعتماد الجلسة "${clean}" بنجاح.`);
  }, [settings, saveStoreSettings]);

  // Synchronize currentSessionName if settings.deviceSessions updates from cloud
  useEffect(() => {
    const devId = getOrCreateDeviceId();
    const mySession = (settings.deviceSessions || []).find((s) => s.id === devId);
    if (mySession && mySession.name && mySession.name.trim() && mySession.name !== currentSessionName) {
      setCurrentSessionName(mySession.name);
      saveCurrentSessionName(mySession.name);
    }
  }, [settings.deviceSessions, currentSessionName]);

  // View navigation helper that pushes state to history
  const handleViewChange = useCallback(
    (newView: 'DEBTORS' | 'CUSTOMERS' | 'DASHBOARD' | 'SUPPLIERS') => {
      if (newView !== activeView) {
        window.history.pushState({ view: newView }, '');
        setActiveView(newView);
      }
    },
    [activeView]
  );

  // Helper for opening debtor details with history
  const handleSelectDebtor = useCallback((debtorId: string) => {
    window.history.pushState({ debtorId }, '');
    setActiveDebtorId(debtorId);
  }, []);

  const handleCloseDebtorDetail = useCallback(() => {
    setActiveDebtorId(null);
    if (window.history.state?.debtorId && !isPopStateRef.current) {
      window.history.back();
    }
  }, []);

  const handleOpenAddDebtor = useCallback((toEdit: Debtor | null = null) => {
    setDebtorToEdit(toEdit);
    window.history.pushState({ modal: 'addDebtor' }, '');
    setIsAddDebtorOpen(true);
  }, []);

  const handleCloseAddDebtor = useCallback(() => {
    setIsAddDebtorOpen(false);
    setDebtorToEdit(null);
    if (window.history.state?.modal === 'addDebtor' && !isPopStateRef.current) {
      window.history.back();
    }
  }, []);

  const handleOpenQuickTx = useCallback((type: TransactionType, target: DebtorWithStats | null = null) => {
    setQuickTxType(type);
    setQuickTxTargetDebtor(target);
    window.history.pushState({ modal: 'quickTx' }, '');
    setIsQuickTxOpen(true);
  }, []);

  const handleCloseQuickTx = useCallback(() => {
    setIsQuickTxOpen(false);
    if (window.history.state?.modal === 'quickTx' && !isPopStateRef.current) {
      window.history.back();
    }
  }, []);

  const handleOpenVoiceTx = useCallback(() => {
    window.history.pushState({ modal: 'voiceTx' }, '');
    setIsVoiceTxOpen(true);
  }, []);

  const handleCloseVoiceTx = useCallback(() => {
    setIsVoiceTxOpen(false);
    if (window.history.state?.modal === 'voiceTx' && !isPopStateRef.current) {
      window.history.back();
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    window.history.pushState({ modal: 'settings' }, '');
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    if (window.history.state?.modal === 'settings' && !isPopStateRef.current) {
      window.history.back();
    }
  }, []);

  const handleOpenPrint = useCallback((id: string) => {
    window.history.pushState({ modal: 'print', id }, '');
    setActivePrintDebtorId(id);
  }, []);

  const handleClosePrint = useCallback(() => {
    setActivePrintDebtorId(null);
    if (window.history.state?.modal === 'print' && !isPopStateRef.current) {
      window.history.back();
    }
  }, []);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type?: 'success' | 'info' | 'warn';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Compute debtors with real-time stats
  const debtorsWithStats = useMemo(() => {
    return debtors.map((d) => computeDebtorStats(d, transactions));
  }, [debtors, transactions]);

  // Filter & Sort
  const filteredAndSortedDebtors = useMemo(() => {
    let list = [...debtorsWithStats];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          (d.address && d.address.toLowerCase().includes(q))
      );
    }

    // Filter
    if (currentFilter === 'ACTIVE_DEBT') {
      list = list.filter((d) => d.currentBalance > 0);
    } else if (currentFilter === 'SETTLED') {
      list = list.filter((d) => d.currentBalance === 0);
    } else if (currentFilter === 'OVER_LIMIT') {
      list = list.filter((d) => d.isOverLimit);
    }

    // Sort
    if (currentSort === 'HIGHEST_DEBT') {
      list.sort((a, b) => b.currentBalance - a.currentBalance);
    } else if (currentSort === 'LOWEST_DEBT') {
      list.sort((a, b) => a.currentBalance - b.currentBalance);
    } else if (currentSort === 'NEWEST_ACTIVITY') {
      list.sort((a, b) => {
        const timeA = a.lastTransactionDate ? new Date(a.lastTransactionDate).getTime() : 0;
        const timeB = b.lastTransactionDate ? new Date(b.lastTransactionDate).getTime() : 0;
        return timeB - timeA;
      });
    } else if (currentSort === 'NAME_ASC') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }

    return list;
  }, [debtorsWithStats, searchQuery, currentFilter, currentSort]);

  // 1. فحص والتعرف التلقائي على حساب صاحب المحل عند إرسال الرمز للبوت
  useEffect(() => {
    if (settings.telegramChatId || !settings.shopCode) return;

    const checkLinkInterval = async () => {
      try {
        const res = await checkAndLinkTelegramOwner(
          settings.shopCode,
          settings.storeName,
          settings.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN
        );
        if (res.success && res.chatId) {
          saveStoreSettings({
            ...settings,
            telegramChatId: res.chatId,
            telegramOwnerName: res.ownerName || '',
          });
          showToast(`🎉 تم ربط حساب تليجرام لصاحب المحل (${res.ownerName || ''}) بنجاح!`);
        }
      } catch (err) {
        console.warn('Auto telegram link check notice:', err);
      }
    };

    checkLinkInterval();
    const interval = setInterval(checkLinkInterval, 25000);
    return () => clearInterval(interval);
  }, [settings.telegramChatId, settings.shopCode, settings.storeName, settings.telegramBotToken, saveStoreSettings]);

  // 2. رفع نسخة وتقرير الديون يومياً الساعة 12:00 صباحاً لصاحب المحل على تليجرام
  useEffect(() => {
    if (!settings.telegramChatId || !settings.enableDailyMidnightReport) return;

    const checkAndRunMidnightReport = async () => {
      const now = new Date();
      const todayDateKey = now.toISOString().slice(0, 10);

      // إذا تم الإرسال مسبقاً لهذا اليوم، نتخطى
      if (settings.lastDailyMidnightReportDate === todayDateKey) return;

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // نافذة منتصف الليل (12:00 ص إلى 12:05 ص)
      if (currentHour === 0 && currentMinute <= 5) {
        try {
          const res = await sendTelegramDailyBackupReport(debtors, transactions, settings);
          if (res.success) {
            saveStoreSettings({
              ...settings,
              lastDailyMidnightReportDate: todayDateKey,
            });
            showToast('🌙 تم رفع وإرسال التقرير اليومي ونسخة الديون إلى تليجرام (الساعة 12:00 ص).');
          }
        } catch (e) {
          console.error('Midnight backup trigger error:', e);
        }
      }
    };

    // حساب التوقيت الدقيق حتى الساعة 12:00 صباحاً التالية
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

    const midnightTimer = setTimeout(async () => {
      if (settings.telegramChatId && settings.enableDailyMidnightReport) {
        const todayKey = new Date().toISOString().slice(0, 10);
        try {
          const res = await sendTelegramDailyBackupReport(debtors, transactions, settings);
          if (res.success) {
            saveStoreSettings({
              ...settings,
              lastDailyMidnightReportDate: todayKey,
            });
            showToast('🌙 تم رفع وإرسال التقرير اليومي للديون إلى تليجرام (الساعة 12:00 ص).');
          }
        } catch (err) {
          console.error('Scheduled midnight report error:', err);
        }
      }
    }, msUntilMidnight);

    const checkInterval = setInterval(checkAndRunMidnightReport, 60000);

    return () => {
      clearTimeout(midnightTimer);
      clearInterval(checkInterval);
    };
  }, [
    settings.telegramChatId,
    settings.enableDailyMidnightReport,
    settings.lastDailyMidnightReportDate,
    debtors,
    transactions,
    saveStoreSettings,
  ]);

  // Currently opened debtor in detail modal
  const activeDebtorDetail = useMemo(() => {
    if (!activeDebtorId) return null;
    return debtorsWithStats.find((d) => d.id === activeDebtorId) || null;
  }, [activeDebtorId, debtorsWithStats]);

  // Currently opened debtor for printing
  const activePrintDebtor = useMemo(() => {
    if (!activePrintDebtorId) return null;
    return debtorsWithStats.find((d) => d.id === activePrintDebtorId) || null;
  }, [activePrintDebtorId, debtorsWithStats]);

  // Handlers for Debtors
  const handleSaveDebtor = async (
    debtorData: Omit<Debtor, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    await saveDebtor(debtorData, existingId);
    if (existingId) {
      showToast(`تم تحديث بيانات الزبون "${debtorData.name}" بنجاح.`);
    } else {
      showToast(`تمت إضافة الزبون الجديد "${debtorData.name}" إلى دفتر الديون.`);
    }
  };

  const handleDeleteDebtor = async (debtorId: string, debtorName: string) => {
    if (
      confirm(
        `هل أنت متأكد من رغبتك في حذف الزبون "${debtorName}" وجميع حركات ديونه ومشترياته السابقة نهائياً؟`
      )
    ) {
      await deleteDebtor(debtorId);
      if (activeDebtorId === debtorId) {
        setActiveDebtorId(null);
      }
      showToast(`تم حذف الزبون "${debtorName}" وحساباته بنجاح.`);
    }
  };

  // Handlers for Transactions with WhatsApp Alert
  const handleAddTransaction = async (data: {
    debtorId: string;
    type: TransactionType;
    amount: number;
    description: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
    invoiceNumber?: string;
    date: string;
    autoOpenWhatsApp?: boolean;
    sessionName?: string;
  }) => {
    const targetDebtor = debtorsWithStats.find((d) => d.id === data.debtorId);
    const debtorName = targetDebtor?.name || 'الزبون';
    const previousBalance = targetDebtor?.currentBalance || 0;
    const newBalance =
      data.type === 'DEBT'
        ? previousBalance + data.amount
        : previousBalance - data.amount;

    // Strict credit limit verification
    if (
      settings.strictCreditLimit &&
      data.type === 'DEBT' &&
      targetDebtor?.creditLimit &&
      newBalance > targetDebtor.creditLimit
    ) {
      const confirmExceed = confirm(
        `تنبيه: الزبون "${debtorName}" لديه سقف ائتمان ${formatCurrency(
          targetDebtor.creditLimit,
          settings.currency
        )}. إضافة هذا الدين ستجعل الرصيد (${formatCurrency(
          newBalance,
          settings.currency
        )}) متجاوزاً للحد! هل ترغب بالاستمرار مع ذلك؟`
      );
      if (!confirmExceed) {
        showToast('تم إلغاء العملية بسبب تجاوز سقف الائتمان.', 'warn');
        return;
      }
    }

    const devId = getOrCreateDeviceId();
    const mySession = (settings.deviceSessions || []).find((s) => s.id === devId);
    const sessionToUse =
      data.sessionName?.trim() ||
      mySession?.name?.trim() ||
      currentSessionName?.trim() ||
      loadCurrentSessionName() ||
      'الجلسة 1';

    const newTx = await addTransaction({
      ...data,
      sessionName: sessionToUse,
    });

    if (data.type === 'DEBT') {
      showToast(
        `تم تسجيل دين بمبلغ ${formatCurrency(data.amount, settings.currency)} على حساب "${debtorName}".`
      );
    } else {
      showToast(
        `تم قبض وتسديد دفعة ${formatCurrency(data.amount, settings.currency)} من "${debtorName}".`
      );
    }

    // إرسال إشعار فوري لصاحب المحل على تليجرام عند تسجيل أي دين أو تسديد
    if (settings.enableTelegramAlerts && settings.telegramChatId) {
      sendTelegramDebtAlert(
        {
          ...(newTx || data),
          sessionName: sessionToUse,
          balanceAfter: newBalance,
        },
        targetDebtor || {
          id: data.debtorId,
          name: debtorName,
          phone: '',
          createdAt: new Date().toISOString(),
        },
        settings
      ).catch((err) => console.warn('Telegram debt alert error:', err));
    }

    // Trigger WhatsApp notification if debtor has phone number
    if (targetDebtor?.phone) {
      const messageParams = {
        storeName: settings.storeName,
        debtorName: targetDebtor.name,
        transactionType: data.type,
        transactionAmount: data.amount,
        previousBalance,
        newBalance,
        currency: settings.currency,
        description: data.description,
        date: data.date,
      };
      const waMsg = generateTransactionWhatsAppMessage(messageParams);
      const waUrl = generateTransactionWhatsAppUrl(targetDebtor.phone, messageParams);

      let opened = false;
      // If autoOpenWhatsApp is true and waUrl exists, also attempt direct tab opening
      if (waUrl && (data as any).autoOpenWhatsApp !== false) {
        try {
          const w = window.open(waUrl, '_blank');
          opened = Boolean(w);
        } catch (e) {
          console.warn('Direct window open error:', e);
        }
      }

      // الطريقة الأولى: إرسال تلقائي في الخلفية إذا تم تفعيل بوت Meta WhatsApp Cloud API
      if (settings.metaWhatsAppEnabled && settings.metaPhoneNumberId && settings.metaAccessToken) {
        showToast(`🤖 جاري إرسال إشعار الدين تلقائياً للزبون "${targetDebtor.name}" عبر البوت...`);
        sendMetaCloudMessage({
          phoneNumberId: settings.metaPhoneNumberId,
          accessToken: settings.metaAccessToken,
          toPhone: targetDebtor.phone,
          messageText: waMsg,
        }).then((res) => {
          if (res.success) {
            showToast(`✅ تم إرسال رسالة الواتساب تلقائياً للزبون "${targetDebtor.name}" عبر البوت.`);
          } else {
            showToast(`⚠️ تعذر الإرسال التلقائي عبر البوت: ${res.error}`);
            // إتاحة التحويل اليدوي كخيار بديل
            setWhatsAppPrompt({
              debtorName: targetDebtor.name,
              phone: targetDebtor.phone,
              url: waUrl,
              messageText: waMsg,
              type: data.type,
              amount: data.amount,
              newBalance,
              autoOpened: opened,
            });
          }
        }).catch((err) => {
          console.error('Error sending bot message:', err);
          showToast(`⚠️ خطأ في الاتصال بالبوت: ${err.message}`);
        });
      } else {
        // التحويل المباشر للواتساب وإظهار نافذة إرسال تفاصيل الفاتورة
        setWhatsAppPrompt({
          debtorName: targetDebtor.name,
          phone: targetDebtor.phone,
          url: waUrl,
          messageText: waMsg,
          type: data.type,
          amount: data.amount,
          newBalance,
          autoOpened: opened,
        });
      }
    }
  };

  const handleUpdateTransactionNotes = async (transactionId: string, notes: string) => {
    await updateTransactionNotes(transactionId, notes);
    showToast('تم حفظ ملاحظات الحركة بنجاح.');
  };

  const handleUpdateTransactionGroup = async (transactionId: string, groupName: string) => {
    await updateTransactionGroup(transactionId, groupName);
    showToast('تم تحديث تصنيف الحركة بنجاح.');
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    await deleteTransaction(transactionId);
    showToast('تم حذف الحركة وتحديث الرصيد.');
  };

  // Handlers for Suppliers
  const handleAddSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    const updated = [newSupplier, ...suppliers];
    setSuppliers(updated);
    saveSuppliers(updated);
    showToast(`تمت إضافة المورد "${newSupplier.name}" بنجاح.`);
  };

  const handleUpdateSupplier = (updatedSupplier: Supplier) => {
    const updated = suppliers.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s));
    setSuppliers(updated);
    saveSuppliers(updated);
    showToast(`تم تحديث بيانات المورد "${updatedSupplier.name}".`);
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const sup = suppliers.find((s) => s.id === supplierId);
    const updatedSuppliers = suppliers.filter((s) => s.id !== supplierId);
    const updatedTx = supplierTransactions.filter((t) => t.supplierId !== supplierId);
    setSuppliers(updatedSuppliers);
    saveSuppliers(updatedSuppliers);
    setSupplierTransactions(updatedTx);
    saveSupplierTransactions(updatedTx);
    showToast(`تم حذف المورد "${sup?.name || ''}" وسجل فواتيره.`);
  };

  const handleAddSupplierTransaction = (data: {
    supplierId: string;
    type: 'SUPPLY_BILL' | 'SUPPLY_PAYMENT';
    amount: number;
    description: string;
    invoiceNumber?: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
  }) => {
    const newTx: SupplierTransaction = {
      ...data,
      id: 'stx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: new Date().toISOString(),
    };
    const updated = [newTx, ...supplierTransactions];
    setSupplierTransactions(updated);
    saveSupplierTransactions(updated);
    showToast(
      data.type === 'SUPPLY_BILL'
        ? `تم تسجيل فاتورة تجهيز بمبلغ ${formatCurrency(data.amount, settings.currency)}.`
        : `تم تسجيل سداد للمورد بمبلغ ${formatCurrency(data.amount, settings.currency)}.`
    );
  };

  const handleDeleteSupplierTransaction = (txId: string) => {
    const updated = supplierTransactions.filter((t) => t.id !== txId);
    setSupplierTransactions(updated);
    saveSupplierTransactions(updated);
    showToast('تم حذف حركة المورد وتحديث رصيد الحساب.');
  };

  // Settings
  const handleSaveSettings = async (newSettings: StoreSettings) => {
    if (newSettings.themeMode) {
      setThemeMode(newSettings.themeMode);
    }
    await saveStoreSettings(newSettings);

    const devId = getOrCreateDeviceId();
    const mySession = newSettings.deviceSessions?.find((s) => s.id === devId);
    if (mySession) {
      if (mySession.isTerminated) {
        executeLogout();
        showToast('تم إنهاء هذه الجلسة وتسجيل الخروج بواسطة الجهاز الرئيسي.', 'warn');
        return;
      }
      if (mySession.name && mySession.name !== currentSessionName) {
        saveCurrentSessionName(mySession.name);
        setCurrentSessionName(mySession.name);
      }
    }

    showToast('تم حفظ إعدادات المحل والأجهزة والجلسات بنجاح.');
  };

  // Auth & Cloud Sync
  const handleLogin = async () => {
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        showToast(`مرحباً بك ${loggedUser.displayName || ''}! تم تفعيل المزامنة السحابية المباشرة.`);
      }
    } catch {
      showToast('تعذر تسجيل الدخول. يمكنك مواصلة العمل في وضع الأوفلاين.', 'warn');
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const executeLogout = async () => {
    setIsLogoutConfirmOpen(false);
    setIsSettingsOpen(false);
    setSuppliers([]);
    setSupplierTransactions([]);
    logoutAppUser();
    setAppUser(null);
    try {
      await logoutUser();
      showToast('تم تسجيل الخروج بنجاح.');
    } catch (e) {
      console.error('Logout error:', e);
      showToast('تم تسجيل الخروج محلياً.');
    }
  };

  const handlePhoneAuthLogin = (userLogged: AppUser) => {
    saveAppUser(userLogged);
    setAppUser(userLogged);
    showToast(`أهلاً بك يا ${userLogged.name}! تم تسجيل الدخول برقمك (${userLogged.phone}).`);
  };

  const handlePhoneAuthLogout = () => {
    logoutAppUser();
    setAppUser(null);
    showToast('تم تسجيل الخروج من الحساب بنجاح.');
  };

  const handleForceSync = async () => {
    try {
      await forceSyncToCloud();
      showToast('تمت مزامنة جميع البيانات سحابياً بنجاح.');
    } catch {
      showToast('تعذر الاتصال بالسحابة حالياً. سيتم الرفع تلقائياً عند توفر الإنترنت.', 'warn');
    }
  };

  // Export Excel & CSV
  const handleExportCSV = async () => {
    try {
      const effectiveDebtors = debtors && debtors.length > 0 ? debtors : loadDebtors();
      const effectiveTransactions = transactions && transactions.length > 0 ? transactions : loadTransactions();
      await downloadExcelBackup(effectiveDebtors, effectiveTransactions, settings);
      showToast('تم تصدير ملف إكسل شامل لكافة الزبائن والديون (.xlsx) بنجاح.');
    } catch {
      exportToCSV(debtorsWithStats, settings.currency);
      showToast('تم تصدير كشف الحسابات بصيغة CSV بنجاح.');
    }
  };

  const handleReloadAll = () => {
    reloadDataFromStorage();
    setSuppliers(loadSuppliers());
    setSupplierTransactions(loadSupplierTransactions());
    setAppUser(loadAppUser());
  };

  // Ensure strict authentication - guest bypass is disallowed
  const isAuthenticated = Boolean(user || (appUser && appUser.isLoggedIn && appUser.role !== 'GUEST'));

  // Authentication Gates - Do not show any data before login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 space-y-4" dir="rtl">
        <div className="w-20 h-20 rounded-3xl p-1 bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-xl shadow-blue-500/25 animate-pulse">
          <img
            src="./icon-192.png"
            alt="أيقونة التطبيق"
            className="w-full h-full rounded-[22px] object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">دفتر ديون السوبرماركت</h2>
          <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>جاري التحقق من جلسة تسجيل الدخول واسترجاع الحسابات السحابية...</span>
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          handleReloadAll();
          showToast('أهلاً بك! تم تسجيل الدخول والمزامنة بنجاح.');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Header */}
      <Header
        settings={settings}
        user={user}
        appUser={appUser}
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        activeView={activeView}
        onViewChange={handleViewChange}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        currentSessionName={currentSessionName}
        onOpenSessionModal={handleOpenSessionModal}
        onOpenAddDebtor={() => handleOpenAddDebtor(null)}
        onOpenAddDebt={() => handleOpenQuickTx('DEBT', null)}
        onOpenAddPayment={() => handleOpenQuickTx('PAYMENT', null)}
        onOpenVoiceModal={handleOpenVoiceTx}
        onOpenGeminiAssistant={() => setIsGeminiAssistantOpen(true)}
        onOpenSettings={handleOpenSettings}
        onExportCSV={handleExportCSV}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenPhoneAuth={() => setIsAuthModalOpen(true)}
        onForceSync={handleForceSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-4 space-y-3.5">
        {activeView === 'DEBTORS' ? (
          /* View 1: الصفحة الرئيسية (تاريخ بآخر الحركات + مربع البحث عن الزبون + مربع الزبائن) */
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* مربع الزبائن: عند الضغط عليه تفتح واجهة الزبائن الكاملة */}
            <button
              id="btn-open-customers-view"
              type="button"
              onClick={() => handleViewChange('CUSTOMERS')}
              className="w-full p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#161c2d] border border-blue-500/40 hover:border-blue-500 dark:hover:border-blue-400 text-slate-900 dark:text-slate-100 font-bold flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer group text-right"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">الزبائن</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold">
                      {debtors.length} زبون
                    </span>
                  </div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate">
                    اضغط لفتح واجهة كافة الزبائن وكشوفاتهم
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                <span>عرض الكل</span>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </button>

            {/* مربع البحث المخصص: للوصول للزبون بالبحث فقط */}
            <div className="bg-white dark:bg-[#161c2d] p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-[#27324c] shadow-2xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
                <input
                  id="main-debtor-search"
                  type="text"
                  placeholder="ابحث بالاسم أو رقم الهاتف أو العنوان للوصول للزبون مباشرة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-8 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* نتائج البحث تظهر فقط عند كتابة نص في مربع البحث */}
              {searchQuery.trim().length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-[#243354] space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      نتائج البحث عن «{searchQuery}»: ({filteredAndSortedDebtors.length} زبون)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs cursor-pointer"
                    >
                      إلغاء البحث
                    </button>
                  </div>

                  {filteredAndSortedDebtors.length === 0 ? (
                    <div className="p-4 text-center bg-slate-50 dark:bg-[#101524] rounded-xl border border-dashed border-slate-300 dark:border-[#27324c] space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        لا يوجد زبون يطابق البحث «{searchQuery}».
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAddDebtor(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>إضافة زبون جديد بهذا الاسم</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto p-1">
                      {filteredAndSortedDebtors.map((debtor) => {
                        const hasDebt = debtor.currentBalance > 0;
                        return (
                          <div
                            key={debtor.id}
                            className="p-3 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] hover:border-blue-500 flex flex-col justify-between gap-2 transition-all shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleSelectDebtor(debtor.id)}
                                  className="font-black text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-right truncate block cursor-pointer"
                                >
                                  {debtor.name}
                                </button>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5" dir="ltr">
                                  {debtor.phone && <span>{debtor.phone}</span>}
                                  {debtor.address && (
                                    <span className="truncate max-w-[120px]" dir="rtl">
                                      {debtor.address}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-left shrink-0">
                                <span
                                  className={`text-sm font-black ${
                                    hasDebt
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : debtor.currentBalance < 0
                                      ? 'text-emerald-500 dark:text-emerald-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {formatCurrency(debtor.currentBalance, settings.currency)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-[#202b44]">
                              <button
                                type="button"
                                onClick={() => handleSelectDebtor(debtor.id)}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                كشف الحساب 👈
                              </button>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickTx('DEBT', debtor)}
                                  className="px-2 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs font-bold hover:bg-rose-100 cursor-pointer"
                                >
                                  + دين
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickTx('PAYMENT', debtor)}
                                  className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                                >
                                  + قبض
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* تاريخ بآخر الحركات */}
            <RecentTransactionsList
              transactions={transactions}
              debtors={debtorsWithStats}
              settings={settings}
              onSelectDebtor={(debtor) => handleSelectDebtor(debtor.id)}
              onOpenAddDebt={() => handleOpenQuickTx('DEBT', null)}
              onOpenAddPayment={() => handleOpenQuickTx('PAYMENT', null)}
              onQuickAddDebtForDebtor={(debtor) => handleOpenQuickTx('DEBT', debtor)}
              onQuickAddPaymentForDebtor={(debtor) => handleOpenQuickTx('PAYMENT', debtor)}
            />
          </div>
        ) : activeView === 'CUSTOMERS' ? (
          /* View 2: واجهة الزبائن الكاملة (Full Customers Directory View) */
          <div className="space-y-6 animate-in fade-in duration-200">
            <DebtorList
              debtors={filteredAndSortedDebtors}
              transactions={transactions}
              settings={settings}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              currentFilter={currentFilter}
              onFilterChange={setCurrentFilter}
              currentSort={currentSort}
              onSortChange={setCurrentSort}
              onBackToTransactions={() => handleViewChange('DEBTORS')}
              onSelectDebtor={(debtor) => handleSelectDebtor(debtor.id)}
              onQuickAddDebt={(d) => handleOpenQuickTx('DEBT', d)}
              onQuickAddPayment={(d) => handleOpenQuickTx('PAYMENT', d)}
              onEditDebtor={(d) => handleOpenAddDebtor(d)}
              onDeleteDebtor={handleDeleteDebtor}
              onAddNewDebtor={() => handleOpenAddDebtor(null)}
              onPrintDebtor={(d) => handleOpenPrint(d.id)}
            />
          </div>
        ) : activeView === 'SUPPLIERS' ? (
          /* View 3: ديون الموردين والشركات (Suppliers Ledger) */
          <SuppliersView
            suppliers={suppliers}
            supplierTransactions={supplierTransactions}
            settings={settings}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onAddSupplierTransaction={handleAddSupplierTransaction}
            onDeleteSupplierTransaction={handleDeleteSupplierTransaction}
          />
        ) : (
          /* View 4: لوحة الإحصائيات (Dashboard) */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Stat Cards */}
            <StatsCards
              debtorsWithStats={debtorsWithStats}
              settings={settings}
              onFilterActiveDebts={() => {
                setCurrentFilter('ACTIVE_DEBT');
                handleViewChange('CUSTOMERS');
              }}
              onFilterSettled={() => {
                setCurrentFilter('SETTLED');
                handleViewChange('CUSTOMERS');
              }}
              onFilterOverLimit={() => {
                setCurrentFilter('OVER_LIMIT');
                handleViewChange('CUSTOMERS');
              }}
            />

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleOpenQuickTx('DEBT', null)}
                className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-between shadow-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm">تسجيل دين جديد</div>
                    <div className="text-xs font-normal opacity-90">مشتريات آجل لمواطن</div>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white/25 px-2 py-1 rounded-lg">+ دين</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenQuickTx('PAYMENT', null)}
                className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-between shadow-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ArrowDownLeft className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm">قبض دفعة نقدية</div>
                    <div className="text-xs font-normal opacity-90">تسديد كامل أو جزئي</div>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white/25 px-2 py-1 rounded-lg">+ قبض</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDebtorToEdit(null);
                  setIsAddDebtorOpen(true);
                }}
                className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-between shadow-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm">إضافة زبون جديد</div>
                    <div className="text-xs font-normal opacity-90">فتح دفتر حساب</div>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white/25 px-2 py-1 rounded-lg">+ زبون</span>
              </button>
            </div>

            {/* Recent Transactions List */}
            <RecentTransactionsList
              transactions={transactions}
              debtors={debtors}
              settings={settings}
              onSelectDebtor={(debtorId) => setActiveDebtorId(debtorId)}
              onOpenAddDebt={() => {
                setQuickTxType('DEBT');
                setQuickTxTargetDebtor(null);
                setIsQuickTxOpen(true);
              }}
              onOpenAddPayment={() => {
                setQuickTxType('PAYMENT');
                setQuickTxTargetDebtor(null);
                setIsQuickTxOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* WhatsApp Notification & Redirection Modal */}
      {whatsAppPrompt && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/80 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#131929] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-emerald-500/80 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {whatsAppPrompt.type === 'DEBT' ? 'تم تسجيل الدين بنجاح! 🛒' : 'تم تسجيل الدفعة بنجاح! 💵'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    الزبون: <span className="font-bold text-white">{whatsAppPrompt.debtorName}</span> ({whatsAppPrompt.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppPrompt(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {whatsAppPrompt.autoOpened
                    ? 'تم فتح نافذة محادثة واتساب لإرسال تفاصيل الفاتورة. يمكنك الضغط على الزر بالأسفل إذا لم تفتح.'
                    : 'جاهز للإرسال! انقر على الزر بالأسفل لفتح محادثة واتساب وإرسال تفاصيل الفاتورة مباشرة.'}
                </span>
              </div>

              {/* Balance Summary Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#27324c] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {whatsAppPrompt.type === 'DEBT' ? 'مبلغ الدين الجديد:' : 'المبلغ المسدد:'}
                  </span>
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                    {formatCurrency(whatsAppPrompt.amount, settings.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#27324c] pt-2">
                  <span className="text-slate-500 dark:text-slate-400">صافي الدين الكلي المتبقي:</span>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(whatsAppPrompt.newBalance, settings.currency)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <a
                  href={whatsAppPrompt.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setWhatsAppPrompt(null)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>فتح محادثة واتساب وإرسال الفاتورة ({whatsAppPrompt.phone})</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(whatsAppPrompt.messageText);
                      setHasCopiedWhatsAppMsg(true);
                      setTimeout(() => setHasCopiedWhatsAppMsg(false), 3000);
                    }}
                    className="py-2.5 px-3 bg-slate-100 dark:bg-[#182137] hover:bg-slate-200 dark:hover:bg-[#202b46] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {hasCopiedWhatsAppMsg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم نسخ النص!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ نص الرسالة</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsAppPrompt(null)}
                    className="py-2.5 px-3 bg-slate-100 dark:bg-[#182137] hover:bg-slate-200 dark:hover:bg-[#202b46] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/80 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#131929] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-rose-200 dark:border-rose-900/60 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                تسجيل الخروج من دفتر الديون
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                هل أنت متأكد من رغبتك في تسجيل الخروج؟ ستتمكن من تسجيل الدخول لاحقاً وجميع بياناتك محفوظة ومزامنة بأمان.
              </p>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-[#182137] hover:bg-slate-200 dark:hover:bg-[#202b46] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  id="confirm-logout-button"
                  type="button"
                  onClick={executeLogout}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تأكيد الخروج</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 dark:bg-[#161c2d] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 border border-slate-700 dark:border-[#27324c]">
          {toastMessage.type === 'warn' ? (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Add / Edit Debtor Modal */}
      <AddDebtorModal
        isOpen={isAddDebtorOpen}
        debtorToEdit={debtorToEdit}
        settings={settings}
        onClose={handleCloseAddDebtor}
        onSubmit={handleSaveDebtor}
      />

      {/* Debtor Account Ledger Statement Modal */}
      <DebtorDetailModal
        debtor={activeDebtorDetail}
        transactions={transactions}
        settings={settings}
        onClose={handleCloseDebtorDetail}
        onAddDebt={(d) => handleOpenQuickTx('DEBT', d)}
        onAddPayment={(d) => handleOpenQuickTx('PAYMENT', d)}
        onDeleteTransaction={handleDeleteTransaction}
        onUpdateTransactionNotes={handleUpdateTransactionNotes}
        onUpdateTransactionGroup={handleUpdateTransactionGroup}
        onEditDebtor={(d) => handleOpenAddDebtor(d)}
        onPrint={(d) => handleOpenPrint(d.id)}
      />

      {/* Quick Transaction Modal (Debt / Payment) - Rendered after DebtorDetailModal to guarantee top stacking */}
      <QuickTransactionModal
        isOpen={isQuickTxOpen}
        type={quickTxType}
        selectedDebtor={quickTxTargetDebtor}
        allDebtors={debtorsWithStats}
        settings={settings}
        currentSessionName={currentSessionName}
        onChangeSession={handleOpenSessionModal}
        onClose={handleCloseQuickTx}
        onOpenVoiceModal={() => {
          handleCloseQuickTx();
          handleOpenVoiceTx();
        }}
        onSubmit={handleAddTransaction}
      />

      {/* Voice Transaction Modal (Smart Speech Recognition & Recording) */}
      <VoiceTransactionModal
        isOpen={isVoiceTxOpen}
        allDebtors={debtorsWithStats}
        settings={settings}
        currentSessionName={currentSessionName}
        onClose={handleCloseVoiceTx}
        onSaveTransaction={(data) => {
          handleAddTransaction({
            debtorId: data.debtorId,
            type: data.type,
            amount: data.amount,
            description: data.description,
            notes: data.notes,
            date: new Date().toISOString(),
            autoOpenWhatsApp: data.autoOpenWhatsApp,
            sessionName: data.sessionName || currentSessionName,
          });
        }}
        onOpenInStandardModal={(data) => {
          const found = debtorsWithStats.find((d) => d.id === data.debtorId) || null;
          handleCloseVoiceTx();
          handleOpenQuickTx(data.type, found);
        }}
      />

      {/* Session Naming & Switching Modal */}
      <SessionModal
        isOpen={isSessionModalOpen}
        currentSession={currentSessionName}
        onClose={handleCloseSessionModal}
        onSaveSession={handleSaveSessionName}
      />

      {/* Gemini AI Full Assistant Modal */}
      <GeminiAssistantModal
        isOpen={isGeminiAssistantOpen}
        onClose={() => setIsGeminiAssistantOpen(false)}
        debtors={debtorsWithStats}
        transactions={transactions}
        settings={settings}
        currentSessionName={currentSessionName}
        onAddTransaction={handleAddTransaction}
        onAddDebtor={(d) => handleSaveDebtor({ name: d.name, phone: d.phone || '' })}
        onSelectDebtor={(debtorId) => handleSelectDebtor(debtorId)}
        onNavigateView={(view) => handleViewChange(view)}
      />

      {/* Mobile Floating Action Button for Gemini Voice Assistant */}
      <button
        id="fab-mobile-voice-btn"
        type="button"
        onClick={() => setIsGeminiAssistantOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/35 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
        title="مساعد Gemini الصوتي الذكي"
      >
        <Mic className="w-6 h-6 text-amber-300" />
      </button>

      {/* Printable Statement Modal */}
      {activePrintDebtor && (
        <PrintStatement
          debtor={activePrintDebtor}
          transactions={transactions}
          settings={settings}
          onClose={handleClosePrint}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        debtors={debtors}
        transactions={transactions}
        user={user}
        appUser={appUser}
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onClose={handleCloseSettings}
        onSaveSettings={handleSaveSettings}
        onReloadData={handleReloadAll}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenPhoneAuth={() => setIsAuthModalOpen(true)}
        onForceSync={handleForceSync}
        themeMode={themeMode}
        onSetThemeMode={setThemeMode}
        currentSessionName={currentSessionName}
        onSetCurrentSessionName={handleSaveSessionName}
      />

      {/* Phone Number Authentication & Password Reset Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        currentUser={appUser}
        onLogin={handlePhoneAuthLogin}
        onLogout={handlePhoneAuthLogout}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
