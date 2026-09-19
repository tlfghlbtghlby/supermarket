import React, { useState, useMemo } from 'react';
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
} from './types';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useTheme } from './hooks/useTheme';
import {
  computeDebtorStats,
  exportToCSV,
  formatCurrency,
  generateTransactionWhatsAppUrl,
  generateTransactionWhatsAppMessage,
} from './utils/formatters';
import { sendMetaCloudMessage } from './services/whatsappBot';
import {
  loadSuppliers,
  saveSuppliers,
  loadSupplierTransactions,
  saveSupplierTransactions,
  loadAppUser,
  saveAppUser,
  logoutAppUser,
} from './utils/storage';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { DebtorList } from './components/DebtorList';
import { RecentTransactionsList } from './components/RecentTransactionsList';
import { DebtorDetailModal } from './components/DebtorDetailModal';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { AddDebtorModal } from './components/AddDebtorModal';
import { SettingsModal } from './components/SettingsModal';
import { PrintStatement } from './components/PrintStatement';
import { SuppliersView } from './components/SuppliersView';
import { AuthModal } from './components/AuthModal';
import { LoginScreen } from './components/LoginScreen';
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
} from 'lucide-react';

interface WhatsAppAlertPrompt {
  debtorName: string;
  phone: string;
  url: string;
  messageText: string;
  type: TransactionType;
  amount: number;
  newBalance: number;
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();

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
    deleteTransaction,
    saveStoreSettings,
    forceSyncToCloud,
    reloadDataFromStorage,
    loginWithGoogle,
    logoutUser,
  } = useFirebaseSync();

  // Active View Switcher: 'DEBTORS' vs 'DASHBOARD' vs 'SUPPLIERS'
  const [activeView, setActiveView] = useState<'DEBTORS' | 'DASHBOARD' | 'SUPPLIERS'>('DEBTORS');

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

  const [activeDebtorId, setActiveDebtorId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePrintDebtorId, setActivePrintDebtorId] = useState<string | null>(null);

  // WhatsApp Prompt State
  const [whatsAppPrompt, setWhatsAppPrompt] = useState<WhatsAppAlertPrompt | null>(null);

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
  }) => {
    const targetDebtor = debtorsWithStats.find((d) => d.id === data.debtorId);
    const debtorName = targetDebtor?.name || 'الزبون';
    const previousBalance = targetDebtor?.currentBalance || 0;
    const newBalance =
      data.type === 'DEBT'
        ? previousBalance + data.amount
        : Math.max(0, previousBalance - data.amount);

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

    await addTransaction(data);

    if (data.type === 'DEBT') {
      showToast(
        `تم تسجيل دين بمبلغ ${formatCurrency(data.amount, settings.currency)} على حساب "${debtorName}".`
      );
    } else {
      showToast(
        `تم قبض وتسديد دفعة ${formatCurrency(data.amount, settings.currency)} من "${debtorName}".`
      );
    }

    // Trigger WhatsApp notification if enabled and debtor has phone number
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

      // الطريقة الثانية: إرسال تلقائي في الخلفية عبر بوت Meta WhatsApp Cloud API
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
            // إتاحة الإرسال اليدوي كخيار بديل عند وجود مشكلة في رمز الوصول
            setWhatsAppPrompt({
              debtorName: targetDebtor.name,
              phone: targetDebtor.phone,
              url: waUrl,
              messageText: waMsg,
              type: data.type,
              amount: data.amount,
              newBalance,
            });
          }
        }).catch((err) => {
          console.error('Error sending bot message:', err);
          showToast(`⚠️ خطأ في الاتصال بالبوت: ${err.message}`);
        });
      } else if (settings.enableWhatsAppAlerts) {
        // الطريقة التقليدية (إشعار مع رابط wa.me)
        setWhatsAppPrompt({
          debtorName: targetDebtor.name,
          phone: targetDebtor.phone,
          url: waUrl,
          messageText: waMsg,
          type: data.type,
          amount: data.amount,
          newBalance,
        });
      }
    }
  };

  const handleUpdateTransactionNotes = async (transactionId: string, notes: string) => {
    await updateTransactionNotes(transactionId, notes);
    showToast('تم حفظ ملاحظات الحركة بنجاح.');
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
    await saveStoreSettings(newSettings);
    showToast('تم حفظ إعدادات المحل والعملة والواتساب بنجاح.');
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

  const handleLogout = async () => {
    if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج من دفتر الديون؟')) {
      try {
        setIsSettingsOpen(false);
        setSuppliers([]);
        setSupplierTransactions([]);
        await logoutUser();
        showToast('تم تسجيل الخروج بنجاح.');
      } catch {
        showToast('حدث خطأ أثناء تسجيل الخروج.', 'warn');
      }
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

  // Export CSV
  const handleExportCSV = () => {
    exportToCSV(debtorsWithStats, settings.currency);
    showToast('تم تصدير كشف الحسابات بصيغة إكسل CSV بنجاح.');
  };

  const handleReloadAll = () => {
    reloadDataFromStorage();
    setSuppliers(loadSuppliers());
    setSupplierTransactions(loadSupplierTransactions());
    setAppUser(loadAppUser());
  };

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

  if (!user) {
    return <LoginScreen onLoginSuccess={() => showToast('أهلاً بك! تم تسجيل الدخول والمزامنة بنجاح.')} />;
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
        onViewChange={setActiveView}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAddDebtor={() => {
          setDebtorToEdit(null);
          setIsAddDebtorOpen(true);
        }}
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportCSV={handleExportCSV}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenPhoneAuth={() => setIsAuthModalOpen(true)}
        onForceSync={handleForceSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeView === 'DEBTORS' ? (
          /* View 1: الزبائن (Clear borders and dark mode matching screenshots) */
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
            onSelectDebtor={(d) => setActiveDebtorId(d.id)}
            onQuickAddDebt={(d) => {
              setQuickTxType('DEBT');
              setQuickTxTargetDebtor(d);
              setIsQuickTxOpen(true);
            }}
            onQuickAddPayment={(d) => {
              setQuickTxType('PAYMENT');
              setQuickTxTargetDebtor(d);
              setIsQuickTxOpen(true);
            }}
            onEditDebtor={(d) => {
              setDebtorToEdit(d);
              setIsAddDebtorOpen(true);
            }}
            onDeleteDebtor={handleDeleteDebtor}
            onAddNewDebtor={() => {
              setDebtorToEdit(null);
              setIsAddDebtorOpen(true);
            }}
            onPrintDebtor={(d) => setActivePrintDebtorId(d.id)}
          />
        ) : activeView === 'SUPPLIERS' ? (
          /* View 2: ديون الموردين والشركات (Suppliers Ledger) */
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
          /* View 3: الصفحة الرئيسية (Dashboard with Metrics, Quick Actions & Recent Transactions) */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Stat Cards */}
            <StatsCards
              debtorsWithStats={debtorsWithStats}
              settings={settings}
              onFilterActiveDebts={() => {
                setCurrentFilter('ACTIVE_DEBT');
                setActiveView('DEBTORS');
              }}
              onFilterSettled={() => {
                setCurrentFilter('SETTLED');
                setActiveView('DEBTORS');
              }}
              onFilterOverLimit={() => {
                setCurrentFilter('OVER_LIMIT');
                setActiveView('DEBTORS');
              }}
            />

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuickTxType('DEBT');
                  setQuickTxTargetDebtor(null);
                  setIsQuickTxOpen(true);
                }}
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
                onClick={() => {
                  setQuickTxType('PAYMENT');
                  setQuickTxTargetDebtor(null);
                  setIsQuickTxOpen(true);
                }}
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

      {/* Floating WhatsApp Notification Alert Prompt (Auto-appears upon new debt/payment) */}
      {whatsAppPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900 dark:bg-[#131929] text-white rounded-2xl p-4 shadow-2xl border-2 border-emerald-500/80 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-400">إشعار واتساب التلقائي جاهز</h4>
                  <p className="text-[11px] text-slate-300">
                    تم إعداد رسالة تفصيلية للزبون <span className="font-bold text-white">{whatsAppPrompt.debtorName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppPrompt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-800/80 dark:bg-[#0d121f] rounded-xl text-[11px] text-slate-300 border border-slate-700/60 flex items-center justify-between">
              <div>
                <span>المبلغ: </span>
                <span className="font-black text-white">{formatCurrency(whatsAppPrompt.amount, settings.currency)}</span>
              </div>
              <div>
                <span>صافي الدين الكلي: </span>
                <span className="font-black text-emerald-400">{formatCurrency(whatsAppPrompt.newBalance, settings.currency)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={whatsAppPrompt.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => setWhatsAppPrompt(null)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال عبر واتساب الآن ({whatsAppPrompt.phone})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setWhatsAppPrompt(null)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                تخطي
              </button>
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
        onClose={() => {
          setIsAddDebtorOpen(false);
          setDebtorToEdit(null);
        }}
        onSubmit={handleSaveDebtor}
      />

      {/* Quick Transaction Modal (Debt / Payment) */}
      <QuickTransactionModal
        isOpen={isQuickTxOpen}
        type={quickTxType}
        selectedDebtor={quickTxTargetDebtor}
        allDebtors={debtorsWithStats}
        settings={settings}
        onClose={() => {
          setIsQuickTxOpen(false);
          setQuickTxTargetDebtor(null);
        }}
        onSubmit={handleAddTransaction}
      />

      {/* Debtor Account Ledger Statement Modal */}
      <DebtorDetailModal
        debtor={activeDebtorDetail}
        transactions={transactions}
        settings={settings}
        onClose={() => setActiveDebtorId(null)}
        onAddDebt={(d) => {
          setQuickTxType('DEBT');
          setQuickTxTargetDebtor(d);
          setIsQuickTxOpen(true);
        }}
        onAddPayment={(d) => {
          setQuickTxType('PAYMENT');
          setQuickTxTargetDebtor(d);
          setIsQuickTxOpen(true);
        }}
        onDeleteTransaction={handleDeleteTransaction}
        onUpdateTransactionNotes={handleUpdateTransactionNotes}
        onEditDebtor={(d) => {
          setDebtorToEdit(d);
          setIsAddDebtorOpen(true);
        }}
        onPrint={(d) => {
          setActivePrintDebtorId(d.id);
        }}
      />

      {/* Printable Statement Modal */}
      {activePrintDebtor && (
        <PrintStatement
          debtor={activePrintDebtor}
          transactions={transactions}
          settings={settings}
          onClose={() => setActivePrintDebtorId(null)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        user={user}
        appUser={appUser}
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={handleSaveSettings}
        onReloadData={handleReloadAll}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenPhoneAuth={() => setIsAuthModalOpen(true)}
        onForceSync={handleForceSync}
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
