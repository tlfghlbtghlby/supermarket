import React, { useState } from 'react';
import { DebtorWithStats, StoreSettings, DebtorFilter, DebtorSort, Transaction } from '../types';
import { formatCurrency, generateWhatsAppLink, getDebtorLastActivityText } from '../utils/formatters';
import {
  Search,
  PlusCircle,
  ArrowDownLeft,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Edit2,
  Trash2,
  MessageCircle,
  FileText,
  Lock,
  ArrowUpDown,
  User,
  X,
  ChevronLeft,
  QrCode,
  Plus,
  UserPlus,
} from 'lucide-react';

interface DebtorListProps {
  debtors: DebtorWithStats[];
  transactions?: Transaction[];
  settings: StoreSettings;
  onSelectDebtor: (debtor: DebtorWithStats) => void;
  onQuickAddDebt: (debtor: DebtorWithStats) => void;
  onQuickAddPayment: (debtor: DebtorWithStats) => void;
  onAddNewDebtor: () => void;
  onEditDebtor: (debtor: DebtorWithStats) => void;
  onDeleteDebtor: (debtorId: string, debtorName: string) => void;
  onPrintDebtor?: (debtor: DebtorWithStats) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentFilter: DebtorFilter;
  onFilterChange: (filter: DebtorFilter) => void;
  currentSort: DebtorSort;
  onSortChange: (sort: DebtorSort) => void;
}

export const DebtorList: React.FC<DebtorListProps> = ({
  debtors,
  transactions = [],
  settings,
  onSelectDebtor,
  onQuickAddDebt,
  onQuickAddPayment,
  onAddNewDebtor,
  onEditDebtor,
  onDeleteDebtor,
  onPrintDebtor,
  searchQuery,
  onSearchChange,
  currentFilter,
  onFilterChange,
  currentSort,
  onSortChange,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  return (
    <div className="relative space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="bg-white dark:bg-[#161c2d] p-4 rounded-2xl border-2 border-slate-200 dark:border-[#27324c] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input matching Screenshot 1 */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
            <input
              id="search-debtor-input"
              type="text"
              placeholder="بحث عن زبون (الاسم، الهاتف، أو العنوان)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pr-10 pl-9 py-2.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex bg-slate-100 dark:bg-[#101524] p-1 rounded-xl text-xs border border-slate-200 dark:border-[#27324c]">
              <button
                onClick={() => onFilterChange('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentFilter === 'ALL'
                    ? 'bg-white dark:bg-[#2563eb] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                الكل ({debtors.length})
              </button>
              <button
                onClick={() => onFilterChange('ACTIVE_DEBT')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentFilter === 'ACTIVE_DEBT'
                    ? 'bg-white dark:bg-[#2563eb] text-rose-700 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                عليهم دين
              </button>
              <button
                onClick={() => onFilterChange('OVER_LIMIT')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentFilter === 'OVER_LIMIT'
                    ? 'bg-white dark:bg-[#2563eb] text-amber-800 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                متجاوز الحد
              </button>
              <button
                onClick={() => onFilterChange('SETTLED')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentFilter === 'SETTLED'
                    ? 'bg-white dark:bg-[#2563eb] text-emerald-700 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                تم التسديد
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="sort-debtor-select"
                value={currentSort}
                onChange={(e) => onSortChange(e.target.value as DebtorSort)}
                className="bg-transparent focus:outline-none cursor-pointer pr-1 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="HIGHEST_DEBT" className="dark:bg-[#161c2d]">أعلى دين أولاً</option>
                <option value="LOWEST_DEBT" className="dark:bg-[#161c2d]">أقل دين أولاً</option>
                <option value="NEWEST_ACTIVITY" className="dark:bg-[#161c2d]">أحدث نشاط / حركة</option>
                <option value="NAME_ASC" className="dark:bg-[#161c2d]">أبجدياً (أ - ي)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Debtors List - Clear, distinctly bordered cards matching Screenshot 1 */}
      {debtors.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-[#161c2d] rounded-2xl border-2 border-slate-200 dark:border-[#27324c]">
          <div className="w-16 h-16 bg-slate-100 dark:bg-[#101524] rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">لا يوجد زبائن يطابقون البحث</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            يمكنك مسح الفلتر أو إضافة زبون جديد لتسجيل مديونيته ومشترياته الآجلة.
          </p>
          <button
            onClick={onAddNewDebtor}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة زبون الآن</span>
          </button>
        </div>
      ) : (
        /* Here is the explicit clear boundary between debtor names: individual separated bordered cards */
        <div className="space-y-3.5">
          {debtors.map((debtor, index) => {
            const hasDebt = debtor.currentBalance > 0;
            const limit = debtor.creditLimit || 0;
            const activity = getDebtorLastActivityText(debtor, transactions);

            return (
              <div
                key={debtor.id}
                className="bg-white dark:bg-[#161c2d] border-2 border-slate-300 dark:border-[#27324c] hover:border-blue-500/80 dark:hover:border-blue-500/80 rounded-2xl p-4 sm:p-5 shadow-2xs transition-all flex flex-col gap-3 group relative"
              >
                {/* Top Section: Debtor Name, Number & Balance */}
                <div className="flex items-start justify-between gap-3">
                  {/* Right side (RTL): Number + Name + Subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        onClick={() => onSelectDebtor(debtor)}
                        className={`text-lg sm:text-xl font-black cursor-pointer hover:underline truncate ${
                          hasDebt
                            ? 'text-rose-600 dark:text-[#f87171]'
                            : 'text-emerald-600 dark:text-[#34d399]'
                        }`}
                      >
                        {index + 1}. {debtor.name}
                      </h4>

                      {debtor.isOverLimit && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/60 shrink-0">
                          <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>تجاوز الحد</span>
                        </span>
                      )}

                      {!hasDebt && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/60 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>تم التسديد</span>
                        </span>
                      )}
                    </div>

                    {/* Subtitle: Time since last debt/payment matching Screenshot 1 */}
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">
                        {activity.text}
                      </span>

                      {debtor.phone && (
                        <a
                          href={`tel:${debtor.phone}`}
                          className="inline-flex items-center gap-1 hover:text-blue-500 text-slate-400 dark:text-slate-400"
                          dir="ltr"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{debtor.phone}</span>
                        </a>
                      )}

                      {debtor.address && (
                        <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{debtor.address}</span>
                        </span>
                      )}
                    </div>

                    {debtor.notes && (
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 italic line-clamp-1">
                        ملاحظة: {debtor.notes}
                      </p>
                    )}
                  </div>

                  {/* Left side (RTL): Balance amount & Lock icon */}
                  <div className="text-left shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      {debtor.isOverLimit && (
                        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span
                        onClick={() => onSelectDebtor(debtor)}
                        className={`text-xl sm:text-2xl font-black cursor-pointer ${
                          hasDebt
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-emerald-600 dark:text-[#34d399]'
                        }`}
                      >
                        {Math.round(debtor.currentBalance || 0).toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold mr-0.5">
                        {settings.currency === 'د.ع' ? 'دينار عراقي' : (settings.currency || 'دينار عراقي')}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 text-left mt-0.5">
                      مشتريات: {Math.round(debtor.totalDebt || 0).toLocaleString('en-US')} | مسدد: {Math.round(debtor.totalPaid || 0).toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                {/* Clear separator line inside each debtor card */}
                <div className="border-t border-slate-200/80 dark:border-[#202a40] pt-3 flex flex-wrap items-center justify-between gap-2">
                  {/* Left Action Buttons matching Screenshot 1 (Chevron, QR/Barcode, Plus) */}
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    {/* Primary Button: Detail view chevron (<) */}
                    <button
                      type="button"
                      onClick={() => onSelectDebtor(debtor)}
                      title="فتح كشف حساب الزبون"
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                      <span className="text-xs">تفاصيل الكشف</span>
                    </button>

                    {/* Barcode/QR Statement Button */}
                    <button
                      type="button"
                      onClick={() => onPrintDebtor ? onPrintDebtor(debtor) : onSelectDebtor(debtor)}
                      title="طباعة كشف أو مشاركة الحساب"
                      className="p-2 sm:px-3 bg-slate-100 dark:bg-[#182137] hover:bg-slate-200 dark:hover:bg-[#222d4a] border border-slate-200 dark:border-[#2b3957] text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* Quick Add Debt (+) */}
                    <button
                      type="button"
                      onClick={() => onQuickAddDebt(debtor)}
                      title="تسجيل دين جديد على الزبون (+)"
                      className="p-2 sm:px-3.5 bg-slate-100 dark:bg-[#182137] hover:bg-slate-200 dark:hover:bg-[#222d4a] border border-slate-200 dark:border-[#2b3957] text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4 text-rose-500" />
                      <span className="text-xs hidden sm:inline text-rose-600 dark:text-rose-400 font-bold">دين</span>
                    </button>

                    {/* Quick Add Payment */}
                    <button
                      type="button"
                      onClick={() => onQuickAddPayment(debtor)}
                      title="تسجيل دفعة سداد"
                      className="p-2 sm:px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs hidden sm:inline">سداد</span>
                    </button>
                  </div>

                  {/* Secondary Quick Contact & Options */}
                  <div className="flex items-center gap-1.5 mr-auto">
                    {/* WhatsApp */}
                    {debtor.phone && hasDebt && (
                      <a
                        href={generateWhatsAppLink(debtor, settings)}
                        target="_blank"
                        rel="noreferrer"
                        title="إرسال تذكير بالرصيد عبر واتساب"
                        className="p-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}

                    {/* Context menu for edit/delete */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === debtor.id ? null : debtor.id);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1f2942] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpenId === debtor.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 mt-1 w-40 bg-white dark:bg-[#161c2d] rounded-xl shadow-xl border border-slate-200 dark:border-[#27324c] py-1 z-30 text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              onEditDebtor(debtor);
                            }}
                            className="w-full text-right px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f2942] flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>تعديل بيانات الزبون</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              onDeleteDebtor(debtor.id, debtor.name);
                            }}
                            className="w-full text-right px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-[#27324c]"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>حذف الزبون</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button (FAB) matching Screenshot 1 to add new debtor */}
      <button
        type="button"
        id="fab-add-debtor"
        onClick={onAddNewDebtor}
        title="إضافة زبون جديد"
        className="fixed bottom-6 left-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
      >
        <UserPlus className="w-6 h-6" />
      </button>
    </div>
  );
};
