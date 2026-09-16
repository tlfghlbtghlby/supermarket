import React, { useState, useEffect } from 'react';
import { Debtor, StoreSettings } from '../types';
import { X, UserPlus, UserCheck, Phone, MapPin, Wallet, StickyNote, ShieldAlert } from 'lucide-react';

interface AddDebtorModalProps {
  isOpen: boolean;
  debtorToEdit: Debtor | null;
  settings: StoreSettings;
  onClose: () => void;
  onSubmit: (debtorData: Omit<Debtor, 'id' | 'createdAt'>, existingId?: string) => void;
}

export const AddDebtorModal: React.FC<AddDebtorModalProps> = ({
  isOpen,
  debtorToEdit,
  settings,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [isStubborn, setIsStubborn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (debtorToEdit) {
        setName(debtorToEdit.name || '');
        setPhone(debtorToEdit.phone || '');
        setAddress(debtorToEdit.address || '');
        setNotes(debtorToEdit.notes || '');
        setCreditLimit(debtorToEdit.creditLimit ? debtorToEdit.creditLimit.toString() : '');
        setIsStubborn(debtorToEdit.notes?.includes('دين مستعصي') || false);
      } else {
        setName('');
        setPhone('');
        setAddress('');
        setNotes('');
        setCreditLimit('500000');
        setIsStubborn(false);
      }
    }
  }, [isOpen, debtorToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('يرجى كتابة اسم الزبون أو المدين');
      return;
    }

    const limitNumber = creditLimit ? parseFloat(creditLimit) : undefined;
    let finalNotes = notes.trim();
    if (isStubborn && !finalNotes.includes('دين مستعصي')) {
      finalNotes = finalNotes ? `${finalNotes} - [دين مستعصي]` : '[دين مستعصي]';
    }

    onSubmit(
      {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        notes: finalNotes || undefined,
        creditLimit: limitNumber && limitNumber > 0 ? limitNumber : undefined,
      },
      debtorToEdit ? debtorToEdit.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#131929] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-slate-200 dark:border-[#27324c] animate-in fade-in zoom-in-95 duration-150">
        {/* Header matching Screenshot 4 */}
        <div className="p-4 sm:p-5 bg-slate-900 dark:bg-[#0d121f] text-white flex items-center justify-between border-b border-slate-800 dark:border-[#1e273d]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              {debtorToEdit ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {debtorToEdit ? 'تعديل معلومات الزبون' : 'إضافة زبون / مدين جديد'}
              </h3>
              <p className="text-xs text-slate-300">
                تسجيل بيانات الزبون لفتح حساب دفتر آجل ومتابعة ديونه
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-[#1a233a] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم الزبون / المدين <span className="text-rose-500">*</span>
            </label>
            <input
              id="debtor-name-input"
              type="text"
              required
              placeholder="مثلاً: أبو محمد أو باسم أثير"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رقم الهاتف / الجوال (للتواصل وإرسال واتساب)
            </label>
            <div className="relative">
              <input
                id="debtor-phone-input"
                type="tel"
                placeholder="07xxxxxxxx"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Address / Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              العنوان / المنطقة / السكن (اختياري)
            </label>
            <div className="relative">
              <input
                id="debtor-address-input"
                type="text"
                placeholder="مثلاً: قرب جامع الرحمة"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Credit Limit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-blue-500" />
                <span>الحد الأقصى للدين المسموح به ({settings.currency === 'د.ع' ? 'دينار عراقي' : (settings.currency || 'دينار عراقي')})</span>
              </label>
              <span className="text-[11px] text-slate-400">سقف الائتمان</span>
            </div>
            <div className="relative">
              <input
                id="debtor-credit-limit-input"
                type="number"
                min="0"
                step="any"
                placeholder="مثلاً 1000000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full pr-4 pl-24 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {settings.currency === 'د.ع' ? 'دينار عراقي' : (settings.currency || 'دينار عراقي')}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
              <span>الملاحظات</span>
            </label>
            <textarea
              id="debtor-notes-input"
              rows={2}
              placeholder="أي ملاحظات تخص الزبون..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stubborn debt checkbox matching Screenshot 4 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101524] border border-slate-200 dark:border-[#27324c] flex items-center gap-2.5 cursor-pointer" onClick={() => setIsStubborn(!isStubborn)}>
            <input
              type="checkbox"
              id="debtor-stubborn-checkbox"
              checked={isStubborn}
              onChange={(e) => setIsStubborn(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
            />
            <label htmlFor="debtor-stubborn-checkbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>هل ديونه مستعصية أو بطيئة السداد؟</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-[#182137] hover:bg-slate-200 dark:hover:bg-[#202b46] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              id="debtor-submit-btn"
              type="submit"
              className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>{debtorToEdit ? 'حفظ التعديلات' : 'إضافة الزبون'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
