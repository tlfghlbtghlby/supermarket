/**
 * Utility for generating, formatting, and matching unique account codes
 * Every account has its own distinct unique code (e.g. G648291)
 */

export function generateUniqueAccountCode(seed?: string): string {
  if (seed) {
    let hash = 0;
    const cleanSeed = String(seed).trim().toLowerCase();
    for (let i = 0; i < cleanSeed.length; i++) {
      hash = (hash << 5) - hash + cleanSeed.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    const num = 100000 + (positiveHash % 900000);
    return `G${num}`;
  }
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `G${randomNum}`;
}

export function generateRandomAccountCode(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `G${randomNum}`;
}

export function normalizeArabicDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}

export function cleanAccountCode(code: string): string {
  if (!code) return '';
  return normalizeArabicDigits(code.trim()).toUpperCase().replace(/\s+/g, '');
}

/**
 * Checks if a received Telegram message matches a specific user's unique account code
 */
export function isAccountCodeMatch(rawMessageText: string, targetCode: string): boolean {
  if (!rawMessageText || !targetCode) return false;
  const cleanTarget = cleanAccountCode(targetCode);
  const cleanText = cleanAccountCode(rawMessageText);

  if (cleanText === cleanTarget) return true;

  const upper = rawMessageText.trim().toUpperCase();
  if (upper.startsWith(`/START ${cleanTarget}`)) return true;
  if (upper.startsWith(`/START=${cleanTarget}`)) return true;

  // Word boundary match
  const words = upper.split(/[\s,،;:\-_=]+/);
  return words.includes(cleanTarget);
}
