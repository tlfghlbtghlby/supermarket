import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  PlusCircle,
  ArrowDownLeft,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  User as UserIcon,
  Tag,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Debtor, Transaction, StoreSettings, TransactionType, PaymentMethod } from '../types';
import { speechRecognizer, SpeechRecognitionResultItem } from '../utils/speechRecognition';
import { formatCurrency } from '../utils/formatters';
import { parseLocalIntent } from '../utils/aiIntentParser';

interface AssistantMessage {
  id: string;
  sender: 'USER' | 'GEMINI';
  text: string;
  timestamp: string;
  action?: {
    type: 'ADD_DEBT' | 'ADD_PAYMENT' | 'ADD_DEBTOR' | 'VIEW_DEBTOR' | 'NAVIGATE';
    debtorId?: string;
    debtorName?: string;
    amount?: number;
    description?: string;
    phone?: string;
    view?: 'DEBTORS' | 'CUSTOMERS' | 'DASHBOARD' | 'SUPPLIERS';
    executed?: boolean;
  } | null;
}

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtors: Debtor[];
  transactions: Transaction[];
  settings: StoreSettings;
  currentSessionName?: string;
  onAddTransaction: (data: {
    debtorId: string;
    type: TransactionType;
    amount: number;
    description: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
    invoiceNumber?: string;
    date: string;
    sessionName?: string;
  }) => void;
  onAddDebtor: (data: { name: string; phone?: string; address?: string }) => void;
  onSelectDebtor: (debtorId: string) => void;
  onNavigateView: (view: 'DEBTORS' | 'CUSTOMERS' | 'DASHBOARD' | 'SUPPLIERS') => void;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  debtors,
  transactions,
  settings,
  currentSessionName,
  onAddTransaction,
  onAddDebtor,
  onSelectDebtor,
  onNavigateView,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome_1',
      sender: 'GEMINI',
      text: `أهلاً بك! أنا مساعد Gemini الذكي لمحل "${settings.storeName || 'السوبرماركت'}".\n\nأنا متصل بالكامل بقاعدة بيانات الديون، ويمكنني:\n• تسجيل ديون أو تسديدات مباشرة بالصوت أو الكتابة.\n• الاستعلام عن رصيد أي زبون وكشف حسابه.\n• تقديم ملخصات مالية وإحصائيات دقيقة فورية.\n\nتفضل بالتحدث معي أو اكتب ما تريده!`,
      timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speakResponses, setSpeakResponses] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalDebt = debtors.reduce((sum, d) => sum + (d.currentBalance > 0 ? d.currentBalance : 0), 0);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, liveTranscript]);

  // Clean speech recognition on close
  useEffect(() => {
    if (!isOpen) {
      speechRecognizer.stop();
      setIsListening(false);
      setLiveTranscript('');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen]);

  const speakText = (text: string) => {
    if (!speakResponses || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Remove json or technical characters
      const clean = text.replace(/[*#_{}[\]]/g, ' ').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      speechRecognizer.stop();
      setIsListening(false);
      if (liveTranscript.trim()) {
        handleSendMessage(liveTranscript.trim());
        setLiveTranscript('');
      }
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsListening(true);
    setLiveTranscript('');

    speechRecognizer.start({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (result: SpeechRecognitionResultItem) => {
        setLiveTranscript(result.transcript);
        if (result.isFinal) {
          const final = result.transcript.trim();
          setIsListening(false);
          setLiveTranscript('');
          speechRecognizer.stop();
          if (final) {
            handleSendMessage(final);
          }
        }
      },
      onEnd: () => {
        setIsListening(false);
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      },
    });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    setLiveTranscript('');

    const userMsg: AssistantMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          debtors,
          totalDebt,
          storeName: settings.storeName,
          currency: settings.currency,
          sessionName: currentSessionName || 'الجلسة 1',
          recentTransactions: transactions.slice(0, 15).map((t) => {
            const debtor = debtors.find((d) => d.id === t.debtorId);
            return {
              type: t.type,
              amount: t.amount,
              debtorName: debtor?.name || 'زبون',
              description: t.description || t.notes || '',
              date: t.date,
            };
          }),
        }),
      });

      const data = await res.json();
      let reply = data.reply || '';
      let action = data.action || null;

      // If response contained an error or failed connection message, fall back to smart local intent parser
      if (!res.ok || !reply || reply.includes('حدث خطأ أثناء الاتصال')) {
        const local = parseLocalIntent(text, debtors, settings.currency, totalDebt, transactions);
        reply = local.reply;
        action = local.action;
      }

      const aiMsg: AssistantMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'GEMINI',
        text: reply,
        timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
        action,
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakText(reply);

      // If action is provided, we can either execute directly or prompt confirmation
      if (action) {
        handleAutoExecuteAction(aiMsg.id, action);
      }
    } catch (err: any) {
      console.warn('Gemini Assistant Request Error, using local intent parser:', err);
      // Smart offline fallback if network fails
      handleLocalFallback(text);
    } finally {
      setIsLoading(false);
    }
  };

  // Local fallback if server endpoint or internet is unreachable
  const handleLocalFallback = (text: string) => {
    const local = parseLocalIntent(text, debtors, settings.currency, totalDebt, transactions);

    const aiMsg: AssistantMessage = {
      id: `msg_${Date.now()}_fallback`,
      sender: 'GEMINI',
      text: local.reply,
      timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      action: local.action,
    };

    setMessages((prev) => [...prev, aiMsg]);
    speakText(local.reply);
  };

  const handleExecuteAction = (msgId: string, action: NonNullable<AssistantMessage['action']>) => {
    if (action.executed) return;

    if (action.type === 'ADD_DEBT' || action.type === 'ADD_PAYMENT') {
      let debtorId = action.debtorId;
      if (!debtorId && action.debtorName) {
        const found = debtors.find(
          (d) =>
            d.name.toLowerCase().includes(action.debtorName!.toLowerCase()) ||
            action.debtorName!.toLowerCase().includes(d.name.toLowerCase())
        );
        if (found) debtorId = found.id;
      }

      if (!debtorId && debtors.length > 0) {
        debtorId = debtors[0].id;
      }

      if (debtorId && action.amount && action.amount > 0) {
        onAddTransaction({
          debtorId,
          type: action.type === 'ADD_DEBT' ? 'DEBT' : 'PAYMENT',
          amount: action.amount,
          description: action.description || (action.type === 'ADD_DEBT' ? 'تسجيل دين' : 'تسديد دفعة'),
          date: new Date().toISOString(),
          sessionName: currentSessionName || 'الجلسة 1',
        });

        // Mark as executed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, action: { ...action, executed: true } } : m
          )
        );
      }
    } else if (action.type === 'ADD_DEBTOR') {
      if (action.debtorName) {
        onAddDebtor({
          name: action.debtorName,
          phone: action.phone,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, action: { ...action, executed: true } } : m
          )
        );
      }
    } else if (action.type === 'VIEW_DEBTOR' && action.debtorId) {
      onSelectDebtor(action.debtorId);
      onClose();
    } else if (action.type === 'NAVIGATE' && action.view) {
      onNavigateView(action.view);
      onClose();
    }
  };

  const handleAutoExecuteAction = (msgId: string, action: NonNullable<AssistantMessage['action']>) => {
    // If it's a direct navigation or view debtor, execute immediately
    if (action.type === 'VIEW_DEBTOR' && action.debtorId) {
      // Keep in UI for user to click
    } else if (action.type === 'NAVIGATE' && action.view) {
      // Keep in UI for user to click
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] overflow-hidden bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#0c101d] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl h-[92vh] sm:h-[85vh] max-h-[800px] flex flex-col border border-indigo-200 dark:border-indigo-900/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Gemini Branding */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-purple-400 to-blue-400 p-0.5 shadow-md shadow-indigo-500/30 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                  <span>مساعد Gemini الذكي</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold border border-amber-400/40">
                    AI ✦
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-indigo-200/80">
                المساعد الصوتي والمحاسبي المتكامل لتنفيذ الأوامر والرد على الاستفسارات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speaker Toggle */}
            <button
              type="button"
              onClick={() => {
                setSpeakResponses(!speakResponses);
                if (speakResponses && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
              }}
              title={speakResponses ? 'كتم صوت الرد' : 'تفعيل نطق الردود صوتياً'}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                speakResponses
                  ? 'bg-indigo-700/60 text-amber-300 border-indigo-600'
                  : 'bg-indigo-950/60 text-indigo-400 border-indigo-800/80 hover:text-white'
              }`}
            >
              {speakResponses ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-indigo-200 hover:text-white hover:bg-indigo-800/50 rounded-xl transition-colors cursor-pointer"
              title="إغلاق المساعد"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Active Session & Context Badge */}
        <div className="px-4 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] flex items-center justify-between text-indigo-900 dark:text-indigo-200 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Tag className="w-3 h-3 text-indigo-500 shrink-0" />
            <span>الجلسة النشطة: <strong>{currentSessionName || 'الجلسة 1'}</strong></span>
            <span className="text-slate-400">•</span>
            <span>الزبائن: <strong>{debtors.length}</strong></span>
          </div>
          <div className="flex items-center gap-1 shrink-0 font-bold text-indigo-700 dark:text-indigo-300">
            <span>الديون: {formatCurrency(totalDebt, settings.currency)}</span>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-slate-50/60 dark:bg-[#080d19]">
          {messages.map((msg) => {
            const isUser = msg.sender === 'USER';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-xs font-bold ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-amber-300'
                  }`}
                >
                  {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                  <div
                    className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white dark:bg-[#12182b] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-[#222e49] rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Action Execution Card if Assistant suggested an action */}
                  {msg.action && (
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-[#11192e] dark:to-[#171733] border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        <div className="flex items-center gap-1.5">
                          {msg.action.type === 'ADD_DEBT' ? (
                            <PlusCircle className="w-4 h-4 text-rose-500" />
                          ) : msg.action.type === 'ADD_PAYMENT' ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          )}
                          <span>
                            {msg.action.type === 'ADD_DEBT'
                              ? 'أمر مقترح: تسجيل دين'
                              : msg.action.type === 'ADD_PAYMENT'
                              ? 'أمر مقترح: تسديد دفعة'
                              : msg.action.type === 'ADD_DEBTOR'
                              ? 'أمر مقترح: إضافة زبون جديد'
                              : 'أمر تفاعلي في التطبيق'}
                          </span>
                        </div>

                        {msg.action.executed ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>تم التنفيذ بنجاح</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
                            جاهز للتنفيذ
                          </span>
                        )}
                      </div>

                      {/* Action Details */}
                      <div className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 space-y-0.5 bg-white/70 dark:bg-[#0b101f] p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                        {msg.action.debtorName && (
                          <div>الزبون: <strong>{msg.action.debtorName}</strong></div>
                        )}
                        {msg.action.amount && (
                          <div>المبلغ: <strong>{formatCurrency(msg.action.amount, settings.currency)}</strong></div>
                        )}
                        {msg.action.description && (
                          <div>الوصف: <span>{msg.action.description}</span></div>
                        )}
                      </div>

                      {/* Execution Button */}
                      {!msg.action.executed ? (
                        <button
                          type="button"
                          onClick={() => handleExecuteAction(msg.id, msg.action!)}
                          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>تأكيد وتنفيذ هذا الأمر الآن في السجل</span>
                        </button>
                      ) : (
                        <div className="text-center text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ تمت إضافة الحركة وتحديث كشف الحساب ورصيد الزبون فورياً
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 px-1">{msg.timestamp}</div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-amber-300 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-3 bg-white dark:bg-[#12182b] border border-slate-200 dark:border-[#222e49] rounded-2xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>جاري معالجة طلبك بواسطة Gemini والتفاعل مع النظام...</span>
              </div>
            </div>
          )}

          {/* Live Voice Recording Transcript */}
          {isListening && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/50 animate-pulse text-xs text-purple-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span>جاري الاستماع لصوتك:</span>
                <span className="font-bold text-white font-mono">
                  {liveTranscript || 'تحدث الآن...'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleVoice}
                className="px-2 py-1 bg-rose-600 text-white rounded-md text-[10px] font-bold cursor-pointer"
              >
                إيقاف وإرسال
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 sm:px-4 py-2 bg-slate-100/90 dark:bg-[#0d1222] border-t border-slate-200 dark:border-[#1d273f] flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
          <span className="text-slate-400 font-semibold shrink-0">اقتراحات:</span>
          {[
            'كم مجموع الديون الحالية؟',
            'منو أكثر زبون عليه ديون؟',
            'سجل دين على أحمد 15000',
            'سدد 10000 من حساب محمد',
            'افتح واجهة الزبائن',
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => handleSendMessage(promptText)}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-[#151c30] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#273656] text-[11px] font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Input Bar with Mic & Send */}
        <div className="p-3 sm:p-4 bg-white dark:bg-[#0c101d] border-t border-slate-200 dark:border-[#1d273f] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Record Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-md ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-indigo-500/25'
              }`}
              title={isListening ? 'إيقاف التسجيل الصوتي' : 'تحدث صوتياً مع مساعد Gemini'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-amber-300" />}
            </button>

            {/* Input Field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="تحدث أو اكتب أمرك هنا لمساعد Gemini..."
                className="w-full py-3 px-4 bg-slate-50 dark:bg-[#141b2f] border border-slate-300 dark:border-[#273656] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white transition-colors cursor-pointer shrink-0 shadow-md shadow-indigo-600/25"
              title="إرسال الطلب"
            >
              <Send className="w-5 h-5 -rotate-45 translate-x-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
