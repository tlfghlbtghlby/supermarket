import React, { useState, useEffect } from 'react';
import { DebtorWithStats, TransactionType, PaymentMethod, StoreSettings } from '../types';
import { formatCurrency, generateTransactionWhatsAppUrl } from '../utils/formatters';
import { X, Check, MessageCircle, AlertCircle, Plus, ArrowDownLeft } from 'lucide-react';

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
    autoOpenWhatsApp?: boolean;
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
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentType(initialType);
      setDebtorId(selectedDebtor ? selectedDebtor.id : (allDebtors[0]?.id || ''));
      setAmount('');
      setDescription('');
      setNotes('');
      setSendWhatsApp(true);
      setFormError(null);
    }
  }, [isOpen, selectedDebtor, allDebtors, initialType]);

  if (!isOpen) return null;

  const currentDebtor = allDebtors.find((d) => d.id === debtorId);
  const parsedAmount = parseFloat(amount) || 0;
  const currentBal = currentDebtor?.currentBalance || 0;
  const projectedBal = currentType === 'DEBT' ? currentBal + parsedAmount : Math.max(0, currentBal - parsedAmount);
  const isDebt = currentType === 'DEBT';

  const addQuickAmount = (val: number) => {
    const currentVal = parseFloat(amount) || 0;
    setAmount((currentVal + val).toString());
    setFormError(null);
  };

  const quickDescriptions = ['مسواك', 'كارتات رصيد', 'ألبان واجبان', 'لحوم ودجاج', 'مواد تنظيف'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!debtorId) {
      setFormError('يرجى اختيار الزبون');
      return;
    }
    if (parsedAmount <= 0) {
      setFormError('يرجى إدخال المبلغ');
      return;
    }

    const finalDescription = description.trim() || (isDebt ? 'تسجيل دين' : 'تسديد دفعة');
    const isoDate = new Date().toISOString();

    // Open WhatsApp directly during the user click event
    if (sendWhatsApp && currentDebtor?.phone) {
      const waUrl = generateTransactionWhatsAppUrl(currentDebtor.phone, {
        storeName: settings.storeName,
        debtorName: currentDebtor.name,
        transactionType: currentType,
        transactionAmount: parsedAmount,
        previousBalance: currentBal,
        newBalance: projectedBal,
        currency: settings.currency,
        description: finalDescription,
        date: isoDate,
      });

      if (waUrl) {
        try {
          window.open(waUrl, '_blank');
        } catch (err) {
          console.warn('WhatsApp window open error:', err);
        }
      }
    }

    onSubmit({
      debtorId,
      type: currentType,
      amount: parsedAmount,
      description: finalDescription,
      notes: notes.trim() || undefined,
      paymentMethod: 'CASH',
      date: isoDate,
      autoOpenWhatsApp: sendWhatsApp,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="bg-white dark:bg-[#121727] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header: Title & Customer Name */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              {isDebt ? (
                <span className="text-blue-600 dark:text-blue-400">إضافة دين جديد</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">تسجيل تسديد دفعة</span>
              )}
            </h3>
            {currentDebtor && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                الزبون: <span className="font-bold text-slate-800 dark:text-slate-200">{currentDebtor.name}</span>
                {currentDebtor.currentBalance > 0 && (
                  <span className="mr-2 text-slate-400">
                    (الحالي: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(currentDebtor.currentBalance, settings.currency)}</strong>)
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Toggle (دين / تسديد) */}
        <div className="px-5 pt-4 sm:px-6">
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-[#182035] rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setCurrentType('DEBT');
                setFormError(null);
              }}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isDebt
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دين</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentType('PAYMENT');
                setFormError(null);
              }}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                !isDebt
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>تسديد دفعة</span>
            </button>
          </div>
        </div>

        {/* Form Body: Exactly (المبلغ، الوصف، ملاحظة اختيارية) with Large Inputs */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Debtor Selector (if not locked to one debtor) */}
          {allDebtors.length > 1 && !selectedDebtor && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                اختر الزبون
              </label>
              <select
                id="trx-debtor-select"
                value={debtorId}
                onChange={(e) => {
                  setDebtorId(e.target.value);
                  setFormError(null);
                }}
                className="w-full h-12 px-4 bg-slate-50 dark:bg-[#182035] border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                {allDebtors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.phone ? `(${d.phone})` : ''} - عليه ({formatCurrency(d.currentBalance, settings.currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1. المبلغ (Large Sized Input) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
                المبلغ <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-bold text-slate-400">
                العملة: {settings.currency || 'دينار عراقي'}
              </span>
            </div>
            
            <div className="relative">
              <input
                id="trx-amount-input"
                type="number"
                inputMode="decimal"
                step="any"
                min="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFormError(null);
                }}
                autoFocus
                className="w-full h-16 sm:h-18 pl-20 pr-5 bg-slate-50 dark:bg-[#182035] border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 text-left transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                {settings.currency || 'د.ع'}
              </span>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
              {isDebt ? (
                <>
                  {[1000, 2000, 5000, 10000, 25000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => addQuickAmount(val)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1e2842] hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer shrink-0"
                    >
                      +{val.toLocaleString()}
                    </button>
                  ))}
                </>
              ) : currentBal > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(currentBal.toString());
                    setDescription('تسديد كامل الحساب');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  تسديد كامل الحساب ({formatCurrency(currentBal, settings.currency)})
                </button>
              ) : null}
            </div>
          </div>

          {/* 2. الوصف (Large Sized Input) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
                الوصف
              </label>
              <span className="text-xs text-slate-400">
                ماذا أخذ الزبون؟
              </span>
            </div>

            <input
              id="trx-description-input"
              type="text"
              placeholder="مثال: مسواك، كارتات رصيد، حليب وبيض..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-14 sm:h-15 px-4 bg-slate-50 dark:bg-[#182035] border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl text-base sm:text-lg font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 transition-all"
            />

            {/* Quick Description suggestions */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {quickDescriptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setDescription(description ? `${description} + ${item}` : item);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1a233a] hover:bg-slate-200 dark:hover:bg-[#232f4e] text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 3. ملاحظة اختيارية (Large Sized Input) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                ملاحظة اختيارية
              </label>
              <span className="text-xs text-slate-400">
                اختياري
              </span>
            </div>

            <input
              id="trx-notes-input"
              type="text"
              placeholder="أي ملاحظة أو تفاصيل إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-12 sm:h-13 px-4 bg-slate-50 dark:bg-[#182035] border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 transition-all"
            />
          </div>

          {/* WhatsApp toggle if customer has phone */}
          {currentDebtor?.phone && (
            <label className="flex items-center justify-between p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>إرسال تفاصيل الدين إلى واتساب الزبون ({currentDebtor.phone})</span>
              </div>
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          )}

          {/* Large Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-14 sm:h-15 px-6 rounded-2xl bg-slate-100 dark:bg-[#182035] hover:bg-slate-200 dark:hover:bg-[#202b46] text-slate-700 dark:text-slate-300 text-sm sm:text-base font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              id="trx-submit-btn"
              type="submit"
              className={`flex-1 h-14 sm:h-15 px-6 rounded-2xl text-white text-base sm:text-lg font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isDebt
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
              }`}
            >
              <Check className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{isDebt ? 'حفظ الدين' : 'حفظ التسديد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
