/**
 * خدمة بوت واتساب التلقائي عبر واجهة Meta الرسمية للأعمال
 * (Meta WhatsApp Cloud API)
 *
 * تتيح إرسال الرسائل وفواتير الديون تلقائياً في الخلفية
 * من رقم المتجر المسجل في فيسبوك/ميتا إلى الزبائن
 * دون حاجة لفتح واتساب على جهاز الكاشير أو المستخدم.
 */

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

/**
 * تحويل رقم الهاتف إلى الصيغة الدولية المعتمدة لدى WhatsApp Cloud API (بدون أصفار أولية أو علامة +)
 * مثال للعراق: 07854668977 -> 9647854668977
 */
export function formatPhoneForMeta(rawPhone: string): string {
  if (!rawPhone) return '';
  // تنظيف الرموز والمسافات
  let cleaned = rawPhone.replace(/[\s\-\(\)\+]/g, '').trim();

  // تحويل الأرقام العربية الهندية إلى أرقام إنجليزية
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  cleaned = cleaned.replace(/[٠-٩]/g, (d) => arabicNumbers.indexOf(d).toString());

  // إذا كان يبدأ بـ 00 -> حذف
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // معالجة الأرقام العراقية الشائعة (07xx)
  if (cleaned.startsWith('07')) {
    cleaned = '964' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 10) {
    cleaned = '964' + cleaned;
  }

  return cleaned;
}

/**
 * إرسال رسالة نصية مباشرة عبر Meta WhatsApp Cloud API
 */
export async function sendMetaCloudMessage({
  phoneNumberId,
  accessToken,
  toPhone,
  messageText,
}: {
  phoneNumberId: string;
  accessToken: string;
  toPhone: string;
  messageText: string;
}): Promise<MetaSendResult> {
  const cleanTo = formatPhoneForMeta(toPhone);

  if (!cleanTo || cleanTo.length < 8) {
    return {
      success: false,
      error: 'رقم هاتف المستلم غير صحيح أو ناقص',
    };
  }

  const cleanPhoneId = phoneNumberId.trim();
  const cleanToken = accessToken.trim();

  if (!cleanPhoneId || !cleanToken) {
    return {
      success: false,
      error: 'بيانات بوت الواتساب غير مكتملة (يرجى إدخال معرف رقم الهاتف ورمز الوصول في الإعدادات)',
    };
  }

  const url = `https://graph.facebook.com/v20.0/${cleanPhoneId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `خطأ في واجهة Meta: ${res.status} ${res.statusText}`;
      const errCode = data?.error?.code ? `(كود: ${data.error.code})` : '';
      return {
        success: false,
        error: `${errMsg} ${errCode}`,
        details: data,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      success: true,
      messageId,
      details: data,
    };
  } catch (err: any) {
    console.error('Meta Cloud API Error:', err);
    return {
      success: false,
      error: err?.message || 'تعذر الاتصال بخوادم Meta WhatsApp (تحقق من اتصال الإنترنت)',
      details: err,
    };
  }
}

/**
 * تجربة إرسال رسالة اختبارية للتحقق من سلامة الاتصال والبيانات
 */
export async function testMetaBotConnection({
  phoneNumberId,
  accessToken,
  testPhone,
  storeName,
}: {
  phoneNumberId: string;
  accessToken: string;
  testPhone: string;
  storeName: string;
}): Promise<MetaSendResult> {
  const testMessage = `🤖 *رسالة اختبارية من بوت ديون السوبرماركت*
------------------------------
تم ربط بوت الواتساب التلقائي بنجاح!
المتجر: *${storeName || 'سوبرماركت'}*
التاريخ: ${new Date().toLocaleString('ar-IQ')}
------------------------------
النظام جاهز الآن لإرسال فواتير وكشوفات الديون للزبائن تلقائياً في الخلفية.`;

  return sendMetaCloudMessage({
    phoneNumberId,
    accessToken,
    toPhone: testPhone,
    messageText: testMessage,
  });
}
