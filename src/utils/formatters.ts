import {
  Debtor,
  Transaction,
  DebtorWithStats,
  StoreSettings,
  Supplier,
  SupplierTransaction,
  SupplierWithStats,
} from '../types';

export function formatNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Math.round(amount).toLocaleString('en-US');
}

export function formatCurrency(amount: number, currency: string = 'دينار عراقي'): string {
  const formatted = formatNumber(amount);
  const curr = (!currency || currency === 'د.ع') ? 'دينار عراقي' : currency;
  return `${formatted} ${curr}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    const strHours = String(hours).padStart(2, '0');

    return `${year}-${month}-${day} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
}

export function formatDateOnly(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const month = String(d.getMonth() + 1);
    const day = String(d.getDate());
    return `${month}/${day}`;
  } catch {
    return dateString;
  }
}

export function computeDebtorStats(debtor: Debtor, transactions: Transaction[]): DebtorWithStats {
  const debtorTransactions = transactions.filter((t) => t.debtorId === debtor.id);
  
  let totalDebt = 0;
  let totalPaid = 0;
  let lastDate: string | undefined = undefined;

  const sorted = [...debtorTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const trx of sorted) {
    if (trx.type === 'DEBT') {
      totalDebt += trx.amount;
    } else if (trx.type === 'PAYMENT') {
      totalPaid += trx.amount;
    }
    lastDate = trx.date;
  }

  const currentBalance = Math.max(0, totalDebt - totalPaid);
  const isOverLimit = !!(debtor.creditLimit && currentBalance > debtor.creditLimit);

  return {
    ...debtor,
    totalDebt,
    totalPaid,
    currentBalance,
    lastTransactionDate: lastDate,
    transactionsCount: debtorTransactions.length,
    isOverLimit,
  };
}

export function computeSupplierStats(
  supplier: Supplier,
  transactions: SupplierTransaction[]
): SupplierWithStats {
  const supplierTransactions = transactions.filter((t) => t.supplierId === supplier.id);

  let totalSupply = 0;
  let totalPaid = 0;
  let lastDate: string | undefined = undefined;

  const sorted = [...supplierTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const trx of sorted) {
    if (trx.type === 'SUPPLY_BILL') {
      totalSupply += trx.amount;
    } else if (trx.type === 'SUPPLY_PAYMENT') {
      totalPaid += trx.amount;
    }
    lastDate = trx.date;
  }

  const currentBalance = Math.max(0, totalSupply - totalPaid);

  return {
    ...supplier,
    totalSupply,
    totalPaid,
    currentBalance,
    lastTransactionDate: lastDate,
    transactionsCount: supplierTransactions.length,
  };
}

export function normalizeArabicDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return (str || '')
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  const normalized = normalizeArabicDigits(phone);
  let clean = normalized.replace(/[^0-9]/g, '');
  if (!clean) return '';

  if (clean.startsWith('00964')) {
    clean = '964' + clean.substring(5);
  } else if (clean.startsWith('00')) {
    clean = clean.substring(2);
  } else if (clean.startsWith('9640')) {
    clean = '964' + clean.substring(4);
  } else if (clean.startsWith('07')) {
    clean = '964' + clean.substring(1);
  } else if (clean.startsWith('7') && clean.length === 10) {
    clean = '964' + clean;
  } else if (clean.startsWith('0') && clean.length >= 10) {
    if (clean.startsWith('05')) {
      clean = '966' + clean.substring(1);
    } else if (clean.startsWith('01') && clean.length === 11) {
      clean = '20' + clean.substring(1);
    } else {
      clean = clean.substring(1);
    }
  }
  return clean;
}

export function generateWhatsAppStatementMessage(
  debtor: DebtorWithStats,
  settings: StoreSettings
): string {
  const curr = (!settings.currency || settings.currency === 'د.ع') ? 'دينار عراقي' : settings.currency;
  return settings.customWhatsAppMessage
    .replace(/{NAME}/g, debtor.name)
    .replace(/{STORE}/g, settings.storeName)
    .replace(/{AMOUNT}/g, formatNumber(debtor.currentBalance))
    .replace(/{CURRENCY}/g, curr);
}

export function generateWhatsAppLink(
  debtor: DebtorWithStats,
  settings: StoreSettings
): string {
  if (!debtor.phone) return '';
  const cleanPhone = cleanPhoneNumber(debtor.phone);
  const text = generateWhatsAppStatementMessage(debtor, settings);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function generateTransactionWhatsAppMessage({
  storeName,
  debtorName,
  transactionType,
  transactionAmount,
  previousBalance,
  newBalance,
  currency,
  description,
  date,
}: {
  storeName: string;
  debtorName: string;
  transactionType: 'DEBT' | 'PAYMENT';
  transactionAmount: number;
  previousBalance: number;
  newBalance: number;
  currency: string;
  description?: string;
  date?: string;
  storePhone?: string;
}): string {
  const isDebt = transactionType === 'DEBT';
  const actionTitle = isDebt ? 'تسجيل دين جديد 🛒' : 'تسديد دفعة مالية 💵';
  const curr = (!currency || currency === 'د.ع') ? 'دينار عراقي' : currency;
  const dt = date ? formatDate(date) : formatDate(new Date().toISOString());

  return `🧾 *فاتورة حساب - ${storeName}*
السلام عليكم ورحمة الله، الأخ العزيز *${debtorName}*

تم ${actionTitle}:
------------------------------
🔹 *نوع العملية:* ${isDebt ? 'شراء بالدين (مشتريات)' : 'تسديد دفعة لحسابك'}
💰 *المبلغ الحركي:* ${formatNumber(transactionAmount)} ${curr}
${description ? `📝 *البيان / المواد:* ${description}\n` : ''}🕒 *الوقت والتاريخ:* ${dt}
------------------------------
📊 *موقف الحساب المالي:*
▪️ *الدين القديم (السابق):* ${formatNumber(previousBalance)} ${curr}
▪️ *${isDebt ? '(+) الدين الجديد:' : '(-) المبلغ المسدد:'}* ${formatNumber(transactionAmount)} ${curr}
✨ *صافي الدين الكلي المتبقي:* ${formatNumber(newBalance)} ${curr} ${newBalance === 0 ? '(تم التسديد بالكامل ✅)' : ''}
------------------------------
نشكر حسن تعاملكم وأهلاً وسهلاً بكم دائماً في *${storeName}*!`;
}

export function generateTransactionWhatsAppUrl(
  phone: string,
  params: Parameters<typeof generateTransactionWhatsAppMessage>[0]
): string {
  if (!phone) return '';
  const cleanPhone = cleanPhoneNumber(phone);
  const message = generateTransactionWhatsAppMessage(params);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function getDebtorLastActivityText(
  debtor: DebtorWithStats,
  transactions: Transaction[]
): { text: string; type: 'DEBT' | 'PAYMENT' | 'NONE' } {
  const debtorTx = transactions.filter((t) => t.debtorId === debtor.id);
  if (debtorTx.length === 0) {
    return { text: 'تم التسديد (لا توجد حركات)', type: 'NONE' };
  }

  const sorted = [...debtorTx].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latest = sorted[0];
  const now = new Date();
  const txDate = new Date(latest.date);
  const diffTime = Math.abs(now.getTime() - txDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const action = latest.type === 'DEBT' ? 'آخر دين' : 'آخر تسديد';

  if (diffDays === 0) {
    return { text: `${action} اليوم`, type: latest.type };
  } else if (diffDays === 1) {
    return { text: `${action} منذ 1 يوم`, type: latest.type };
  } else if (diffDays === 2) {
    return { text: `${action} منذ 2 يوم`, type: latest.type };
  } else {
    return { text: `${action} منذ ${diffDays} يوم`, type: latest.type };
  }
}

export function exportToCSV(debtorsWithStats: DebtorWithStats[], currency: string): void {
  const headers = ['اسم العميل', 'رقم الهاتف', 'العنوان', 'إجمالي المشتريات الآجلة', 'إجمالي المسدد', 'الرصيد المتبقي المستحق', 'سقف الدين', 'حالة الحساب'];
  
  const rows = debtorsWithStats.map((d) => [
    `"${d.name.replace(/"/g, '""')}"`,
    `"${d.phone || ''}"`,
    `"${(d.address || '').replace(/"/g, '""')}"`,
    d.totalDebt,
    d.totalPaid,
    d.currentBalance,
    d.creditLimit || 'بدون حد',
    d.currentBalance === 0 ? 'تم التسديد' : d.isOverLimit ? 'متجاوز الحد' : 'مدين نشط',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ديون_السوبرماركت_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

