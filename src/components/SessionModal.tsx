import React, { useState, useEffect } from 'react';
import { X, Tag, UserCheck, Check, Sparkles, History, Clock } from 'lucide-react';
import { loadSessionHistory } from '../utils/storage';

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

  useEffect(() => {
    if (isOpen) {
      setSessionInput(currentSession || 'الجلسة 1');
      setHistory(loadSessionHistory());
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

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#121727] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                تسمية الجلسة الحالية
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                لمعرفة من قام بتسجيل كل دين في سجل الحركات وتليجرام
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Current Session Indicator */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-900 dark:text-amber-200 font-semibold">
                الجلسة الفعالة حالياً:
              </span>
            </div>
            <span className="px-2.5 py-1 bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-2xs">
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
              💡 أي دين أو تسديد يتم تسجيله سيُربط بهذا الاسم مباشرة، وسيظهر في إشعار التليجرام الفوري وسجل الحركات.
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
