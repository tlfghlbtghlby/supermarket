import React from 'react';
import { DebtorWithStats, StoreSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Wallet, Users, CheckCircle2, AlertTriangle, ArrowDown } from 'lucide-react';

interface StatsCardsProps {
  debtorsWithStats: DebtorWithStats[];
  settings: StoreSettings;
  onFilterOverLimit: () => void;
  onFilterActiveDebts: () => void;
  onFilterSettled: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  debtorsWithStats,
  settings,
  onFilterOverLimit,
  onFilterActiveDebts,
  onFilterSettled,
}) => {
  const totalOutstandingDebt = debtorsWithStats.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const totalPaidAllTime = debtorsWithStats.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const activeDebtorsCount = debtorsWithStats.filter((d) => d.currentBalance > 0).length;
  const settledCount = debtorsWithStats.filter((d) => d.currentBalance === 0).length;
  const overLimitCount = debtorsWithStats.filter((d) => d.isOverLimit).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 1. Total Customer Debts (matching Screenshot 2 primary card) */}
      <div
        onClick={onFilterActiveDebts}
        className="bg-white dark:bg-[#151c2e] p-4 sm:p-5 rounded-2xl border-2 border-slate-300 dark:border-[#2d3b59] shadow-sm hover:border-blue-600 transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-800">
            ديون الزبائن في السوق
          </span>
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-300 tracking-tight">
            {formatCurrency(totalOutstandingDebt, settings.currency)}
          </h3>
          <p className="text-xs text-slate-800 dark:text-slate-200 font-bold mt-1">
            مستحقة على <span className="font-black text-rose-700 dark:text-rose-400">{activeDebtorsCount}</span> زبون
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-600" />
      </div>

      {/* 2. Customer Count (matching Screenshot 2) */}
      <div
        onClick={onFilterActiveDebts}
        className="bg-white dark:bg-[#151c2e] p-4 sm:p-5 rounded-2xl border-2 border-slate-300 dark:border-[#2d3b59] shadow-sm hover:border-blue-600 transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 dark:text-slate-200 bg-slate-200/80 dark:bg-[#101524] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-[#27324c]">
            إجمالي الزبائن
          </span>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#101524] text-slate-800 dark:text-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              {debtorsWithStats.length}
            </h3>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
              منهم {activeDebtorsCount} مدينين
            </span>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 font-bold mt-1">
            دفتر حسابات المحل المسجل
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-600" />
      </div>

      {/* 3. Settled Customers & Collections */}
      <div
        onClick={onFilterSettled}
        className="bg-white dark:bg-[#151c2e] p-4 sm:p-5 rounded-2xl border-2 border-slate-300 dark:border-[#2d3b59] shadow-sm hover:border-emerald-600 transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
            حسابات تم تسديدها
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            {formatCurrency(totalPaidAllTime, settings.currency)}
          </h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold mt-1">
            {settledCount} حسابات تم تسديدها بالكامل
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-600" />
      </div>

      {/* 4. Over Credit Limit Warning */}
      <div
        onClick={onFilterOverLimit}
        className={`bg-white dark:bg-[#151c2e] p-4 sm:p-5 rounded-2xl border-2 shadow-sm transition-all cursor-pointer group relative overflow-hidden ${
          overLimitCount > 0
            ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/30'
            : 'border-slate-300 dark:border-[#2d3b59]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
              overLimitCount > 0
                ? 'text-amber-950 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-950/80 border-amber-400 dark:border-amber-700'
                : 'text-slate-800 dark:text-slate-300 bg-slate-200/80 dark:bg-[#101524] border-slate-300 dark:border-[#27324c]'
            }`}
          >
            تجاوزوا سقف الدين
          </span>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
              overLimitCount > 0
                ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                : 'bg-slate-100 dark:bg-[#101524] text-slate-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <h3
              className={`text-2xl sm:text-3xl font-black ${
                overLimitCount > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-950 dark:text-white'
              }`}
            >
              {overLimitCount}
            </h3>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">زبائن متجاوزين الحد</span>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 font-bold mt-1">
            {overLimitCount > 0 ? 'تنبيه: يتطلب مراجعة فورية قبل إعطاء دين جديد' : 'كل الديون تحت السقف المحدد'}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-amber-500" />
      </div>
    </div>
  );
};
