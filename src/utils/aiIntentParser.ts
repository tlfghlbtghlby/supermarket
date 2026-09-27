import { Debtor, DebtorWithStats, Transaction } from '../types';

export interface ParsedAiIntent {
  reply: string;
  action: {
    type: 'ADD_DEBT' | 'ADD_PAYMENT' | 'ADD_DEBTOR' | 'VIEW_DEBTOR' | 'NAVIGATE';
    debtorId?: string;
    debtorName?: string;
    amount?: number;
    description?: string;
    phone?: string;
    view?: 'DEBTORS' | 'CUSTOMERS' | 'DASHBOARD' | 'SUPPLIERS';
    executed?: boolean;
  } | null;
}

export type AnyDebtor = Debtor | DebtorWithStats | (Debtor & { currentBalance?: number });

export function getDebtorBalance(d: AnyDebtor): number {
  if ('currentBalance' in d && typeof d.currentBalance === 'number') {
    return d.currentBalance;
  }
  return 0;
}

// Convert Arabic digits to standard digits
export function normalizeArabicNumbers(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return res;
}

// Extract numerical amount from text (digits and Arabic words)
export function extractAmount(text: string): number {
  const normalized = normalizeArabicNumbers(text).replace(/,/g, '');

  // Check word-based amounts
  if (normalized.includes('ربع مليون')) return 250000;
  if (normalized.includes('نصف مليون') || normalized.includes('نص مليون')) return 500000;
  if (normalized.includes('مليون')) return 1000000;

  // Pattern for digits followed optionally by ألف or k
  const regexWithMultiplier = /(\d+(?:\.\d+)?)\s*(ألف|الاف|الف|k|K)/i;
  const matchMult = normalized.match(regexWithMultiplier);
  if (matchMult) {
    const val = parseFloat(matchMult[1]);
    return Math.round(val * 1000);
  }

  // Pure digits: e.g. "1000 دينار" or "سجل 1000"
  const digitsMatch = normalized.match(/\b\d+\b/);
  if (digitsMatch) {
    return parseInt(digitsMatch[0], 10);
  }

  // Word-based thousands
  if (normalized.includes('ألفين') || normalized.includes('الفين')) return 2000;
  if (normalized.includes('ثلاثة آلاف') || normalized.includes('تلاث آلاف') || normalized.includes('تلت آلاف')) return 3000;
  if (normalized.includes('أربعة آلاف') || normalized.includes('اربعة الاف')) return 4000;
  if (normalized.includes('خمسة آلاف') || normalized.includes('خمس آلاف') || normalized.includes('خمسة الاف')) return 5000;
  if (normalized.includes('عشرة آلاف') || normalized.includes('عشر آلاف') || normalized.includes('عشرة الاف')) return 10000;
  if (normalized.includes('عشرين ألف') || normalized.includes('عشرين الف')) return 20000;
  if (normalized.includes('ثلاثين ألف') || normalized.includes('تلاثين الف')) return 30000;
  if (normalized.includes('أربعين ألف') || normalized.includes('اربعين الف')) return 40000;
  if (normalized.includes('خمسين ألف') || normalized.includes('خمسين الف')) return 50000;
  if (normalized.includes('مائة ألف') || normalized.includes('مية ألف') || normalized.includes('مية الف')) return 100000;
  if (normalized.includes('ألف') || normalized.includes('الف')) return 1000;

  return 0;
}

// Normalize text for comparison
function cleanText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\s\t\n]+/g, ' ')
    .trim();
}

// Find matching debtor from query
export function findMatchingDebtor(text: string, debtors: AnyDebtor[]): AnyDebtor | null {
  const cleaned = cleanText(text);

  // 1. Exact or substring match of full name
  for (const debtor of debtors) {
    const dClean = cleanText(debtor.name);
    if (dClean && (cleaned.includes(dClean) || dClean.includes(cleaned))) {
      return debtor;
    }
  }

  // 2. Multi-word debtor names: match any significant word
  let bestMatch: AnyDebtor | null = null;
  let maxScore = 0;

  for (const debtor of debtors) {
    const words = cleanText(debtor.name).split(' ').filter((w) => w.length > 2);
    let matchedWords = 0;
    for (const w of words) {
      if (cleaned.includes(w)) {
        matchedWords++;
      }
    }
    if (words.length > 0 && matchedWords > 0) {
      const score = matchedWords / words.length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = debtor;
      }
    }
  }

  if (maxScore >= 0.5) {
    return bestMatch;
  }

  return null;
}

export function parseLocalIntent(
  userText: string,
  debtors: AnyDebtor[],
  currency: string = 'د.ع',
  totalDebt: number = 0,
  _recentTransactions: Transaction[] = []
): ParsedAiIntent {
  const text = userText.trim();
  const cleaned = cleanText(text);

  // 1. Check for Add Debt: "سجل 1000 دينار على حجي هادي" or "دين على فلان"
  const isDebtIntent =
    cleaned.includes('سجل') ||
    cleaned.includes('دين') ||
    cleaned.includes('اطلب') ||
    cleaned.includes('اخذ مواد') ||
    cleaned.includes('اضف دين');

  const isPaymentIntent =
    cleaned.includes('سدد') ||
    cleaned.includes('تسديد') ||
    cleaned.includes('دفع') ||
    cleaned.includes('قبض') ||
    cleaned.includes('واصل') ||
    cleaned.includes('استلمت');

  const isSummaryIntent =
    cleaned.includes('مجموع') ||
    cleaned.includes('اجمالي') ||
    cleaned.includes('كل الديون') ||
    cleaned.includes('احصائيات') ||
    cleaned.includes('ارباح') ||
    cleaned.includes('حسابات المحل');

  const isTopDebtorsIntent =
    cleaned.includes('اكثر') ||
    cleaned.includes('اكبر دين') ||
    cleaned.includes('منو عليه') ||
    cleaned.includes('اعلى ديون');

  const isAddDebtorIntent =
    (cleaned.includes('اضف') || cleaned.includes('ضيف') || cleaned.includes('جديد')) &&
    (cleaned.includes('زبون') || cleaned.includes('عميل'));

  const isCheckDebtorBalance =
    cleaned.includes('كم حساب') ||
    cleaned.includes('شكد حساب') ||
    cleaned.includes('رصيد') ||
    cleaned.includes('كشف حساب') ||
    cleaned.includes('شكد يطلب') ||
    cleaned.includes('شكد عليه');

  const isNavigationIntent =
    cleaned.includes('افتح الزبائن') ||
    cleaned.includes('واجهة الزبائن') ||
    cleaned.includes('الموردين') ||
    cleaned.includes('الاحصائيات');

  // Handle Debt Action
  if (isDebtIntent && !isPaymentIntent) {
    const amount = extractAmount(text);
    const debtor = findMatchingDebtor(text, debtors);

    if (debtor && amount > 0) {
      const formattedAmount = amount.toLocaleString('ar-IQ');
      return {
        reply: `تم التعرف على طلب تسجيل دين بقيمة ${formattedAmount} ${currency} على الزبون "${debtor.name}". اضغط على الزر أدناه لتأكيد الحركة وحفظها في السجل ورصيد الزبون.`,
        action: {
          type: 'ADD_DEBT',
          debtorId: debtor.id,
          debtorName: debtor.name,
          amount,
          description: 'تسجيل دين عبر مساعد Gemini',
        },
      };
    } else if (amount > 0 && !debtor) {
      // Try to extract name after "على" or "لـ"
      const nameMatch = text.match(/(?:على|لـ|للزبون|ل)\s+([^\d\n\r,]+)/);
      const extractedName = nameMatch ? nameMatch[1].replace(/دينار|د\.ع|الف/g, '').trim() : '';

      return {
        reply: `تم تحديد مبلغ ${amount.toLocaleString('ar-IQ')} ${currency}${extractedName ? ` على "${extractedName}"` : ''}. يرجى اختيار الزبون أو تأكيد اسمه لإتمام التسجيل.`,
        action: {
          type: 'ADD_DEBT',
          debtorName: extractedName || 'زبون',
          amount,
          description: 'تسجيل دين عبر مساعد Gemini',
        },
      };
    }
  }

  // Handle Payment Action
  if (isPaymentIntent) {
    const amount = extractAmount(text);
    const debtor = findMatchingDebtor(text, debtors);

    if (debtor && amount > 0) {
      const formattedAmount = amount.toLocaleString('ar-IQ');
      return {
        reply: `تم التعرف على طلب تسديد دفعة بقيمة ${formattedAmount} ${currency} من حساب الزبون "${debtor.name}". اضغط أدناه لتأكيد التسديد وتخفيض الدين فورياً.`,
        action: {
          type: 'ADD_PAYMENT',
          debtorId: debtor.id,
          debtorName: debtor.name,
          amount,
          description: 'تسديد دفعة عبر مساعد Gemini',
        },
      };
    } else if (amount > 0) {
      return {
        reply: `تم تحديد دفعة تسديد بقيمة ${amount.toLocaleString('ar-IQ')} ${currency}. حدد الزبون لتسجيل الدفعة لحسابه.`,
        action: {
          type: 'ADD_PAYMENT',
          amount,
          description: 'تسديد دفعة عبر مساعد Gemini',
        },
      };
    }
  }

  // Check specific Debtor balance
  if (isCheckDebtorBalance) {
    const debtor = findMatchingDebtor(text, debtors);
    if (debtor) {
      const bal = getDebtorBalance(debtor).toLocaleString('ar-IQ');
      return {
        reply: `رصيد الزبون "${debtor.name}" الحالي هو ${bal} ${currency}. ${debtor.phone ? `رقم الهاتف: ${debtor.phone}.` : ''} يمكنك عرض كشف حسابه بالكامل أدناه.`,
        action: {
          type: 'VIEW_DEBTOR',
          debtorId: debtor.id,
          debtorName: debtor.name,
        },
      };
    }
  }

  // Add Debtor
  if (isAddDebtorIntent) {
    const nameMatch = text.match(/(?:اسمه|اسم|زبون)\s+([^0-9\n\r]+)/);
    const name = nameMatch ? nameMatch[1].trim() : '';
    const phoneMatch = text.match(/07\d{9}/);
    const phone = phoneMatch ? phoneMatch[0] : '';

    if (name) {
      return {
        reply: `تم تجهيز إضافة الزبون الجديد "${name}"${phone ? ` برقم ${phone}` : ''}. اضغط أدناه لإضافته فورياً إلى الدفتر.`,
        action: {
          type: 'ADD_DEBTOR',
          debtorName: name,
          phone,
        },
      };
    }
  }

  // Summary Intent
  if (isSummaryIntent) {
    const activeDebtorsCount = debtors.filter((d) => getDebtorBalance(d) > 0).length;
    return {
      reply: `📊 ملخص ديون المحل:\n• إجمالي الديون المطلوبة: ${totalDebt.toLocaleString('ar-IQ')} ${currency}\n• عدد الزبائن الكلي: ${debtors.length} زبون\n• الزبائن الذين عليهم ديون حالياً: ${activeDebtorsCount} زبون.`,
      action: null,
    };
  }

  // Top Debtors
  if (isTopDebtorsIntent) {
    const top = [...debtors]
      .filter((d) => getDebtorBalance(d) > 0)
      .sort((a, b) => getDebtorBalance(b) - getDebtorBalance(a))
      .slice(0, 5);

    if (top.length === 0) {
      return {
        reply: `الحمد لله، لا توجد ديون مسجلة حالياً على أي زبون!`,
        action: null,
      };
    }

    const lines = top.map((d, i) => `${i + 1}. ${d.name}: ${getDebtorBalance(d).toLocaleString('ar-IQ')} ${currency}`).join('\n');
    return {
      reply: `أكثر الزبائن ديوناً حالياً:\n${lines}`,
      action: null,
    };
  }

  // Navigation
  if (isNavigationIntent) {
    if (cleaned.includes('زبائن')) {
      return {
        reply: `تم فتح واجهة كشف الزبائن.`,
        action: { type: 'NAVIGATE', view: 'CUSTOMERS' },
      };
    }
    if (cleaned.includes('موردين')) {
      return {
        reply: `تم فتح واجهة الموردين.`,
        action: { type: 'NAVIGATE', view: 'SUPPLIERS' },
      };
    }
  }

  // General fallback
  return {
    reply: `أهلاً بك! أنا مساعد Gemini الذكي لمحلكم.\nإجمالي ديون المحل المسجلة: ${totalDebt.toLocaleString('ar-IQ')} ${currency}.\nيمكنك سؤالي صوتياً أو كتابياً مثل:\n• "سجل 1000 دينار على حجي هادي"\n• "كم حساب فلان؟"\n• "سدد 10 آلاف من حساب محمد"\n• "كم مجموع الديون؟"`,
    action: null,
  };
}
