import React, { useState } from 'react';
import {
  AlertTriangle,
  Copy,
  CheckCircle,
  Crown,
  KeyRound,
  MessageCircle,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { LicenseEvaluation } from '../utils/licenseSystem';

interface LicenseBannerProps {
  evaluation: LicenseEvaluation;
  onOpenLicenseModal: () => void;
  onOpenAdminPanel?: () => void;
}

export const LicenseBanner: React.FC<LicenseBannerProps> = ({
  evaluation,
  onOpenLicenseModal,
  onOpenAdminPanel,
}) => {
  const [copied, setCopied] = useState(false);
  const { license, isReadOnly, isAdmin, isTrial, daysRemaining } = evaluation;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(license.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم، أود تفعيل أو تجديد اشتراك برنامج دفتر الديون.\nرمز جهازي هو: ${license.id}`
  );

  // 1. Expired / Read-Only Mode Banner (Prominent requirement from prompt)
  if (isReadOnly && !isAdmin) {
    return (
      <div
        id="license-readonly-banner"
        className="bg-gradient-to-r from-rose-700 via-red-600 to-amber-700 text-white shadow-md border-b-2 border-amber-300 relative z-40 transition-all"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[280px]">
            <div className="w-8 h-8 rounded-lg bg-black/25 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-xs sm:text-sm font-black leading-tight">
              <span>
                انتهت فترة الاشتراك. البرنامج يعمل حالياً بوضع المعاينة فقط، يرجى التواصل مع الإدارة للتفعيل عبر الرمز الخاص بك:{' '}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-black/35 px-2.5 py-0.5 rounded-md font-mono text-amber-300 font-black tracking-wider text-xs sm:text-sm mr-1">
                {license.id}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="hover:text-white transition-colors cursor-pointer"
                  title="نسخ رمز المستخدم"
                >
                  {copied ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://wa.me/9647723489319?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="تواصل مع الإدارة عبر الواتساب على +9647723489319"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب الإدارة: 07723489319</span>
            </a>

            <button
              type="button"
              onClick={onOpenLicenseModal}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              التفاصيل
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Official Admin Banner (If Admin logged in)
  if (isAdmin) {
    return (
      <div
        id="license-admin-banner"
        className="bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-800 text-white border-b border-amber-500/40 relative z-30"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-300" />
            <span className="font-black text-amber-100">
              أنت مسجل بحساب المدير الرسمي (tlfghlbtghlby@gmail.com) - كامل الصلاحيات الإدارية مفعلة
            </span>
          </div>

          {onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="px-3 py-0.5 bg-yellow-400 hover:bg-yellow-300 text-amber-950 font-black rounded-md flex items-center gap-1 text-[11px] shadow-xs cursor-pointer transition-colors"
            >
              <KeyRound className="w-3 h-3 text-amber-950" />
              <span>فتح لوحة تحكم التراخيص (Admin Panel)</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Active 15-Day Trial Banner
  if (isTrial) {
    return (
      <div
        id="license-trial-banner"
        className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-blue-950 text-blue-100 border-b border-blue-700/50 relative z-30"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-1 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              فترة تجريبية مجانية:{' '}
              <strong className="text-white font-black">{daysRemaining} يوم متبقية</strong> بكامل
              الصلاحيات
            </span>
            <span className="hidden md:inline text-blue-300">|</span>
            <span className="hidden md:inline">
              رمز جهازك:{' '}
              <span className="font-mono text-amber-300 font-bold">{license.id}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-blue-200 hover:text-white underline cursor-pointer flex items-center gap-1"
            >
              {copied ? 'تم نسخ الرمز' : 'نسخ رمز الجهاز'}
            </button>
            <button
              type="button"
              onClick={onOpenLicenseModal}
              className="px-2 py-0.5 bg-blue-700/60 hover:bg-blue-600/80 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors"
            >
              حالة الاشتراك
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
