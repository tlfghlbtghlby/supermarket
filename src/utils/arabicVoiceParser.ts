import { DebtorWithStats, TransactionType } from '../types';

export interface ParsedVoiceTransaction {
  rawTranscript: string;
  type: TransactionType;
  debtorId?: string;
  debtorName?: string;
  matchedDebtor?: DebtorWithStats;
  amount?: number;
  description: string;
  notes?: string;
  confidence: number;
}

// Normalize Arabic letters for accurate matching
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '') // remove tashkeel
    .replace(/[،,.:;؟?!]/g, ' ')
    .trim()
    .toLowerCase();
}

// Convert Eastern Arabic numerals to standard Western numerals
export function convertArabicDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = str;
  arabicDigits.forEach((digit, idx) => {
    result = result.split(digit).join(idx.toString());
  });
  return result;
}

// Extract numerical amount from colloquial and written Arabic
export function parseArabicVoiceAmount(text: string): number | undefined {
  if (!text) return undefined;
  const clean = convertArabicDigits(normalizeArabicText(text));

  // 1. Direct number followed by "الف" or "الاف" (e.g. "15 الف", "25 ألف", "5 الاف")
  const kPattern = /(\d+(?:\.\d+)?)\s*(?:الف|الاف|آلاف|الفا)/i;
  const kMatch = clean.match(kPattern);
  if (kMatch) {
    const base = parseFloat(kMatch[1]);
    if (!isNaN(base)) return Math.round(base * 1000);
  }

  // 2. Direct number followed by "مليون" (e.g. "2 مليون")
  const mPattern = /(\d+(?:\.\d+)?)\s*(?:مليون|ملايين)/i;
  const mMatch = clean.match(mPattern);
  if (mMatch) {
    const base = parseFloat(mMatch[1]);
    if (!isNaN(base)) return Math.round(base * 1000000);
  }

  // 3. Numbers written in words
  const wordsToNumbers: { [key: string]: number } = {
    'مليون': 1000000,
    'مليونين': 2000000,
    'ميه الف': 100000,
    'مائه الف': 100000,
    'مئتا الف': 200000,
    'ميتين الف': 200000,
    'مائتين الف': 200000,
    'خمسين الف': 50000,
    'اربعين الف': 40000,
    'ثلاثين الف': 30000,
    'عشرين الف': 20000,
    'خمسه وعشرين الف': 25000,
    'خمسة وعشرين الف': 25000,
    'خمسه وتلاتين الف': 35000,
    'خمسة وتلاتين الف': 35000,
    'خمسه واربعين الف': 45000,
    'خمسة عشر الف': 15000,
    'خمستعش الف': 15000,
    'خمستالاف': 5000,
    'تلتالاف': 3000,
    'عشرتالاف': 10000,
    'عشره الاف': 10000,
    'عشرة الاف': 10000,
    'تسعه الاف': 9000,
    'تسعة الاف': 9000,
    'ثمانيه الاف': 8000,
    'ثمانية الاف': 8000,
    'سبعه الاف': 7000,
    'سبعة الاف': 7000,
    'سته الاف': 6000,
    'ستة الاف': 6000,
    'خمسه الاف': 5000,
    'خمسة الاف': 5000,
    'اربعه الاف': 4000,
    'اربعة الاف': 4000,
    'ثلاثه الاف': 3000,
    'ثلاثة الاف': 3000,
    'الفين ونص': 2500,
    'الفين': 2000,
    'الف ونص': 1500,
    'الف': 1000,
    'خمسميه': 500,
    'خمسمائه': 500,
    'نص': 500,
    'ربع': 250,
  };

  for (const [phrase, value] of Object.entries(wordsToNumbers)) {
    if (clean.includes(phrase)) {
      return value;
    }
  }

  // 4. Standalone plain numbers (e.g., "15000", "7500", "500")
  const plainNumMatch = clean.match(/\b\d{3,9}\b/);
  if (plainNumMatch) {
    const val = parseInt(plainNumMatch[0], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // Smaller standalone numbers like "25" -> might mean 25 if cashier is entering small items or thousands
  const smallNumMatch = clean.match(/\b\d+\b/);
  if (smallNumMatch) {
    const val = parseInt(smallNumMatch[0], 10);
    if (!isNaN(val) && val > 0) {
      // In Iraqi colloquial speech, saying "25" often means 25,000 if in debt context,
      // but return literal number if under 100
      return val < 100 ? val * 1000 : val;
    }
  }

  return undefined;
}

// Find closest matching debtor from the list
export function findMatchingDebtor(
  text: string,
  debtors: DebtorWithStats[]
): { debtor?: DebtorWithStats; matchedText?: string } {
  if (!text || debtors.length === 0) return {};
  const normText = normalizeArabicText(text);

  // Exact or full name inclusion
  for (const d of debtors) {
    const normName = normalizeArabicText(d.name);
    if (normText.includes(normName)) {
      return { debtor: d, matchedText: d.name };
    }
  }

  // Partial first name or nickname (e.g. "صلاح" in "عمو صلاح" or "أبو أحمد")
  for (const d of debtors) {
    const parts = normalizeArabicText(d.name).split(/\s+/).filter(p => p.length >= 3);
    for (const part of parts) {
      if (['ابو', 'عمو', 'خال', 'سيد', 'حاج', 'حجي', 'استاذ'].includes(part)) continue;
      // Look for word boundary or isolated word
      const regex = new RegExp(`\\b${part}\\b`, 'i');
      if (regex.test(normText)) {
        return { debtor: d, matchedText: d.name };
      }
    }
  }

  // Phone number matching (if user read out 4 digits of phone)
  const phoneMatch = text.match(/\d{4,11}/);
  if (phoneMatch) {
    const digits = phoneMatch[0];
    const debtorByPhone = debtors.find(d => d.phone && d.phone.includes(digits));
    if (debtorByPhone) {
      return { debtor: debtorByPhone, matchedText: debtorByPhone.phone };
    }
  }

  return {};
}

// Main parser that analyzes whole Arabic sentence
export function parseVoiceInputToTransaction(
  transcript: string,
  allDebtors: DebtorWithStats[]
): ParsedVoiceTransaction {
  const norm = normalizeArabicText(transcript);

  // 1. Detect Transaction Type
  const isPayment =
    norm.includes('تسديد') ||
    norm.includes('سدد') ||
    norm.includes('دفعه') ||
    norm.includes('دفع') ||
    norm.includes('واصل') ||
    norm.includes('قبض');
  const type: TransactionType = isPayment ? 'PAYMENT' : 'DEBT';

  // 2. Match Debtor
  const { debtor: matchedDebtor, matchedText } = findMatchingDebtor(transcript, allDebtors);

  // 3. Extract Amount
  const amount = parseArabicVoiceAmount(transcript);

  // 4. Extract Description
  // Remove known action keywords, matched debtor name, and numbers from transcript
  let cleanDesc = transcript;

  // Remove common prefix commands
  const removePatterns = [
    /سجل\s+(?:دين\s+)?(?:على\s+)?/gi,
    /دين\s+(?:على\s+)?/gi,
    /تسديد\s+(?:من\s+)?/gi,
    /سدد\s+(?:من\s+)?/gi,
    /دفع\s+(?:من\s+)?/gi,
    /دفعة\s+(?:من\s+)?/gi,
    /حساب\s+/gi,
    /على\s+/gi,
    /من\s+/gi,
    /بمبلغ\s+/gi,
    /بقيمة\s+/gi,
    /دينار\s*(?:عراقي)?/gi,
  ];

  removePatterns.forEach(pattern => {
    cleanDesc = cleanDesc.replace(pattern, ' ');
  });

  // Remove matched debtor's name if present
  if (matchedText) {
    cleanDesc = cleanDesc.replace(new RegExp(matchedText, 'gi'), ' ');
  }

  // Remove numerical phrases from description
  const amountPatterns = [
    /\b\d+\s*(?:الف|الاف|آلاف|مليون|ملايين)?\b/gi,
    /مليون/gi,
    /خمسين\s+الف/gi,
    /اربعين\s+الف/gi,
    /ثلاثين\s+الف/gi,
    /عشرين\s+الف/gi,
    /خمسة\s+وعشرين\s+الف/gi,
    /خمسة\s+عشر\s+الف/gi,
    /عشرة\s+الاف/gi,
    /خمسة\s+الاف/gi,
    /الفين/gi,
    /الف/gi,
  ];
  amountPatterns.forEach(p => {
    cleanDesc = cleanDesc.replace(p, ' ');
  });

  // Clean extra spaces and punctuation
  cleanDesc = cleanDesc.replace(/[،,.:;؟?!]/g, ' ').replace(/\s+/g, ' ').trim();

  // Default description if empty
  const defaultDesc = isPayment ? 'تسديد دفعة' : 'مسواك';
  const finalDescription = cleanDesc.length >= 2 ? cleanDesc : defaultDesc;

  let confidence = 0.5;
  if (matchedDebtor) confidence += 0.3;
  if (amount && amount > 0) confidence += 0.2;

  return {
    rawTranscript: transcript,
    type,
    debtorId: matchedDebtor?.id,
    debtorName: matchedDebtor?.name,
    matchedDebtor,
    amount,
    description: finalDescription,
    confidence: Math.min(1, confidence),
  };
}
