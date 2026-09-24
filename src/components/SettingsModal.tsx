import React, { useState } from 'react';
import { StoreSettings, AppUser, Debtor, Transaction } from '../types';
import { User } from 'firebase/auth';
import { resetToSampleData } from '../utils/storage';
import {
  X,
  Settings,
  RefreshCw,
  Check,
  AlertTriangle,
  Cloud,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  Users,
  MessageCircle,
  Moon,
  Sun,
  Laptop,
  Shield,
  Phone,
  Send,
  Key,
  Eye,
  EyeOff,
  Copy,
  Mail,
  Lock,
  Store,
  MessageSquare,
  ExternalLink,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  Palette,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import {
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_BOT_USERNAME,
  checkAndLinkTelegramOwner,
  sendTelegramMessage,
  sendTelegramDailyBackupReport,
} from '../services/telegramBot';

interface SettingsModalProps {
  isOpen: boolean;
  settings: StoreSettings;
  debtors?: Debtor[];
  transactions?: Transaction[];
  user?: User | null;
  appUser?: AppUser | null;
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncedAt?: Date | null;
  onClose: () => void;
  onSaveSettings: (newSettings: StoreSettings) => void;
  onReloadData: () => void;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenPhoneAuth?: () => void;
  onForceSync?: () => void;
}

const COMMON_CURRENCIES = [
  { symbol: 'دينار عراقي', name: 'دينار عراقي (د.ع / IQD)' },
  { symbol: '$', name: 'دولار أمريكي ($ / USD)' },
  { symbol: 'ر.س', name: 'ريال سعودي (ر.س)' },
  { symbol: 'د.ك', name: 'دينار كويتي (د.ك)' },
  { symbol: 'د.إ', name: 'درهم إماراتي (د.إ)' },
  { symbol: 'ج.م', name: 'جنيه مصري (ج.م)' },
  { symbol: 'د.أ', name: 'دينار أردني (د.أ)' },
  { symbol: 'TL', name: 'ليرة تركية (TL)' },
  { symbol: '€', name: 'يورو (€)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  debtors = [],
  transactions = [],
  user,
  appUser,
  isOnline = true,
  isSyncing = false,
  onClose,
  onSaveSettings,
  onReloadData,
  onLogin,
  onLogout,
  onOpenPhoneAuth,
  onForceSync,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [ownerName, setOwnerName] = useState(settings.ownerName || 'صاحب المحل');
  const [ownerEmail, setOwnerEmail] = useState(
    settings.ownerEmail || (user?.email && !user.email.includes('@supermarket.app') ? user.email : 'example@gmail.com')
  );
  const [ownerPasswordCode, setOwnerPasswordCode] = useState(settings.ownerPasswordCode || '123123');
  const [shopCode, setShopCode] = useState(settings.shopCode || 'G781011');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [phone, setPhone] = useState(settings.phone || '07854668977');
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState(settings.customWhatsAppMessage);
  const [enableWhatsAppAlerts, setEnableWhatsAppAlerts] = useState(settings.enableWhatsAppAlerts ?? true);
  const [storeWhatsAppPhone, setStoreWhatsAppPhone] = useState(settings.storeWhatsAppPhone || settings.phone || '');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(settings.themeMode || 'dark');
  const [strictCreditLimit, setStrictCreditLimit] = useState(settings.strictCreditLimit ?? false);

  const handleCopyText = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(`تم نسخ ${label} بنجاح!`);
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  // إعدادات وتكامل بوت تليجرام (Telegram Bot Integration)
  const [telegramBotToken, setTelegramBotToken] = useState(
    settings.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN
  );
  const [telegramBotUsername, setTelegramBotUsername] = useState(
    settings.telegramBotUsername || DEFAULT_TELEGRAM_BOT_USERNAME
  );
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId || '');
  const [telegramOwnerName, setTelegramOwnerName] = useState(settings.telegramOwnerName || '');
  const [enableTelegramAlerts, setEnableTelegramAlerts] = useState(
    settings.enableTelegramAlerts ?? true
  );
  const [enableDailyMidnightReport, setEnableDailyMidnightReport] = useState(
    settings.enableDailyMidnightReport ?? true
  );

  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [telegramLinkStatus, setTelegramLinkStatus] = useState<{
    success?: boolean;
    msg?: string;
  } | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testTelegramResult, setTestTelegramResult] = useState<string | null>(null);
  const [isSendingBackup, setIsSendingBackup] = useState(false);
  const [backupSendResult, setBackupSendResult] = useState<string | null>(null);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    info: true,
    store: true,
    whatsapp: false,
    appearance: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isOpen) return null;

  const handleCheckAndLinkTelegram = async () => {
    setIsLinkingTelegram(true);
    setTelegramLinkStatus(null);
    try {
      const res = await checkAndLinkTelegramOwner(
        shopCode.trim() || 'G781011',
        storeName.trim() || 'دفتر ديون السوبرماركت',
        telegramBotToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN
      );
      if (res.success && res.chatId) {
        setTelegramChatId(res.chatId);
        if (res.ownerName) setTelegramOwnerName(res.ownerName);
        setTelegramLinkStatus({
          success: true,
          msg: res.message || 'تم التعرف على حسابك وربط البوت بنجاح!',
        });
        // Auto-save settings with linked chatId
        onSaveSettings({
          ...settings,
          storeName: storeName.trim() || 'سوبرماركت',
          ownerName: ownerName.trim() || 'صاحب المحل',
          ownerEmail: ownerEmail.trim() || 'example@gmail.com',
          ownerPasswordCode: ownerPasswordCode.trim() || '123123',
          shopCode: shopCode.trim().toUpperCase() || 'G781011',
          phone: phone.trim(),
          address: address.trim(),
          currency,
          customCurrencyName: currency === 'د.ع' ? 'دينار عراقي' : currency,
          customWhatsAppMessage,
          enableWhatsAppAlerts,
          storeWhatsAppPhone: storeWhatsAppPhone.trim(),
          themeMode,
          strictCreditLimit,
          metaWhatsAppEnabled: false,
          metaPhoneNumberId: '',
          metaAccessToken: '',
          telegramBotToken: telegramBotToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
          telegramBotUsername: telegramBotUsername.trim() || DEFAULT_TELEGRAM_BOT_USERNAME,
          telegramChatId: res.chatId,
          telegramOwnerName: res.ownerName || '',
          enableTelegramAlerts,
          enableDailyMidnightReport,
        });
      } else {
        setTelegramLinkStatus({
          success: false,
          msg:
            res.message ||
            'لم يتم العثور على رسالة بالرمز في البوت حتى الآن. يرجى فتح البوت وإرسال الرمز أولاً ثم النقر هنا مجدداً.',
        });
      }
    } catch (e: any) {
      setTelegramLinkStatus({
        success: false,
        msg: e?.message || 'خطأ أثناء الاتصال بتليجرام.',
      });
    } finally {
      setIsLinkingTelegram(false);
    }
  };

  const handleTestTelegramNotification = async () => {
    if (!telegramChatId.trim()) {
      alert('يرجى ربط معرف المحادثة (Chat ID) أولاً عبر إرسال الرمز للبوت');
      return;
    }
    setIsTestingTelegram(true);
    setTestTelegramResult(null);
    try {
      const testMsg = `
🔔 <b>إشعار تجريبي ناجح من دفتر ديون السوبرماركت!</b>
🏪 <b>المتجر:</b> ${storeName}
🔑 <b>رمز صاحب المحل:</b> <code>${shopCode}</code>
⏰ <b>الوقت:</b> ${new Date().toLocaleTimeString('ar-IQ')}

✅ تم اختبار الاتصال ببوت تليجرام بنجاح. ستصلك الإشعارات الفورية عند كل دين جديد أو تسديد، بالإضافة إلى النسخة اليومية الساعة 12:00 صباحاً.
      `.trim();
      const res = await sendTelegramMessage(
        telegramChatId.trim(),
        testMsg,
        telegramBotToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN
      );
      if (res.success) {
        setTestTelegramResult('✅ تم إرسال الإشعار التجريبي بنجاح إلى حساب تليجرام الخاص بك!');
      } else {
        setTestTelegramResult(`❌ فشل الإرسال: ${res.error}`);
      }
    } catch (e: any) {
      setTestTelegramResult(`❌ خطأ: ${e?.message}`);
    } finally {
      setIsTestingTelegram(false);
      setTimeout(() => setTestTelegramResult(null), 5000);
    }
  };

  const handleSendManualDailyBackup = async () => {
    if (!telegramChatId.trim()) {
      alert('يرجى ربط محادثة تليجرام لصاحب المحل أولاً');
      return;
    }
    setIsSendingBackup(true);
    setBackupSendResult(null);
    try {
      const res = await sendTelegramDailyBackupReport(
        debtors || [],
        transactions || [],
        {
          ...settings,
          storeName,
          shopCode,
          telegramBotToken: telegramBotToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
          telegramChatId: telegramChatId.trim(),
        }
      );
      if (res.success) {
        setBackupSendResult('✅ تم رفع وإرسال التقرير اليومي ونسخة ملف الديون إلى تليجرام بنجاح!');
      } else {
        setBackupSendResult(`❌ تعذر الرفع: ${res.error}`);
      }
    } catch (e: any) {
      setBackupSendResult(`❌ خطأ: ${e?.message}`);
    } finally {
      setIsSendingBackup(false);
      setTimeout(() => setBackupSendResult(null), 6000);
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveSettings({
      ...settings,
      storeName: storeName.trim() || 'سوبرماركت',
      ownerName: ownerName.trim() || 'صاحب المحل',
      ownerEmail: ownerEmail.trim() || 'example@gmail.com',
      ownerPasswordCode: ownerPasswordCode.trim() || '123123',
      shopCode: shopCode.trim().toUpperCase() || 'G781011',
      phone: phone.trim(),
      address: address.trim(),
      currency,
      customCurrencyName: currency === 'د.ع' ? 'دينار عراقي' : currency,
      customWhatsAppMessage,
      enableWhatsAppAlerts,
      storeWhatsAppPhone: storeWhatsAppPhone.trim(),
      themeMode,
      strictCreditLimit,
      metaWhatsAppEnabled: false,
      metaPhoneNumberId: '',
      metaAccessToken: '',
      telegramBotToken: telegramBotToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
      telegramBotUsername: telegramBotUsername.trim() || DEFAULT_TELEGRAM_BOT_USERNAME,
      telegramChatId: telegramChatId.trim(),
      telegramOwnerName: telegramOwnerName.trim(),
      enableTelegramAlerts,
      enableDailyMidnightReport,
    });
    onClose();
  };

  const handleResetData = () => {
    if (
      confirm(
        'تحذير: سيتم حذف جميع البيانات الحالية وإعادة تعيين التطبيق إلى البيانات التجريبية الأولية بالدينار العراقي. هل تريد المتابعة؟'
      )
    ) {
      resetToSampleData();
      onReloadData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#070b14] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200">
      {/* Full Screen Top App Bar */}
      <header className="px-4 sm:px-6 py-3.5 bg-slate-900 dark:bg-[#0c101d] text-white border-b border-slate-800 dark:border-[#1d273f] flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 dark:bg-[#182136] dark:hover:bg-[#222e49] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700/80"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لدفتر الديون</span>
          </button>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">واجهة إعدادات النظام ودفتر الديون</h2>
              <p className="text-[11px] text-slate-300">أقسام منسدلة قابلة للفتح والطي للتحكم الكامل بالنظام</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">حفظ جميع التغييرات</span>
            <span className="sm:hidden">حفظ</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-[#1a233a] rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Full-Page Content */}
      <div className="flex-1 overflow-y-auto bg-slate-100/70 dark:bg-[#080d18] p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-4">
          {/* Feedback banner for copied items */}
          {copyFeedback && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{copyFeedback}</span>
            </div>
          )}

          {/* Quick Expand / Collapse Controls */}
          <div className="flex items-center justify-between pb-1 text-xs">
            <div className="text-slate-500 dark:text-slate-400 font-semibold text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>اضغط على أي قسم منسدل لفتح أو إغلاق الخيارات التابعة له:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenSections({ info: true, store: true, whatsapp: true, appearance: true })}
                className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
              >
                فتح جميع الأقسام
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => setOpenSections({ info: false, store: false, whatsapp: false, appearance: false })}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#141b2e] rounded-lg transition-colors cursor-pointer"
              >
                طي جميع الأقسام
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 1. قسم المعلومات (نافذة منسدلة) */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#111726] rounded-2xl border-2 border-slate-200/90 dark:border-[#1d273e] overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('info')}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-blue-50/70 via-white to-transparent dark:from-[#131d33] dark:via-[#111726] dark:to-transparent hover:bg-blue-50/90 dark:hover:bg-[#16213a] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      قسم المعلومات
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      3 خيارات
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    معلومات تسجيل الدخول، رمز صاحب المحل، بوت تليجرام، والحساب السحابي
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-xs font-bold hidden sm:inline text-blue-600 dark:text-blue-400">
                  {openSections.info ? 'إغلاق القسم' : 'عرض الخيارات'}
                </span>
                <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${openSections.info ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {openSections.info && (
              <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">

              {/* خيار: معلومات تسجيل الدخول */}
              <div className="p-4 rounded-xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 dark:from-[#11192e] dark:via-[#131b30] dark:to-[#171f38] space-y-3.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-[#223050] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          خيار معلومات تسجيل الدخول ورمز المحل
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                          بيانات الدخول
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        تظهر هنا بيانات دخول صاحب المحل وكود المتجر المستخدم في تسجيل الدخول والربط
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Shop Code Card */}
                  <div className="p-3 bg-white dark:bg-[#101524] rounded-xl border border-blue-200 dark:border-[#243354] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-blue-500" />
                        <span>رمز صاحب المحل:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(shopCode, 'رمز صاحب المحل')}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px] font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>نسخ</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={shopCode}
                        onChange={(e) => setShopCode(e.target.value.toUpperCase())}
                        className="w-full text-base font-black font-mono text-blue-600 dark:text-blue-400 tracking-wider bg-slate-50 dark:bg-[#151c2e] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#273656] focus:outline-hidden focus:border-blue-500"
                        placeholder="G781011"
                      />
                      <span className="absolute left-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold pointer-events-none">
                        الكود
                      </span>
                    </div>
                  </div>

                  {/* Owner Email */}
                  <div className="p-3 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>البريد الإلكتروني:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(ownerEmail, 'البريد الإلكتروني')}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px] font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>نسخ</span>
                      </button>
                    </div>
                    <input
                      type="email"
                      dir="ltr"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full text-xs font-bold font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#151c2e] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-[#273656] focus:outline-hidden focus:border-blue-500 text-left"
                      placeholder="example@gmail.com"
                    />
                  </div>

                  {/* Owner Password / Security Code */}
                  <div className="p-3 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>الرمز (كلمة المرور):</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title={showOwnerPassword ? 'إخفاء' : 'إظهار'}
                        >
                          {showOwnerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(ownerPasswordCode, 'الرمز السري')}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px] font-semibold"
                        >
                          <Copy className="w-3 h-3" />
                          <span>نسخ</span>
                        </button>
                      </div>
                    </div>
                    <input
                      type={showOwnerPassword ? 'text' : 'password'}
                      dir="ltr"
                      value={ownerPasswordCode}
                      onChange={(e) => setOwnerPasswordCode(e.target.value)}
                      className="w-full text-xs font-bold font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#151c2e] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-[#273656] focus:outline-hidden focus:border-blue-500 text-left"
                      placeholder="123123"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 flex items-start gap-2 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                  <Check className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <span>
                    <strong>طريقة الدخول:</strong> يمكنك تسجيل الدخول إلى دفتر الديون من أي جهاز باستخدام البريد الإلكتروني <code className="font-mono font-bold bg-white dark:bg-[#12192b] px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">{ownerEmail || 'example@gmail.com'}</code> أو رمز المحل <code className="font-mono font-bold bg-white dark:bg-[#12192b] px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">{shopCode || 'G781011'}</code> مع الرمز السري <code className="font-mono font-bold bg-white dark:bg-[#12192b] px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">{ownerPasswordCode || '123123'}</code>.
                  </span>
                </div>
              </div>

              {/* خيار: بوت تليجرام */}
              <div className="p-4 rounded-xl border-2 border-sky-500/50 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50 dark:from-[#0d1c2e] dark:via-[#111e33] dark:to-[#14233c] space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 dark:border-[#1d3554] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                      <Send className="w-4 h-4 -rotate-45 translate-x-0.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          خيار بوت تليجرام للإشعارات الفورية والنسخ اليومي (12:00 ص)
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800">
                          @deptstbot
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        ربط حساب صاحب المحل بالتوكن لاستلام إشعار بكل دين ورفع نسخة يومية من الديون الساعة 12:00 صباحاً
                      </p>
                    </div>
                  </div>

                  {telegramChatId ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>متصل ومربوط بحسابك</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>بانتظار إرسال الرمز للبوت</span>
                    </div>
                  )}
                </div>

                {/* Instructions & Link Workflow */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0e1626] border border-sky-200 dark:border-[#203656] space-y-3">
                  <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <MessageSquare className="w-4 h-4" />
                      <span>طريقة ربط البوت بحساب صاحب المحل:</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] space-y-1 text-slate-600 dark:text-slate-300 pr-1">
                      <li>
                        افتح بوت تليجرام الرسمي: <strong>@deptstbot</strong> أو اضغط الزر الأزرق أدناه.
                      </li>
                      <li>
                        أرسل رمز صاحب المحل الخاص بك: <code className="font-mono font-bold bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-300">{shopCode || 'G781011'}</code> إلى محادثة البوت.
                      </li>
                      <li>
                        اضغط زر <strong>«فحص والربط مع البوت الآن»</strong> ليتعرف النظام على حسابك ويتم الربط فوراً!
                      </li>
                    </ol>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={`https://t.me/deptstbot?start=${encodeURIComponent(shopCode || 'G781011')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح البوت في تليجرام وإرسال الرمز ({shopCode})</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCheckAndLinkTelegram}
                      disabled={isLinkingTelegram}
                      className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLinkingTelegram ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                          <span>جاري فحص رسائل البوت...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                          <span>فحص والربط مع البوت الآن</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feedback result */}
                  {telegramLinkStatus && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-medium flex items-start gap-2 animate-in fade-in ${
                        telegramLinkStatus.success
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {telegramLinkStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      )}
                      <span className="leading-relaxed">{telegramLinkStatus.msg}</span>
                    </div>
                  )}
                </div>

                {/* Linked details & Live Test / Backup trigger */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Chat ID & Owner Info */}
                  <div className="p-3 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>معرف محادثة تليجرام (Chat ID):</span>
                      {telegramChatId && (
                        <button
                          type="button"
                          onClick={() => {
                            setTelegramChatId('');
                            setTelegramOwnerName('');
                          }}
                          className="text-rose-500 hover:underline text-[10px] cursor-pointer"
                        >
                          فصل المحادثة
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="يتم تعبئته تلقائياً عند إرسال الرمز للبوت"
                      className="w-full text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-[#151c2e] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#273656] text-left"
                    />
                    {telegramOwnerName && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        صاحب الحساب: <span className="font-bold text-sky-600 dark:text-sky-400">{telegramOwnerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Test & Backup Actions */}
                  <div className="p-3 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2 flex flex-col justify-center">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      إجراءات فورية عبر البوت:
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleTestTelegramNotification}
                        disabled={isTestingTelegram || !telegramChatId}
                        className="flex-1 py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingTelegram ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        <span>إرسال إشعار تجريبي</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendManualDailyBackup}
                        disabled={isSendingBackup || !telegramChatId}
                        className="flex-1 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingBackup ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        <span>رفع نسخة الديون الآن</span>
                      </button>
                    </div>

                    {testTelegramResult && (
                      <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-in fade-in">
                        {testTelegramResult}
                      </div>
                    )}
                    {backupSendResult && (
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                        {backupSendResult}
                      </div>
                    )}
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="p-3 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        إرسال إشعار فوري عند كل دين أو تسديد
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        يقوم البوت بإرسال رسالة تليجرام فورية لصاحب المحل تحتوي اسم الزبون، المبلغ، والرصيد المتبقي.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableTelegramAlerts}
                      onChange={(e) => setEnableTelegramAlerts(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                    />
                  </label>

                  <div className="border-t border-slate-100 dark:border-[#1e2942] pt-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            رفع نسخة من الدين يومياً الساعة 12:00 صباحاً
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            تلقائي يومياً
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          يقوم النظام يومياً عند منتصف الليل (الساعة 12:00 ص) بتوليد تقرير شامل ورفع ملف نسخة احتياطية من جميع الديون والزبائن إلى حساب تليجرام الخاص بك.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableDailyMidnightReport}
                        onChange={(e) => setEnableDailyMidnightReport(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Collapsible Token */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showTelegramToken ? 'إخفاء تفاصيل توكن البوت' : 'عرض توكن البوت والإعدادات المتقدمة'}</span>
                  </button>

                  {showTelegramToken && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-100/70 dark:bg-[#0c1220] border border-slate-200 dark:border-[#202e48] space-y-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          توكن بوت تليجرام (Telegram Bot Token):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          className="w-full text-xs font-mono bg-white dark:bg-[#151c2e] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#2b3a56] text-slate-800 dark:text-slate-200 text-left"
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        التوكن المعتمد: <code className="font-mono select-all">8804502479:AAEpAGxY53toTCSoIKiMdMs9yGR8arahR-Q</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* خيار: الحساب وتسجيل الدخول السحابي */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        خيار الحساب وتسجيل الدخول السحابي
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        حالة المزامنة السحابية وإدارة هاتف المسؤول
                      </p>
                    </div>
                  </div>
                  {user ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>المزامنة السحابية نشطة</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">غير مسجل الدخول</span>
                  )}
                </div>

                {user ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#101524] p-3 rounded-xl border border-slate-200 dark:border-[#202b44]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {user.displayName || settings.ownerName || 'المسؤول'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono dir-ltr text-right">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLogout();
                        }}
                        className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>تسجيل الخروج</span>
                      </button>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#101524] p-3 rounded-xl border border-slate-200 dark:border-[#202b44]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {appUser ? appUser.name : 'بيانات الهاتف والمسؤول الإضافي'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {appUser ? `الهاتف: ${appUser.phone}` : 'احمِ بيانات متجرك وسجل الدخول برقمك'}
                      </p>
                    </div>
                  </div>

                  {onOpenPhoneAuth && (
                    <button
                      type="button"
                      onClick={onOpenPhoneAuth}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-[#1c2438] hover:bg-slate-300 dark:hover:bg-[#25304a] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      {appUser ? 'إدارة رقم الهاتف' : 'تسجيل رقم هاتف'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 2. قسم بيانات المتجر والعملة (نافذة منسدلة) */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-[#111726] rounded-2xl border-2 border-slate-200/90 dark:border-[#1d273e] overflow-hidden shadow-xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('store')}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-indigo-50/70 via-white to-transparent dark:from-[#161c36] dark:via-[#111726] dark:to-transparent hover:bg-indigo-50/90 dark:hover:bg-[#19223e] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    قسم بيانات المتجر والعملة
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    البيانات والعملة
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  الاسم التجاري للمتجر، اسم المسؤول، رقم الهاتف، العملة المعتمدة والعنوان
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <span className="text-xs font-bold hidden sm:inline text-indigo-600 dark:text-indigo-400">
                {openSections.store ? 'إغلاق القسم' : 'عرض الخيارات'}
              </span>
              <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${openSections.store ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {openSections.store && (
            <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
              {/* خيار: بيانات ومعلومات المتجر والعملة */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#202c46]">
                  <Store className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    خيار تفاصيل المتجر والمسؤول والعملة
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم السوبرماركت / المتجر
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم صاحب المحل / المسؤول
                    </label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم الهاتف الرسمي للمتجر
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      العملة الافتراضية للحسابات
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {COMMON_CURRENCIES.map((c) => (
                        <option key={c.symbol} value={c.symbol} className="dark:bg-[#161c2d]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    العنوان / الموقع
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. قسم إشعارات الواتساب وسقف الائتمان (نافذة منسدلة) */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-[#111726] rounded-2xl border-2 border-slate-200/90 dark:border-[#1d273e] overflow-hidden shadow-xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('whatsapp')}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-emerald-50/70 via-white to-transparent dark:from-[#112328] dark:via-[#111726] dark:to-transparent hover:bg-emerald-50/90 dark:hover:bg-[#152e34] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/20">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    قسم إشعارات الواتساب وسقف الائتمان
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    الواتساب والائتمان
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  إرسال فواتير وحركات الديون تلقائياً للزبائن عبر الواتساب وسقف الدين
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <span className="text-xs font-bold hidden sm:inline text-emerald-600 dark:text-emerald-400">
                {openSections.whatsapp ? 'إغلاق القسم' : 'عرض الخيارات'}
              </span>
              <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${openSections.whatsapp ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {openSections.whatsapp && (
            <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
              {/* خيار: إشعارات الواتساب التلقائية وسقف الائتمان */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        خيار إشعارات وتنبيهات الواتساب التلقائية
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        إرسال رسالة مفصلة بالدين الجديد والقديم وإجمالي الدين عند كل حركة
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableWhatsAppAlerts}
                      onChange={(e) => setEnableWhatsAppAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      رقم هاتف / واتساب المتجر (اختياري)
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="07xxxxxxxx"
                      value={storeWhatsAppPhone}
                      onChange={(e) => setStoreWhatsAppPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      خيار سقف الائتمان الصارم
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-300 dark:border-[#27324c] cursor-pointer text-xs text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={strictCreditLimit}
                        onChange={(e) => setStrictCreditLimit(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>منع إضافة دين جديد عند تجاوز سقف الائتمان</span>
                    </label>
                  </div>
                </div>

                {/* خيار: نص رسالة تذكير الواتساب */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#202c46]">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    خيار نص رسالة تذكير الواتساب العامة للزبائن
                  </label>
                  <textarea
                    rows={2}
                    value={customWhatsAppMessage}
                    onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 4. قسم مظهر التطبيق والنظام (نافذة منسدلة) */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-[#111726] rounded-2xl border-2 border-slate-200/90 dark:border-[#1d273e] overflow-hidden shadow-xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('appearance')}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-purple-50/70 via-white to-transparent dark:from-[#211634] dark:via-[#111726] dark:to-transparent hover:bg-purple-50/90 dark:hover:bg-[#281c3e] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/20">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    قسم مظهر التطبيق والنظام
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    المظهر والنظام
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ألوان العرض، الوضع الليلي والنهاري، وخيار إعادة تعيين البيانات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <span className="text-xs font-bold hidden sm:inline text-purple-600 dark:text-purple-400">
                {openSections.appearance ? 'إغلاق القسم' : 'عرض الخيارات'}
              </span>
              <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${openSections.appearance ? 'rotate-180 text-purple-600 dark:text-purple-400' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {openSections.appearance && (
            <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
              {/* خيار: مظهر التطبيق */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>خيار مظهر التطبيق (الوضع الليلي / النهاري)</span>
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeMode('dark')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#101524] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#27324c]'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>داكن (Dark)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode('light')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#101524] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#27324c]'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>فاتح (Light)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode('system')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      themeMode === 'system'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#101524] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#27324c]'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>تلقائي (النظام)</span>
                  </button>
                </div>
              </div>

              {/* خيار: إعادة ضبط المصنع */}
              <div className="p-4 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-white dark:bg-[#161c2d] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>خيار إعادة ضبط المصنع للبيانات</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    إعادة تعيين البيانات للوضع الأولي التجريبي بالدينار العراقي وحذف الديون الحالية
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetData}
                  className="px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>إعادة ضبط المصنع</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>

    {/* Bottom Sticky Bar */}
    <footer className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-[#1d273f] bg-white dark:bg-[#0c101d] flex items-center justify-between gap-3 shrink-0 shadow-lg">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1c2438] text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة لدفتر الديون بدون حفظ</span>
      </button>

      <button
        type="button"
        onClick={() => handleSave()}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <Check className="w-4 h-4" />
        <span>حفظ جميع التغييرات</span>
      </button>
    </footer>
  </div>
);
};
