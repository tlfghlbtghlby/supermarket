import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  UserCheck,
  Check,
  Sparkles,
  Clock,
  Laptop,
  Smartphone,
  Globe,
  MapPin,
  Wifi,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { loadSessionHistory } from '../utils/storage';
import {
  detectDeviceInfo,
  fetchDeviceNetworkInfo,
  loadSavedNetworkInfo,
  DeviceNetworkInfo,
  getOrCreateDeviceId,
} from '../utils/deviceSession';

interface SessionModalProps {
  isOpen: boolean;
  currentSession: string;
  onClose: () => void;
  onSaveSession: (sessionName: string) => void;
}

const PRESET_SESSIONS = [
  'الجلسة 1',
  'جلسة الصباح',
  'جلسة المساء',
  'كاشير 1',
  'كاشير 2',
  'نوبة الليل',
];

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  currentSession,
  onClose,
  onSaveSession,
}) => {
  const [sessionInput, setSessionInput] = useState(currentSession || 'الجلسة 1');
  const [history, setHistory] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState(() => detectDeviceInfo());
  const [networkInfo, setNetworkInfo] = useState<DeviceNetworkInfo | null>(() => loadSavedNetworkInfo());
  const [deviceId, setDeviceId] = useState<string>('');
  const [copiedIp, setCopiedIp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSessionInput(currentSession || 'الجلسة 1');
      setHistory(loadSessionHistory());
      setDeviceInfo(detectDeviceInfo());
      setDeviceId(getOrCreateDeviceId());

      // Fetch or refresh network info (IP, location, ISP)
      fetchDeviceNetworkInfo().then((net) => {
        setNetworkInfo(net);
      });
    }
  }, [isOpen, currentSession]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sessionInput.trim() || 'الجلسة 1';
    onSaveSession(clean);
    onClose();
  };

  const handleSelectPreset = (name: string) => {
    setSessionInput(name);
  };

  const handleCopyIp = () => {
    if (networkInfo?.ipAddress && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(networkInfo.ipAddress);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#121727] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                معلومات الجلسة والجهاز المسجل
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                بيانات الجهاز الحالي، عنوان الآي بي، والموقع وتسمية الكاشير
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Registered Device Information Card (بطاقة معلومات الجهاز المسجل) */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-[#151c2e] dark:to-[#121829] border border-blue-200 dark:border-[#243354] rounded-2xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  {deviceInfo.deviceType === 'MOBILE' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{deviceInfo.deviceName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>متصل الآن</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {deviceInfo.browserInfo}
                  </div>
                </div>
              </div>

              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-mono block">
                  #{deviceId.slice(0, 10)}
                </span>
              </div>
            </div>

            {/* Grid of Device Details: IP, Location, ISP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* IP Address */}
              <div className="p-2.5 bg-white dark:bg-[#0f1424] border border-slate-200 dark:border-[#222e48] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">عنوان الآي بي (IP):</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs" dir="ltr">
                      {networkInfo?.ipAddress || 'جاري الفحص...'}
                    </div>
                  </div>
                </div>
                {networkInfo?.ipAddress && (
                  <button
                    type="button"
                    onClick={handleCopyIp}
                    title="نسخ عنوان الآي بي"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Location (المكان والموقع) */}
              <div className="p-2.5 bg-white dark:bg-[#0f1424] border border-slate-200 dark:border-[#222e48] rounded-xl flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">الموقع والمكان:</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {networkInfo?.location || 'العراق 🇮🇶'}
                  </div>
                </div>
              </div>

              {/* ISP / Network Provider */}
              {networkInfo?.isp && (
                <div className="p-2.5 bg-white dark:bg-[#0f1424] border border-slate-200 dark:border-[#222e48] rounded-xl sm:col-span-2 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Wifi className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">شبكة الاتصال ومزود الخدمة:</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {networkInfo.isp}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Active Session Indicator */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-900 dark:text-amber-200 font-semibold">
                الجلسة الفعالة حالياً على هذا الجهاز:
              </span>
            </div>
            <span className="px-3 py-1 bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-2xs">
              {currentSession || 'الجلسة 1'}
            </span>
          </div>

          {/* Session Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>اسم الجلسة أو المسؤول / الكاشير:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                placeholder="مثال: أحمد، جلسة الصباح، كاشير 1، وردية المساء..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#101524] border-2 border-slate-200 dark:border-[#27324c] rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-all"
                autoFocus
                required
              />
            </div>
            <p className="text-[11px] text-slate-400">
              💡 أي دين أو تسديد يتم تسجيله سيُربط بهذا الاسم ومعلومات الجهاز في سجل الحركات وإشعار التليجرام الفوري.
            </p>
          </div>

          {/* Quick Presets / History */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>اقتراحات وتسميات سريعة:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...PRESET_SESSIONS, ...history])).map((preset) => {
                const isSelected = sessionInput.trim() === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-900 shadow-2xs font-black'
                        : 'bg-slate-100 dark:bg-[#182138] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#202b47] border border-slate-200/80 dark:border-[#243354]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{preset}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد وتعيين الجلسة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
