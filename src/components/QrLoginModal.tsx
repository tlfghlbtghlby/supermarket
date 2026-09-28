import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Download,
  Check,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { StoreSettings } from '../types';
import { User } from 'firebase/auth';

interface QrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  user: User | null;
}

export const QrLoginModal: React.FC<QrLoginModalProps> = ({
  isOpen,
  onClose,
  settings,
  user,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [joinUrl, setJoinUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const payload = {
      type: 'DEBTS_SHOP_JOIN',
      shopCode: settings.shopCode || '',
      email: settings.ownerEmail || user?.email || '',
      passwordCode: settings.ownerPasswordCode || '123123',
      storeName: settings.storeName || 'سوبرماركت',
      timestamp: Date.now(),
    };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const generatedUrl = `${origin}?join=${encodeURIComponent(JSON.stringify(payload))}`;
    setJoinUrl(generatedUrl);

    // Generate high-resolution QR code
    QRCode.toDataURL(generatedUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });
  }, [isOpen, settings, user]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `باركود_دخول_${settings.storeName || 'المحل'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111726] border-2 border-slate-200 dark:border-[#222e47] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl space-y-4">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-xs">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-1.5">
                <span>باركود تسجيل الدخول والربط السريع</span>
              </h3>
              <p className="text-xs text-indigo-100">
                خاص بالجلسة الرئيسية • لربط الهواتف والأجهزة الأخرى
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-center">
          {/* Shop Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>متجر: {settings.storeName || 'السوبرماركت'}</span>
            <span>•</span>
            <span className="font-mono">{settings.shopCode}</span>
          </div>

          {/* QR Code Container */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl border-4 border-indigo-500/20 shadow-lg relative group">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-56 h-56 object-contain rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  <span>جارٍ إنشاء الباركود...</span>
                </div>
              )}
            </div>
          </div>

          {/* Step Instructions */}
          <div className="bg-slate-50 dark:bg-[#161c2d] p-3.5 rounded-2xl border border-slate-200 dark:border-[#243354] text-xs text-right space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>طريقة الاستخدام من الهاتف أو الجهاز الآخر:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed pr-1">
              <li>افتح كاميرا الهاتف أو زر <strong className="text-slate-900 dark:text-slate-200">"مسح الباركود"</strong> في صفحة الدخول.</li>
              <li>وجّه الكاميرا نحو هذا الباركود ليتم التعرف على متجرك مباشرة.</li>
              <li>سيتم تسجيل الدخول سحابياً ومزامنة البيانات في ثانية واحدة بدون كتابة كلمة سر.</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#182136] dark:hover:bg-[#202c48] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#2a3a5e] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>نسخ الرابط</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الصورة</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 dark:bg-[#0d121f] border-t border-slate-200 dark:border-[#1d273f] text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-[#1c2438] dark:hover:bg-[#25304a] text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
