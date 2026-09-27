import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions for parsing Arabic accounting intents
function normalizeArabicNumbers(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return res;
}

function extractAmount(text: string): number {
  const normalized = normalizeArabicNumbers(text).replace(/,/g, '');

  if (normalized.includes('ربع مليون')) return 250000;
  if (normalized.includes('نصف مليون') || normalized.includes('نص مليون')) return 500000;
  if (normalized.includes('مليون')) return 1000000;

  const regexWithMultiplier = /(\d+(?:\.\d+)?)\s*(ألف|الاف|الف|k|K)/i;
  const matchMult = normalized.match(regexWithMultiplier);
  if (matchMult) {
    const val = parseFloat(matchMult[1]);
    return Math.round(val * 1000);
  }

  const digitsMatch = normalized.match(/\b\d+\b/);
  if (digitsMatch) {
    return parseInt(digitsMatch[0], 10);
  }

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

function cleanText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\s\t\n]+/g, ' ')
    .trim();
}

function findMatchingDebtor(text: string, debtors: any[]): any | null {
  const cleaned = cleanText(text);

  for (const debtor of debtors) {
    const dClean = cleanText(debtor.name || '');
    if (dClean && (cleaned.includes(dClean) || dClean.includes(cleaned))) {
      return debtor;
    }
  }

  let bestMatch: any | null = null;
  let maxScore = 0;

  for (const debtor of debtors) {
    const words = cleanText(debtor.name || '').split(' ').filter((w) => w.length > 2);
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

function parseLocalIntent(
  userText: string,
  debtors: any[],
  currency: string = 'د.ع',
  totalDebt: number = 0,
  _recentTransactions: any[] = []
) {
  const text = userText.trim();
  const cleaned = cleanText(text);

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

  if (isCheckDebtorBalance) {
    const debtor = findMatchingDebtor(text, debtors);
    if (debtor) {
      const bal = Number(debtor.currentBalance || 0).toLocaleString('ar-IQ');
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

  if (isSummaryIntent) {
    const activeDebtorsCount = debtors.filter((d: any) => Number(d.currentBalance || 0) > 0).length;
    return {
      reply: `📊 ملخص ديون المحل:\n• إجمالي الديون المطلوبة: ${totalDebt.toLocaleString('ar-IQ')} ${currency}\n• عدد الزبائن الكلي: ${debtors.length} زبون\n• الزبائن الذين عليهم ديون حالياً: ${activeDebtorsCount} زبون.`,
      action: null,
    };
  }

  if (isTopDebtorsIntent) {
    const top = [...debtors]
      .filter((d: any) => Number(d.currentBalance || 0) > 0)
      .sort((a: any, b: any) => Number(b.currentBalance || 0) - Number(a.currentBalance || 0))
      .slice(0, 5);

    if (top.length === 0) {
      return {
        reply: `الحمد لله، لا توجد ديون مسجلة حالياً على أي زبون!`,
        action: null,
      };
    }

    const lines = top.map((d: any, i: number) => `${i + 1}. ${d.name}: ${Number(d.currentBalance || 0).toLocaleString('ar-IQ')} ${currency}`).join('\n');
    return {
      reply: `أكثر الزبائن ديوناً حالياً:\n${lines}`,
      action: null,
    };
  }

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

  return {
    reply: `أهلاً بك! أنا مساعد Gemini الذكي لمحلكم.\nإجمالي ديون المحل المسجلة: ${totalDebt.toLocaleString('ar-IQ')} ${currency}.\nيمكنك سؤالي صوتياً أو كتابياً مثل:\n• "سجل 1000 دينار على حجي هادي"\n• "كم حساب فلان؟"\n• "سدد 10 آلاف من حساب محمد"\n• "كم مجموع الديون؟"`,
    action: null,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Gemini Assistant endpoint
  app.post('/api/gemini/assistant', async (req, res) => {
    const { message, debtors = [], totalDebt = 0, storeName = 'السوبرماركت', currency = 'د.ع', recentTransactions = [], sessionName = 'الجلسة 1' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!ai) {
      const parsed = parseLocalIntent(message, debtors, currency, totalDebt, recentTransactions);
      res.json(parsed);
      return;
    }

    try {
      const systemInstruction = `
أنت "مساعد Gemini الذكي"، المساعد المحاسبي الذكي المتكامل داخل تطبيق دفتر ديون السوبرماركت والمحل (${storeName}).
الجلسة الحالية: ${sessionName}.
العملة المستخدمة: ${currency}.
إجمالي الديون الحالية المسجلة: ${totalDebt} ${currency}.
عدد الزبائن: ${debtors.length}.

قائمة الزبائن وحساباتهم الحالية:
${JSON.stringify(debtors.slice(0, 50).map((d: any) => ({ id: d.id, name: d.name, balance: d.currentBalance, phone: d.phone })))}

آخر الحركات:
${JSON.stringify(recentTransactions.slice(0, 10).map((t: any) => ({ type: t.type, amount: t.amount, debtorName: t.debtorName, description: t.description, date: t.date })))}

دورك ومهامك:
1. الإجابة بذكاء ودقة واحترافية وبلهجة عراقية أو عربية ودودة ومباشرة عن أي استفسار مالي أو تفاصيل حسابات الزبائن والديون والمدفوعات.
2. تنفيذ الأوامر داخل البرنامج عند طلب المستخدم ذلك:
   - إضافة دين: إذا طلب المستخدم تسجيل دين، مثل: "سجل 1000 دينار على حجي هادي" أو "سجل دين على أحمد 15000".
   - تسديد دفعة: إذا طلب تسديد أو قبض، مثل: "سدد 5000 من حساب محمد".
   - إضافة زبون جديد: مثل: "أضف زبون جديد اسمه كمال".
   - الاستعلام والبحث: كشف حساب زبون معين، أو إعطاء ملخص مالي كامل.
3. الرد بصيغة JSON حصراً بالشكل التالي:
{
  "reply": "الرسالة النصية التي ستقرأها وتجيب بها المستخدم بوضوح وبلهجة محترمة ومفيدة",
  "action": null أو كائن يحتوي على الأمر المطلوب تنفيذه:
    - في حال إضافة دين:
      {"type": "ADD_DEBT", "debtorId": "معرف الزبون إن وجد", "debtorName": "اسم الزبون", "amount": 1000, "description": "تسجيل دين عبر مساعد Gemini"}
    - في حال تسديد دفعة:
      {"type": "ADD_PAYMENT", "debtorId": "معرف الزبون إن وجد", "debtorName": "اسم الزبون", "amount": 5000, "description": "تسديد دفعة عبر مساعد Gemini"}
    - في حال إضافة زبون:
      {"type": "ADD_DEBTOR", "name": "اسم الزبون", "phone": "رقم الهاتف إن وجد"}
    - في حال فتح كشف حساب:
      {"type": "VIEW_DEBTOR", "debtorId": "معرف الزبون", "debtorName": "اسم الزبون"}
    - في حال التنقل في التطبيق:
      {"type": "NAVIGATE", "view": "CUSTOMERS" أو "DEBTORS" أو "DASHBOARD"}
}
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: message }] },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch {
        const fallback = parseLocalIntent(message, debtors, currency, totalDebt, recentTransactions);
        res.json({
          reply: responseText || fallback.reply,
          action: fallback.action,
        });
      }
    } catch (error: any) {
      console.warn('Gemini Assistant API notice, using local intent parser:', error?.message);
      const fallback = parseLocalIntent(message, debtors, currency, totalDebt, recentTransactions);
      res.json(fallback);
    }
  });

  // Serve static files in production or Vite in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
