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
  LogOut,
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
  Info,
  ChevronDown,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_BOT_USERNAME,
  checkAndLinkTelegramOwner,
  sendTelegramMessage,
  sendTelegramDailyBackupReport,
} from '../services/telegramBot';
import {
  generateUniqueAccountCode,
  generateRandomAccountCode,
  cleanAccountCode,
} from '../utils/accountCode';

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
  onLogout,
  onOpenPhoneAuth,
  onForceSync,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName || 'دفتر ديون السوبرماركت');
  const [ownerName, setOwnerName] = useState(settings.ownerName || 'صاحب المحل');
  const [ownerEmail, setOwnerEmail] = useState(
    settings.ownerEmail || (user?.email && !user.email.includes('@supermarket.app') ? user.email : 'example@gmail.com')
  );
  const [ownerPasswordCode, setOwnerPasswordCode] = useState(settings.ownerPasswordCode || '123123');

  // Each user has their own unique code (رمز خاص به وليس رمز واحد موحد)
  const [shopCode, setShopCode] = useState(() => {
    if (settings.shopCode && settings.shopCode !== 'G781011') {
      return settings.shopCode;
    }
    return generateUniqueAccountCode(user?.uid || settings.ownerEmail || undefined);
  });

  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [phone, setPhone] = useState(settings.phone || '07854668977');
  const [address, setAddress] = useState(settings.address || '');
  const [currency, setCurrency] = useState(settings.currency || 'دينار عراقي');
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState(
    settings.customWhatsAppMessage ||
      'السلام عليكم ورحمة الله وبركاته، الأخ العزيز {NAME}، نود تذكيركم بلطف بأن رصيد حسابكم المتبقي لدى {STORE} هو {AMOUNT} {CURRENCY}. نرحب بكم في أي وقت شاكرين حسن تعاملكم.'
  );
  const [enableWhatsAppAlerts, setEnableWhatsAppAlerts] = useState(settings.enableWhatsAppAlerts ?? true);
  const [storeWhatsAppPhone, setStoreWhatsAppPhone] = useState(settings.storeWhatsAppPhone || settings.phone || '');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(settings.themeMode || 'dark');
  const [strictCreditLimit, setStrictCreditLimit] = useState(settings.strictCreditLimit ?? false);

  // Telegram Bot State
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

  // Accordion state: all sections are collapsed by default in normal state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    accountCode: false,
    telegram: false,
    store: false,
    whatsapp: false,
    cloud: false,
    appearance: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCopyText = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(`تم نسخ ${label} بنجاح!`);
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleRegenerateCode = () => {
    const newCode = generateRandomAccountCode();
    setShopCode(newCode);
    setCopyFeedback(`تم توليد رمز فريد جديد لحسابك: ${newCode}`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  if (!isOpen) return null;

  const handleCheckAndLinkTelegram = async () => {
    setIsLinkingTelegram(true);
    setTelegramLinkStatus(null);
    try {
      const activeCode = cleanAccountCode(shopCode) || generateUniqueAccountCode(user?.uid);
      const res = await checkAndLinkTelegramOwner(
        activeCode,
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
          shopCode: activeCode,
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
            `لم يتم العثور على رسالة بالرمز [${activeCode}] في البوت حتى الآن. يرجى فتح البوت وإرسال الرمز الخاص بك أولاً ثم النقر هنا مجدداً.`,
        });
      }
    } catch (e: any) {
      setTelegramLinkStatus({
        success: false,
        msg: e?.message || 'حدث خطأ أثناء فحص محادثة تليجرام، تأكد من اتصال الإنترنت.',
      });
    } finally {
      setIsLinkingTelegram(false);
    }
  };

  const handleTestTelegramNotification = async () => {
    if (!telegramChatId) {
      setTestTelegramResult('⚠️ يجب ربط معرف المحادثة (Chat ID) أولاً');
      setTimeout(() => setTestTelegramResult(null), 3000);
      return;
    }

    setIsTestingTelegram(true);
    setTestTelegramResult(null);

    try {
      const activeCode = cleanAccountCode(shopCode);
      const testMsg = `
🔔 <b>رسالة فحص تجريبية - ${storeName || 'دفتر ديون السوبرماركت'}</b>

✅ بوت تليجرام متصل وجاهز للعمل مع حسابك الخاص!
🔑 <b>رمز الحساب:</b> <code>${activeCode}</code>
⏰ <b>الوقت:</b> ${new Date().toLocaleTimeString('ar-IQ')}

<i>سيصلك إشعار فوري عند كل حركة دين جديدة، بالإضافة إلى تقرير ونسخة يومية الساعة 12:00 منتصف الليل.</i>
      `.trim();

      const res = await sendTelegramMessage(
        telegramChatId,
        testMsg,
        telegramBotToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN
      );

      if (res.success) {
        setTestTelegramResult('✅ تم إرسال الإشعار التجريبي إلى تليجرام بنجاح!');
      } else {
        setTestTelegramResult(`❌ فشل الإرسال: ${res.error || 'خطأ غير معروف'}`);
      }
    } catch (err: any) {
      setTestTelegramResult(`❌ خطأ: ${err?.message || 'فشل الاتصال'}`);
    } finally {
      setIsTestingTelegram(false);
      setTimeout(() => setTestTelegramResult(null), 5000);
    }
  };

  const handleSendManualDailyBackup = async () => {
    if (!telegramChatId) {
      setBackupSendResult('⚠️ يجب ربط معرف محادثة تليجرام أولاً');
      setTimeout(() => setBackupSendResult(null), 3000);
      return;
    }

    setIsSendingBackup(true);
    setBackupSendResult(null);

    try {
      const tempSettings: StoreSettings = {
        ...settings,
        storeName: storeName.trim() || 'سوبرماركت',
        ownerName: ownerName.trim() || 'صاحب المحل',
        shopCode: cleanAccountCode(shopCode),
        currency,
        customCurrencyName: currency === 'د.ع' ? 'دينار عراقي' : currency,
        telegramBotToken: telegramBotToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
        telegramChatId: telegramChatId.trim(),
      };

      const res = await sendTelegramDailyBackupReport(
        debtors,
        transactions,
        tempSettings
      );

      if (res.success) {
        setBackupSendResult('✅ تم رفع نسخة الديون والتقرير المالي بنجاح إلى تليجرام!');
      } else {
        setBackupSendResult(`❌ فشل رفع النسخة: ${res.error || 'خطأ'}`);
      }
    } catch (e: any) {
      setBackupSendResult(`❌ خطأ: ${e?.message || 'تعذر الإرسال'}`);
    } finally {
      setIsSendingBackup(false);
      setTimeout(() => setBackupSendResult(null), 5000);
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const activeCode = cleanAccountCode(shopCode) || generateUniqueAccountCode(user?.uid);

    onSaveSettings({
      ...settings,
      storeName: storeName.trim() || 'سوبرماركت',
      ownerName: ownerName.trim() || 'صاحب المحل',
      ownerEmail: ownerEmail.trim() || 'example@gmail.com',
      ownerPasswordCode: ownerPasswordCode.trim() || '123123',
      shopCode: activeCode,
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

  const activeCodeDisplay = cleanAccountCode(shopCode) || 'G' + Math.floor(100000 + Math.random() * 900000);

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#070b14] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200">
      {/* Full Screen Header */}
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
              <h2 className="text-base font-black text-white leading-tight">واجهة الإعدادات والتحكم بالنظام</h2>
              <p className="text-[11px] text-slate-300">نوافذ منسدلة مستقلة، تظهر الخيارات تحت كل قسم عند الضغط عليه</p>
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

          {/* ======================================================== */}
          {/* نافذة منسدلة 1: رمز الحساب وبيانات تسجيل الدخول */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#111726] rounded-2xl border-2 border-slate-200/90 dark:border-[#1d273e] overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('accountCode')}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-blue-50/70 via-white to-transparent dark:from-[#131d33] dark:via-[#111726] dark:to-transparent hover:bg-blue-50/90 dark:hover:bg-[#16213a] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      رمز الحساب وبيانات تسجيل الدخول
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      بيانات الدخول
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    رمز الحساب، البريد الإلكتروني، والرمز السري (كلمة المرور)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-xs font-bold hidden sm:inline text-blue-600 dark:text-blue-400">
                  {openSections.accountCode ? 'إغلاق الخيارات' : 'عرض الخيارات'}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${
                    openSections.accountCode ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {openSections.accountCode && (
              <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Shop Code Card */}
                  <div className="p-3.5 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-blue-500" />
                        <span>رمز الحساب:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyText(shopCode, 'رمز الحساب')}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px] font-semibold"
                        >
                          <Copy className="w-3 h-3" />
                          <span>نسخ</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={shopCode}
                        onChange={(e) => setShopCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        className="w-full text-base font-black font-mono text-blue-600 dark:text-blue-400 tracking-wider bg-slate-50 dark:bg-[#151c2e] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#273656] focus:outline-hidden focus:border-blue-500"
                        placeholder="GXXXXXX"
                      />
                      <span className="absolute left-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold pointer-events-none">
                        الكود
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="w-full py-1 px-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-[#161f33] hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>توليد رمز جديد للحساب</span>
                    </button>
                  </div>

                  {/* Owner Email */}
                  <div className="p-3.5 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
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
                    <div className="text-[10px] text-slate-400">
                      يُستخدم لتسجيل الدخول السحابي ومزامنة بياناتك
                    </div>
                  </div>

                  {/* Owner Password / Security Code */}
                  <div className="p-3.5 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>الرمز السري (كلمة المرور):</span>
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
                    <div className="text-[10px] text-slate-400">
                      يُستخدم لحماية حسابك والدخول من أي جهاز آخر
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <Check className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <span>
                    يمكنك تسجيل الدخول برمز الحساب <code className="font-mono font-bold bg-white dark:bg-[#12192b] px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">{activeCodeDisplay}</code> أو بالبريد الإلكتروني والرمز السري من أي جهاز آخر.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* نافذة منسدلة 2: بوت تليجرام للإشعارات والنسخ اليومي */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#111726] rounded-2xl border-2 border-sky-500/40 dark:border-sky-900/50 overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('telegram')}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-sky-50/70 via-white to-transparent dark:from-[#0d1e33] dark:via-[#111726] dark:to-transparent hover:bg-sky-50/90 dark:hover:bg-[#14263f] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-sky-500/20">
                  <Send className="w-5 h-5 -rotate-45 translate-x-0.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      بوت تليجرام للإشعارات الفورية والنسخ اليومي (12:00 ص)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                      @{DEFAULT_TELEGRAM_BOT_USERNAME}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    إرسال رمز الحساب للبوت لاستلام إشعار بكل دين ورفع نسخة يومية تلقائية للديون
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                {telegramChatId ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مربوط</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>غير مربوط</span>
                  </span>
                )}
                <div
                  className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${
                    openSections.telegram ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {openSections.telegram && (
              <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
                {/* Instructions Box */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#0e1626] border border-sky-200 dark:border-[#203656] space-y-3">
                  <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <MessageSquare className="w-4 h-4" />
                      <span>طريقة ربط حسابك بالبوت لاستلام الإشعارات والنسخ:</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] space-y-1.5 text-slate-600 dark:text-slate-300 pr-1">
                      <li>
                        افتح بوت تليجرام: <strong>@{DEFAULT_TELEGRAM_BOT_USERNAME}</strong> عبر الضغط على الزر أدناه.
                      </li>
                      <li>
                        أرسل رمز حسابك: <code className="font-mono font-bold bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-300 text-xs">{activeCodeDisplay}</code> إلى محادثة البوت.
                      </li>
                      <li>
                        اضغط زر <strong>«فحص والربط مع البوت الآن»</strong> لإتمام الربط وتفعيل إشعارات الديون والنسخة الاحتياطية.
                      </li>
                    </ol>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={`https://t.me/${DEFAULT_TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(activeCodeDisplay)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-sky-500/20"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح البوت في تليجرام وإرسال رمز الحساب ({activeCodeDisplay})</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCheckAndLinkTelegram}
                      disabled={isLinkingTelegram}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLinkingTelegram ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                          <span>جاري فحص رسائل البوت...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 text-sky-400" />
                          <span>فحص والربط مع البوت الآن</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feedback result */}
                  {telegramLinkStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-in fade-in ${
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

                {/* Linked Chat Details & Test / Backup Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span>معرف محادثة تليجرام (Chat ID):</span>
                      {telegramChatId && (
                        <button
                          type="button"
                          onClick={() => {
                            setTelegramChatId('');
                            setTelegramOwnerName('');
                          }}
                          className="text-rose-500 hover:underline text-[11px] cursor-pointer font-bold"
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
                      className="w-full text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-[#151c2e] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-[#273656] text-left"
                    />
                    {telegramOwnerName && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        صاحب الحساب المربوط: <span className="font-bold text-sky-600 dark:text-sky-400">{telegramOwnerName}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-2 flex flex-col justify-center">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      إجراءات فورية عبر البوت:
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleTestTelegramNotification}
                        disabled={isTestingTelegram || !telegramChatId}
                        className="flex-1 py-2 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingTelegram ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>إرسال إشعار تجريبي</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendManualDailyBackup}
                        disabled={isSendingBackup || !telegramChatId}
                        className="flex-1 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingBackup ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
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
                <div className="p-3.5 bg-white dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#243354] space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        إرسال إشعار فوري عند كل دين جديد أو دفعة تسديد
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        يقوم البوت بإرسال رسالة تليجرام فورية لك تحتوي اسم الزبون، المبلغ المسجل، والرصيد المتبقي.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableTelegramAlerts}
                      onChange={(e) => setEnableTelegramAlerts(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                    />
                  </label>

                  <div className="border-t border-slate-100 dark:border-[#1e2942] pt-2.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            رفع نسخة من الديون يومياً الساعة 12:00 صباحاً
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            تلقائي يومياً
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          يقوم النظام يومياً عند منتصف الليل (الساعة 12:00 ص) بتوليد تقرير شامل ورفع ملف نسخة احتياطية من جميع ديون وزبائن هذا الحساب إلى محادثة تليجرام الخاصة بك.
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

                {/* Collapsible Token Settings */}
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
                        التوكن المعتمد: <code className="font-mono select-all">{DEFAULT_TELEGRAM_BOT_TOKEN}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* نافذة منسدلة 3: بيانات المتجر والعملة */}
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
                      بيانات المتجر والعملة
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      الاسم والعملة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    الاسم التجاري للمتجر، اسم المسؤول، رقم الهاتف، العملة المعتمدة والعنوان
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-xs font-bold hidden sm:inline text-indigo-600 dark:text-indigo-400">
                  {openSections.store ? 'إغلاق الخيارات' : 'عرض الخيارات تحتها'}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${
                    openSections.store ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {openSections.store && (
              <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3.5 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        اسم السوبرماركت / المتجر
                      </label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 text-left focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        العملة الافتراضية للحسابات
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      placeholder="بغداد - الكرادة - قرب..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* نافذة منسدلة 4: إشعارات الواتساب وسقف الائتمان */}
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
                      إشعارات الواتساب وسقف الائتمان
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
                  {openSections.whatsapp ? 'إغلاق الخيارات' : 'عرض الخيارات تحتها'}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${
                    openSections.whatsapp ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {openSections.whatsapp && (
              <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          إشعارات وتنبيهات الواتساب التلقائية
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          تجهيز رسالة مفصلة بالدين الجديد والقديم وإجمالي الرصيد عند كل حركة
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
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
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
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        سقف الائتمان الصارم
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

                  <div className="pt-2 border-t border-slate-100 dark:border-[#202c46]">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      نص رسالة تذكير الواتساب العامة للزبائن
                    </label>
                    <textarea
                      rows={2}
                      value={customWhatsAppMessage}
                      onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      المتغيرات المدعومة: <code>{'{NAME}'}</code> للاسم، <code>{'{AMOUNT}'}</code> للرصيد، <code>{'{STORE}'}</code> لاسم المحل، <code>{'{CURRENCY}'}</code> للعملة.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* نافذة منسدلة 5: الحساب السحابي والمزامنة */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#111726] rounded-2xl border-2 border-slate-200/90 dark:border-[#1d273e] overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('cloud')}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-teal-50/70 via-white to-transparent dark:from-[#0f2128] dark:via-[#111726] dark:to-transparent hover:bg-teal-50/90 dark:hover:bg-[#132a33] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-teal-500/20">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      الحساب السحابي والمزامنة
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      فايربيس السحابي
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    حالة الاتصال السحابي، المزامنة اليدوية، وتسجيل الخروج
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-xs font-bold hidden sm:inline text-teal-600 dark:text-teal-400">
                  {openSections.cloud ? 'إغلاق الخيارات' : 'عرض الخيارات تحتها'}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${
                    openSections.cloud ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {openSections.cloud && (
              <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          حالة المزامنة السحابية والحساب
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isOnline ? 'متصل بالإنترنت وقاعدة البيانات السحابية' : 'العمل في وضع عدم الاتصال (Offline)'}
                        </p>
                      </div>
                    </div>
                    {user ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>المزامنة السحابية نشطة</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">غير مسجل الدخول سحابياً</span>
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

                      <div className="flex items-center gap-2">
                        {onForceSync && (
                          <button
                            type="button"
                            onClick={onForceSync}
                            disabled={isSyncing}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>مزامنة سحابية الآن</span>
                          </button>
                        )}

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
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#101524] p-3 rounded-xl border border-slate-200 dark:border-[#202b44]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {appUser ? appUser.name : 'بيانات الهاتف والمسؤول'}
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
          {/* نافذة منسدلة 6: مظهر التطبيق والنظام وإعادة التعيين */}
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
                      مظهر التطبيق والنظام وإعادة التعيين
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      المظهر والنظام
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    الوضع الليلي والنهاري، وإعادة تعيين البيانات
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-xs font-bold hidden sm:inline text-purple-600 dark:text-purple-400">
                  {openSections.appearance ? 'إغلاق الخيارات' : 'عرض الخيارات تحتها'}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#172033] flex items-center justify-center transition-transform duration-200 ${
                    openSections.appearance ? 'rotate-180 text-purple-600 dark:text-purple-400' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {openSections.appearance && (
              <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d1320] border-t border-slate-100 dark:border-[#1d273f] animate-in fade-in duration-200">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>مظهر التطبيق (الوضع الليلي / النهاري)</span>
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

                {/* Reset Data */}
                <div className="p-4 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-white dark:bg-[#161c2d] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>إعادة تعيين البيانات وتصفير السجل</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      إعادة تعيين البيانات للوضع الأولي بالدينار العراقي
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetData}
                    className="px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>إعادة تعيين البيانات</span>
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
          <span>العودة لدفتر الديون</span>
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
