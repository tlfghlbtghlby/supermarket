import React, { useState, useEffect } from 'react';
import { DebtorWithStats, TransactionType, PaymentMethod, StoreSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import { X, PlusCircle, ArrowDownLeft, Calendar, StickyNote, Check } from 'lucide-react';

interface QuickTransactionModalProps {
  isOpen: boolean;
  type: TransactionType;
  selectedDebtor: DebtorWithStats | null;
  allDebtors: DebtorWithStats[];
  settings: StoreSettings;
  onClose: () => void;
  onSubmit: (data: {
    debtorId: string;
    type: TransactionType;
    amount: number;
    description: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
    invoiceNumber?: string;
    date: string;
  }) => void;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  type: initialType,
  selectedDebtor,
  allDebtors,
  settings,
  onClose,
  onSubmit,
}) => {
  const [currentType, setCurrentType] = useState<TransactionType>(initialType);
  const [debtorId, setDebtorId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setCurrentType(initialType);
      setDebtorId(selectedDebtor ? selectedDebtor.id : (allDebtors[0]?.id || ''));
      setAmount('');
      setNotes('');
      setPaymentMethod('CASH');
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDate(now.toISOString().slice(0, 16));
    }
  }, [isOpen, selectedDebtor, allDebtors, initialType]);

  if (!isOpen) return null;

  const currentDebtor = allDebtors.find((d) => d.id === debtorId);
  const parsedAmount = parseFloat(amount) || 0;
  const currentBal = currentDebtor?.currentBalance || 0;
  const projectedBal = currentType === 'DEBT' ? currentBal + parsedAmount : Math.max(0, currentBal - parsedAmount);
  const isDebt = currentType === 'DEBT';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorId) {
      alert('يرجى اختيار الزبون');
      return;
    }
    if (parsedAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const finalDescription = notes.trim() || (isDebt ? 'تسجيل دين' : 'تسديد دفعة');

    onSubmit({
      debtorId,
      type: currentType,
      amount: parsedAmount,
      description: finalDescription,
      notes: notes.trim() || undefined,
      paymentMethod: currentType === 'PAYMENT' ? paymentMethod : undefined,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#131929] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-slate-200 dark:border-[#27324c] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 dark:bg-[#0d121f] text-white flex items-center justify-between border-b border-slate-800 dark:border-[#1e273d]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              {isDebt ? <PlusCircle className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {isDebt ? 'تسجيل دين على زبون' : 'تسديد دفعة من زبون'}
              </h3>
              <p className="text-xs text-slate-300">
                {currentDebtor ? `الزبون: ${currentDebtor.name}` : 'إضافة مبلغ وحركة جديدة'}
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

        {/* Toggle Tabs: "تسجيل دين" vs "تسديد مبلغ" */}
        <div className="p-4 bg-slate-50 dark:bg-[#0f1422] border-b border-slate-200 dark:border-[#27324c]">
          <div className="grid grid-cols-2 gap-2 bg-slate-200 dark:bg-[#101524] p-1 rounded-xl border border-slate-300 dark:border-[#27324c]">
            <button
              type="button"
              onClick={() => setCurrentType('DEBT')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isDebt
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل دين</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentType('PAYMENT')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                !isDebt
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>تسديد مبلغ</span>
            </button>
          </div>
        </div>

        {/* Form Body - Only Debtor, Price/Amount, Notes, Date */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* 1. Select Debtor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم الزبون / المدين <span className="text-rose-500">*</span>
            </label>
            <select
              id="trx-debtor-select"
              value={debtorId}
              onChange={(e) => setDebtorId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {allDebtors.map((d) => (
                <option key={d.id} value={d.id} className="dark:bg-[#161c2d]">
                  {d.name} {d.currentBalance > 0 ? `(عليه: ${formatCurrency(d.currentBalance, settings.currency)})` : '(تم التسديد)'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Price / Amount (السعر) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              السعر / المبلغ ({settings.currency === 'د.ع' ? 'دينار عراقي' : (settings.currency || 'دينار عراقي')}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="trx-amount-input"
                type="number"
                step="any"
                min="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full pr-4 pl-28 py-3 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xl font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {settings.currency === 'د.ع' ? 'دينار عراقي' : (settings.currency || 'دينار عراقي')}
              </span>
            </div>

            {/* Quick Settle All Button for Payments */}
            {!isDebt && currentBal > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAmount(currentBal.toString());
                  setNotes('تسديد كامل الحساب نقداً');
                }}
                className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>تسديد كامل الحساب المتبقي ({formatCurrency(currentBal, settings.currency)})</span>
              </button>
            )}
          </div>

          {/* 3. Notes Field (خانة الملاحظات - بدون اقتراحات) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-blue-500" />
                <span>الملاحظات</span>
              </label>
              <span className="text-[10px] text-slate-400">اختياري</span>
            </div>
            <textarea
              id="trx-notes-input"
              rows={3}
              placeholder="اكتب أي ملاحظات هنا..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 4. Date Field (خانة التاريخ) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>التاريخ والوقت</span>
            </label>
            <input
              id="trx-date-input"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Live Balance Preview Box */}
          {currentDebtor && (
            <div className="p-3 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#27324c] flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">الرصيد الحالي: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(currentBal, settings.currency)}
                </span>
              </div>
              <div className="text-slate-400">➔</div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">الرصيد بعد الحركة: </span>
                <span className={`font-black ${isDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(projectedBal, settings.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 dark:bg-[#182137] hover:bg-slate-200 dark:hover:bg-[#202b46] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              id="trx-submit-btn"
              type="submit"
              className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ ({isDebt ? 'تسجيل دين' : 'تسديد مبلغ'})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
