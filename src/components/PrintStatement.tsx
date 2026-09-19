import React from 'react';
import { DebtorWithStats, Transaction, StoreSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Printer, X } from 'lucide-react';

interface PrintStatementProps {
  debtor: DebtorWithStats | null;
  transactions: Transaction[];
  settings: StoreSettings;
  onClose: () => void;
}

export const PrintStatement: React.FC<PrintStatementProps> = ({
  debtor,
  transactions,
  settings,
  onClose,
}) => {
  if (!debtor) return null;

  const debtorTransactions = transactions
    .filter((t) => t.debtorId === debtor.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0;
  const txList = debtorTransactions.map((tx) => {
    if (tx.type === 'DEBT') running += tx.amount;
    else running = Math.max(0, running - tx.amount);
    return { ...tx, balanceAfter: running };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-300 flex flex-col my-auto max-h-[96vh]">
        {/* Floating Controls Bar (Hidden during print) */}
        <div className="no-print p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold">معاينة كشف الحساب قبل الطباعة</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الآن (أو حفظ PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Area */}
        <div id="printable-statement" className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900">{settings.storeName}</h1>
                <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
                {settings.phone && (
                  <p className="text-xs text-slate-600">هاتف: {settings.phone}</p>
                )}
              </div>
              <div className="text-left border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-xs">
                <div className="font-bold text-slate-800">كشف حساب مشتريات آجل</div>
                <div className="text-slate-500 mt-0.5">تاريخ الطباعة: {formatDate(new Date().toISOString())}</div>
              </div>
            </div>
          </div>

          {/* Debtor Details Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">اسم العميل:</span>
              <span className="text-sm font-bold text-slate-900">{debtor.name}</span>
              {debtor.address && (
                <span className="block text-slate-600 mt-1">العنوان: {debtor.address}</span>
              )}
            </div>
            <div className="text-left">
              {debtor.phone && (
                <div className="mb-1">
                  <span className="text-slate-500 font-semibold">الهاتف: </span>
                  <span className="font-bold" dir="ltr">{debtor.phone}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-semibold">حالة الحساب: </span>
                <span className={`font-bold ${debtor.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {debtor.currentBalance > 0 ? 'ذمة مستحقة' : 'خالص المسدد'}
                </span>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="mb-6">
            <table className="w-full text-right text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="p-2 border-l border-slate-300">م</th>
                  <th className="p-2 border-l border-slate-300">التاريخ</th>
                  <th className="p-2 border-l border-slate-300">النوع</th>
                  <th className="p-2 border-l border-slate-300">البيان / تفاصيل المشتريات</th>
                  <th className="p-2 border-l border-slate-300 text-left">مبلغ الدين (+)</th>
                  <th className="p-2 border-l border-slate-300 text-left">مبلغ المسدد (-)</th>
                  <th className="p-2 text-left">الرصيد المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {txList.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td className="p-2 border-l border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-l border-slate-200 whitespace-nowrap text-slate-600">
                      {formatDate(tx.date)}
                    </td>
                    <td className="p-2 border-l border-slate-200 whitespace-nowrap font-semibold">
                      {tx.type === 'DEBT' ? 'مشتريات آجل' : 'دفعة سداد'}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-slate-800 font-medium">
                      <div>{tx.description}</div>
                      {tx.notes && (
                        <div className="text-[10px] text-amber-900 bg-amber-50/80 p-1 rounded mt-1 border border-amber-200">
                          <span className="font-bold">ملاحظة: </span>
                          {tx.notes}
                        </div>
                      )}
                      {tx.invoiceNumber && (
                        <span className="text-[10px] text-slate-500 block mt-0.5">فاتورة: {tx.invoiceNumber}</span>
                      )}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-left font-bold text-rose-600 whitespace-nowrap">
                      {tx.type === 'DEBT' ? formatCurrency(tx.amount, settings.currency) : '-'}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-left font-bold text-emerald-600 whitespace-nowrap">
                      {tx.type === 'PAYMENT' ? formatCurrency(tx.amount, settings.currency) : '-'}
                    </td>
                    <td className="p-2 text-left font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(tx.balanceAfter, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Statement Totals Box */}
          <div className="flex justify-end mb-8">
            <div className="w-72 border-2 border-slate-800 rounded-xl p-3.5 bg-slate-50 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>إجمالي المشتريات الآجلة:</span>
                <span className="font-bold">{formatCurrency(debtor.totalDebt, settings.currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>إجمالي المسدد:</span>
                <span className="font-bold">{formatCurrency(debtor.totalPaid, settings.currency)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-black text-rose-600">
                <span>المبلغ المتبقي والمستحق:</span>
                <span className="text-base">{formatCurrency(debtor.currentBalance, settings.currency)}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="border-t border-slate-300 pt-6 mt-6 grid grid-cols-2 text-center text-xs text-slate-600">
            <div>
              <p className="font-bold mb-8">توقيع العميل المستلم</p>
              <p className="border-t border-dashed border-slate-400 mx-auto w-40 pt-1 text-slate-400">........................</p>
            </div>
            <div>
              <p className="font-bold mb-8">ختم وتوقيع المحل</p>
              <p className="border-t border-dashed border-slate-400 mx-auto w-40 pt-1 text-slate-400">........................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
