import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('المتصفح لا يدعم الوصول المباشر للكاميرا. يمكنك رفع صورة الباركود أو لصق الرابط.');
        setHasCameraPermission(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCameraPermission(true);

      // Start scanning loop if BarcodeDetector is supported
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code'],
          });

          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessing) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  if (rawValue) {
                    handleFoundQr(rawValue);
                  }
                }
              } catch {
                // ignore frame scan errors
              }
            }
          }, 350);
        } catch {
          // BarcodeDetector failed init
        }
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('تم حظر الوصول إلى الكاميرا. يرجى السماح بالكاميرا من إعدادات المتصفح أو رفع صورة الباركود.');
      } else {
        setErrorMsg('تعذر فتح الكاميرا. يرجى استخدام متصفح Google Chrome أو رفع صورة الباركود.');
      }
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleFoundQr = (code: string) => {
    setIsProcessing(true);
    stopCamera();
    onScanSuccess(code);
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!('BarcodeDetector' in window)) {
      setErrorMsg('قراءة الباركود من الصور تتطلب متصفح Google Chrome حديث، أو يمكنك لصق الرابط يدوياً.');
      return;
    }

    try {
      setIsProcessing(true);
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const barcodes = await barcodeDetector.detect(img);
      if (barcodes && barcodes.length > 0) {
        handleFoundQr(barcodes[0].rawValue);
      } else {
        setErrorMsg('لم يتم العثور على باركود صالح في الصورة المحددة. يرجى اختيار صورة واضحة.');
      }
    } catch (err: any) {
      setErrorMsg('تعذر قراءة الصورة: ' + (err?.message || 'خطأ غير متوقع'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleFoundQr(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111726] border-2 border-slate-200 dark:border-[#222e47] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl space-y-3">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-300" />
            <h3 className="text-sm font-black">مسح باركود الدخول والربط</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          {/* Camera Viewfinder */}
          <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-black rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Target Box Overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-amber-400 rounded-2xl pointer-events-none flex items-center justify-center animate-pulse">
              <span className="text-[10px] text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded-full">
                وجّه الباركود داخل هذا الإطار
              </span>
            </div>

            {isProcessing && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-xs font-bold">جارٍ معالجة وتسجيل الدخول...</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Fallback Option 1: File Upload */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-[#161c2d] rounded-xl border border-slate-200 dark:border-[#243354] text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>أو اختر صورة الباركود:</span>
            </span>
            <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs">
              <span>رفع صورة</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Fallback Option 2: Paste Code / Link */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              أو الصق الرابط أو الرمز المستلم:
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="الصق الرابط أو الرمز هنا..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#161c2d] border border-slate-200 dark:border-[#243354] rounded-xl text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={!manualCode.trim() || isProcessing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                دخول
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-[#0d121f] border-t border-slate-200 dark:border-[#1d273f]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-[#1c2438] dark:hover:bg-[#25304a] text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
