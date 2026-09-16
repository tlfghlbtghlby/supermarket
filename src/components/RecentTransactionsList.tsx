import React from 'react';
import { Transaction, DebtorWithStats, StoreSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ArrowUpRight, ArrowDownLeft, Calendar, User, Wallet, FileText, Clock } from 'lucide-react';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  debtors: DebtorWithStats[];
  settings: StoreSettings;
  onSelectDebtor: (debtor: DebtorWithStats) => void;
  onOpenAddDebt: () => void;
  onOpenAddPayment: () => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  debtors,
  settings,
  onSelectDebtor,
}) => {
  // Sort transactions by date descending (latest first)
  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Helper to find debtor
  const getDebtor = (debtorId: string) => debtors.find((d) => d.id === debtorId);

  // Compute running balance at that moment or current balance
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>اخر حركات الزبائن</span>
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          أحدث {recentTx.length} حركة مسجلة
        </span>
      </div>

      {recentTx.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#151c2e] border border-slate-200 dark:border-[#27324c] rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            لا توجد حركات مسجلة بعد. استخدم أزرار تسجيل الدين أو السداد لإضافة أول حركة.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentTx.map((tx) => {
            const debtor = getDebtor(tx.debtorId);
            const isDebt = tx.type === 'DEBT';

            return (
              <div
                key={tx.id}
                className="bg-white dark:bg-[#161c2d] border-2 border-slate-200 dark:border-[#27324c] rounded-2xl p-4 shadow-2xs hover:border-blue-500/50 transition-all"
              >
                {/* Top Row: Type Tag, Amount & Date */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isDebt
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                      }`}
                    >
                      {isDebt ? 'دين' : 'تسديد'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-lg font-extrabold ${
                          isDebt
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatCurrency(tx.amount, settings.currency)}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isDebt
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isDebt ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1" dir="ltr">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(tx.date).toISOString().slice(0, 10)}</span>
                  </div>
                </div>

                {/* Nested Box with details matching Screenshot 2 */}
                <div className="bg-slate-50 dark:bg-[#101524] border border-slate-200/80 dark:border-[#1f283d] rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>وقت الإضافة:</span>
                      <span className="font-semibold" dir="ltr">
                        {formatDate(tx.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      <span className="text-slate-500 dark:text-slate-400">الزبون:</span>
                      {debtor ? (
                        <button
                          type="button"
                          onClick={() => onSelectDebtor(debtor)}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {debtor.name}
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">غير محدد</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-[#1f283d]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Wallet className="w-3.5 h-3.5 text-slate-400" />
                      <span>الرصيد بعد الحركة:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {debtor ? formatCurrency(debtor.currentBalance, settings.currency) : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>الملاحظة:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {tx.notes || tx.description || 'لا يوجد ملاحظات'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
