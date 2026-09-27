import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { Debtor, Transaction, StoreSettings } from '../types';
import { loadDebtors, loadTransactions } from './storage';

export interface DebtFinancialSummary {
  totalOutstandingDebt: number;
  totalCumulativeDebt: number;
  totalPaymentsReceived: number;
  totalDebtorsCount: number;
  activeDebtorsCount: number;
  settledDebtorsCount: number;
  topDebtors: { name: string; phone: string; balance: number; totalDebt: number; totalPaid: number }[];
}

export function computeFinancialSummary(
  debtorsInput: Debtor[],
  transactionsInput: Transaction[]
): DebtFinancialSummary {
  const debtors = debtorsInput && debtorsInput.length > 0 ? debtorsInput : loadDebtors();
  const transactions = transactionsInput && transactionsInput.length > 0 ? transactionsInput : loadTransactions();

  let totalCumulativeDebt = 0;
  let totalPaymentsReceived = 0;
  let activeDebtorsCount = 0;
  let settledDebtorsCount = 0;

  const debtorBalances = debtors.map((d) => {
    const dTx = transactions.filter((t) => t.debtorId === d.id);
    const dDebt = dTx
      .filter((t) => t.type === 'DEBT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const dPaid = dTx
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const balance = dDebt - dPaid;

    totalCumulativeDebt += dDebt;
    totalPaymentsReceived += dPaid;

    if (balance > 0) {
      activeDebtorsCount++;
    } else {
      settledDebtorsCount++;
    }

    return {
      name: d.name,
      phone: d.phone || '',
      balance,
      totalDebt: dDebt,
      totalPaid: dPaid,
    };
  });

  const totalOutstandingDebt = debtorBalances
    .filter((d) => d.balance > 0)
    .reduce((sum, d) => sum + d.balance, 0);

  debtorBalances.sort((a, b) => b.balance - a.balance);
  const topDebtors = debtorBalances.slice(0, 10);

  return {
    totalOutstandingDebt,
    totalCumulativeDebt,
    totalPaymentsReceived,
    totalDebtorsCount: debtors.length,
    activeDebtorsCount,
    settledDebtorsCount,
    topDebtors,
  };
}

/**
 * Generates an Excel Workbook (.xlsx) Blob containing full debt backup data
 * Sheet 1: سجل ديون الزبائن الشامل (Customer Debts Sheet) with Today's Date per row
 * Sheet 2: سجل الحركات التفصيلي (Transactions Log)
 * Sheet 3: ملخص المؤشرات المالية (Financial KPI Summary)
 */
export async function generateDebtExcelBlob(
  debtorsInput: Debtor[],
  transactionsInput: Transaction[],
  settings: StoreSettings
): Promise<Blob> {
  // Guarantee data fallback to avoid ever generating an empty file
  let debtors = debtorsInput && debtorsInput.length > 0 ? debtorsInput : loadDebtors();
  let transactions = transactionsInput && transactionsInput.length > 0 ? transactionsInput : loadTransactions();

  const currency = settings.customCurrencyName || settings.currency || 'د.ع';
  const summary = computeFinancialSummary(debtors, transactions);
  const now = new Date();

  // Format today's date in clear formats
  const todayIsoDate = now.toISOString().slice(0, 10);
  const todayArabicDate = now.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayFullDateText = now.toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: سجل ديون الزبائن الشامل (الورقة الأولى الأساسية)
  // ==========================================
  const debtorMap = new Map<string, Debtor>();
  debtors.forEach((d) => debtorMap.set(d.id, d));

  const mainSheetRows: any[][] = [
    // Header Banner
    [`كشف وسجل ديون الزبائن الشامل - ${settings.storeName || 'دفتر ديون السوبرماركت'}`],
    [
      `تاريخ اليوم: ${todayFullDateText} (${todayArabicDate})`,
      '',
      `المسؤول: ${settings.ownerName || 'صاحب المحل'}`,
      '',
      `العملة المعتمدة: ${currency}`,
      '',
      `وقت استخراج الملف: ${timeFormatted}`,
    ],
    [
      `إجمالي الديون المتبقية بالسوق: ${summary.totalOutstandingDebt.toLocaleString()} ${currency}`,
      '',
      `إجمالي التسديدات المقبوضة: ${summary.totalPaymentsReceived.toLocaleString()} ${currency}`,
      '',
      `إجمالي الديون التراكمية: ${summary.totalCumulativeDebt.toLocaleString()} ${currency}`,
      '',
      `عدد الزبائن المدينين: ${summary.activeDebtorsCount} من إجمالي ${summary.totalDebtorsCount} زبون`,
    ],
    [], // Blank separation row
    // Column Headers
    [
      'ت',
      'تاريخ اليوم',
      'اسم الزبون',
      `الدين الذي عليه (المتبقي)`,
      'حالة الحساب',
      `إجمالي الديون المسجلة`,
      `إجمالي التسديدات الواصلة`,
      'تاريخ آخر حركة',
      'رقم الهاتف',
      'العنوان / المنطقة',
      'الحد الائتماني',
      'الملاحظات والبيان',
    ],
  ];

  let totalDebtCol = 0;
  let totalPaidCol = 0;
  let totalBalanceCol = 0;

  debtors.forEach((d, idx) => {
    const dTx = transactions.filter((t) => t.debtorId === d.id);
    const dDebt = dTx
      .filter((t) => t.type === 'DEBT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const dPaid = dTx
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const balance = dDebt - dPaid;

    totalDebtCol += dDebt;
    totalPaidCol += dPaid;
    if (balance > 0) totalBalanceCol += balance;

    let status = 'خالص (لا يوجد دين)';
    if (balance > 0) status = 'مدين (مطلوب سداد)';
    else if (balance < 0) status = 'له رصيد دائن';

    // Find last activity date
    const sortedDTx = [...dTx].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
    const lastDate = sortedDTx[0]?.date
      ? new Date(sortedDTx[0].date).toLocaleDateString('ar-IQ')
      : 'لا توجد حركات سابقة';

    mainSheetRows.push([
      idx + 1,
      todayArabicDate, // تاريخ اليوم لكل الزبائن
      d.name,
      balance, // الدين الذي عليه
      status,
      dDebt,
      dPaid,
      lastDate,
      d.phone || '-',
      d.address || '-',
      d.creditLimit ? `${d.creditLimit} ${currency}` : 'بدون سقف',
      d.notes || '-',
    ]);
  });

  // Summary Row at the bottom of the table
  mainSheetRows.push([]);
  mainSheetRows.push([
    'المجموع الإجمالي',
    todayArabicDate,
    `إجمالي عدد الزبائن: ${debtors.length}`,
    totalBalanceCol,
    '',
    totalDebtCol,
    totalPaidCol,
    `تاريخ اليوم: ${todayArabicDate}`,
    '',
    '',
    '',
    `تم الاستخراج عبر تطبيق: ${settings.storeName || 'سوبرماركت'}`,
  ]);

  const wsCustomers = XLSX.utils.aoa_to_sheet(mainSheetRows);
  wsCustomers['!cols'] = [
    { wch: 6 },  // ت
    { wch: 15 }, // تاريخ اليوم
    { wch: 26 }, // اسم الزبون
    { wch: 22 }, // الدين الذي عليه
    { wch: 20 }, // حالة الحساب
    { wch: 20 }, // إجمالي الديون
    { wch: 20 }, // إجمالي التسديدات
    { wch: 18 }, // تاريخ آخر حركة
    { wch: 18 }, // رقم الهاتف
    { wch: 22 }, // العنوان
    { wch: 16 }, // الحد الائتماني
    { wch: 30 }, // الملاحظات
  ];
  // Set sheet direction to RTL
  wsCustomers['!views'] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'سجل ديون الزبائن');

  // ==========================================
  // SHEET 2: سجل الحركات اليومية والتفصيلية
  // ==========================================
  const txHeaders = [
    'ت',
    'تاريخ اليوم',
    'التاريخ والوقت المسجل',
    'اسم الزبون',
    'نوع العملية',
    `المبلغ (${currency})`,
    `الرصيد بعد الحركة (${currency})`,
    'المسؤول / الجلسة',
    'رقم القائمة / الفاتورة',
    'طريقة الدفع',
    'البيان والملاحظات',
  ];

  const txRows: any[][] = [
    [`سجل الحركات التفصيلي - ${settings.storeName || 'سوبرماركت'} - تاريخ اليوم: ${todayArabicDate}`],
    [],
    txHeaders,
  ];

  const sortedTx = [...transactions].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  sortedTx.forEach((t, idx) => {
    const debtor = debtorMap.get(t.debtorId);
    const debtorName = debtor?.name || 'زبون غير محدد';
    const typeLabel = t.type === 'DEBT' ? 'دين جديد' : 'دفعة تسديد';
    const txDate = t.date ? new Date(t.date) : new Date();
    const formattedDateTime = `${txDate.toLocaleDateString('ar-IQ')} ${txDate.toLocaleTimeString('ar-IQ', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    txRows.push([
      idx + 1,
      todayArabicDate,
      formattedDateTime,
      debtorName,
      typeLabel,
      Number(t.amount || 0),
      t.balanceAfter !== undefined ? Number(t.balanceAfter) : '',
      t.sessionName || 'الرئيسي',
      t.invoiceNumber || '-',
      t.paymentMethod || 'نقداً',
      t.notes || t.description || '-',
    ]);
  });

  const wsTx = XLSX.utils.aoa_to_sheet(txRows);
  wsTx['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 35 },
  ];
  wsTx['!views'] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, wsTx, 'سجل الحركات التفصيلي');

  // ==========================================
  // SHEET 3: ملخص المؤشرات المالية
  // ==========================================
  const summaryRows = [
    [`تقرير الموقف المالي العام - ${settings.storeName || 'سوبرماركت'}`],
    ['تاريخ اليوم:', todayFullDateText],
    ['التاريخ الرقمي:', todayArabicDate],
    ['وقت الاستخراج:', timeFormatted],
    ['المسؤول عن الحساب:', settings.ownerName || 'صاحب المحل'],
    ['الرمز الخاص بالحساب:', settings.shopCode || '-'],
    ['العملة:', currency],
    [],
    ['المؤشر المالي', 'القيمة'],
    ['إجمالي الديون المتبقية في السوق (المستحقات)', summary.totalOutstandingDebt],
    ['إجمالي التسديدات المستلمة (المقبوضات)', summary.totalPaymentsReceived],
    ['إجمالي الديون التراكمية المسجلة', summary.totalCumulativeDebt],
    ['عدد الزبائن الكلي', summary.totalDebtorsCount],
    ['عدد الزبائن المدينين حالياً', summary.activeDebtorsCount],
    ['عدد الزبائن الخالصين', summary.settledDebtorsCount],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 28 }];
  wsSummary['!views'] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'المؤشرات المالية');

  // Generate binary ArrayBuffer and safely wrap in Uint8Array Blob
  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const uint8 = new Uint8Array(arrayBuffer);
  return new Blob([uint8], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generates an executive PowerPoint Presentation (.pptx) Blob for debt records
 */
export async function generateDebtPowerPointBlob(
  debtors: Debtor[],
  transactions: Transaction[],
  settings: StoreSettings
): Promise<Blob> {
  const currency = settings.customCurrencyName || settings.currency || 'د.ع';
  const summary = computeFinancialSummary(debtors, transactions);
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.rtlMode = true;

  // Slide 1: Cover Slide (غلاف العرض التقديمي)
  const slide1 = pptx.addSlide();
  slide1.background = { color: '0F172A' }; // Dark Slate

  // Top accent bar
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.25,
    fill: { color: '3B82F6' },
  });

  slide1.addText('سوبرماركت - تقرير الديون المالي', {
    x: 0.8,
    y: 1.5,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: '60A5FA',
    align: 'right',
  });

  slide1.addText(settings.storeName || 'دفتر ديون السوبرماركت', {
    x: 0.8,
    y: 2.2,
    w: 11.7,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    align: 'right',
  });

  slide1.addText('عرض تقديمي تنفيذي شامل للديون والمستحقات والتسديدات المالية', {
    x: 0.8,
    y: 3.5,
    w: 11.7,
    h: 0.6,
    fontSize: 18,
    color: '94A3B8',
    align: 'right',
  });

  // Metadata block at bottom
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 4.8,
    w: 11.73,
    h: 1.6,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });

  slide1.addText(
    `المسؤول: ${settings.ownerName || 'صاحب المحل'}  |  الرمز: ${settings.shopCode || '-'}  |  التاريخ: ${dateStr}\nالعملة المعتمدة: ${currency}  |  إجمالي الديون بالسوق: ${summary.totalOutstandingDebt.toLocaleString()} ${currency}`,
    {
      x: 1.0,
      y: 5.1,
      w: 11.33,
      h: 1.0,
      fontSize: 14,
      color: 'CBD5E1',
      align: 'right',
    }
  );

  // Slide 2: Executive Dashboard KPIs (لوحة المؤشرات المالية الرئيسية)
  const slide2 = pptx.addSlide();
  slide2.background = { color: 'F8FAFC' };

  slide2.addText('لوحة المؤشرات المالية الشاملة للديون', {
    x: 0.8,
    y: 0.5,
    w: 11.7,
    h: 0.7,
    fontSize: 24,
    bold: true,
    color: '0F172A',
    align: 'right',
  });

  slide2.addText(`الموقف المالي الفوري للمتجر كما في ${dateStr}`, {
    x: 0.8,
    y: 1.15,
    w: 11.7,
    h: 0.4,
    fontSize: 13,
    color: '64748B',
    align: 'right',
  });

  // Card 1: Outstanding Debt
  slide2.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.8,
    w: 5.6,
    h: 2.2,
    fill: { color: 'FFF1F2' },
    line: { color: 'F43F5E', width: 2 },
  });
  slide2.addText('إجمالي الديون المتبقية في السوق (المستحقات)', {
    x: 1.0,
    y: 2.0,
    w: 5.2,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: 'BE123C',
    align: 'right',
  });
  slide2.addText(`${summary.totalOutstandingDebt.toLocaleString()} ${currency}`, {
    x: 1.0,
    y: 2.5,
    w: 5.2,
    h: 0.9,
    fontSize: 24,
    bold: true,
    color: '881337',
    align: 'right',
  });
  slide2.addText(`موزعة على ${summary.activeDebtorsCount} زبون مدين`, {
    x: 1.0,
    y: 3.4,
    w: 5.2,
    h: 0.4,
    fontSize: 11,
    color: '9F1239',
    align: 'right',
  });

  // Card 2: Total Payments Received
  slide2.addShape(pptx.ShapeType.rect, {
    x: 6.9,
    y: 1.8,
    w: 5.6,
    h: 2.2,
    fill: { color: 'F0FDF4' },
    line: { color: '10B981', width: 2 },
  });
  slide2.addText('إجمالي التسديدات المستلمة (المقبوضات)', {
    x: 7.1,
    y: 2.0,
    w: 5.2,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: '047857',
    align: 'right',
  });
  slide2.addText(`${summary.totalPaymentsReceived.toLocaleString()} ${currency}`, {
    x: 7.1,
    y: 2.5,
    w: 5.2,
    h: 0.9,
    fontSize: 24,
    bold: true,
    color: '064E3B',
    align: 'right',
  });
  slide2.addText('تم تحصيلها بنجاح وإيداعها في الصندوق', {
    x: 7.1,
    y: 3.4,
    w: 5.2,
    h: 0.4,
    fontSize: 11,
    color: '065F46',
    align: 'right',
  });

  // Card 3: Total Cumulative Debt
  slide2.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 4.4,
    w: 5.6,
    h: 2.2,
    fill: { color: 'EFF6FF' },
    line: { color: '3B82F6', width: 2 },
  });
  slide2.addText('إجمالي الديون التراكمية المسجلة', {
    x: 1.0,
    y: 4.6,
    w: 5.2,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: '1D4ED8',
    align: 'right',
  });
  slide2.addText(`${summary.totalCumulativeDebt.toLocaleString()} ${currency}`, {
    x: 1.0,
    y: 5.1,
    w: 5.2,
    h: 0.9,
    fontSize: 24,
    bold: true,
    color: '1E3A8A',
    align: 'right',
  });
  slide2.addText(`إجمالي المبيعات بالآجل منذ بدء النشاط`, {
    x: 1.0,
    y: 6.0,
    w: 5.2,
    h: 0.4,
    fontSize: 11,
    color: '1E40AF',
    align: 'right',
  });

  // Card 4: Customers & Health
  slide2.addShape(pptx.ShapeType.rect, {
    x: 6.9,
    y: 4.4,
    w: 5.6,
    h: 2.2,
    fill: { color: 'FAF5FF' },
    line: { color: 'A855F7', width: 2 },
  });
  slide2.addText('إجمالي عدد الزبائن المسجلين', {
    x: 7.1,
    y: 4.6,
    w: 5.2,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: '7E22CE',
    align: 'right',
  });
  slide2.addText(`${summary.totalDebtorsCount} زبون`, {
    x: 7.1,
    y: 5.1,
    w: 5.2,
    h: 0.9,
    fontSize: 24,
    bold: true,
    color: '581C87',
    align: 'right',
  });
  const recoveryRate =
    summary.totalCumulativeDebt > 0
      ? Math.round((summary.totalPaymentsReceived / summary.totalCumulativeDebt) * 100)
      : 100;
  slide2.addText(`نسبة التحصيل الإجمالية: ${recoveryRate}%`, {
    x: 7.1,
    y: 6.0,
    w: 5.2,
    h: 0.4,
    fontSize: 11,
    color: '6B21A8',
    align: 'right',
  });

  // Slide 3: Top Debtors Table (أعلى الزبائن متبقي عليهم ديون)
  const slide3 = pptx.addSlide();
  slide3.background = { color: 'FFFFFF' };

  slide3.addText('أعلى الزبائن متبقي عليهم ديون في السجل', {
    x: 0.8,
    y: 0.5,
    w: 11.7,
    h: 0.7,
    fontSize: 24,
    bold: true,
    color: '0F172A',
    align: 'right',
  });

  slide3.addText('الزبائن الأكثر تأثيراً على حجم المستحقات الحالية للمتجر', {
    x: 0.8,
    y: 1.15,
    w: 11.7,
    h: 0.4,
    fontSize: 13,
    color: '64748B',
    align: 'right',
  });

  const tableData: any[][] = [
    [
      { text: 'النسبة من الإجمالي', options: { bold: true, color: 'FFFFFF', fill: '1E293B', align: 'center' } },
      { text: `المتبقي الحالي (${currency})`, options: { bold: true, color: 'FFFFFF', fill: '1E293B', align: 'center' } },
      { text: `إجمالي التسديدات`, options: { bold: true, color: 'FFFFFF', fill: '1E293B', align: 'center' } },
      { text: `إجمالي الديون`, options: { bold: true, color: 'FFFFFF', fill: '1E293B', align: 'center' } },
      { text: 'رقم الهاتف', options: { bold: true, color: 'FFFFFF', fill: '1E293B', align: 'center' } },
      { text: 'اسم الزبون', options: { bold: true, color: 'FFFFFF', fill: '1E293B', align: 'right' } },
      { text: '#', options: { bold: true, color: 'FFFFFF', fill: '1E293B', align: 'center' } },
    ],
  ];

  const topList = summary.topDebtors.slice(0, 7);
  topList.forEach((d, idx) => {
    const ratio =
      summary.totalOutstandingDebt > 0
        ? Math.round((d.balance / summary.totalOutstandingDebt) * 100)
        : 0;
    const isEven = idx % 2 === 0;
    const rowFill = isEven ? 'F8FAFC' : 'FFFFFF';

    tableData.push([
      { text: `${ratio}%`, options: { fill: rowFill, align: 'center', color: '64748B' } },
      { text: `${d.balance.toLocaleString()}`, options: { bold: true, fill: rowFill, align: 'center', color: 'BE123C' } },
      { text: `${d.totalPaid.toLocaleString()}`, options: { fill: rowFill, align: 'center', color: '059669' } },
      { text: `${d.totalDebt.toLocaleString()}`, options: { fill: rowFill, align: 'center', color: '2563EB' } },
      { text: d.phone || '-', options: { fill: rowFill, align: 'center', color: '475569' } },
      { text: d.name, options: { bold: true, fill: rowFill, align: 'right', color: '0F172A' } },
      { text: String(idx + 1), options: { fill: rowFill, align: 'center', color: '64748B' } },
    ]);
  });

  slide3.addTable(tableData, {
    x: 0.8,
    y: 1.8,
    w: 11.73,
    colW: [2.0, 2.3, 2.0, 2.0, 1.8, 3.0, 0.6],
    fontSize: 12,
    border: { pt: 0.5, color: 'E2E8F0' },
  });

  // Slide 4: Recommendations & Closing
  const slide4 = pptx.addSlide();
  slide4.background = { color: '0F172A' };

  slide4.addText('إرشادات وتوصيات إدارة التحصيل', {
    x: 0.8,
    y: 0.8,
    w: 11.7,
    h: 0.8,
    fontSize: 26,
    bold: true,
    color: '60A5FA',
    align: 'right',
  });

  const tips = [
    '• المتابعة الدورية وإرسال رسائل تذكير لطيفة عبر واتساب للزبائن الذين تجاوزت ديونهم السقف المحدد.',
    '• تحديد سقف ائتماني (Credit Limit) لكل زبون لتفادي تراكم مبالغ كبيرة غير مدفوعة.',
    '• استلام دفعات أسبوعية أو شهرية منتظمة عند استلام الرواتب لتقليل الديون المعلقة.',
    '• مراجعة النسخة الاحتياطية اليومية المرسلة عبر تليجرام لحفظ الحقوق وضمان سلامة البيانات.',
  ];

  slide4.addText(tips.join('\n\n'), {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    h: 3.5,
    fontSize: 16,
    color: 'E2E8F0',
    align: 'right',
    lineSpacing: 26,
  });

  // Bottom footer stamp
  slide4.addText(
    `تم تصدير هذا التقرير آلياً عبر تطبيق: ${settings.storeName || 'دفتر ديون السوبرماركت'}  |  ${dateStr}`,
    {
      x: 0.8,
      y: 6.0,
      w: 11.7,
      h: 0.5,
      fontSize: 12,
      color: '64748B',
      align: 'right',
    }
  );

  const pptxBlob = (await pptx.write({ outputType: 'blob' })) as Blob;
  return pptxBlob;
}

/**
 * Triggers a browser download of the Excel backup file (.xlsx)
 */
export async function downloadExcelBackup(
  debtors: Debtor[],
  transactions: Transaction[],
  settings: StoreSettings
): Promise<void> {
  const blob = await generateDebtExcelBlob(debtors, transactions, settings);
  const cleanStoreName = (settings.storeName || 'سوبرماركت').replace(/\s+/g, '_');
  const isoDate = new Date().toISOString().slice(0, 10);
  const fileName = `نسخة_ديون_${cleanStoreName}_${isoDate}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of the PowerPoint presentation backup (.pptx)
 */
export async function downloadPowerPointBackup(
  debtors: Debtor[],
  transactions: Transaction[],
  settings: StoreSettings
): Promise<void> {
  const blob = await generateDebtPowerPointBlob(debtors, transactions, settings);
  const cleanStoreName = (settings.storeName || 'سوبرماركت').replace(/\s+/g, '_');
  const isoDate = new Date().toISOString().slice(0, 10);
  const fileName = `عرض_ديون_${cleanStoreName}_${isoDate}.pptx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
