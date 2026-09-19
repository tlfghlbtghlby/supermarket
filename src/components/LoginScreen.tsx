import React, { useState } from 'react';
import {
  BookOpen,
  Lock,
  Mail,
  Phone,
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
  Sparkles,
} from 'lucide-react';
import {
  loginWithGoogle,
  loginWithEmailOrPhone,
  registerWithEmailOrPhone,
  resetPasswordForUser,
} from '../lib/firebase';
import { syncStoreSettings } from '../services/firebaseSync';
import { initialSettings } from '../data/initialData';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
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

  const mapAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code.includes('user-not-found') || code.includes('invalid-credential')) {
      return 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد/الهاتف وكلمة المرور.';
    }
    if (code.includes('wrong-password')) {
      return 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً أو النقر على "نسيت كلمة المرور".';
    }
    if (code.includes('email-already-in-use')) {
      return 'هذا الحساب مسجل مسبقاً، يرجى التبديل إلى "تسجيل الدخول".';
    }
    if (code.includes('weak-password')) {
      return 'كلمة المرور ضعيفة، يرجى إدخال 6 أحرف أو أرقام على الأقل.';
    }
    if (code.includes('invalid-email')) {
      return 'صيغة البريد الإلكتروني أو رقم الهاتف غير صحيحة.';
    }
    if (code.includes('popup-closed-by-user')) {
      return 'تم إغلاق نافذة تسجيل الدخول بجوجل قبل إتمام العملية.';
    }
    if (code.includes('network-request-failed')) {
      return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.';
    }
    return err?.message || 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة لاحقاً.';
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      onLoginSuccess?.();
    } catch (err: any) {
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
      setErrorMsg('يرجى إدخال البريد الإلكتروني أو رقم الهاتف.');
      return;
    }

    if (mode === 'FORGOT') {
      setIsLoading(true);
      try {
        await resetPasswordForUser(cleanId);
        setSuccessMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!');
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
      setErrorMsg('يرجى إدخال كلمة المرور.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('يجب أن تتكون كلمة المرور من 6 خانات على الأقل.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        await loginWithEmailOrPhone(cleanId, password);
        onLoginSuccess?.();
      } else {
        // Register new account
        const user = await registerWithEmailOrPhone(
          cleanId,
          password,
          ownerName.trim() || undefined
        );

        if (user && (storeName.trim() || ownerName.trim())) {
          const customSet = {
            ...initialSettings,
            storeName: storeName.trim() || 'دفتر ديون السوبرماركت',
            ownerName: ownerName.trim() || '',
            phone: cleanId.replace(/[^0-9+]/g, ''),
          };
          await syncStoreSettings(customSet, user.uid).catch(() => {});
        }

        setSuccessMsg('تم إنشاء الحساب بنجاح! جاري الدخول ومزامنة دفتر الديون...');
        onLoginSuccess?.();
      }
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden" dir="rtl">
      {/* Background ambient accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* App Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 text-white mb-1">
            <BookOpen className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            دفتر ديون السوبرماركت
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            نظام محاسبي سحابي لمتابعة ديون الزبائن والموردين مع حفظ تلقائي دائم يحمي بياناتك من الضياع.
          </p>
        </div>

        {/* Security & Sync Guarantee Banner */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 text-right">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-bold text-emerald-400">حفظ سحابي دائم ومشفر</p>
            <p className="text-slate-400 leading-normal">
              تسجيل الدخول يضمن استرجاع كامل زبائنك وحساباتك فوراً حتى لو قمت بحذف البرنامج أو غيرت جهازك.
            </p>
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          {/* Quick Google Sign In */}
          <div>
            <button
              id="google-signin-main-btn"
              type="button"
              disabled={isGoogleLoading || isLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>الدخول السريع بحساب Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-700 w-full" />
            <span className="bg-slate-800 px-3 text-xs text-slate-400 font-medium absolute">
              أو بالبريد الإلكتروني / رقم الهاتف
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
                className={`py-2 rounded-lg transition-all ${
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
                className={`py-2 rounded-lg transition-all ${
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
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    اسم صاحب المحل / الكاشير
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="مثال: أبو أحمد"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    اسم السوبرماركت / المتجر
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="مثال: أسواق البركة المركزية"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="مثال: 07701234567 أو store@gmail.com"
                  dir="ltr"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500 text-left font-mono"
                />
              </div>
            </div>

            {mode !== 'FORGOT' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    كلمة المرور
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500 text-left font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'FORGOT' && (
              <p className="text-xs text-slate-400 leading-relaxed">
                أدخل البريد الإلكتروني وسنرسل لك رابطاً مباشراً لتعيين كلمة مرور جديدة لحسابك.
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
                  <span>تسجيل الدخول للدفتر</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              ) : mode === 'REGISTER' ? (
                <>
                  <span>إنشاء الحساب وبدء الدفتر</span>
                  <Sparkles className="w-4 h-4" />
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
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 text-center block"
              >
                العودة إلى تسجيل الدخول
              </button>
            )}
          </form>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400 pt-2">
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
    </div>
  );
};
