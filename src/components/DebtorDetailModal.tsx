import React, { useState } from 'react';
import { DebtorWithStats, Transaction, StoreSettings } from '../types';
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatDateOnly,
  generateWhatsAppLink,
  generateWhatsAppStatementMessage,
  generateTransactionWhatsAppMessage,
} from '../utils/formatters';
import { sendMetaCloudMessage } from '../services/whatsappBot';
import {
  ArrowRight,
  MoreVertical,
  ChevronsUp,
  ChevronsDown,
  Wallet,
  Trash2,
  Printer,
  QrCode,
  Edit2,
  Receipt,
  Clock,
  Calendar,
  ArrowUpDown,
  Plus,
  ArrowUp,
  ArrowDown,
  FileText,
  Check,
  X,
  MessageCircle,
  AlertCircle,
  Phone,
  MapPin,
  Bot,
} from 'lucide-react';

interface DebtorDetailModalProps {
  debtor: DebtorWithStats | null;
  transactions: Transaction[];
  settings: StoreSettings;
  onClose: () => void;
  onAddDebt: (debtor: DebtorWithStats) => void;
  onAddPayment: (debtor: DebtorWithStats) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onUpdateTransactionNotes: (transactionId: string, notes: string) => void;
  onEditDebtor: (debtor: DebtorWithStats) => void;
  onPrint: (debtor: DebtorWithStats) => void;
  onDeleteDebtor?: (debtorId: string) => void;
}

export const DebtorDetailModal: React.FC<DebtorDetailModalProps> = ({
  debtor,
  transactions,
  settings,
  onClose,
  onAddDebt,
  onAddPayment,
  onDeleteTransaction,
  onUpdateTransactionNotes,
  onEditDebtor,
  onPrint,
  onDeleteDebtor,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'DEBT' | 'PAYMENT'>('ALL');
  const [sortBy, setSortBy] = useState<'CREATED' | 'DATE'>('CREATED');
  const [sortAsc, setSortAsc] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  if (!debtor) return null;

  // Filter transactions for this debtor
  const debtorTransactions = transactions
    .filter((t) => t.debtorId === debtor.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balances
  let runningBalance = 0;
  const txWithBalances = debtorTransactions.map((tx) => {
    const prev = runningBalance;
    if (tx.type === 'DEBT') {
      runningBalance += tx.amount;
    } else {
      runningBalance = Math.max(0, runningBalance - tx.amount);
    }
    return {
      ...tx,
      previousBalance: prev,
      balanceAfter: runningBalance,
    };
  });

  // Filter and sort display list
  const displayTransactions = [...txWithBalances]
    .filter((tx) => {
      if (filterType === 'ALL') return true;
      return tx.type === filterType;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });

  const startEditingNotes = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditingNotesValue(tx.notes || tx.description || '');
  };

  const saveNotes = (txId: string) => {
    onUpdateTransactionNotes(txId, editingNotesValue);
    setEditingTxId(null);
    setEditingNotesValue('');
  };

  const handleSendSingleTxWhatsApp = async (tx: Transaction & { balanceAfter?: number; previousBalance?: number }) => {
    if (!debtor.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون.');
      return;
    }
    const msg = generateTransactionWhatsAppMessage({
      storeName: settings.storeName,
      debtorName: debtor.name,
      transactionType: tx.type,
      transactionAmount: tx.amount,
      previousBalance: tx.previousBalance || 0,
      newBalance: tx.balanceAfter || 0,
      currency: settings.currency,
      description: tx.description,
      date: tx.date,
    });

    if (settings.metaWhatsAppEnabled && settings.metaPhoneNumberId && settings.metaAccessToken) {
      const res = await sendMetaCloudMessage({
        phoneNumberId: settings.metaPhoneNumberId,
        accessToken: settings.metaAccessToken,
        toPhone: debtor.phone,
        messageText: msg,
      });
      if (res.success) {
        alert(`تم إرسال إشعار الحركة تلقائياً عبر البوت إلى الزبون ${debtor.phone}!`);
        return;
      } else {
        if (!confirm(`تعذر إرسال البوت تلقائياً: ${res.error}\nهل تود فتح الواتساب للإرسال اليدوي؟`)) {
          return;
        }
      }
    }

    let cleanPhone = debtor.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('07')) cleanPhone = '964' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('0')) cleanPhone = '964' + cleanPhone.substring(1);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSendStatementViaBot = async () => {
    setShowMenu(false);
    if (!debtor.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون.');
      return;
    }
    const msg = generateWhatsAppStatementMessage(debtor, settings);
    const res = await sendMetaCloudMessage({
      phoneNumberId: settings.metaPhoneNumberId || '',
      accessToken: settings.metaAccessToken || '',
      toPhone: debtor.phone,
      messageText: msg,
    });
    if (res.success) {
      alert(`تم إرسال كشف الحساب كاملاً عبر بوت الواتساب للزبون "${debtor.name}" بنجاح!`);
    } else {
      alert(`فشل إرسال كشف الحساب عبر البوت: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#121829] text-slate-100 rounded-2xl shadow-2xl w-full max-w-xl max-h-[96vh] flex flex-col overflow-hidden border border-[#232f48] relative">
        {/* Top App Bar matching the screenshot */}
        <div className="p-4 bg-[#121829] flex items-center justify-between border-b border-[#1e293f] shrink-0">
          {/* Back button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-[#1c253d] rounded-xl transition-colors cursor-pointer"
            title="رجوع"
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-wide">الزبون</h2>
            <p className="text-xs text-slate-400">{debtor.name}</p>
          </div>

          {/* More options menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-[#1c253d] rounded-xl transition-colors cursor-pointer"
              title="خيارات"
            >
              <MoreVertical className="w-6 h-6" />
            </button>

            {showMenu && (
              <div className="absolute left-0 mt-2 w-52 bg-[#1a2236] border border-[#2c3a59] rounded-xl shadow-2xl py-1 z-20 text-xs font-semibold">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEditDebtor(debtor);
                  }}
                  className="w-full text-right px-4 py-2.5 hover:bg-[#25324e] flex items-center gap-2 text-slate-200"
                >
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>تعديل بيانات وسقف الدين</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onPrint(debtor);
                  }}
                  className="w-full text-right px-4 py-2.5 hover:bg-[#25324e] flex items-center gap-2 text-slate-200"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>طباعة كشف الحساب</span>
                </button>
                {debtor.phone && (
                  <a
                    href={generateWhatsAppLink(debtor, settings)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowMenu(false)}
                    className="w-full text-right px-4 py-2.5 hover:bg-[#25324e] flex items-center gap-2 text-emerald-400"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال كشف الحساب واتساب</span>
                  </a>
                )}
                {onDeleteDebtor && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (confirm(`هل أنت متأكد من حذف الزبون "${debtor.name}" نهائياً من الدفتر؟`)) {
                        onDeleteDebtor(debtor.id);
                        onClose();
                      }
                    }}
                    className="w-full text-right px-4 py-2.5 hover:bg-rose-950/50 flex items-center gap-2 text-rose-400 border-t border-[#2c3a59]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف الزبون وسجلاته</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-[#0e1322]">
          {/* Credit Limit Alert Banner */}
          {debtor.isOverLimit && (
            <div className="bg-amber-500/15 border border-amber-500/40 p-3 rounded-xl flex items-center gap-2.5 text-amber-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <span className="font-bold">تنبيه تجاوز سقف الائتمان: </span>
                <span>
                  الحد الأقصى المسموح به هو {formatCurrency(debtor.creditLimit || 0, settings.currency)}، والرصيد الحالي هو {formatCurrency(debtor.currentBalance, settings.currency)}.
                </span>
              </div>
            </div>
          )}

          {/* Customer Quick Info (Phone & Address) */}
          <div className="bg-[#141b2d] border border-[#202b44] rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{debtor.name}</span>
              {debtor.phone ? (
                <a href={`tel:${debtor.phone}`} className="flex items-center gap-1 text-sky-400 hover:underline" dir="ltr">
                  <Phone className="w-3 h-3" />
                  <span>{debtor.phone}</span>
                </a>
              ) : (
                <span className="text-slate-500">لا يوجد هاتف</span>
              )}
            </div>
            {debtor.creditLimit ? (
              <span className="text-[11px] text-slate-400">
                سقف الدين: <span className="text-white font-bold">{formatNumber(debtor.creditLimit)}</span> {settings.currency}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">سقف دين: غير محدد</span>
            )}
          </div>

          {/* 3 Metric Cards matching Screenshot faithfully */}
          {/* Card 1: التسجيلات (Total Debts) */}
          <div className="bg-[#161f36] border border-[#263554] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="text-amber-500">
              <ChevronsUp className="w-7 h-7" />
            </div>
            <div className="text-left">
              <div className="text-3xl sm:text-4xl font-black text-sky-400 tracking-tight">
                {formatNumber(debtor.totalDebt)}
              </div>
              <div className="text-xs font-semibold text-slate-400 mt-0.5">التسجيلات</div>
            </div>
          </div>

          {/* Card 2: التسديدات (Total Payments) */}
          <div className="bg-[#161f36] border border-[#263554] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="text-emerald-500">
              <ChevronsDown className="w-7 h-7" />
            </div>
            <div className="text-left">
              <div className="text-3xl sm:text-4xl font-black text-sky-400 tracking-tight">
                {formatNumber(debtor.totalPaid)}
              </div>
              <div className="text-xs font-semibold text-slate-400 mt-0.5">التسديدات</div>
            </div>
          </div>

          {/* Card 3: صافي الديون (Net Debt) */}
          <div className="bg-[#161f36] border border-[#263554] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="text-sky-400">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="text-left">
              <div className="text-3xl sm:text-4xl font-black text-sky-400 tracking-tight">
                {formatNumber(debtor.currentBalance)}
              </div>
              <div className="text-xs font-semibold text-slate-400 mt-0.5">صافي الديون</div>
            </div>
          </div>

          {/* 4 Action Buttons Row matching screenshot */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {/* Red button: Delete / Reset */}
            <button
              onClick={() => {
                if (confirm(`هل أنت متأكد من حذف الزبون "${debtor.name}" وسجلاته؟`)) {
                  onDeleteDebtor?.(debtor.id);
                  onClose();
                }
              }}
              className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer"
              title="حذف الزبون"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Blue button 1: Print statement */}
            <button
              onClick={() => onPrint(debtor)}
              className="py-3 bg-[#1d2740] hover:bg-[#253252] text-sky-400 rounded-xl flex items-center justify-center transition-colors border border-[#2c3c63] cursor-pointer"
              title="طباعة كشف الحساب"
            >
              <Printer className="w-5 h-5" />
            </button>

            {/* Blue button 2: Barcode / QR */}
            <button
              onClick={() => setShowQrModal(true)}
              className="py-3 bg-[#1d2740] hover:bg-[#253252] text-sky-400 rounded-xl flex items-center justify-center transition-colors border border-[#2c3c63] cursor-pointer"
              title="رمز QR وكود الزبون"
            >
              <QrCode className="w-5 h-5" />
            </button>

            {/* Blue button 3: Edit Debtor */}
            <button
              onClick={() => onEditDebtor(debtor)}
              className="py-3 bg-[#1d2740] hover:bg-[#253252] text-sky-400 rounded-xl flex items-center justify-center transition-colors border border-[#2c3c63] cursor-pointer"
              title="تعديل بيانات الزبون"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>

          {/* Section: حركات الزبون (Customer Transactions Header Card) */}
          <div className="bg-[#141c30] border border-[#202d4a] rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setFilterType(filterType === 'ALL' ? 'DEBT' : filterType === 'DEBT' ? 'PAYMENT' : 'ALL')}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>{filterType === 'ALL' ? 'عرض الكل' : filterType === 'DEBT' ? 'المعروض: ديون فقط' : 'المعروض: تسديدات فقط'}</span>
                <span>&gt;</span>
              </button>

              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <h3 className="text-sm font-bold text-white">حركات الزبون</h3>
                  <span className="text-[11px] text-slate-400">
                    {displayTransactions.length} حركة معروضة
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#1a253e] text-sky-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Two Filter/Sort Pills */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1e2a44]">
              <button
                onClick={() => {
                  setSortBy('DATE');
                  setSortAsc(!sortAsc);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  sortBy === 'DATE'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                    : 'bg-[#101626] text-slate-400 border border-[#202b44]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>تاريخ الحركة</span>
                <ArrowUpDown className="w-3 h-3 mr-1 opacity-70" />
              </button>

              <button
                onClick={() => {
                  setSortBy('CREATED');
                  setSortAsc(!sortAsc);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  sortBy === 'CREATED'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                    : 'bg-[#101626] text-slate-400 border border-[#202b44]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>تاريخ الإضافة</span>
                <ArrowUpDown className="w-3 h-3 mr-1 opacity-70" />
              </button>
            </div>
          </div>

          {/* Transaction Cards List matching the screenshot */}
          <div className="space-y-3">
            {displayTransactions.length === 0 ? (
              <div className="bg-[#141c30] border border-[#202d4a] rounded-xl p-8 text-center text-slate-400 text-xs">
                لا توجد حركات مسجلة لهذا الزبون حالياً.
              </div>
            ) : (
              displayTransactions.map((tx) => {
                const isDebt = tx.type === 'DEBT';
                const isEditingNotes = editingTxId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className="bg-[#141c30] border border-[#202d4a] rounded-xl p-3.5 space-y-2.5 transition-all shadow-sm hover:border-[#2b3c63]"
                  >
                    {/* Top Row: Badge on right/left and Amount with Icon */}
                    <div className="flex items-center justify-between">
                      {/* Left: Badge (تسديد / دين) */}
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                          isDebt
                            ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                        }`}
                      >
                        {isDebt ? 'دين' : 'تسديد'}
                      </span>

                      {/* Right: Amount + Circular Arrow Icon + Date */}
                      <div className="flex items-center gap-2">
                        <div className="text-left">
                          <div
                            className={`text-xl font-black tracking-tight ${
                              isDebt ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {formatNumber(tx.amount)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateOnly(tx.date)}
                          </div>
                        </div>

                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            isDebt
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-700/50'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/50'
                          }`}
                        >
                          {isDebt ? (
                            <ArrowUp className="w-5 h-5" />
                          ) : (
                            <ArrowDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Dark Container: الرصيد بعد الحركة + وقت الإضافة */}
                    <div className="bg-[#0c111e] border border-[#1a243b] rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <div className="text-left">
                        <div className="text-[11px] text-slate-400">الرصيد بعد الحركة</div>
                        <div className="text-base font-black text-white mt-0.5">
                          {formatNumber(tx.balanceAfter)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">وقت الإضافة</div>
                        <div className="text-xs text-slate-200 mt-0.5 font-medium" dir="ltr">
                          {formatDate(tx.date)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Line: الملاحظة (Editable Notes) */}
                    <div className="pt-1 border-t border-[#1a243b]/80">
                      {isEditingNotes ? (
                        <div className="space-y-2 bg-[#101728] p-2.5 rounded-lg border border-blue-500/50">
                          <div className="flex items-center justify-between text-[11px] text-blue-300 font-bold">
                            <span>تعديل الملاحظة:</span>
                            <button
                              type="button"
                              onClick={() => setEditingTxId(null)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <textarea
                            value={editingNotesValue}
                            onChange={(e) => setEditingNotesValue(e.target.value)}
                            rows={2}
                            className="w-full bg-[#0a0f1c] text-xs p-2 rounded text-white border border-[#273552] focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="اكتب ملاحظة..."
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingTxId(null)}
                              className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => saveNotes(tx.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>حفظ</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                          <div
                            onClick={() => startEditingNotes(tx)}
                            className="flex items-center gap-1.5 hover:text-slate-200 cursor-pointer flex-1"
                            title="انقر لتعديل الملاحظة"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              الملاحظة: {tx.notes || tx.description || 'لا يوجد ملاحظات'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {debtor.phone && (
                              <button
                                type="button"
                                onClick={() => handleSendSingleTxWhatsApp(tx)}
                                title="إرسال إشعار هذه الحركة للزبون بالواتساب"
                                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 rounded transition-colors cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذه الحركة؟')) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              title="حذف الحركة"
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Floating Action Button (FAB) matching the screenshot */}
        <div className="absolute bottom-5 left-5 z-20">
          {showQuickAddMenu ? (
            <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-3 duration-150">
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onAddDebt(debtor);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ تسجيل دين (مشتريات)</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onAddPayment(debtor);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowDown className="w-4 h-4" />
                <span>+ قبض دفعة (سداد)</span>
              </button>
            </div>
          ) : null}

          <button
            onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
            className="w-13 h-13 rounded-2xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white flex items-center justify-center shadow-xl transition-all cursor-pointer"
            title="إضافة حركة جديدة"
          >
            <Plus className={`w-7 h-7 transition-transform duration-200 ${showQuickAddMenu ? 'rotate-45' : ''}`} />
          </button>
        </div>

        {/* QR Code Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#141b2d] border border-[#273656] rounded-2xl p-5 max-w-xs w-full text-center space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">بطاقة الزبون الإلكترونية</h3>
                <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl inline-block shadow-md">
                <div className="w-40 h-40 bg-slate-100 flex flex-col items-center justify-center text-slate-800 border-2 border-dashed border-slate-300 rounded">
                  <QrCode className="w-24 h-24 text-slate-900" />
                  <span className="text-[10px] font-mono mt-1 font-bold">{debtor.id}</span>
                </div>
              </div>

              <div className="text-xs text-slate-300">
                <p className="font-bold text-white">{debtor.name}</p>
                <p className="text-slate-400 mt-0.5">رصيد الحساب: {formatCurrency(debtor.currentBalance, settings.currency)}</p>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
