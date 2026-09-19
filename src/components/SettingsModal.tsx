import React, { useState, useRef } from 'react';
import { StoreSettings, AppUser } from '../types';
import { User } from 'firebase/auth';
import { exportBackupData, importBackupData, resetToSampleData } from '../utils/storage';
import {
  X,
  Settings,
  Download,
  Upload,
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
  Bot,
  Send,
  Key,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { testMetaBotConnection } from '../services/whatsappBot';

interface SettingsModalProps {
  isOpen: boolean;
  settings: StoreSettings;
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
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone || '07854668977');
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState(settings.customWhatsAppMessage);
  const [enableWhatsAppAlerts, setEnableWhatsAppAlerts] = useState(settings.enableWhatsAppAlerts ?? true);
  const [storeWhatsAppPhone, setStoreWhatsAppPhone] = useState(settings.storeWhatsAppPhone || settings.phone || '');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(settings.themeMode || 'dark');
  const [strictCreditLimit, setStrictCreditLimit] = useState(settings.strictCreditLimit ?? false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // إعدادات بوت واتساب التلقائي (Meta WhatsApp Cloud API)
  const [metaWhatsAppEnabled, setMetaWhatsAppEnabled] = useState(settings.metaWhatsAppEnabled ?? false);
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState(settings.metaPhoneNumberId || '');
  const [metaAccessToken, setMetaAccessToken] = useState(settings.metaAccessToken || '');
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState('07854668977');
  const [showMetaGuide, setShowMetaGuide] = useState(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; msg?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTestBot = async () => {
    if (!metaPhoneNumberId.trim()) {
      alert('يرجى إدخال معرف رقم الهاتف (Phone Number ID) أولاً');
      return;
    }
    if (!metaAccessToken.trim()) {
      alert('يرجى إدخال رمز الوصول (Access Token) أولاً');
      return;
    }
    if (!testPhone.trim()) {
      alert('يرجى إدخال رقم هاتف لإجراء الاختبار عليه');
      return;
    }

    setTestStatus({ loading: true });
    try {
      const res = await testMetaBotConnection({
        phoneNumberId: metaPhoneNumberId.trim(),
        accessToken: metaAccessToken.trim(),
        testPhone: testPhone.trim(),
        storeName: storeName.trim(),
      });
      if (res.success) {
        setTestStatus({
          loading: false,
          success: true,
          msg: 'تم إرسال الرسالة الاختبارية بنجاح عبر بوت الواتساب! تحقق من هاتف المستلم.',
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          msg: res.error || 'فشل الإرسال. تحقق من صحة الرمز ومعرف الرقم.',
        });
      }
    } catch (e: any) {
      setTestStatus({
        loading: false,
        success: false,
        msg: e?.message || 'خطأ أثناء الاتصال بواجهة Meta',
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      storeName: storeName.trim() || 'سوبرماركت',
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currency,
      customCurrencyName: currency === 'د.ع' ? 'دينار عراقي' : currency,
      customWhatsAppMessage,
      enableWhatsAppAlerts,
      storeWhatsAppPhone: storeWhatsAppPhone.trim(),
      themeMode,
      strictCreditLimit,
      metaWhatsAppEnabled,
      metaPhoneNumberId: metaPhoneNumberId.trim(),
      metaAccessToken: metaAccessToken.trim(),
    });
    onClose();
  };

  const handleExportBackup = () => {
    const json = exportBackupData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_احتياطية_ديون_المحل_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = importBackupData(content);
        if (res.success) {
          setImportStatus('تم استرجاع النسخة الاحتياطية بنجاح!');
          onReloadData();
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus(`خطأ: ${res.message}`);
        }
      } catch {
        setImportStatus('تعذر قراءة الملف. تأكد من أنه ملف JSON سليم.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#131929] rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-[#27324c] max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1e273d] flex items-center justify-between bg-slate-900 dark:bg-[#0d121f] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إعدادات المحل والواتساب والمظهر</h3>
              <p className="text-xs text-slate-300">العملة، إرسال إشعارات الواتساب، الوضع الليلي، وتسجيل الدخول</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-[#1a233a] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-[#0c101b]">
          {/* User Profile & Auth Section */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  الحساب وتسجيل الدخول السحابي
                </h4>
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

            {/* Cloud User Card & Logout */}
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

          {/* Theme & Display Options */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>مظهر التطبيق (دارك مود / لايت مود)</span>
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

          {/* WhatsApp Automation Settings */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    إشعارات وتنبيهات الواتساب التلقائية
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
          </div>

          {/* Meta WhatsApp Cloud API Bot Settings (الطريقة الثانية - بوت واتساب مركزي) */}
          <div className={`p-4 rounded-xl border transition-all space-y-3 ${
            metaWhatsAppEnabled
              ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-[#102028]/60 shadow-xs'
              : 'border-slate-200 dark:border-[#27324c] bg-white dark:bg-[#161c2d]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  metaWhatsAppEnabled
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-[#1f283e] text-slate-600 dark:text-slate-400'
                }`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      بوت واتساب التلقائي المركزي (Meta Cloud API)
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      الطريقة الثانية
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    إرسال الرسائل تلقائياً في الخلفية للزبون من رقمك المخصص، دون حاجة لواتساب على جهاز الموظف
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={metaWhatsAppEnabled}
                  onChange={(e) => setMetaWhatsAppEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {metaWhatsAppEnabled && (
              <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <span>معرف رقم الهاتف (Phone Number ID)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="مثلاً: 105839201948291"
                      value={metaPhoneNumberId}
                      onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>رمز الوصول (Access Token)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showToken ? 'إخفاء' : 'إظهار'}</span>
                      </button>
                    </div>
                    <input
                      type={showToken ? 'text' : 'password'}
                      dir="ltr"
                      placeholder="EAA..."
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Live Test Bot Box */}
                <div className="p-3 bg-white dark:bg-[#121829] rounded-xl border border-slate-200 dark:border-[#24304b] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-500" />
                      <span>فحص وتجربة إرسال رسالة من البوت</span>
                    </span>
                    <span className="text-[10px] text-slate-400">تحقق فوري</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="07xxxxxxxx"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#0c101c] border border-slate-300 dark:border-[#27324c] rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={testStatus?.loading}
                      onClick={handleTestBot}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {testStatus?.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{testStatus?.loading ? 'جاري الإرسال...' : 'إرسال تجريبي'}</span>
                    </button>
                  </div>

                  {testStatus && (
                    <div className={`p-2 rounded-lg text-[11px] font-medium flex items-start gap-1.5 ${
                      testStatus.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}>
                      {testStatus.success ? <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      <span>{testStatus.msg}</span>
                    </div>
                  )}
                </div>

                {/* Helper Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMetaGuide(!showMetaGuide)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>كيف تحصل على معرف الهاتف والرمز من Meta؟ (شرح مبسط)</span>
                  </button>

                  {showMetaGuide && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#27324c] text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100">خطوات تفعيل البوت الرسمي من Meta:</p>
                      <p>1. ادخل إلى <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-500 underline font-mono">developers.facebook.com</a> وأنشئ تطبيقاً من نوع (Business).</p>
                      <p>2. أضف منتج (WhatsApp) للتطبيق، وستحصل فوراً على <strong>Phone Number ID</strong> خاص برقمك أو رقم تجريبي مجاني.</p>
                      <p>3. انسخ <strong>Access Token</strong> والصقه في الحقل أعلاه.</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">✨ الآن أي مستخدم أو كاشير يسجل حركة في البرنامج، سيقوم البوت فوراً بالإرسال للزبون تلقائياً من هذا الرقم المركزي في الخلفية.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form id="store-settings-form" onSubmit={handleSave} className="space-y-4">
            {/* Store details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم السوبرماركت / المتجر
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رقم الهاتف الرسمي
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  العملة الافتراضية
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نص رسالة تذكير الواتساب العامة
              </label>
              <textarea
                rows={2}
                value={customWhatsAppMessage}
                onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التغييرات</span>
              </button>
            </div>
          </form>

          {/* Backup & Restore */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#27324c] space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              النسخ الاحتياطي اليدوي للملفات (يشمل ديون الزبائن والموردين)
            </h4>

            {importStatus && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{importStatus}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3.5 py-2 bg-white dark:bg-[#161c2d] hover:bg-slate-100 dark:hover:bg-[#1d273f] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#2b3957] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>تحميل نسخة احتياطية (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-white dark:bg-[#161c2d] hover:bg-slate-100 dark:hover:bg-[#1d273f] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#2b3957] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-500" />
                <span>استرجاع نسخة احتياطية</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                type="button"
                onClick={handleResetData}
                className="px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer mr-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>إعادة ضبط المصنع</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
