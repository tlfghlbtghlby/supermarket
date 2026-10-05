import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Copy,
  Clock,
  Calendar,
  Sparkles,
  X,
  Search,
  RefreshCw,
  UserCheck,
  Zap,
  KeyRound,
  AlertTriangle,
  Send,
  Store,
  Crown,
  MessageCircle,
} from 'lucide-react';
import {
  LicenseRecord,
  LicensePlan,
  activateUserLicense,
  fetchAllCloudLicenses,
  getOrCreateHwid,
  ADMIN_OFFICIAL_EMAIL,
  ADMIN_OFFICIAL_WHATSAPP,
} from '../utils/licenseSystem';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHwid?: string;
  onLicenseChanged?: () => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'warn') => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentHwid,
  onLicenseChanged,
  showToast,
}) => {
  const [targetUserId, setTargetUserId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<LicensePlan>('1_month');
  const [customDays, setCustomDays] = useState<number>(30);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [extendExisting, setExtendExisting] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Licenses list state
  const [allLicenses, setAllLicenses] = useState<LicenseRecord[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const localHwid = currentHwid || getOrCreateHwid();

  const loadLicensesList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const list = await fetchAllCloudLicenses();
      setAllLicenses(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLicensesList();
      setFeedback(null);
    }
  }, [isOpen, loadLicensesList]);

  if (!isOpen) return null;

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanId = targetUserId.trim().toUpperCase();
    if (!cleanId) {
      setFeedback({ type: 'error', message: 'يرجى إدخال رمز المستخدم (User ID / HWID) المطلوب تفعيله.' });
      return;
    }

    setIsLoading(true);
    try {
      const planToApply = selectedPlan === 'custom' ? customDays : selectedPlan;
      const updated = await activateUserLicense(
        cleanId,
        planToApply,
        clientName,
        notes,
        extendExisting
      );

      const expDate = new Date(updated.expiresAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      setFeedback({
        type: 'success',
        message: `تم تفعيل ترخيص المستخدم [${cleanId}] بنجاح! تاريخ الانتهاء الجديد: ${expDate}. تم فتح الصلاحيات كاملة فوراً.`,
      });

      if (showToast) {
        showToast(`تم تفعيل حساب المستخدم ${cleanId} بنجاح!`, 'success');
      }

      onLicenseChanged?.();
      loadLicensesList();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'حدث خطأ أثناء حفظ التفعيل في قاعدة البيانات. يرجى التحقق من اتصال الإنترنت.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (userId: string, name?: string) => {
    setTargetUserId(userId);
    if (name) setClientName(name);
    setFeedback(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredLicenses = allLicenses.filter((lic) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      lic.id.toLowerCase().includes(q) ||
      (lic.clientName && lic.clientName.toLowerCase().includes(q)) ||
      (lic.notes && lic.notes.toLowerCase().includes(q))
    );
  });

  const totalCount = allLicenses.length;
  const activeCount = allLicenses.filter((l) => l.status === 'active').length;
  const trialCount = allLicenses.filter((l) => l.status === 'trial').length;
  const expiredCount = allLicenses.filter((l) => {
    const isPast = new Date(l.expiresAt).getTime() < Date.now();
    return l.status === 'expired' || isPast;
  }).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f1422] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1e273d] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with Crown / Shield */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-100 shadow-inner">
              <Crown className="w-6 h-6 text-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">لوحة تحكم المدير والتراخيص (Admin Panel)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-200 border border-amber-400/30">
                  حصري للإدارة
                </span>
              </div>
              <div className="text-xs text-amber-100/90 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>مسجّل بحساب المدير: <strong className="underline">{ADMIN_OFFICIAL_EMAIL}</strong></span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-bold">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                  <span>واتساب الإدارة: {ADMIN_OFFICIAL_WHATSAPP}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-[#161c2d] p-3 rounded-xl border border-slate-200 dark:border-[#27324c]">
              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold mb-1">إجمالي الأجهزة المسجلة</div>
              <div className="text-xl font-black text-slate-800 dark:text-slate-100">{totalCount}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold mb-1">اشتراكات مفعلة</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/50">
              <div className="text-[11px] text-blue-800 dark:text-blue-300 font-bold mb-1">فترة تجريبية</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">{trialCount}</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800/50">
              <div className="text-[11px] text-rose-800 dark:text-rose-300 font-bold mb-1">منتهية الصلاحية</div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">{expiredCount}</div>
            </div>
          </div>

          {/* Activation Form Section */}
          <div className="bg-slate-50 dark:bg-[#141b2c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#20293f] shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                تفعيل أو تمديد اشتراك مستخدم
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              أدخل رمز المستخدم (User ID / HWID) وحدد المدة المطلوبة، واضغط تأكيد ليتم فك حظر التعديل وفتح الصلاحيات فوراً في قاعدة البيانات.
            </p>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold mb-4 flex items-start gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleActivateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* User ID Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رمز المستخدم المطلوب تفعيله (User ID / HWID) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value.toUpperCase())}
                      placeholder="مثال: HWID-7A2F-9B1C"
                      className="w-full px-3 py-2 pr-9 bg-white dark:bg-[#0d121f] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 uppercase"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  </div>
                  {/* Button to quickly paste current local HWID */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetUserId(localHwid)}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      استخدام رمز جهازي الحالي ({localHwid})
                    </button>
                  </div>
                </div>

                {/* Client Name (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم الزبون أو المحل (اختياري للتوثيق)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="مثال: سوبرماركت النور / الأستاذ أحمد"
                      className="w-full px-3 py-2 pr-9 bg-white dark:bg-[#0d121f] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                    <Store className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Activation Duration Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  تحديد مدة التفعيل المطلوبة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('1_month')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedPlan === '1_month'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-[#0d121f] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#27324c] hover:bg-slate-100 dark:hover:bg-[#1a233a]'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>شهر واحد</span>
                    <span className="text-[10px] opacity-80">(30 يوم)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('2_months')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedPlan === '2_months'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-[#0d121f] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#27324c] hover:bg-slate-100 dark:hover:bg-[#1a233a]'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>شهران</span>
                    <span className="text-[10px] opacity-80">(60 يوم)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('1_year')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedPlan === '1_year'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-[#0d121f] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#27324c] hover:bg-slate-100 dark:hover:bg-[#1a233a]'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>سنة كاملة</span>
                    <span className="text-[10px] opacity-80">(365 يوم)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('lifetime')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedPlan === 'lifetime'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-[#0d121f] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#27324c] hover:bg-slate-100 dark:hover:bg-[#1a233a]'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>مدى الحياة</span>
                    <span className="text-[10px] opacity-80">(دائم)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('custom')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedPlan === 'custom'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-[#0d121f] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#27324c] hover:bg-slate-100 dark:hover:bg-[#1a233a]'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>تمديد مخصص</span>
                    <span className="text-[10px] opacity-80">(بالأيام)</span>
                  </button>
                </div>

                {selectedPlan === 'custom' && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      عدد الأيام المراد إضافتها:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-[#0d121f] border border-slate-300 dark:border-[#27324c] rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">يوماً</span>
                  </div>
                )}
              </div>

              {/* Extension Options & Notes */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200 dark:border-[#20293f]">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extendExisting}
                    onChange={(e) => setExtendExisting(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500"
                  />
                  <span>تمديد على الاشتراك الحالي (إضافة الأيام دون ضياع الرصيد المتبقي للمستخدم)</span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التفعيل في قاعدة البيانات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>تأكيد التفعيل وفتح الصلاحيات فوراً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Registered Users Table / List */}
          <div className="bg-slate-50 dark:bg-[#141b2c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#20293f] shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  سجل الأجهزة والتراخيص المسجلة بالسحابة
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث برمز المستخدم أو الاسم..."
                    className="px-3 py-1.5 pr-8 text-xs bg-white dark:bg-[#0d121f] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-slate-100 w-44 sm:w-60"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>

                <button
                  type="button"
                  onClick={loadLicensesList}
                  disabled={isLoadingList}
                  className="p-1.5 bg-white dark:bg-[#0d121f] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  title="تحديث القائمة من السحابة"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingList ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#27324c]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-[#1a233a] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-[#27324c]">
                  <tr>
                    <th className="p-2.5">رمز المستخدم (HWID)</th>
                    <th className="p-2.5">العميل / المحل</th>
                    <th className="p-2.5">الحالة</th>
                    <th className="p-2.5">الخطة</th>
                    <th className="p-2.5">تاريخ الانتهاء</th>
                    <th className="p-2.5 text-center">إجراء سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#20293f] bg-white dark:bg-[#0d121f]">
                  {filteredLicenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-600 dark:text-slate-300">
                        {isLoadingList
                          ? 'جاري تحميل التراخيص من السحابة...'
                          : 'لا توجد تراخيص مطابقة. يمكنك تفعيل أي رمز مستخدم عبر النموذج أعلاه.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLicenses.map((lic) => {
                      const isExpired = new Date(lic.expiresAt).getTime() < Date.now();
                      const isLocal = lic.id === localHwid;

                      return (
                        <tr
                          key={lic.id}
                          className={`hover:bg-slate-50 dark:hover:bg-[#141b2c] transition-colors ${
                            isLocal ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span>{lic.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(lic.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                                title="نسخ الرمز"
                              >
                                {copiedId === lic.id ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {isLocal && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-md font-bold">
                                  جهازك
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">
                            {lic.clientName || '—'}
                          </td>
                          <td className="p-2.5">
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                منتهي (معاينة فقط)
                              </span>
                            ) : lic.status === 'active' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                مفعل كامل
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                فترة تجريبية (15 يوم)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300 font-bold">
                            {lic.plan === '1_month'
                              ? 'شهر'
                              : lic.plan === '2_months'
                              ? 'شهران'
                              : lic.plan === '1_year'
                              ? 'سنة'
                              : lic.plan === 'lifetime'
                              ? 'مدى الحياة'
                              : lic.plan === 'trial'
                              ? 'تجريبي'
                              : 'مخصص'}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            {new Date(lic.expiresAt).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleQuickFill(lic.id, lic.clientName)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              title="تحديد لتمديد الاشتراك"
                            >
                              تمديد / تفعيل
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 dark:bg-[#121827] px-5 py-3 border-t border-slate-200 dark:border-[#1e273d] flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-600 dark:text-slate-300">
            أي تفعيل تقوم به ينعكس فورياً في أجهزة المستخدمين عبر السحابة وتفتح صلاحياتهم دون الحاجة لإعادة تشغيل البرنامج.
          </span>
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
