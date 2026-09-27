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

  // Millions & quarters of millions
  if (normalized.includes('ربع مليون')) return 250000;
  if (normalized.includes('نصف مليون') || normalized.includes('نص مليون')) return 500000;
  if (normalized.includes('مليون')) return 1000000;

  // Iraqi common currency terms
  if (normalized.includes('ورقة') || normalized.includes('ورقه')) return 150000;
  if (normalized.includes('شدة') || normalized.includes('شده')) return 1500000;

  // Fractions in IQD
  if (normalized.includes('ألفين ونص') || normalized.includes('الفين ونص')) return 2500;
  if (normalized.includes('ألف ونص') || normalized.includes('الف ونص')) return 1500;
  if (normalized.includes('ألف وربع') || normalized.includes('الف وربع') || normalized.includes('الف وميتين وخمسين')) return 1250;
  if (normalized.includes('تلت ارباع') || normalized.includes('ثلاث ارباع') || normalized.includes('سبعمية وخمسين')) return 750;
  if (normalized.includes('نص دينار') || normalized.includes('خمسمية') || normalized.includes('خمسمائة') || normalized.includes('نص الف')) return 500;
  if (normalized.includes('ربع دينار') || normalized.includes('ميتين وخمسين') || (normalized.includes('ربع') && !normalized.includes('مليون') && !normalized.includes('اربع'))) return 250;

  // Iraqi colloquial compounded thousands
  if (normalized.includes('عشرين ألف') || normalized.includes('عشرين الف') || normalized.includes('عشرينالف')) return 20000;
  if (normalized.includes('خمسة وعشرين ألف') || normalized.includes('خمسه وعشرين الف') || normalized.includes('خمسة وعشرينالف')) return 25000;
  if (normalized.includes('ثلاثين ألف') || normalized.includes('تلاثين الف') || normalized.includes('تلاثينالف')) return 30000;
  if (normalized.includes('أربعين ألف') || normalized.includes('اربعين الف') || normalized.includes('اربعينالف')) return 40000;
  if (normalized.includes('خمسين ألف') || normalized.includes('خمسين الف') || normalized.includes('خمسينالف')) return 50000;
  if (normalized.includes('خمسة وسبعين ألف') || normalized.includes('خمسه وسبعين الف')) return 75000;
  if (normalized.includes('مائة ألف') || normalized.includes('مية ألف') || normalized.includes('مية الف') || normalized.includes('ميت الف')) return 100000;
  if (normalized.includes('مية وخمسين ألف') || normalized.includes('مية وخمسين الف')) return 150000;

  // Teens in Iraqi dialect
  if (normalized.includes('خمسطعش ألف') || normalized.includes('خمسطعش الف') || normalized.includes('خمس طعش الف')) return 15000;
  if (normalized.includes('اربعطعش ألف') || normalized.includes('اربعطعش الف') || normalized.includes('اربع طعش الف')) return 14000;
  if (normalized.includes('تلطعش ألف') || normalized.includes('تلطعش الف') || normalized.includes('تلت طعش الف')) return 13000;
  if (normalized.includes('طنعش ألف') || normalized.includes('طنعش الف') || normalized.includes('اثنعش الف')) return 12000;
  if (normalized.includes('دعش ألف') || normalized.includes('دعش الف') || normalized.includes('ادعش الف')) return 11000;

  // Single digit thousands in Iraqi dialect (e.g. خمستالاف / عشرتالاف)
  if (normalized.includes('عشرة آلاف') || normalized.includes('عشر آلاف') || normalized.includes('عشرة الاف') || normalized.includes('عشرتالاف') || normalized.includes('عشرت الاف') || normalized.includes('عشرتالاف')) return 10000;
  if (normalized.includes('تسعة آلاف') || normalized.includes('تسع آلاف') || normalized.includes('تسعة الاف') || normalized.includes('تسعتالاف') || normalized.includes('تسعت الاف')) return 9000;
  if (normalized.includes('ثمانية آلاف') || normalized.includes('ثمان آلاف') || normalized.includes('ثمانية الاف') || normalized.includes('ثمنتالاف') || normalized.includes('ثمنطالاف')) return 8000;
  if (normalized.includes('سبعة آلاف') || normalized.includes('سبع آلاف') || normalized.includes('سبعة الاف') || normalized.includes('سبعتالاف') || normalized.includes('سبعت الاف')) return 7000;
  if (normalized.includes('ستة آلاف') || normalized.includes('ست آلاف') || normalized.includes('ستة الاف') || normalized.includes('ستالاف') || normalized.includes('ستت الاف')) return 6000;
  if (normalized.includes('خمسة آلاف') || normalized.includes('خمس آلاف') || normalized.includes('خمسة الاف') || normalized.includes('خمستالاف') || normalized.includes('خمست الاف')) return 5000;
  if (normalized.includes('أربعة آلاف') || normalized.includes('اربعة الاف') || normalized.includes('اربع آلاف') || normalized.includes('اربعتالاف') || normalized.includes('اربعت الاف')) return 4000;
  if (normalized.includes('ثلاثة آلاف') || normalized.includes('تلاث آلاف') || normalized.includes('تلت آلاف') || normalized.includes('تلتالاف') || normalized.includes('تلاثتالاف')) return 3000;
  if (normalized.includes('ألفين') || normalized.includes('الفين')) return 2000;
  if (normalized.includes('ألف') || normalized.includes('الف')) return 1000;

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

  return 0;
}

function cleanText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[أإآء]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤئ]/g, 'ي')
    .replace(/[ـ]/g, '') // strip tatweel
    .replace(/[\s\t\n]+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  return dp[m][n];
}

function findMatchingDebtor(text: string, debtors: any[]): any | null {
  const cleaned = cleanText(text);

  // Exact substring check
  for (const debtor of debtors) {
    const dClean = cleanText(debtor.name || '');
    if (dClean && (cleaned.includes(dClean) || dClean.includes(cleaned))) {
      return debtor;
    }
  }

  // Token match with honorifics handling (حجي، سيد، ابو، ام، كاك)
  let bestMatch: any | null = null;
  let maxScore = 0;

  for (const debtor of debtors) {
    const dClean = cleanText(debtor.name || '');
    const words = dClean.split(' ').filter((w) => w.length >= 2);
    let matchedWords = 0;

    for (const w of words) {
      if (cleaned.includes(w)) {
        matchedWords++;
      } else {
        // Check for slight typo (1 character diff)
        const textTokens = cleaned.split(' ');
        for (const t of textTokens) {
          if (t.length >= 3 && Math.abs(t.length - w.length) <= 1) {
            if (levenshteinDistance(t, w) <= 1) {
              matchedWords += 0.9;
              break;
            }
          }
        }
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

  if (maxScore >= 0.45) {
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
أنت "مساعد Gemini الذكي"، أقوى وأذكى خبير محاسبي رقمي فوري في العراق، مدمج داخل تطبيق دفتر ديون السوبرماركت والمحل (${storeName}).
الجلسة الحالية: ${sessionName}.
العملة المستخدمة: ${currency}.
إجمالي الديون الحالية: ${totalDebt} ${currency}.
عدد الزبائن: ${debtors.length}.

قائمة الزبائن المسجلين لديك وحساباتهم (استخدمها للتطابق وتصحيح الأخطاء الإملائية):
${JSON.stringify(debtors.slice(0, 80).map((d: any) => ({ id: d.id, name: d.name, balance: d.currentBalance, phone: d.phone })))}

آخر الحركات:
${JSON.stringify(recentTransactions.slice(0, 15).map((t: any) => ({ type: t.type, amount: t.amount, debtorName: t.debtorName, description: t.description, date: t.date })))}

قواعد الذكاء الخارق وفهم اللهجة العامية العراقية وتصحيح الأخطاء:
1. تصحيح الأخطاء الإملائية والصوتية الناتجة عن الميكروفون:
   - المستخدم يتحدث صوتياً وغالباً ما ينتج عن الميكروفون أخطاء هجائية أو تلاصق كلمات، مثل:
     * "حجهادي" أو "حجي هدي" أو "حجي عادي" -> طابقها فوراً مع الزبون "حجي هادي" وصحح الاسم.
     * "قرار" أو "كرام" -> طابقها مع "كرار".
     * "علوي" أو "على وي" -> طابقها مع "علاوي" أو "علي".
     * "ابوفهد" أو "بوفهد" -> "ابو فهد".
     * "سيدمرتضى" -> "سيد مرتضى".
   - دائماً ابحث في قائمة الزبائن المعطاة أعلاه واختر الزبون الأقرب صوتياً وهجائياً. إذا تطابق مع زبون، ضع معرّفه (debtorId) واسمه الدقيق المكتمل.

2. فهم عميق لمصطلحات وأرقام العامية العراقية:
   - مفردات الديون: "سجل عليه"، "قيد عليه"، "اطلب فلان"، "اخذ بالدين"، "اخذ مسواك"، "شال بـ"، "كتب عليه"، "بقى يطلب"، "اخذ غراض وما دفع".
   - مفردات التسديد والدفع: "انطاني"، "جاب لي"، "سدد"، "واصل"، "قبضت منه"، "دفع"، "نزل من حسابه"، "صفّى حسابه"، "جاب دفعة"، "حط بحسابه".
   - الأرقام العراقية:
     * "ربع" = 250
     * "نص" = 500
     * "تلت ارباع" = 750
     * "ألف / الف" = 1000
     * "ألف وربع / الف و250" = 1250
     * "ألف ونص" = 1500
     * "ألفين" = 2000
     * "ألفين ونص" = 2500
     * "تلت آلاف / تلاث الاف / تلتالاف" = 3000
     * "أربعة آلاف / اربعتالاف" = 4000
     * "خمسة آلاف / خمس الاف / خمستالاف" = 5000
     * "ست آلاف / ستالاف" = 6000
     * "سبع آلاف / سبعتالاف" = 7000
     * "ثمان آلاف / ثمنتالاف" = 8000
     * "تسع آلاف / تسعتالاف" = 9000
     * "عشرة آلاف / عشر الاف / عشرتالاف" = 10000
     * "دعش ألف" = 11000
     * "طنعش ألف / اثنعش الف" = 12000
     * "تلطعش ألف" = 13000
     * "اربعطعش ألف" = 14000
     * "خمسطعش ألف / خمس طعش" = 15000
     * "عشرين ألف" = 20000
     * "خمسة وعشرين ألف" = 25000
     * "ثلاثين ألف / تلاثين الف" = 30000
     * "أربعين ألف" = 40000
     * "خمسين ألف" = 50000
     * "خمسة وسبعين ألف" = 75000
     * "مية ألف / مية الف" = 100000
     * "مية وخمسين ألف" = 150000
     * "ورقة" = 150000
     * "مليون" = 1000000

3. استخراج تفاصيل المواد (الوصف):
   - إذا ذكر المستخدم مواد مشتراة (مثل: "سجل على حجي هادي 5000 مسواك خضرة ودجاج" أو "كرار اخذ كارت أثير بـ 10 الاف"):
     استخرج المواد بدقة واجعلها في حقل "description".

4. الرد بأسلوب عراقي لبق وودود ومحترم ("تدلل عيوني"، "حاضر من عيوني"، "تم التعرف بدقة"، "تفضل") مع إظهار الملاحظة الذكية وقوة الفهم.

5. الإرجاع بصيغة JSON حصراً:
{
  "reply": "الرد النصي الذكي والواضح للمستخدم بالعامية العراقية المهذبة وتأكيد ما تم فهمه والملاحظة الذكية",
  "action": null أو كائن يحتوي على:
    - إضافة دين:
      {"type": "ADD_DEBT", "debtorId": "معرف الزبون إن وجد في القائمة", "debtorName": "اسم الزبون الصحيح بعد التصحيح", "amount": 5000, "description": "وصف المواد إن ذكرت"}
    - تسديد دفعة:
      {"type": "ADD_PAYMENT", "debtorId": "معرف الزبون إن وجد", "debtorName": "اسم الزبون", "amount": 10000, "description": "تسديد دفعة واصلة"}
    - إضافة زبون جديد:
      {"type": "ADD_DEBTOR", "name": "اسم الزبون", "phone": "رقم هاتفه إن ذكره"}
    - فتح كشف حساب:
      {"type": "VIEW_DEBTOR", "debtorId": "معرف الزبون", "debtorName": "اسم الزبون"}
    - ملاحة:
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
