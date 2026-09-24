import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Store,
  User as UserIcon,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  HelpCircle,
  X,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import {
  loginWithGoogle,
  loginWithEmailOrPhone,
  registerWithEmailOrPhone,
  resetPasswordForUser,
  checkRedirectAuthResult,
  isAndroidWebView,
} from '../lib/firebase';
import { syncStoreSettings } from '../services/firebaseSync';
import { initialSettings } from '../data/initialData';
import { saveAppUser, loadSettings, saveSettings } from '../utils/storage';
import { generateUniqueAccountCode } from '../utils/accountCode';
import { AppUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onOfflineContinue?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onOfflineContinue }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showApkGoogleHelp, setShowApkGoogleHelp] = useState(false);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  // Check if returning from Google Redirect
  useEffect(() => {
    checkRedirectAuthResult().then((user) => {
      if (user) {
        onLoginSuccess?.();
      }
    });
  }, [onLoginSuccess]);

  const mapAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/apk-webview-unsupported' || err?.message === 'APK_WEBVIEW_GOOGLE_UNSUPPORTED') {
      setShowApkGoogleHelp(true);
      return 'تسجيل الدخول بجوجل غير مدعوم داخل تطبيق APK (WebView) بسبب قيود الحماية من Google. يُرجى تسجيل الدخول بالبريد الإلكتروني أو الهاتف وكلمة المرور.';
    }
    if (code.includes('operation-not-allowed')) {
      return 'طريقة تسجيل الدخول هذه غير مفعلة في مشروع Firebase. يرجى استخدام البريد الإلكتروني وكلمة المرور.';
    }
    if (code.includes('unauthorized-domain')) {
      return `نطاق التطبيق (${currentDomain}) غير مضاف في قائمة النطاقات المعتمدة بـ Firebase. يمكنك المتابعة بالبريد وكلمة المرور.`;
    }
    if (code.includes('user-not-found') || code.includes('invalid-credential')) {
      return 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد أو رقم الهاتف وكلمة المرور أو إنشاء حساب جديد.';
    }
    if (code.includes('wrong-password')) {
      return 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً أو النقر على "نسيت كلمة المرور".';
    }
    if (code.includes('email-already-in-use')) {
      return 'هذا البريد أو الرقم مسجل مسبقاً! انقر على تبويب "تسجيل الدخول" في الأعلى للمتابعة.';
    }
    if (code.includes('weak-password')) {
      return 'كلمة المرور ضعيفة، يرجى إدخال 6 خانات أو أرقام على الأقل.';
    }
    if (code.includes('invalid-email')) {
      return 'يرجى إدخال بريد إلكتروني صحيح أو رقم هاتف.';
    }
    if (code.includes('popup-blocked')) {
      return 'تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة أو الدخول بالبريد وكلمة المرور.';
    }
    if (code.includes('popup-closed-by-user')) {
      return 'تم إغلاق نافذة تسجيل الدخول بجوجل قبل إتمام العملية.';
    }
    if (code.includes('network-request-failed')) {
      return 'تعذر الاتصال بالسحابة حالياً. يرجى التأكد من اتصال الإنترنت أو الدخول بالوضع المحلي.';
    }
    return err?.message || 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة لاحقاً.';
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // If already in an Android WebView APK, explain immediately without hanging
    if (isAndroidWebView()) {
      setShowApkGoogleHelp(true);
      return;
    }

    setIsGoogleLoading(true);
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        onLoginSuccess?.();
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        return;
      }
      if (code === 'auth/apk-webview-unsupported' || err?.message === 'APK_WEBVIEW_GOOGLE_UNSUPPORTED') {
        setShowApkGoogleHelp(true);
        return;
      }
      setErrorMsg(mapAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني أو رقم الهاتف أو رمز الحساب.');
      return;
    }

    if (mode === 'FORGOT') {
      setIsLoading(true);
      try {
        await resetPasswordForUser(cleanId);
        setSuccessMsg('تم إرسال رابط إعادة تعيين كلمة المرور بنجاح، تفقد بريدك الإلكتروني.');
        setTimeout(() => {
          setMode('LOGIN');
          setSuccessMsg(null);
        }, 4000);
      } catch (err: any) {
        setErrorMsg(mapAuthError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور أو الرمز السري.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('يجب أن تتكون كلمة المرور من 4 خانات على الأقل.');
      return;
    }

    setIsLoading(true);

    const upperId = cleanId.toUpperCase();
    const isOwnerDemo = upperId === 'G781011' || cleanId.toLowerCase() === 'example@gmail.com';
    const isCashierDemo = upperId === 'C202401' || cleanId.toLowerCase() === 'cashier@example.com';
    const isGuestDemo = upperId === 'GUEST-88' || upperId === 'GUEST';
    const isDirectDemo = upperId === 'DIRECT-01' || upperId === 'DIRECT';

    try {
      if (mode === 'LOGIN') {
        // Internal silent handling of demo/offline credentials if typed manually
        if (isOwnerDemo && password === '123123') {
          const targetUser: AppUser = {
            id: 'usr-owner-g781011',
            name: 'صاحب المحل',
            phone: '07854668977',
            email: 'example@gmail.com',
            shopCode: 'G781011',
            passwordCode: '123123',
            role: 'OWNER',
            isLoggedIn: true,
          };
          saveAppUser(targetUser);
          const currentSettings = loadSettings();
          saveSettings({
            ...currentSettings,
            ownerName: 'صاحب المحل',
            ownerEmail: 'example@gmail.com',
            ownerPasswordCode: '123123',
            shopCode: 'G781011',
          });
          onLoginSuccess?.();
          return;
        }

        if (isCashierDemo && password === '456456') {
          const targetUser: AppUser = {
            id: 'usr-cashier-c202401',
            name: 'كاشير المتجر',
            phone: '07701122334',
            email: 'cashier@example.com',
            shopCode: 'C202401',
            passwordCode: '456456',
            role: 'CASHIER',
            isLoggedIn: true,
          };
          saveAppUser(targetUser);
          onLoginSuccess?.();
          return;
        }

        if ((isGuestDemo && password === '000000') || (isDirectDemo && password === '111111')) {
          const targetUser: AppUser = {
            id: 'usr-local-' + Date.now(),
            name: isGuestDemo ? 'حساب تجريبي' : 'مستخدم محلي',
            phone: '07000000000',
            email: 'local@supermarket.app',
            shopCode: isGuestDemo ? 'GUEST-88' : 'DIRECT-01',
            passwordCode: password,
            role: 'GUEST',
            isLoggedIn: true,
          };
          saveAppUser(targetUser);
          onLoginSuccess?.();
          return;
        }

        // Standard cloud authentication
        try {
          await loginWithEmailOrPhone(cleanId, password);
          onLoginSuccess?.();
        } catch (authErr: any) {
          throw authErr;
        }
      } else {
        // Mode: REGISTER - generates a unique code for this new account
        const assignedShopCode = generateUniqueAccountCode(cleanId);
        try {
          const user = await registerWithEmailOrPhone(
            cleanId,
            password,
            ownerName.trim() || undefined
          );

          if (user) {
            const customSet = {
              ...initialSettings,
              storeName: storeName.trim() || 'دفتر ديون السوبرماركت',
              ownerName: ownerName.trim() || 'صاحب المحل',
              ownerEmail: cleanId,
              ownerPasswordCode: password,
              shopCode: assignedShopCode,
              phone: cleanId.replace(/[^0-9+]/g, ''),
            };
            await syncStoreSettings(customSet, user.uid).catch(() => {});
          }

          setSuccessMsg('تم إنشاء الحساب بنجاح! يتم الدخول الآن...');
          setTimeout(() => {
            onLoginSuccess?.();
          }, 700);
        } catch (regErr: any) {
          throw regErr;
        }
      }
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterGuestMode = () => {
    const guestUser: AppUser = {
      id: 'usr-guest-' + Date.now(),
      name: 'مستخدم تجريبي (محلي)',
      phone: '07000000000',
      email: 'guest@supermarket.app',
      shopCode: 'LOCAL-' + Math.floor(1000 + Math.random() * 9000),
      passwordCode: '0000',
      role: 'GUEST',
      isLoggedIn: true,
    };
    saveAppUser(guestUser);
    if (onOfflineContinue) {
      onOfflineContinue();
    } else {
      onLoginSuccess?.();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden" dir="rtl">
      {/* Background ambient accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* App Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl p-1 bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-xl shadow-blue-500/25 mb-1">
            <img
              src="./icon-192.png"
              alt="أيقونة تطبيق دفتر ديون السوبرماركت"
              className="w-full h-full rounded-[22px] object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            دفتر ديون السوبرماركت
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            تسجيل الدخول إلى دفتر الحسابات وإدارة ديون الزبائن والموردين.
          </p>
        </div>

        {/* Security & Sync Guarantee Banner */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 flex items-start gap-3 text-right">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <Cloud className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-300 space-y-0.5">
            <p className="font-bold text-emerald-400">حفظ سحابي دائم ومشفر</p>
            <p className="text-slate-400 leading-normal">
              حساباتك محفوظة بأمان، ويمكنك الاطلاع على رمز المحل وتعديله من شاشة الإعدادات بعد تسجيل الدخول.
            </p>
          </div>
        </div>

        {/* Main Clean Authentication Card */}
        <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
          
          {/* Google Sign-In Button */}
          <div>
            <button
              id="google-signin-btn"
              type="button"
              disabled={isGoogleLoading || isLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>تسجيل الدخول بحساب Google</span>
            </button>
          </div>

          {/* Clean Subtle Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="h-px bg-slate-700/60 w-full" />
            <span className="bg-slate-800 px-3 py-0.5 rounded-full border border-slate-700/80 text-[11px] text-slate-400 font-medium absolute">
              أو بالبريد وكلمة المرور
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== 'FORGOT' && (
            <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-xl border border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'LOGIN'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'REGISTER'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                إنشاء حساب جديد
              </button>
            </div>
          )}

          {/* Alert Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Clean Input Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم صاحب المحل أو الكاشير
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="أدخل اسمك"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم السوبرماركت / المتجر
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="أدخل اسم المتجر"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني أو الهاتف أو الرمز"
                  dir="ltr"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500 text-left font-sans"
                />
              </div>
            </div>

            {mode !== 'FORGOT' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    كلمة المرور أو الرمز السري
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    dir="ltr"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500 text-left font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'FORGOT' && (
              <p className="text-xs text-slate-400 leading-relaxed">
                أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
              </p>
            )}

            <button
              id="submit-auth-form-btn"
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'LOGIN' ? (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              ) : mode === 'REGISTER' ? (
                <>
                  <span>إنشاء الحساب</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <span>إرسال رابط إعادة التعيين</span>
              )}
            </button>

            {mode === 'FORGOT' && (
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                }}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 text-center block cursor-pointer"
              >
                العودة إلى تسجيل الدخول
              </button>
            )}
          </form>

          {/* Discreet Local Exploration Link */}
          <div className="pt-2 text-center border-t border-slate-700/50">
            <button
              type="button"
              onClick={handleEnterGuestMode}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1"
            >
              المتابعة بدون تسجيل حساب (وضع تجريبي محلي)
            </button>
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400 pt-1">
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>حفظ سحابي دائم</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <Store className="w-4 h-4 text-blue-400" />
            <span>زبائن وموردين</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>كشوفات وحسابات</span>
          </div>
        </div>
      </div>

      {/* APK / Android WebView Google Sign-In Guidance Modal */}
      {showApkGoogleHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <span>تسجيل الدخول بجوجل في تطبيق الهاتف (APK)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowApkGoogleHelp(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                <strong>تنبيه أمان Google:</strong> تمنع شركة Google تسجيل الدخول بالنوافذ المنبثقة وحسابات Google داخل متصفحات الـ WebView لتطبيقات الـ APK المحولة لحماية الحسابات.
              </div>

              <p className="font-bold text-white text-xs sm:text-sm">
                كيف تسجل دخولك بنجاح في تطبيق الهاتف؟
              </p>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                <li>
                  <strong className="text-white">الطريقة الأسهل والأسرع:</strong> سجّل دخولك أو أنشئ حساباً باستخدام <strong>البريد الإلكتروني أو رقم الهاتف وكلمة المرور</strong> مباشرة في الحقول أعلاه. تعمل فوراً داخل الـ APK بدون أي قيود، وستحفظ جميع ديونك سحابياً.
                </li>
                <li>
                  <strong className="text-white">إذا أردت استخدام حساب Google على الهاتف:</strong> افتح رابط التطبيق في متصفح <strong>Google Chrome</strong> على هاتفك، ثم اضغط على القائمة (الثلاث نقاط) واختر <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong> (PWA). سيعمل كتطبيق كامل ومستقل ويدعم تسجيل الدخول بجوجل بنقرة واحدة.
                </li>
              </ol>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApkGoogleHelp(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                فهمت، سأدخل بالبريد أو الهاتف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
