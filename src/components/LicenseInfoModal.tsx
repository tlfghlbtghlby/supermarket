import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  CheckCircle,
  X,
  AlertTriangle,
  Clock,
  Calendar,
  MessageCircle,
  ShieldCheck,
  Crown,
  Sparkles,
  Info,
  Globe,
  MapPin,
  Laptop,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { LicenseEvaluation } from '../utils/licenseSystem';
import {
  detectDeviceInfo,
  fetchDeviceNetworkInfo,
  loadSavedNetworkInfo,
  DeviceNetworkInfo,
} from '../utils/deviceSession';

interface LicenseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: LicenseEvaluation;
  onOpenAdminPanel?: () => void;
}

export const LicenseInfoModal: React.FC<LicenseInfoModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  onOpenAdminPanel,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [deviceInfo] = useState(() => detectDeviceInfo());
  const [networkInfo, setNetworkInfo] = useState<DeviceNetworkInfo | null>(() => loadSavedNetworkInfo());

  useEffect(() => {
    if (isOpen) {
      fetchDeviceNetworkInfo().then((net) => {
        setNetworkInfo(net);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { license, isReadOnly, isAdmin, isTrial, daysRemaining, hoursRemaining, formattedExpiresAt } =
    evaluation;

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(license.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله، أود تفعيل أو تجديد اشتراك برنامج دفتر ديون السوبرماركت.\nرمز جهازي (User ID / HWID) هو:\n${license.id}`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0f1422] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1e273d] overflow-hidden my-auto">
        {/* Header */}
        <div
          className={`px-5 py-4 text-white flex items-center justify-between shadow-xs ${
            isReadOnly
              ? 'bg-gradient-to-r from-rose-600 to-amber-600'
              : isAdmin
              ? 'bg-gradient-to-r from-amber-600 to-yellow-600'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              {isAdmin ? (
                <Crown className="w-5 h-5 text-amber-200" />
              ) : isReadOnly ? (
                <AlertTriangle className="w-5 h-5 text-rose-100" />
              ) : (
                <KeyRound className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black">
                {isAdmin
                  ? 'حساب الإدارة والترخيص الرئيسي'
                  : isReadOnly
                  ? 'حالة الترخيص (وضع المعاينة فقط)'
                  : 'معلومات الترخيص والاشتراك'}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {isAdmin
                  ? 'صلاحيات إدارية كاملة مفتوحة دائماً'
                  : isReadOnly
                  ? 'انتهت الفترة التجريبية / الاشتراك'
                  : isTrial
                  ? 'أنت في الفترة التجريبية المجانية (15 يوم)'
                  : 'الاشتراك مفعل بكامل الصلاحيات'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 text-slate-800 dark:text-slate-100">
          {/* User ID / HWID Display Box */}
          <div className="bg-slate-50 dark:bg-[#141b2c] p-4 rounded-xl border border-slate-200 dark:border-[#27324c]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                رمز جهازك الفريد (User ID / HWID):
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                أرسل هذا الرمز للإدارة لتفعيل حسابك
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white dark:bg-[#0b0f1a] border border-slate-300 dark:border-[#27324c] px-3 py-2 rounded-xl text-sm sm:text-base font-mono font-black text-center text-blue-600 dark:text-blue-400 select-all tracking-wider">
                {license.id}
              </div>

              <button
                type="button"
                onClick={handleCopyHwid}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="نسخ الرمز للحافظة"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ الرمز</span>
                  </>
                )}
              </button>
            </div>

            {/* Registered Device Details (اسم الجهاز، عنوان الآي بي، والمكان) */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-[#0d1220] rounded-lg border border-slate-200 dark:border-[#222e48]">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  {deviceInfo.deviceType === 'MOBILE' ? (
                    <Smartphone className="w-3.5 h-3.5" />
                  ) : (
                    <Laptop className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400">الجهاز المسجل:</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 break-words">{deviceInfo.deviceName}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-white dark:bg-[#0d1220] rounded-lg border border-slate-200 dark:border-[#222e48]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400">عنوان الآي بي:</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]" dir="ltr">
                      {networkInfo?.ipAddress || 'جاري الفحص...'}
                    </div>
                  </div>
                </div>
                {networkInfo?.ipAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(networkInfo.ipAddress);
                        setCopiedIp(true);
                        setTimeout(() => setCopiedIp(false), 2000);
                      }
                    }}
                    title="نسخ الآي بي"
                    className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
                  >
                    {copiedIp ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 p-2 bg-white dark:bg-[#0d1220] rounded-lg border border-slate-200 dark:border-[#222e48] sm:col-span-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-400">المكان والموقع:</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {networkInfo?.location || 'العراق 🇮🇶'}
                    {networkInfo?.isp ? ` • ${networkInfo.isp}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-[#161c2d] p-3 rounded-xl border border-slate-200 dark:border-[#27324c]">
              <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold block mb-1">
                حالة الاشتراك:
              </span>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400">
                  <Crown className="w-3.5 h-3.5" />
                  مدير رسمي (غير محدود)
                </span>
              ) : isReadOnly ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  منتهي (معاينة وتصفح فقط)
                </span>
              ) : isTrial ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  تجريبي (15 يوم)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  مفعل بكامل الصلاحيات
                </span>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-[#161c2d] p-3 rounded-xl border border-slate-200 dark:border-[#27324c]">
              <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold block mb-1">
                المدة المتبقية:
              </span>
              {isAdmin ? (
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  غير محدودة (دائم)
                </span>
              ) : isReadOnly ? (
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                  0 يوم (يرجى التفعيل)
                </span>
              ) : (
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {daysRemaining > 0 ? `${daysRemaining} يوماً` : `${hoursRemaining} ساعة`}
                </span>
              )}
            </div>
          </div>

          {/* Expiry Date */}
          {!isAdmin && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#131929] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#222c45]">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                تاريخ انتهاء الصلاحية الحالي:{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-mono">
                  {formattedExpiresAt}
                </strong>
              </span>
            </div>
          )}

          {/* Important Reassurance Note */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">ضمان عدم ضياع البيانات:</p>
              <p className="leading-relaxed text-[11px]">
                حتى بعد انتهاء فترة الاشتراك أو التجربة، تظل كافة ديونك وزبائنك وحساباتك محفوظة بالكامل ويمكنك استعراضها وطباعة كشوفاتها دون أي قفل، وفور التفعيل يتم فتح ميزة الإضافة والتعديل تلقائياً دون فقدان أي سجل.
              </p>
            </div>
          </div>

          {/* Contact Admin Actions */}
          <div className="space-y-2 pt-2">
            <a
              href={`https://wa.me/9647723489319?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تواصل مع الإدارة عبر الواتساب لتفعيل الرمز (+9647723489319)</span>
            </a>

            {isAdmin && onOpenAdminPanel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminPanel();
                }}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>فتح لوحة تحكم التراخيص الخاصة بك (Admin Panel)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-[#121827] px-5 py-3 border-t border-slate-200 dark:border-[#1e273d] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-[#1f293d] hover:bg-slate-300 dark:hover:bg-[#28354f] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
