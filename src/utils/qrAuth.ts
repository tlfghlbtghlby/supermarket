// QR code authentication and shop joining utility
export interface QrShopPayload {
  type: 'DEBTS_SHOP_JOIN';
  shopCode: string;
  email: string;
  passwordCode: string;
  storeName?: string;
  timestamp?: number;
}

export function generateQrJoinUrl(payload: QrShopPayload): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const json = JSON.stringify(payload);
  return `${origin}${pathname}?join=${encodeURIComponent(json)}`;
}

export function parseQrJoinData(rawData: string): QrShopPayload | null {
  if (!rawData || !rawData.trim()) return null;

  try {
    let clean = rawData.trim();

    // Check if it's a URL with ?join= or &join=
    if (clean.includes('join=')) {
      const match = clean.match(/[?&]join=([^&]+)/);
      if (match && match[1]) {
        clean = decodeURIComponent(match[1]);
      }
    }

    // Try parsing as JSON
    const parsed = JSON.parse(clean);
    if (parsed && (parsed.type === 'DEBTS_SHOP_JOIN' || parsed.email || parsed.shopCode)) {
      return {
        type: 'DEBTS_SHOP_JOIN',
        shopCode: String(parsed.shopCode || '').trim(),
        email: String(parsed.email || '').trim(),
        passwordCode: String(parsed.passwordCode || '123123').trim(),
        storeName: String(parsed.storeName || '').trim(),
        timestamp: parsed.timestamp,
      };
    }
    return null;
  } catch {
    // If not JSON, check if it's formatted as email:password or shopCode
    const trimmed = rawData.trim();
    if (trimmed.includes(':') && trimmed.includes('@')) {
      const [email, password] = trimmed.split(':');
      return {
        type: 'DEBTS_SHOP_JOIN',
        shopCode: '',
        email: email.trim(),
        passwordCode: password ? password.trim() : '123123',
      };
    }
    return null;
  }
}
