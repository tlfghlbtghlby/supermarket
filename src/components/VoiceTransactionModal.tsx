import React, { useState, useEffect, useRef } from 'react';
import { DebtorWithStats, TransactionType, StoreSettings } from '../types';
import { speechRecognizer, SpeechRecognitionResultItem } from '../utils/speechRecognition';
import { parseVoiceInputToTransaction, ParsedVoiceTransaction } from '../utils/arabicVoiceParser';
import { formatCurrency, generateTransactionWhatsAppUrl } from '../utils/formatters';
import {
  Mic,
  MicOff,
  X,
  Check,
  Sparkles,
  ArrowRight,
  Plus,
  ArrowDownLeft,
  AlertCircle,
  HelpCircle,
  MessageCircle,
  Keyboard,
} from 'lucide-react';

interface VoiceTransactionModalProps {
  isOpen: boolean;
  allDebtors: DebtorWithStats[];
  settings: StoreSettings;
  onClose: () => void;
  onSaveTransaction: (data: {
    debtorId: string;
    type: TransactionType;
    amount: number;
    description: string;
    notes?: string;
    autoOpenWhatsApp?: boolean;
  }) => void;
  onOpenInStandardModal?: (data: {
    debtorId: string;
    type: TransactionType;
    amount: number;
    description: string;
  }) => void;
}

export const VoiceTransactionModal: React.FC<VoiceTransactionModalProps> = ({
  isOpen,
  allDebtors,
  settings,
  onClose,
  onSaveTransaction,
  onOpenInStandardModal,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedVoiceTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);

  // Manual editable overrides if user wants to tweak the parsed outcome
  const [selectedDebtorId, setSelectedDebtorId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<TransactionType>('DEBT');
  const [editedAmount, setEditedAmount] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');

  const silenceTimerRef = useRef<any>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setManualInput('');
      setParsedData(null);
      setErrorMessage(null);
      setSelectedDebtorId(allDebtors[0]?.id || '');
      setSelectedType('DEBT');
      setEditedAmount('');
      setEditedDescription('');
      setSendWhatsApp(true);
      setShowManualInput(false);
    } else {
      speechRecognizer.stop();
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }

    return () => {
      speechRecognizer.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isOpen]);

  // Handle parsing a piece of text (either spoken or typed)
  const processSpeechText = (text: string) => {
    setTranscript(text);
    const parsed = parseVoiceInputToTransaction(text, allDebtors);
    setParsedData(parsed);

    if (parsed.debtorId) {
      setSelectedDebtorId(parsed.debtorId);
    }
    setSelectedType(parsed.type);
    if (parsed.amount && parsed.amount > 0) {
      setEditedAmount(parsed.amount.toString());
    }
    if (parsed.description) {
      setEditedDescription(parsed.description);
    }
  };

  const startListeningSession = () => {
    setErrorMessage(null);
    setIsListening(true);

    speechRecognizer.start({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (result: SpeechRecognitionResultItem) => {
        processSpeechText(result.transcript);

        if (result.isFinal) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            speechRecognizer.stop();
            setIsListening(false);
          }, 2000);
        }
      },
      onEnd: () => {
        setIsListening(false);
      },
      onError: (err: string) => {
        setErrorMessage(err);
        setIsListening(false);
      },
    });
  };

  const toggleListening = () => {
    if (isListening) {
      speechRecognizer.stop();
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else {
      startListeningSession();
    }
  };

  if (!isOpen) return null;

  const currentDebtor = allDebtors.find((d) => d.id === selectedDebtorId);
  const parsedNumericAmount = parseFloat(editedAmount) || 0;
  const currentBal = currentDebtor?.currentBalance || 0;
  const projectedBal =
    selectedType === 'DEBT'
      ? currentBal + parsedNumericAmount
      : Math.max(0, currentBal - parsedNumericAmount);
  const isDebt = selectedType === 'DEBT';

  const handleConfirmSave = () => {
    if (!selectedDebtorId) {
      setErrorMessage('يرجى تحديد الزبون');
      return;
    }
    if (parsedNumericAmount <= 0) {
      setErrorMessage('يرجى تحديد المبلغ');
      return;
    }

    const finalDescription = editedDescription.trim() || (isDebt ? 'تسجيل دين' : 'تسديد دفعة');
    const isoDate = new Date().toISOString();

    if (sendWhatsApp && currentDebtor?.phone) {
      const waUrl = generateTransactionWhatsAppUrl(currentDebtor.phone, {
        storeName: settings.storeName,
        debtorName: currentDebtor.name,
        transactionType: selectedType,
        transactionAmount: parsedNumericAmount,
        previousBalance: currentBal,
        newBalance: projectedBal,
        currency: settings.currency,
        description: finalDescription,
        date: isoDate,
      });

      if (waUrl) {
        try {
          window.open(waUrl, '_blank');
        } catch (err) {
          console.warn('WhatsApp link error:', err);
        }
      }
    }

    speechRecognizer.stop();
    setIsListening(false);
    onSaveTransaction({
      debtorId: selectedDebtorId,
      type: selectedType,
      amount: parsedNumericAmount,
      description: finalDescription,
      autoOpenWhatsApp: sendWhatsApp,
    });
    onClose();
  };

  const handleOpenInRegularModal = () => {
    speechRecognizer.stop();
    setIsListening(false);
    if (onOpenInStandardModal && selectedDebtorId) {
      onOpenInStandardModal({
        debtorId: selectedDebtorId,
        type: selectedType,
        amount: parsedNumericAmount,
        description: editedDescription,
      });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto bg-slate-900/80 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          speechRecognizer.stop();
          setIsListening(false);
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-[#121727] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${
                isListening ? 'bg-rose-600 animate-pulse ring-4 ring-rose-500/30' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
              }`}
            >
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>التسجيل والتعرف الصوتي الذكي</span>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تكلّم بصوتك أو اكتب وسيقوم النظام باستخراج الدين فوراً
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              speechRecognizer.stop();
              setIsListening(false);
              onClose();
            }}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Listening Ambient & Mic Section */}
        <div className="p-6 text-center space-y-4 bg-gradient-to-b from-purple-50/50 via-slate-50/80 to-transparent dark:from-purple-950/20 dark:via-[#172036]/40 dark:to-transparent">
          {/* Main Pulsing Mic Trigger */}
          <div className="relative inline-flex items-center justify-center">
            {isListening && (
              <>
                <span className="absolute w-32 h-32 rounded-full bg-rose-500/25 animate-ping pointer-events-none" />
                <span className="absolute w-24 h-24 rounded-full bg-rose-500/35 animate-pulse pointer-events-none" />
              </>
            )}
            <button
              id="voice-mic-trigger-btn"
              type="button"
              onClick={toggleListening}
              className={`relative z-10 w-22 h-22 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white scale-105 shadow-rose-600/40 ring-4 ring-rose-400/40'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
              }`}
            >
              {isListening ? (
                <Mic className="w-10 h-10 animate-bounce" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={toggleListening}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-200'
              }`}
            >
              {isListening ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  <span>🎙️ جاري الاستماع... تكلّم الآن بصوتك</span>
                </>
              ) : (
                <span>👉 اضغط على المايكروفون وتكلّم</span>
              )}
            </button>
          </div>

          {/* Transcript Display Box */}
          <div className="p-3.5 bg-white dark:bg-[#161d30] rounded-2xl border border-slate-200 dark:border-slate-700 min-h-[60px] flex items-center justify-center text-center shadow-xs">
            {transcript ? (
              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                "{transcript}"
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                قل مثلاً: <strong className="text-slate-700 dark:text-slate-200">"سجل على عمو صلاح 15 ألف مسواك"</strong> أو <strong className="text-slate-700 dark:text-slate-200">"تسديد 10 آلاف من أحمد"</strong>
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold text-right space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pr-6">
                💡 نصيحة: يمكنك أيضاً كتابة الجملة أو اختيار أحد الأمثلة السريعة أدناه لتسجيل الدين فوراً.
              </p>
            </div>
          )}

          {/* Quick Manual Input Toggle for noisy environments or permission blocks */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{showManualInput ? 'إخفاء خانة الكتابة' : 'أو اكتب الجملة نصياً هنا للتعرف الذكي'}</span>
            </button>

            {showManualInput && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="اكتب مثلاً: سجل على أحمد 20 ألف مسواك..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (manualInput.trim()) processSpeechText(manualInput.trim());
                    }
                  }}
                  className="flex-1 h-10 px-3 bg-white dark:bg-[#161d30] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manualInput.trim()) processSpeechText(manualInput.trim());
                  }}
                  className="h-10 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  تحليل
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Detected Transaction Card */}
        <div className="px-5 pb-5 space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-[#182035] rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/60 pb-2">
              <span>البيانات المستخرجة من الكلام</span>
              {parsedData?.confidence && parsedData.confidence > 0.6 && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>تم التعرف بنجاح ({Math.round(parsedData.confidence * 100)}%)</span>
                </span>
              )}
            </div>

            {/* Debtor Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                الزبون المحدد:
              </label>
              <select
                value={selectedDebtorId}
                onChange={(e) => setSelectedDebtorId(e.target.value)}
                className="w-full h-11 px-3 bg-white dark:bg-[#121727] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-hidden focus:border-purple-500"
              >
                {allDebtors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.phone ? `(${d.phone})` : ''} - عليه ({formatCurrency(d.currentBalance, settings.currency)})
                  </option>
                ))}
              </select>
            </div>

            {/* Type & Amount Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  نوع الحركة:
                </label>
                <div className="grid grid-cols-2 p-1 bg-white dark:bg-[#121727] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSelectedType('DEBT')}
                    className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      isDebt
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>دين ➕</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('PAYMENT')}
                    className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      !isDebt
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>تسديد ➖</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  المبلغ المستخرج:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={editedAmount}
                    onChange={(e) => setEditedAmount(e.target.value)}
                    className="w-full h-11 pl-14 pr-3 bg-white dark:bg-[#121727] border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 text-left"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    {settings.currency || 'د.ع'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                الوصف / ماذا أخذ الزبون:
              </label>
              <input
                type="text"
                placeholder="مثال: مسواك، كارتات رصيد..."
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-[#121727] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
              />
            </div>

            {/* Projected Balance preview */}
            {currentDebtor && parsedNumericAmount > 0 && (
              <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">الرصيد بعد العملية:</span>
                <span
                  className={`font-black font-mono ${
                    isDebt ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {formatCurrency(projectedBal, settings.currency)}
                </span>
              </div>
            )}
          </div>

          {/* WhatsApp Toggle */}
          {currentDebtor?.phone && (
            <label className="flex items-center justify-between p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 cursor-pointer">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>إرسال إشعار فوري للزبون عبر الواتساب</span>
              </div>
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              id="voice-confirm-save-btn"
              type="button"
              disabled={parsedNumericAmount <= 0}
              onClick={handleConfirmSave}
              className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>تأكيد وحفظ في الدفتر فوراً</span>
            </button>

            {onOpenInStandardModal && (
              <button
                type="button"
                onClick={handleOpenInRegularModal}
                className="h-14 px-4 rounded-2xl bg-slate-100 dark:bg-[#182035] hover:bg-slate-200 dark:hover:bg-[#202b46] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>تعديل في الواجهة العادية</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Voice Command Examples */}
          <div className="pt-2 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>أمثلة سريعة لتجربة التعرف الصوتي والذكي:</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
              {[
                'سجل على عمو صلاح 15 ألف مسواك',
                'دين على كرار 8 آلاف كارتات',
                'تسديد 10 آلاف من أحمد',
                'على أبو محمد 25000 لحم',
              ].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => processSpeechText(phrase)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-[#182035] hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  "{phrase}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
