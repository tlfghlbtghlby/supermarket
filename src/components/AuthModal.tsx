import React, { useState } from 'react';
import { AppUser } from '../types';
import { Lock, Phone, KeyRound, Check, X, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

interface AuthModalProps {
  currentUser: AppUser | null;
  onLogin: (user: AppUser) => void;
  onLogout: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onLogin,
  onLogout,
  onClose,
  isOpen,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT' | 'VERIFY_OTP' | 'PROFILE'>('LOGIN');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!phone.trim()) {
      setErrorMsg('يرجى إدخال رقم الهاتف.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('يرجى إدخال كلمة المرور.');
      return;
    }

    // Authenticate user
    const user: AppUser = {
      id: 'usr-' + Date.now(),
      name: phone.trim().endsWith('8977') ? 'أبو أحمد (صاحب المحل)' : 'مستخدم (' + phone.trim() + ')',
      phone: phone.trim(),
      role: phone.trim().endsWith('8977') ? 'OWNER' : 'EMPLOYEE',
      isLoggedIn: true,
    };
    onLogin(user);
    setSuccessMsg('تم تسجيل الدخول بنجاح!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!phone.trim()) {
      setErrorMsg('يرجى إدخال رقم الهاتف لإرسال رمز التحقق.');
      return;
    }

    // Generate random 4-digit OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setMode('VERIFY_OTP');
    setSuccessMsg(`تم إرسال رمز التحقق إلى رقمك: [${code}] (تم تزويدك بالرمز تلقائياً للمحاكاة).`);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otpCode !== generatedOtp && otpCode !== '1234') {
      setErrorMsg('رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('كلمة المرور الجديدة يجب أن تتكون من 4 خانات على الأقل.');
      return;
    }

    // Password reset success
    setPassword(newPassword);
    setSuccessMsg('تمت إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
    setTimeout(() => {
      setMode('LOGIN');
      setSuccessMsg(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white dark:bg-[#141b2d] border border-slate-300 dark:border-[#273656] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#202b44] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {currentUser
                ? 'حساب المستخدم'
                : mode === 'LOGIN'
                ? 'تسجيل الدخول'
                : mode === 'FORGOT'
                ? 'استعادة كلمة المرور'
                : 'إدخال رمز التحقق'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* If already logged in */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#202b44] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentUser.name}
                </div>
                <div className="text-xs text-slate-400" dir="ltr">
                  {currentUser.phone}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1b2438] rounded-xl hover:bg-slate-200"
              >
                متابعة العمل
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setMode('LOGIN');
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        ) : mode === 'LOGIN' ? (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="0770xxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setMode('FORGOT');
                }}
                className="text-blue-500 hover:underline font-semibold"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer mt-2"
            >
              تسجيل الدخول
            </button>
          </form>
        ) : mode === 'FORGOT' ? (
          /* Forgot Password Step 1: Phone */
          <form onSubmit={handleSendOtp} className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أدخل رقم هاتفك المسجل لإرسال رمز التحقق السريع لإعادة تعيين كلمة المرور.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم الهاتف المسجل
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="0770xxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b2438] rounded-xl"
              >
                رجوع
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                إرسال الرمز
              </button>
            </div>
          </form>
        ) : (
          /* Verify OTP & Set New Password */
          <form onSubmit={handleResetPassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رمز التحقق (OTP)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="مثلاً: 1234"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  dir="ltr"
                  maxLength={6}
                  className="w-full pr-9 pl-3 py-2 text-center text-sm font-black tracking-widest bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="كلمة مرور جديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b2438] rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                حفظ كلمة المرور
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
