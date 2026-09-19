import { Debtor, Transaction, StoreSettings, Supplier, SupplierTransaction } from '../types';

export const initialSettings: StoreSettings = {
  storeName: 'دفتر ديون السوبرماركت',
  ownerName: '',
  phone: '',
  address: '',
  currency: 'دينار عراقي',
  customCurrencyName: 'د.ع',
  customWhatsAppMessage: 'السلام عليكم ورحمة الله وبركاته، الأخ العزيز {NAME}، نود تذكيركم بلطف بأن رصيد حسابكم المتبقي لدى {STORE} هو {AMOUNT} {CURRENCY}. نرحب بكم في أي وقت شاكرين حسن تعاملكم.',
  enableWhatsAppAlerts: true,
  storeWhatsAppPhone: '',
  themeMode: 'dark',
  strictCreditLimit: false,
};

export const initialSuppliers: Supplier[] = [];

export const initialSupplierTransactions: SupplierTransaction[] = [];

export const initialDebtors: Debtor[] = [];

export const initialTransactions: Transaction[] = [];

