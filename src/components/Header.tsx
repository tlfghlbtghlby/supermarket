import React from 'react';
import { StoreSettings, AppUser } from '../types';
import { User } from 'firebase/auth';
import {
  Store,
  UserPlus,
  PlusCircle,
  ArrowDownLeft,
  Settings,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  Users,
  LayoutDashboard,
  Truck,
  Shield,
  Clock,
  Tag,
  Edit2,
  Sparkles,
  Mic,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  settings: StoreSettings;
  user: User | null;
  appUser?: AppUser | null;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  activeView: 'DEBTORS' | 'CUSTOMERS' | 'DASHBOARD' | 'SUPPLIERS';
  onViewChange: (view: 'DEBTORS' | 'CUSTOMERS' | 'DASHBOARD' | 'SUPPLIERS') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  currentSessionName?: string;
  onOpenSessionModal?: () => void;
  onOpenAddDebtor: () => void;
  onOpenAddDebt: () => void;
  onOpenAddPayment: () => void;
  onOpenVoiceModal?: () => void;
  onOpenGeminiAssistant?: () => void;
  onOpenSettings: () => void;
  onExportCSV: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenPhoneAuth?: () => void;
  onForceSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  user,
  appUser,
  isOnline,
  isSyncing,
  lastSyncedAt: _lastSyncedAt,
  activeView,
  onViewChange,
  isDark,
  onToggleTheme,
  currentSessionName,
  onOpenSessionModal,
  onOpenAddDebtor,
  onOpenAddDebt,
  onOpenAddPayment,
  onOpenVoiceModal: _onOpenVoiceModal,
  onOpenGeminiAssistant,
  onOpenSettings,
  onExportCSV: _onExportCSV,
  onLogin: _onLogin,
  onLogout: _onLogout,
  onOpenPhoneAuth: _onOpenPhoneAuth,
  onForceSync,
}) => {
  const officerName = appUser?.name || settings.ownerName || 'المحل';

  return (
    <header className="bg-white dark:bg-[#0f1422] border-b border-slate-200 dark:border-[#1e273d] sticky top-0 z-30 shadow-xs transition-colors">
      {/* Top Connection & Sync Status Banner when Offline */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-900 px-4 py-1 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span>أنت الآن في وضع الأوفلاين (بدون إنترنت). يعمل النظام بكفاءة كاملة وسيتم حفظ وتزامن كافة البيانات فور عودة الاتصال!</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* 1. Store Info & Session + Gemini AI Assistant Button + Settings */}
          <div className="flex items-center justify-between w-full md:w-auto gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[140px] sm:max-w-[200px] md:max-w-none">
                  {settings.storeName || 'سوبرماركت دجلة والفرات'}
                </h1>

                <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/50 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{settings.currency === 'د.ع' ? 'د.ع' : (settings.currency || 'د.ع')}</span>
                </span>

                {/* Current Session Name Button */}
                {onOpenSessionModal && (
                  <button
                    id="btn-header-session"
                    type="button"
                    onClick={onOpenSessionModal}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/70 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all cursor-pointer shadow-2xs group shrink-0"
                    title="انقر لتسمية أو تغيير الجلسة الحالية (المسؤول / الكاشير)"
                  >
                    <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span>الجلسة: <span className="underline decoration-amber-500 decoration-2 font-black">{currentSessionName || 'الجلسة 1'}</span></span>
                    <Edit2 className="w-2.5 h-2.5 text-amber-600/70 dark:text-amber-400/70" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* زر مساعد Gemini الصوتي الذكي في أعلى نسخة */}
              {onOpenGeminiAssistant && (
                <button
                  id="btn-header-gemini-assistant"
                  type="button"
                  onClick={onOpenGeminiAssistant}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/25 transition-all cursor-pointer group shrink-0"
                  title="مساعد Gemini الذكي - تسجيل صوتي وتفاعل كامل مع الديون والأوامر"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform shrink-0" />
                  <Mic className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="text-[11px] sm:text-xs">مساعد Gemini ✦</span>
                </button>
              )}

              {/* زر التبديل السريع بين الوضع الفاتح والداكن (شمس / قمر) */}
              <button
                id="btn-toggle-theme"
                type="button"
                onClick={onToggleTheme}
                title={isDark ? 'التحويل إلى الوضع الفاتح (النهاري)' : 'التحويل إلى الوضع الداكن (الليلي)'}
                className="p-1.5 sm:p-2 flex items-center gap-1 text-slate-700 dark:text-amber-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#182137] dark:hover:bg-[#202c49] rounded-xl transition-all border border-slate-300 dark:border-[#27324c] cursor-pointer shrink-0 shadow-2xs"
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-bold text-slate-200 hidden sm:inline">فاتح</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px] font-bold text-slate-700 hidden sm:inline">داكن</span>
                  </>
                )}
              </button>

              {/* زر الإعدادات في الأعلى في أقصى اليسار */}
              <button
                id="btn-open-settings"
                type="button"
                onClick={onOpenSettings}
                title="إعدادات المحل والجلسات والأجهزة"
                className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#182137] rounded-xl transition-colors border border-slate-200 dark:border-[#27324c] cursor-pointer shrink-0"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Center Navigation Tabs */}
          <div className="flex items-center order-3 md:order-2 w-full md:w-auto justify-center">
            <div className="flex bg-slate-100 dark:bg-[#101524] p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-[#1e273d] w-full md:w-auto justify-around">
              <button
                type="button"
                onClick={() => onViewChange('DEBTORS')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'DEBTORS'
                    ? 'bg-white dark:bg-[#2563eb] text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>آخر الحركات</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('CUSTOMERS')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'CUSTOMERS'
                    ? 'bg-white dark:bg-[#2563eb] text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>الزبائن</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('SUPPLIERS')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'SUPPLIERS'
                    ? 'bg-white dark:bg-[#2563eb] text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>الموردين</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('DASHBOARD')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'DASHBOARD'
                    ? 'bg-white dark:bg-[#2563eb] text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>الإحصائيات</span>
              </button>
            </div>
          </div>

          {/* 3. Right Action Area: Officer Name + Sync Button + Action Buttons (دين، تسديد، زبون) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 order-2 md:order-3 w-full md:w-auto">
            {/* Badges: Officer + Sync */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0">
              <div
                className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-slate-100 dark:bg-[#161c2d] border border-slate-200 dark:border-[#27324c] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0"
                title="اسم المسؤول الحالي"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] sm:text-xs">المسؤول: <span className="text-blue-600 dark:text-blue-400 font-black">{officerName}</span></span>
              </div>

              {/* زر المزامنة السحابية */}
              <button
                id="header-sync-status-btn"
                type="button"
                onClick={onForceSync}
                title="حالة المزامنة السحابية - انقر لمزامنة يدوية فورية"
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                  isOnline
                    ? user
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60 hover:bg-sky-100'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                {isOnline ? (
                  user ? (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] sm:text-xs">متزامن</span>
                      {isSyncing && <RefreshCw className="w-3 h-3 animate-spin mr-0.5 text-emerald-600" />}
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span className="text-[11px] sm:text-xs">حفظ محلي</span>
                    </>
                  )
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] sm:text-xs">أوفلاين</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Actions (الأزرار الثلاثة المحددة: + دين، + تسديد، + زبون) - تتمدد بعرض كامل في الموبايل بدون أي اقتصاص */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
              {/* Quick Add Debt (+ دين) */}
              <button
                id="btn-quick-add-debt"
                type="button"
                onClick={onOpenAddDebt}
                className="flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 active:scale-95"
                title="تسجيل دين جديد"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">+ دين</span>
              </button>

              {/* Quick Add Payment (+ تسديد) */}
              <button
                id="btn-quick-add-payment"
                type="button"
                onClick={onOpenAddPayment}
                className="flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 active:scale-95"
                title="تسجيل دفعة تسديد"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">+ تسديد</span>
              </button>

              {/* Add Debtor (+ زبون) */}
              <button
                id="btn-add-debtor"
                type="button"
                onClick={onOpenAddDebtor}
                className="flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 active:scale-95"
                title="إضافة زبون جديد"
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">+ زبون</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
