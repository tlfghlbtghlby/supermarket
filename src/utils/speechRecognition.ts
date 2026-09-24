// Speech recognition utility supporting Web Speech API with Arabic (ar-SA / ar-IQ)

export interface SpeechRecognitionResultItem {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface SpeechRecognizerCallbacks {
  onStart?: () => void;
  onResult: (result: SpeechRecognitionResultItem) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class AppSpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private isStarting: boolean = false;
  // ar-SA is universal across all Android and iOS devices, handles all Arabic dialects
  private currentLang: string = 'ar-SA';
  private callbacks: SpeechRecognizerCallbacks | null = null;
  private userRequestedStop: boolean = false;
  private autoRestartCount: number = 0;
  private maxAutoRestarts: number = 2;

  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public setLanguage(lang: string = 'ar-SA') {
    this.currentLang = lang;
    if (this.recognition) {
      try {
        this.recognition.lang = lang;
      } catch (e) {
        // ignore
      }
    }
  }

  public async start(callbacks: SpeechRecognizerCallbacks) {
    this.callbacks = callbacks;
    this.userRequestedStop = false;
    this.autoRestartCount = 0;

    if (!AppSpeechRecognizer.isSupported()) {
      callbacks.onError?.('متصفحك لا يدعم التعرف الصوتي المباشر. يرجى استخدام متصفح Google Chrome أو Microsoft Edge.');
      return;
    }

    // Clean up any previous session safely
    this.cleanupCurrentInstance();

    // Check / prompt for microphone permission explicitly to avoid sudden popup dismissal
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks after permission verification
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr: any) {
        if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
          this.callbacks?.onError?.('تم حظر الوصول إلى الميكروفون. يرجى السماح بالصلاحية من إعدادات المتصفح.');
          return;
        }
        // Continue if it was just a transient warning
      }
    }

    this.initAndStart();
  }

  private initAndStart() {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        this.callbacks?.onError?.('التعرف الصوتي غير متوفر في هذا المتصفح.');
        return;
      }

      const instance = new SpeechRecognition();

      // Mobile Chrome/WebKit crashes or closes the speech popup immediately if continuous=true
      // We set continuous=false for mobile/broad compatibility, and handle phrase completion
      const isMobile = typeof navigator !== 'undefined' && 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

      instance.continuous = !isMobile;
      instance.interimResults = true;
      instance.maxAlternatives = 1;
      instance.lang = this.currentLang;

      instance.onstart = () => {
        this.isStarting = false;
        this.isListening = true;
        this.playChime('start');
        this.callbacks?.onStart?.();
      };

      instance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0.9;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
            confidence = res[0].confidence || 0.9;
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const transcript = (finalTranscript || interimTranscript).trim();
        if (transcript && this.callbacks?.onResult) {
          this.callbacks.onResult({
            transcript,
            isFinal: Boolean(finalTranscript),
            confidence,
          });
        }
      };

      instance.onerror = (event: any) => {
        const error = event.error;
        console.warn('Speech recognition error event:', error);

        if (this.userRequestedStop || error === 'aborted') {
          return;
        }

        if (error === 'no-speech') {
          // If no speech heard on mobile, we don't treat it as a hard crash
          if (!this.userRequestedStop && this.autoRestartCount < this.maxAutoRestarts) {
            this.autoRestartCount++;
            return;
          }
          this.callbacks?.onError?.('لم يتم سماع أي صوت. انقر وتحدث بصوت واضح بالقرب من الميكروفون.');
          return;
        }

        if (error === 'not-allowed' || error === 'permission-denied') {
          this.callbacks?.onError?.('يرجى السماح بصلاحية الميكروفون من قفل الموقع بأعلى المتصفح.');
          return;
        }

        if (error === 'audio-capture') {
          this.callbacks?.onError?.('لم يتم العثور على ميكروفون يعمل أو أنه قيد الاستخدام في تطبيق آخر.');
          return;
        }

        if (error === 'network') {
          this.callbacks?.onError?.('تعذر الاتصال بخدمة التعرف الصوتي. يرجى التحقق من اتصال الإنترنت.');
          return;
        }

        this.callbacks?.onError?.(`تنبيه التعرف الصوتي: ${error}`);
      };

      instance.onend = () => {
        const wasActive = this.isListening || this.isStarting;
        this.isListening = false;
        this.isStarting = false;

        if (wasActive && !this.userRequestedStop) {
          this.playChime('stop');
        }

        this.callbacks?.onEnd?.();
      };

      this.recognition = instance;
      this.isStarting = true;

      try {
        instance.start();
      } catch (err: any) {
        this.isStarting = false;
        this.isListening = false;
        console.warn('Recognition start exception caught:', err?.message || err);
        this.cleanupCurrentInstance();
        this.callbacks?.onError?.('تعذر بدء التعرف الصوتي. انقر مجدداً للتحدث.');
      }
    } catch (e: any) {
      this.isStarting = false;
      this.isListening = false;
      console.warn('Failed to initialize speech recognition:', e);
      this.callbacks?.onError?.('تعذر تشغيل الميكروفون.');
    }
  }

  public stop() {
    this.userRequestedStop = true;
    this.cleanupCurrentInstance();
  }

  private cleanupCurrentInstance() {
    if (this.recognition) {
      const rec = this.recognition;
      this.recognition = null;
      this.isListening = false;
      this.isStarting = false;

      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;

      try {
        rec.abort();
      } catch (e) {
        // ignore
      }
    } else {
      this.isListening = false;
      this.isStarting = false;
    }
  }

  public getActiveState(): boolean {
    return this.isListening || this.isStarting;
  }

  // Soft web-audio chime feedback
  private playChime(type: 'start' | 'stop' | 'success') {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'start') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      } else {
        // Success
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      }

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext blocked
    }
  }
}

export const speechRecognizer = new AppSpeechRecognizer();
