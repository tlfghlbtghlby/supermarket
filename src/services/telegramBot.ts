import { Debtor, Transaction, StoreSettings, DebtorWithStats } from '../types';
import { cleanAccountCode, isAccountCodeMatch } from '../utils/accountCode';

export const DEFAULT_TELEGRAM_BOT_TOKEN = '8804502479:AAEpAGxY53toTCSoIKiMdMs9yGR8arahR-Q';
export const DEFAULT_TELEGRAM_BOT_USERNAME = 'deptstbot';

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export interface LinkTelegramResult {
  success: boolean;
  chatId?: string;
  ownerName?: string;
  username?: string;
  message?: string;
}

/**
 * Get bot info to verify token validity
 */
export async function getTelegramBotInfo(token: string = DEFAULT_TELEGRAM_BOT_TOKEN): Promise<TelegramBotInfo | null> {
  try {
    const cleanToken = token.trim();
    if (!cleanToken) return null;
    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await response.json();
    if (data.ok && data.result) {
      return data.result as TelegramBotInfo;
    }
    return null;
  } catch (error) {
    console.error('Error fetching Telegram bot info:', error);
    return null;
  }
}

/**
 * Send an HTML or plain text message to a specific Telegram chat
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  token: string = DEFAULT_TELEGRAM_BOT_TOKEN,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanToken = token.trim() || DEFAULT_TELEGRAM_BOT_TOKEN;
    const cleanChatId = String(chatId).trim();

    if (!cleanChatId) {
      return { success: false, error: 'معرف المحادثة (Chat ID) غير متوفر' };
    }

    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: parseMode,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description || 'فشل إرسال الرسالة عبر تليجرام' };
    }
  } catch (error: any) {
    console.error('Telegram sendMessage error:', error);
    return { success: false, error: error?.message || 'خطأ أثناء الاتصال بخادم تليجرام' };
  }
}

/**
 * Send a document/file attachment (e.g. daily debts backup) to Telegram chat
 */
export async function sendTelegramDocument(
  chatId: string | number,
  fileContent: string,
  fileName: string,
  caption: string,
  token: string = DEFAULT_TELEGRAM_BOT_TOKEN
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanToken = token.trim() || DEFAULT_TELEGRAM_BOT_TOKEN;
    const cleanChatId = String(chatId).trim();

    if (!cleanChatId) {
      return { success: false, error: 'معرف المحادثة (Chat ID) غير متوفر' };
    }

    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
    formData.append('document', blob, fileName);

    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description || 'فشل رفع الملف عبر تليجرام' };
    }
  } catch (error: any) {
    console.error('Telegram sendDocument error:', error);
    return { success: false, error: error?.message || 'خطأ أثناء رفع الملف إلى تليجرام' };
  }
}

/**
 * Checks for messages sent to the bot matching the store's code (e.g. G781011)
 * When found, links the chat, sends a welcome greeting, and returns the chat ID!
 */
export async function checkAndLinkTelegramOwner(
  shopCode: string,
  storeName: string,
  token: string = DEFAULT_TELEGRAM_BOT_TOKEN
): Promise<LinkTelegramResult> {
  try {
    const cleanToken = token.trim() || DEFAULT_TELEGRAM_BOT_TOKEN;
    const cleanCode = cleanAccountCode(shopCode);

    if (!cleanCode) {
      return { success: false, message: 'رمز الحساب الخاص بك غير محدد' };
    }

    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates?limit=50`);
    const data = await response.json();

    if (!data.ok || !Array.isArray(data.result)) {
      return { success: false, message: data.description || 'تعذر جلب التحديثات من بوت تليجرام' };
    }

    // Find the latest message that matches this specific user's unique account code
    const updates = data.result.slice().reverse();

    for (const update of updates) {
      const msg = update.message;
      if (!msg || !msg.chat) continue;

      const rawText = msg.text || '';
      const isCodeMatch = isAccountCodeMatch(rawText, cleanCode);

      if (isCodeMatch) {
        const chatId = String(msg.chat.id);
        const ownerName = msg.from?.first_name
          ? `${msg.from.first_name}${msg.from.last_name ? ' ' + msg.from.last_name : ''}`
          : msg.chat.title || 'صاحب الحساب';
        const username = msg.from?.username || '';

        // Send a celebratory confirmation message back to the owner on Telegram
        const welcomeText = `
🎉 <b>تم بنجاح ربط البوت بحسابك الخاص!</b>

🏪 <b>المتجر:</b> ${storeName}
🔑 <b>الرمز الخاص بحسابك:</b> <code>${cleanCode}</code>
👤 <b>حساب تليجرام:</b> ${ownerName} ${username ? '(@' + username + ')' : ''}

📌 <b>الإشعارات المفعلة لهذا الحساب:</b>
1️⃣ <b>إشعار فوري:</b> عند تسجيل أي حركة دين أو استلام دفعة من زبائن هذا الحساب.
2️⃣ <b>تقرير ونسخة يومية:</b> إرسال تقرير مالي ونسخة احتياطية للديون يومياً الساعة 12:00 صباحاً.

<i>تم ربط هذا الرمز الخاص بحسابك بنجاح.</i>
        `.trim();

        await sendTelegramMessage(chatId, welcomeText, cleanToken);

        return {
          success: true,
          chatId,
          ownerName,
          username,
          message: `تم العثور على محادثة [${ownerName}] وربط الرمز الخاص بحسابك [${cleanCode}] بنجاح!`,
        };
      }
    }

    return {
      success: false,
      message: `لم يتم العثور على رسالة بالرمز الخاص بك [${cleanCode}]. يرجى فتح البوت @${DEFAULT_TELEGRAM_BOT_USERNAME} وإرسال رمز حسابك "${cleanCode}" ثم المحاولة مجدداً.`,
    };
  } catch (error: any) {
    console.error('Error linking Telegram owner:', error);
    return {
      success: false,
      message: error?.message || 'تعذر الاتصال بخوادم تليجرام، تأكد من اتصال الإنترنت.',
    };
  }
}

/**
 * Send an immediate alert on every new debt or payment transaction
 */
export async function sendTelegramDebtAlert(
  transaction: Transaction,
  debtor: Debtor | DebtorWithStats,
  settings: StoreSettings
): Promise<{ success: boolean; error?: string }> {
  const token = settings.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN;
  const chatId = settings.telegramChatId;

  if (!chatId || !settings.enableTelegramAlerts) {
    return { success: false, error: 'تنبيهات تليجرام غير مفعلة أو معرف المحادثة غير مربوط' };
  }

  const isDebt = transaction.type === 'DEBT';
  const currency = settings.customCurrencyName || settings.currency || 'د.ع';
  const typeLabel = isDebt ? '🔴 تسجيل دين جديد' : '🟢 تسديد دفعة نقدية';
  const actionEmoji = isDebt ? '🛒' : '💵';

  const txDate = transaction.date ? new Date(transaction.date) : new Date();
  const formattedTime = txDate.toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDate = txDate.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const balanceText =
    transaction.balanceAfter !== undefined
      ? `${Number(transaction.balanceAfter).toLocaleString()} ${currency}`
      : 'محسوب في السجل';

  const message = `
🔔 <b>إشعار حركة دين - ${settings.storeName || 'سوبرماركت'}</b>

${actionEmoji} <b>نوع العملية:</b> ${typeLabel}
👤 <b>الزبون:</b> <b>${debtor.name}</b>
${debtor.phone ? `📞 <b>الهاتف:</b> <code>${debtor.phone}</code>\n` : ''}💰 <b>المبلغ:</b> <b><code>${Number(transaction.amount).toLocaleString()} ${currency}</code></b>
💳 <b>رصيد الزبون الحالي:</b> <b><code>${balanceText}</code></b>
${transaction.notes ? `📝 <b>البيان / الملاحظات:</b> ${transaction.notes}\n` : ''}${transaction.invoiceNumber ? `🧾 <b>رقم الفاتورة:</b> <code>${transaction.invoiceNumber}</code>\n` : ''}⏰ <b>الوقت:</b> ${formattedTime} | ${formattedDate}

<i>دفتر ديون السوبرماركت</i>
  `.trim();

  return await sendTelegramMessage(chatId, message, token);
}

/**
 * Prepares and sends the daily 12:00 AM (midnight) debts summary & backup document
 */
export async function sendTelegramDailyBackupReport(
  debtors: Debtor[],
  transactions: Transaction[],
  settings: StoreSettings
): Promise<{ success: boolean; error?: string }> {
  const token = settings.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN;
  const chatId = settings.telegramChatId;

  if (!chatId) {
    return { success: false, error: 'معرف المحادثة (Chat ID) غير مربوط بحساب صاحب المحل' };
  }

  const currency = settings.customCurrencyName || settings.currency || 'د.ع';
  const today = new Date();
  const dateStr = today.toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = today.toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate totals
  let totalAllDebt = 0;
  let totalAllPaid = 0;
  const debtorBalances: { name: string; phone?: string; balance: number }[] = [];

  for (const debtor of debtors) {
    const dTx = transactions.filter((t) => t.debtorId === debtor.id);
    const dDebt = dTx.filter((t) => t.type === 'DEBT').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const dPaid = dTx.filter((t) => t.type === 'PAYMENT').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const balance = dDebt - dPaid;
    totalAllDebt += dDebt;
    totalAllPaid += dPaid;
    if (balance > 0) {
      debtorBalances.push({ name: debtor.name, phone: debtor.phone, balance });
    }
  }

  const netBalance = totalAllDebt - totalAllPaid;
  debtorBalances.sort((a, b) => b.balance - a.balance);
  const topDebtors = debtorBalances.slice(0, 5);

  let topDebtorsText = '';
  if (topDebtors.length > 0) {
    topDebtorsText = `\n\n<b>🔝 أعلى 5 زبائن متبقي عليهم ديون:</b>\n` +
      topDebtors
        .map(
          (d, idx) =>
            `${idx + 1}. <b>${d.name}</b>: <code>${d.balance.toLocaleString()} ${currency}</code>`
        )
        .join('\n');
  }

  const summaryMessage = `
🌙 <b>التقرير اليومي والنسخة المحفوظة للديون (الساعة 12:00)</b>
🏪 <b>المتجر:</b> ${settings.storeName}
📅 <b>التاريخ:</b> ${dateStr} - ${timeStr}

📊 <b>الملخص المالي الشامل:</b>
• 👥 <b>إجمالي عدد الزبائن المدينين:</b> ${debtorBalances.length} زبون
• 💰 <b>إجمالي الديون المتبقية في السوق:</b> <b><code>${netBalance.toLocaleString()} ${currency}</code></b>
• 📈 <b>إجمالي الديون التراكمية:</b> <code>${totalAllDebt.toLocaleString()} ${currency}</code>
• 💵 <b>إجمالي التسديدات المستلمة:</b> <code>${totalAllPaid.toLocaleString()} ${currency}</code>${topDebtorsText}

📁 <i>تم إرفاق نسخة احتياطية كاملة ومحدثة من سجل الديون والزبائن أدناه لضمان حفظ بياناتك بشكل آمن دائماً.</i>
  `.trim();

  // Send summary text message first
  await sendTelegramMessage(chatId, summaryMessage, token);

  // Prepare backup JSON document payload
  const backupPayload = {
    app: 'Supermarket Debt Ledger',
    storeName: settings.storeName,
    shopCode: settings.shopCode || 'G781011',
    ownerName: settings.ownerName,
    exportedAt: new Date().toISOString(),
    currency,
    financialSummary: {
      totalOutstandingDebt: netBalance,
      totalCumulativeDebt: totalAllDebt,
      totalPaymentsReceived: totalAllPaid,
      activeDebtorsCount: debtorBalances.length,
    },
    debtors,
    transactions,
  };

  const fileContent = JSON.stringify(backupPayload, null, 2);
  const isoDate = new Date().toISOString().slice(0, 10);
  const fileName = `نسخة_ديون_${settings.storeName.replace(/\s+/g, '_')}_${isoDate}.json`;
  const docCaption = `📦 <b>نسخة احتياطية كاملة لسجل الديون</b> - ${settings.storeName} (${isoDate})`;

  return await sendTelegramDocument(chatId, fileContent, fileName, docCaption, token);
}
