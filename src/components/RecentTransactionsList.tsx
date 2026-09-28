import React, { useState, useMemo } from 'react';
import { Transaction, DebtorWithStats, StoreSettings, TransactionType } from '../types';
import { formatCurrency, formatDate, formatDateOnly } from '../utils/formatters';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  Wallet,
  FileText,
  Clock,
  Search,
  Filter,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  X,
  ChevronDown,
  Tag,
} from 'lucide-react';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  debtors: DebtorWithStats[];
  settings: StoreSettings;
  onSelectDebtor: (debtor: DebtorWithStats) => void;
  onOpenAddDebt: () => void;
  onOpenAddPayment: () => void;
  onQuickAddDebtForDebtor?: (debtor: DebtorWithStats) => void;
  onQuickAddPaymentForDebtor?: (debtor: DebtorWithStats) => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  debtors,
  settings,
  onSelectDebtor,
  onOpenAddDebt,
  onOpenAddPayment,
  onQuickAddDebtForDebtor,
  onQuickAddPaymentForDebtor,
}) => {
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(25);

  // Helper map for fast debtor lookup
  const debtorsMap = useMemo(() => {
    const map = new Map<string, DebtorWithStats>();
    debtors.forEach((d) => map.set(d.id, d));
    return map;
  }, [debtors]);

  // Sort and filter transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Type filter
    if (txTypeFilter !== 'ALL') {
      list = list.filter((tx) => tx.type === txTypeFilter);
    }

    // Search query
    if (txSearchQuery.trim()) {
      const q = txSearchQuery.toLowerCase().trim();
      list = list.filter((tx) => {
        const debtor = debtorsMap.get(tx.debtorId);
        const nameMatch = debtor?.name.toLowerCase().includes(q);
        const phoneMatch = debtor?.phone.includes(q);
        const noteMatch = (tx.notes || tx.description || '').toLowerCase().includes(q);
        const dateMatch = tx.date.includes(q);
        const sessionMatch = (tx.sessionName || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || noteMatch || dateMatch || sessionMatch;
      });
    }

    return list;
  }, [transactions, txTypeFilter, txSearchQuery, debtorsMap]);

  // Group transactions by date string (YYYY-MM-DD)
  const groupedByDate = useMemo(() => {
    const limited = filteredTransactions.slice(0, displayLimit);
    const groups: { [dateKey: string]: Transaction[] } = {};

    limited.forEach((tx) => {
      const dateKey = formatDateOnly(tx.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });

    return groups;
  }, [filteredTransactions, displayLimit]);

  // Friendly date label generator
  const getDateLabel = (dateKey: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (dateKey === today) {
      return 'اليوم';
    } else if (dateKey === yesterday) {
      return 'أمس';
    } else {
      try {
        const d = new Date(dateKey);
        return d.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return dateKey;
      }
    }
  };

  // Metrics for filtered set
  const totalDebtsSum = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'DEBT')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalPaymentsSum = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  return (
    <div className="space-y-4">
      {/* Transactions List Grouped by Date */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#161c2d] border-2 border-slate-200 dark:border-[#27324c] rounded-2xl space-y-3">
          <div className="w-14 h-14 bg-slate-100 dark:bg-[#101524] rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Clock className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
            لا توجد حركات مسجلة تطابق البحث
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            يمكنك تسجيل دين جديد أو سداد دفعة نقدية لتظهر الحركات فورياً في هذا السجل التاريخي.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onOpenAddDebt}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل دين جديد</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddPayment}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>تسجيل دفعة نقدية</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedByDate) as [string, Transaction[]][]).map(([dateKey, txList]) => {
            const dateLabel = getDateLabel(dateKey);
            const dayDebts = txList.filter((t) => t.type === 'DEBT').reduce((s, t) => s + t.amount, 0);
            const dayPaid = txList.filter((t) => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);

            return (
              <div key={dateKey} className="space-y-3">
                {/* Date Header Badge */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-200 dark:bg-[#1d273f] text-slate-800 dark:text-slate-200 text-xs font-extrabold shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{dateLabel}</span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        ({dateKey})
                      </span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {txList.length} {txList.length === 1 ? 'حركة' : 'حركات'}
                    </span>
                  </div>

                  {/* Day Subtotal */}
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    {dayDebts > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        ديون: +{formatCurrency(dayDebts, settings.currency)}
                      </span>
                    )}
                    {dayPaid > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        قبض: -{formatCurrency(dayPaid, settings.currency)}
                      </span>
                    )}
                  </div>
                </div>

                {/* List of Transactions for this Date */}
                <div className="space-y-3">
                  {txList.map((tx) => {
                    const debtor = debtorsMap.get(tx.debtorId);
                    const isDebt = tx.type === 'DEBT';

                    return (
                      <div
                        key={tx.id}
                        className="bg-white dark:bg-[#161c2d] border-2 border-slate-200 dark:border-[#27324c] hover:border-blue-500/60 dark:hover:border-blue-500/60 rounded-2xl p-4 shadow-2xs transition-all space-y-3 group"
                      >
                        {/* Top Row: Type Tag, Amount, and Time */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            {/* Type Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black ${
                                isDebt
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                              }`}
                            >
                              {isDebt ? (
                                <>
                                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                                  <span>دين جديد</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>تسديد دفعة</span>
                                </>
                              )}
                            </span>

                            {/* Amount */}
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-lg sm:text-xl font-black ${
                                  isDebt
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {formatCurrency(tx.amount, settings.currency)}
                              </span>
                            </div>
                          </div>

                          {/* Session Badge & Time/Date display */}
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 shadow-2xs"
                              title="اسم الجلسة أو المسؤول الذي سجّل هذه الحركة"
                            >
                              <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>الجلسة: {tx.sessionName || 'الجلسة 1'}</span>
                            </span>

                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5" dir="ltr">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold">{formatDate(tx.date).slice(11)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Details Box: Customer Name, Balance After, Note */}
                        <div className="bg-slate-100/90 dark:bg-[#0f1424] border border-slate-300 dark:border-[#222e48] rounded-xl p-3 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Debtor Button */}
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="text-slate-800 dark:text-slate-200 font-bold">الزبون:</span>
                              {debtor ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectDebtor(debtor)}
                                  className="font-black text-sm text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                                  title="فتح ملف وكشف حساب الزبون"
                                >
                                  <span>{debtor.name}</span>
                                  {debtor.phone && (
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400" dir="ltr">
                                      ({debtor.phone})
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  زبون محذوف أو غير محدد
                                </span>
                              )}
                            </div>

                            {/* Debtor Balance */}
                            {debtor && (
                              <div className="flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                <span className="text-slate-800 dark:text-slate-200 font-bold">الرصيد المتبقي:</span>
                                <span
                                  className={`font-black ${
                                    debtor.currentBalance > 0
                                      ? 'text-rose-700 dark:text-rose-400'
                                      : 'text-emerald-700 dark:text-emerald-400'
                                  }`}
                                >
                                  {formatCurrency(debtor.currentBalance, settings.currency)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Note / Description */}
                          <div className="flex items-start gap-2 pt-1.5 border-t border-slate-300 dark:border-[#1f283d] text-slate-800 dark:text-slate-200">
                            <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                            <span className="font-bold text-slate-900 dark:text-slate-300 shrink-0">التفاصيل / الملاحظة:</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 break-words">
                              {tx.notes || tx.description || 'لا توجد ملاحظات مسجلة على هذه الحركة'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Load More Button if transactions exceed displayLimit */}
          {filteredTransactions.length > displayLimit && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + 25)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-[#161c2d] border-2 border-slate-200 dark:border-[#27324c] hover:border-blue-500 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
                <span>عرض المزيد من الحركات السابقة ({filteredTransactions.length - displayLimit} متبقية)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
