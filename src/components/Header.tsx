import React, { useState } from 'react';
import { StoreSettings, AppUser } from '../types';
import { User } from 'firebase/auth';
import {
  Store,
  UserPlus,
  PlusCircle,
  ArrowDownLeft,
  Settings,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  CheckCircle2,
  Moon,
  Sun,
  Users,
  LayoutDashboard,
  Truck,
  Shield,
  Phone,
} from 'lucide-react';

interface HeaderProps {
  settings: StoreSettings;
  user: User | null;
  appUser?: AppUser | null;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  activeView: 'DEBTORS' | 'DASHBOARD' | 'SUPPLIERS';
  onViewChange: (view: 'DEBTORS' | 'DASHBOARD' | 'SUPPLIERS') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAddDebtor: () => void;
  onOpenAddDebt: () => void;
  onOpenAddPayment: () => void;
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
  onOpenAddDebtor,
  onOpenAddDebt,
  onOpenAddPayment,
  onOpenSettings,
  onExportCSV,
  onLogin,
  onLogout,
  onOpenPhoneAuth,
  onForceSync,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white dark:bg-[#0f1422] border-b border-slate-200 dark:border-[#1e273d] sticky top-0 z-30 shadow-xs transition-colors">
      {/* Top Connection & Sync Status Banner when Offline */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-900 px-4 py-1.5 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              أنت الآن في وضع الأوفلاين (بدون إنترنت). يعمل النظام بكفاءة كاملة وسيتم حفظ وتزامن كافة البيانات فور عودة الاتصال!
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
          {/* Store Info, Badges & Currency */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {settings.storeName || 'سوبرماركت دجلة والفرات'}
                  </h1>
                  <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>العملة: {settings.currency === 'د.ع' ? 'دينار عراقي (د.ع)' : (settings.currency || 'دينار عراقي')}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>المسؤول: {appUser?.name || settings.ownerName || 'المحل'}</span>

                  {/* Sync & Auth Status Badge */}
                  <div className="flex items-center gap-1.5 mr-1">
                    {appUser && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span>مُسجّل: {appUser.phone}</span>
                      </span>
                    )}

                    {isOnline ? (
                      user ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 cursor-pointer"
                          title="البيانات متزامنة سحابياً في الوقت الفعلي مع كل الأجهزة"
                          onClick={onForceSync}
                        >
                          <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>متزامن سحابياً</span>
                          {isSyncing && <RefreshCw className="w-2.5 h-2.5 animate-spin mr-0.5" />}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50"
                          title="البيانات محفوظة على هذا الجهاز"
                        >
                          <Wifi className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          <span>حفظ محلي فوري</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        <CloudOff className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                        <span>أوفلاين (محفوظ بالجهاز)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Actions (Theme Toggle & Auth & Logout) */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={onToggleTheme}
                title={isDark ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الليلي (Dark Mode)'}
                className="p-2 rounded-xl bg-slate-100 dark:bg-[#182137] text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-[#2b3957] cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {(user || appUser) && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 cursor-pointer flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

              {onOpenPhoneAuth && !appUser && !user && (
                <button
                  type="button"
                  onClick={onOpenPhoneAuth}
                  className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>دخول</span>
                </button>
              )}
            </div>
          </div>

          {/* Center Main Tabs: "الزبائن" vs "الصفحة الرئيسية" vs "ديون الموردين" */}
          <div className="flex items-center justify-center">
            <div className="flex bg-slate-100 dark:bg-[#101524] p-1 rounded-xl border border-slate-200 dark:border-[#1e273d]">
              <button
                type="button"
                onClick={() => onViewChange('DEBTORS')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'DEBTORS'
                    ? 'bg-white dark:bg-[#2563eb] text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ديون الزبائن</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('SUPPLIERS')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'SUPPLIERS'
                    ? 'bg-white dark:bg-[#2563eb] text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>حسابات الموردين</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('DASHBOARD')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

          {/* Quick Action Buttons & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Add Debt (+ مواد) */}
            <button
              id="btn-quick-add-debt"
              onClick={onOpenAddDebt}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل دين</span>
            </button>

            {/* Quick Add Payment (+ كاش) */}
            <button
              id="btn-quick-add-payment"
              onClick={onOpenAddPayment}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>تسديد دفعة</span>
            </button>

            {/* Add Debtor */}
            <button
              id="btn-add-debtor"
              onClick={onOpenAddDebtor}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>زبون جديد</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-[#27324c] mx-0.5 hidden sm:block" />

            {/* Theme Toggle Button (Dark / Light Mode) */}
            <button
              id="btn-toggle-theme"
              type="button"
              onClick={onToggleTheme}
              title={isDark ? 'تفعيل الوضع الفاتح (Light Mode)' : 'تفعيل الوضع الليلي (Dark Mode)'}
              className="p-2 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-[#182137] rounded-xl border border-slate-200 dark:border-[#27324c] transition-colors cursor-pointer flex items-center justify-center"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* User Account & Logout Pill */}
            <div className="relative">
              {user ? (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button
                      id="header-user-menu-btn"
                      type="button"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-50 dark:bg-[#161c2d] hover:bg-slate-100 dark:hover:bg-[#1c2438] border border-slate-200 dark:border-[#27324c] rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                      <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.displayName || user.email?.split('@')[0]}</span>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowUserMenu(false)}
                        />
                        <div
                          className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-[#161c2d] rounded-2xl shadow-xl border border-slate-200 dark:border-[#27324c] py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                        >
                          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-[#27324c]">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {user.displayName || settings.ownerName || 'صاحب المتجر'}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate dir-ltr text-left font-mono">{user.email}</p>
                            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>المزامنة السحابية مفعلة بالكامل</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setShowUserMenu(false);
                              onForceSync();
                            }}
                            className="w-full px-3.5 py-2 text-right text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f283d] flex items-center gap-2 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>مزامنة يدوية فورية الآن</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowUserMenu(false);
                              onLogout();
                            }}
                            className="w-full px-3.5 py-2 text-right text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-[#27324c] mt-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>تسجيل الخروج من الحساب</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    id="btn-direct-header-logout"
                    type="button"
                    onClick={onLogout}
                    title="تسجيل الخروج من الحساب"
                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : appUser ? (
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-200">
                    <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {appUser.name?.[0] || 'ح'}
                    </div>
                    <span className="max-w-[70px] sm:max-w-[110px] truncate">{appUser.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 hidden sm:inline">محلي</span>
                  </div>

                  <button
                    id="btn-direct-header-logout"
                    type="button"
                    onClick={onLogout}
                    title="تسجيل الخروج من الحساب"
                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Export CSV */}
            <button
              id="btn-export-excel"
              onClick={onExportCSV}
              title="تصدير كشف إكسل CSV"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-[#182137] rounded-xl transition-colors border border-slate-200 dark:border-[#27324c] cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              title="إعدادات المحل والنسخ الاحتياطي"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#182137] rounded-xl transition-colors border border-slate-200 dark:border-[#27324c] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
