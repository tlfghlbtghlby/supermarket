import React, { useState, useMemo } from 'react';
import {
  Supplier,
  SupplierTransaction,
  SupplierWithStats,
  StoreSettings,
  PaymentMethod,
} from '../types';
import {
  formatNumber,
  formatCurrency,
  formatDate,
  computeSupplierStats,
  cleanPhoneNumber,
} from '../utils/formatters';
import {
  Truck,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Phone,
  Building2,
  Receipt,
  FileText,
  Calendar,
  Trash2,
  Edit2,
  X,
  Check,
  MessageCircle,
  Printer,
  ChevronLeft,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface SuppliersViewProps {
  suppliers: Supplier[];
  supplierTransactions: SupplierTransaction[];
  settings: StoreSettings;
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onAddSupplierTransaction: (data: {
    supplierId: string;
    type: 'SUPPLY_BILL' | 'SUPPLY_PAYMENT';
    amount: number;
    description: string;
    invoiceNumber?: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
  }) => void;
  onDeleteSupplierTransaction: (txId: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  supplierTransactions,
  settings,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddSupplierTransaction,
  onDeleteSupplierTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // New Transaction modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txSupplierId, setTxSupplierId] = useState<string>('');
  const [txType, setTxType] = useState<'SUPPLY_BILL' | 'SUPPLY_PAYMENT'>('SUPPLY_BILL');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txInvoiceNo, setTxInvoiceNo] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>('CASH');

  // Add/Edit Supplier form state
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');

  // Compute stats for each supplier
  const suppliersWithStats: SupplierWithStats[] = useMemo(() => {
    return suppliers.map((sup) => computeSupplierStats(sup, supplierTransactions));
  }, [suppliers, supplierTransactions]);

  // Overall totals owed to suppliers
  const overallStats = useMemo(() => {
    let totalOwed = 0;
    let totalSupply = 0;
    let totalPaid = 0;

    suppliersWithStats.forEach((s) => {
      totalOwed += s.currentBalance;
      totalSupply += s.totalSupply;
      totalPaid += s.totalPaid;
    });

    return { totalOwed, totalSupply, totalPaid };
  }, [suppliersWithStats]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliersWithStats.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
      );
    });
  }, [suppliersWithStats, searchQuery]);

  const activeSupplier = useMemo(() => {
    if (!selectedSupplierId) return null;
    return suppliersWithStats.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliersWithStats, selectedSupplierId]);

  const activeSupplierTx = useMemo(() => {
    if (!selectedSupplierId) return [];
    return supplierTransactions
      .filter((t) => t.supplierId === selectedSupplierId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [supplierTransactions, selectedSupplierId]);

  // Reset Add/Edit Supplier Form
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormCompany('');
    setFormPhone('');
    setFormCategory('');
    setFormNotes('');
    setFormCreditLimit('');
    setShowAddSupplierModal(true);
  };

  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormName(sup.name);
    setFormCompany(sup.companyName || '');
    setFormPhone(sup.phone);
    setFormCategory(sup.category || '');
    setFormNotes(sup.notes || '');
    setFormCreditLimit(sup.creditLimit ? sup.creditLimit.toString() : '');
    setShowAddSupplierModal(true);
  };

  const handleSaveSupplierForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingSupplier) {
      onUpdateSupplier({
        ...editingSupplier,
        name: formName.trim(),
        companyName: formCompany.trim() || undefined,
        phone: formPhone.trim(),
        category: formCategory.trim() || undefined,
        notes: formNotes.trim() || undefined,
        creditLimit: formCreditLimit ? parseFloat(formCreditLimit) : undefined,
      });
    } else {
      onAddSupplier({
        name: formName.trim(),
        companyName: formCompany.trim() || undefined,
        phone: formPhone.trim(),
        category: formCategory.trim() || undefined,
        notes: formNotes.trim() || undefined,
        creditLimit: formCreditLimit ? parseFloat(formCreditLimit) : undefined,
      });
    }
    setShowAddSupplierModal(false);
  };

  const openNewTransaction = (supplierId?: string, defaultType: 'SUPPLY_BILL' | 'SUPPLY_PAYMENT' = 'SUPPLY_BILL') => {
    setTxSupplierId(supplierId || suppliers[0]?.id || '');
    setTxType(defaultType);
    setTxAmount('');
    setTxDesc('');
    setTxInvoiceNo('');
    setTxNotes('');
    setTxPaymentMethod('CASH');
    setTxModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount);
    if (!txSupplierId || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddSupplierTransaction({
      supplierId: txSupplierId,
      type: txType,
      amount: parsedAmount,
      description: txDesc.trim() || (txType === 'SUPPLY_BILL' ? 'فاتورة توريد بضاعة' : 'تسديد دفعة للمندوب'),
      invoiceNumber: txInvoiceNo.trim() || undefined,
      notes: txNotes.trim() || undefined,
      paymentMethod: txType === 'SUPPLY_PAYMENT' ? txPaymentMethod : undefined,
    });
    setTxModalOpen(false);
  };

  const sendSupplierWhatsApp = (sup: SupplierWithStats) => {
    if (!sup.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا المندوب.');
      return;
    }
    const cleanPhone = cleanPhoneNumber(sup.phone);
    const msg = `السلام عليكم ورحمة الله، الأخ المندوب *${sup.name}* (${sup.companyName || 'المحترم'}).
تحية طيبة من *${settings.storeName}*.

نود إعلامكم بموقف الحساب المالي الجاري بيننا:
- إجمالي التوريدات المستلمة: ${formatCurrency(sup.totalSupply, settings.currency)}
- إجمالي المبالغ المسددة لكم: ${formatCurrency(sup.totalPaid, settings.currency)}
- *المبلغ المتبقي بذمة المحل لكم: ${formatCurrency(sup.currentBalance, settings.currency)}* ${sup.currentBalance === 0 ? '(تم التسديد بالكامل ✅)' : ''}

شاكرين تعاونكم المستمر ودقة مواعيدكم.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/80 text-white flex items-center justify-center shadow-md">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">ديون الموردين والمندوبين</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                سجل المبالغ المستحقة لمندوبي الشركات وتجار الجملة وفواتير التوريد الآجل
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openAddSupplier}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة مندوب جديد</span>
            </button>
            <button
              onClick={() => openNewTransaction(undefined, 'SUPPLY_BILL')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>تسجيل فاتورة توريد (دين علينا)</span>
            </button>
            <button
              onClick={() => openNewTransaction(undefined, 'SUPPLY_PAYMENT')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>تسديد دفعة للمندوب</span>
            </button>
          </div>
        </div>

        {/* 3 Summary Cards for Suppliers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">إجمالي فواتير التوريد (المستلم)</div>
              <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-1">
                {formatCurrency(overallStats.totalSupply, settings.currency)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">إجمالي ما سدده المحل للمندوبين</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                {formatCurrency(overallStats.totalPaid, settings.currency)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 border border-rose-900/40 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-300">صافي الديون المستحقة علينا للموردين</div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
                {formatCurrency(overallStats.totalOwed, settings.currency)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Suppliers List & Active Supplier Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Suppliers List (Cards) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث عن مندوب أو شركة أو نوع بضاعة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-white dark:bg-[#131929] border border-slate-200 dark:border-[#27324c] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
              {filteredSuppliers.length} مندوب
            </span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto">
            {filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#131929] rounded-2xl border border-slate-200 dark:border-[#27324c] text-xs text-slate-400">
                لا يوجد موردين يطابقون البحث. اضغط على "إضافة مندوب جديد" للبدء.
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const isSelected = selectedSupplierId === sup.id;
                const hasDebt = sup.currentBalance > 0;

                return (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedSupplierId(sup.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-[#1d2742] border-indigo-500 shadow-md ring-1 ring-indigo-500'
                        : 'bg-white dark:bg-[#131929] hover:bg-slate-50 dark:hover:bg-[#182137] border-slate-200 dark:border-[#27324c]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                            {sup.name}
                          </h4>
                          {sup.companyName && (
                            <span className="text-[10px] bg-slate-100 dark:bg-[#202b46] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                              {sup.companyName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          {sup.category && <span>بضاعة: {sup.category}</span>}
                          {sup.phone && <span dir="ltr">هاتف: {sup.phone}</span>}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className={`text-base font-black ${hasDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formatNumber(sup.currentBalance)}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">
                          {hasDebt ? 'مطلوب له' : 'تم التسديد'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-[#202a40] text-[11px]">
                      <div className="text-slate-400">
                        توريد: {formatNumber(sup.totalSupply)} | مسدد: {formatNumber(sup.totalPaid)} {settings.currency}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openNewTransaction(sup.id, 'SUPPLY_BILL');
                          }}
                          className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded font-bold transition-colors"
                          title="فاتورة توريد جديدة"
                        >
                          + توريد
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openNewTransaction(sup.id, 'SUPPLY_PAYMENT');
                          }}
                          className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded font-bold transition-colors"
                          title="تسديد دفعة"
                        >
                          + تسديد
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Supplier Ledger Statement */}
        <div className="lg:col-span-7">
          {activeSupplier ? (
            <div className="bg-white dark:bg-[#131929] rounded-2xl border border-slate-200 dark:border-[#27324c] p-4 sm:p-5 shadow-xs space-y-4">
              {/* Supplier Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#202a40]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      كشف حساب: {activeSupplier.name}
                    </h3>
                    {activeSupplier.companyName && (
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {activeSupplier.companyName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    {activeSupplier.phone && (
                      <a href={`tel:${activeSupplier.phone}`} className="flex items-center gap-1 text-blue-500 hover:underline" dir="ltr">
                        <Phone className="w-3 h-3" />
                        <span>{activeSupplier.phone}</span>
                      </a>
                    )}
                    {activeSupplier.category && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>بضاعة: {activeSupplier.category}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeSupplier.phone && (
                    <button
                      onClick={() => sendSupplierWhatsApp(activeSupplier)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title="إرسال رسالة كشف حساب للمندوب واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب المندوب</span>
                    </button>
                  )}
                  <button
                    onClick={() => openEditSupplier(activeSupplier)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1d2742] rounded-xl transition-colors cursor-pointer"
                    title="تعديل بيانات المندوب"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف المندوب "${activeSupplier.name}" وسجلاته؟`)) {
                        onDeleteSupplier(activeSupplier.id);
                        setSelectedSupplierId(null);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="حذف المندوب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3 Supplier Metric Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-slate-50 dark:bg-[#101524] p-3 rounded-xl border border-slate-200 dark:border-[#202b44] text-center">
                  <div className="text-[11px] text-slate-400">إجمالي التوريدات</div>
                  <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {formatNumber(activeSupplier.totalSupply)}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-[#101524] p-3 rounded-xl border border-slate-200 dark:border-[#202b44] text-center">
                  <div className="text-[11px] text-slate-400">إجمالي المسدد له</div>
                  <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatNumber(activeSupplier.totalPaid)}
                  </div>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-center">
                  <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">المتبقي له بذمتنا</div>
                  <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {formatNumber(activeSupplier.currentBalance)}
                  </div>
                </div>
              </div>

              {/* Action buttons inside detail */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openNewTransaction(activeSupplier.id, 'SUPPLY_BILL')}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>تسجيل فاتورة توريد (دين علينا)</span>
                </button>
                <button
                  onClick={() => openNewTransaction(activeSupplier.id, 'SUPPLY_PAYMENT')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>تسديد دفعة نقدية للمندوب</span>
                </button>
              </div>

              {/* Transactions List */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  سجل فواتير ودفعات المندوب ({activeSupplierTx.length})
                </h4>

                {activeSupplierTx.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#202b44]">
                    لا توجد فواتير أو دفعات مسجلة لهذا المندوب بعد.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {activeSupplierTx.map((tx) => {
                      const isBill = tx.type === 'SUPPLY_BILL';

                      return (
                        <div
                          key={tx.id}
                          className="p-3 bg-slate-50 dark:bg-[#101524] rounded-xl border border-slate-200 dark:border-[#202b44] flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isBill
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                }`}
                              >
                                {isBill ? 'توريد بضاعة (دين علينا)' : 'تسديد دفعة (مسدد من المحل)'}
                              </span>
                              {tx.invoiceNumber && (
                                <span className="text-[10px] text-slate-400">
                                  رقم الوصل: {tx.invoiceNumber}
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {tx.description}
                            </div>
                            {tx.notes && (
                              <div className="text-[11px] text-slate-400 italic">
                                ملاحظة: {tx.notes}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400" dir="ltr">
                              {formatDate(tx.date)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-left">
                              <div
                                className={`text-sm font-black ${
                                  isBill ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isBill ? '+ ' : '- '}
                                {formatNumber(tx.amount)} {settings.currency}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذه الحركة؟')) {
                                  onDeleteSupplierTransaction(tx.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                              title="حذف الحركة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#131929] rounded-2xl border border-slate-200 dark:border-[#27324c] text-slate-400 space-y-2">
              <Truck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                اختر مندوباً من القائمة الجانبية
              </p>
              <p className="text-xs">
                لعرض كشف الحساب التفصيلي، وسجل التوريدات، وتسجيل الدفعات المسددة.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
          <div className="bg-white dark:bg-[#141b2d] border border-slate-300 dark:border-[#273656] rounded-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#202b44] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingSupplier ? 'تعديل بيانات المندوب' : 'إضافة مندوب أو مورد جديد'}
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierForm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المندوب <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله (أبو فهد)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الشركة / المذخر / المصنع
                </label>
                <input
                  type="text"
                  placeholder="مثال: شركة ألبان الرافدين"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف / واتساب
                  </label>
                  <input
                    type="tel"
                    placeholder="0770xxxxxxx"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع البضاعة
                  </label>
                  <input
                    type="text"
                    placeholder="ألبان، منظفات..."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سقف الائتمان المتفق عليه ({settings.currency})
                </label>
                <input
                  type="number"
                  placeholder="مثلاً 5000000"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات
                </label>
                <textarea
                  rows={2}
                  placeholder="مواعيد التوزيع، طريقة السداد، شروط الخصم..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#202b44]">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b2438] rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {editingSupplier ? 'حفظ التعديلات' : 'إضافة المندوب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Transaction Modal */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
          <div className="bg-white dark:bg-[#141b2d] border border-slate-300 dark:border-[#273656] rounded-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#202b44] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {txType === 'SUPPLY_BILL' ? 'تسجيل فاتورة توريد (دين علينا للمندوب)' : 'تسديد دفعة للمندوب (كاش أو حوالة)'}
              </h3>
              <button onClick={() => setTxModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#101524] rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('SUPPLY_BILL')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    txType === 'SUPPLY_BILL'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  فاتورة توريد (دين علينا)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('SUPPLY_PAYMENT')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    txType === 'SUPPLY_PAYMENT'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  تسديد دفعة للمندوب
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المندوب / المورد <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={txSupplierId}
                  onChange={(e) => setTxSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white font-bold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ ({settings.currency}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="مثال: 500000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-base font-black bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البيان وتفاصيل البضاعة
                </label>
                <input
                  type="text"
                  placeholder={txType === 'SUPPLY_BILL' ? 'مثال: 20 كارتون زيت + 10 أكياس أرز' : 'مثال: تسديد نقدي في المحل'}
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الوصل / الفاتورة
                  </label>
                  <input
                    type="text"
                    placeholder="INV-9920"
                    value={txInvoiceNo}
                    onChange={(e) => setTxInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                {txType === 'SUPPLY_PAYMENT' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      طريقة الدفع
                    </label>
                    <select
                      value={txPaymentMethod}
                      onChange={(e) => setTxPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white font-bold"
                    >
                      <option value="CASH">كاش (نقدي باليد)</option>
                      <option value="TRANSFER">حوالة (زين كاش / مصرفي)</option>
                      <option value="CARD">بطاقة بنكية</option>
                      <option value="OTHER">أخرى</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات إضافية
                </label>
                <input
                  type="text"
                  placeholder="أي ملاحظة تخص الاستلام أو التوقيع..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#101524] border border-slate-300 dark:border-[#27324c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#202b44]">
                <button
                  type="button"
                  onClick={() => setTxModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b2438] rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs ${
                    txType === 'SUPPLY_BILL' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {txType === 'SUPPLY_BILL' ? 'حفظ وتثبيت الدين' : 'تأكيد التسديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
