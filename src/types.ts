export type TransactionType = 'DEBT' | 'PAYMENT';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';

export interface Transaction {
  id: string;
  debtorId: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO format
  description: string; // items purchased or payment notes
  paymentMethod?: PaymentMethod;
  invoiceNumber?: string;
  notes?: string;
  balanceAfter?: number;
  previousBalance?: number;
  groupName?: string;
}

export interface Debtor {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  creditLimit?: number; // Maximum debt allowed
  createdAt: string;
}

export interface DebtorWithStats extends Debtor {
  totalDebt: number;
  totalPaid: number;
  currentBalance: number; // totalDebt - totalPaid
  lastTransactionDate?: string;
  transactionsCount: number;
  isOverLimit: boolean;
}

// Wholesale Suppliers / Sales Reps (مندوبي المبيعات والموردين)
export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  category?: string; // مثلاً: مواد غذائية، ألبان، منظفات، مشروبات
  notes?: string;
  creditLimit?: number;
  createdAt: string;
}

export type SupplierTransactionType = 'SUPPLY_BILL' | 'SUPPLY_PAYMENT'; // فاتورة توريد (دين على المحل) | تسديد دفعة للمندوب

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: SupplierTransactionType;
  amount: number;
  date: string;
  description: string;
  invoiceNumber?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  balanceAfter?: number;
}

export interface SupplierWithStats extends Supplier {
  totalSupply: number; // إجمالي التوريدات (دين على المحل)
  totalPaid: number;   // ما سدده المحل للمندوب
  currentBalance: number; // الرصيد المتبقي للمندوب في ذمة المحل
  lastTransactionDate?: string;
  transactionsCount: number;
}

export interface StoreSettings {
  storeName: string;
  ownerName: string;
  ownerEmail?: string; // بريد صاحب المحل (مثال: example@gmail.com)
  ownerPasswordCode?: string; // رمز كلمة المرور (الرمز: 123123)
  shopCode?: string; // رمز صاحب المحل / كود المتجر (رمزه هو: G781011)
  phone: string;
  address: string;
  currency: string;
  customCurrencyName: string;
  customWhatsAppMessage: string;
  enableWhatsAppAlerts: boolean; // إرسال إشعار تلقائي بالدين
  storeWhatsAppPhone?: string; // رقم هاتف المحل للواتساب
  themeMode?: 'dark' | 'light' | 'system';
  strictCreditLimit?: boolean; // منع تجاوز سقف الدين
  // إعدادات بوت واتساب التلقائي (Meta WhatsApp Cloud API)
  metaWhatsAppEnabled?: boolean;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaBusinessAccountId?: string;
  // إعدادات وتكامل بوت تليجرام (Telegram Bot)
  telegramBotToken?: string; // توكن البوت: 8804502479:AAEpAGxY53toTCSoIKiMdMs9yGR8arahR-Q
  telegramBotUsername?: string; // يوزرنيم البوت: deptstbot
  telegramChatId?: string; // معرف محادثة تليجرام لصاحب المحل
  telegramOwnerName?: string; // اسم صاحب المحل على تليجرام
  enableTelegramAlerts?: boolean; // إرسال إشعار فوري بكل حركة دين
  enableDailyMidnightReport?: boolean; // رفع وإرسال نسخة من الدين يومياً الساعة 12:00 صباحاً
  lastDailyMidnightReportDate?: string; // تاريخ آخر تقرير يومي
}

export interface AppUser {
  id: string;
  phone: string;
  name: string;
  email?: string;
  shopCode?: string;
  passwordCode?: string;
  role?: string;
  storeName?: string;
  isLoggedIn: boolean;
}

export type DebtorFilter = 'ALL' | 'ACTIVE_DEBT' | 'SETTLED' | 'OVER_LIMIT';
export type DebtorSort = 'HIGHEST_DEBT' | 'LOWEST_DEBT' | 'NEWEST_ACTIVITY' | 'NAME_ASC';

