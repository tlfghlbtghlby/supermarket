import { Debtor, Transaction, StoreSettings, Supplier, SupplierTransaction } from '../types';
import { generateUniqueAccountCode } from '../utils/accountCode';

export const initialSettings: StoreSettings = {
  storeName: 'دفتر ديون السوبرماركت',
  ownerName: 'صاحب المحل',
  ownerEmail: 'example@gmail.com',
  ownerPasswordCode: '123123',
  shopCode: generateUniqueAccountCode(),
  phone: '07854668977',
  address: '',
  currency: 'دينار عراقي',
  customCurrencyName: 'د.ع',
  customWhatsAppMessage: 'السلام عليكم ورحمة الله وبركاته، الأخ العزيز {NAME}، نود تذكيركم بلطف بأن رصيد حسابكم المتبقي لدى {STORE} هو {AMOUNT} {CURRENCY}. نرحب بكم في أي وقت شاكرين حسن تعاملكم.',
  enableWhatsAppAlerts: true,
  storeWhatsAppPhone: '',
  themeMode: 'dark',
  strictCreditLimit: false,
  telegramBotToken: '8804502479:AAEpAGxY53toTCSoIKiMdMs9yGR8arahR-Q',
  telegramBotUsername: 'deptstbot',
  telegramChatId: '',
  telegramOwnerName: '',
  enableTelegramAlerts: true,
  enableDailyMidnightReport: true,
};

export const initialSuppliers: Supplier[] = [];

export const initialSupplierTransactions: SupplierTransaction[] = [];

export const initialDebtors: Debtor[] = [];

export const initialTransactions: Transaction[] = [];

