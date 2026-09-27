// Speech recognition utility supporting Web Speech API with Arabic (ar-IQ / ar-SA)
// Supports non-stop continuous listening until user explicitly stops it by clicking the button again.

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
  // Default to ar-IQ for Iraqi dialect recognition, fallback gracefully to ar-SA
  private currentLang: string = 'ar-IQ';
  private callbacks: SpeechRecognizerCallbacks | null = null;
  private userRequestedStop: boolean = false;
  private accumulatedFinalText: string = '';
  private restartTimer: any = null;

  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public setLanguage(lang: string = 'ar-IQ') {
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
    this.accumulatedFinalText = '';

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

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
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr: any) {
        if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
          this.callbacks?.onError?.('تم حظر الوصول إلى الميكروفون. يرجى السماح بالصلاحية من إعدادات المتصفح.');
          return;
        }
      }
    }

    this.playChime('start');
    this.initAndStart(false);
  }

  private initAndStart(isSilentRestart: boolean = false) {
    if (this.userRequestedStop) return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        if (!isSilentRestart) {
          this.callbacks?.onError?.('التعرف الصوتي غير متوفر في هذا المتصفح.');
        }
        return;
      }

      this.cleanupCurrentInstance();

      const instance = new SpeechRecognition();

      instance.continuous = true;
      instance.interimResults = true;
      instance.maxAlternatives = 3;
      instance.lang = this.currentLang;

      instance.onstart = () => {
        this.isStarting = false;
        this.isListening = true;
        if (!isSilentRestart) {
          this.callbacks?.onStart?.();
        }
      };

      instance.onresult = (event: any) => {
        let interimTranscript = '';
        let newlyFinalChunk = '';
        let confidence = 0.95;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            newlyFinalChunk += ' ' + res[0].transcript;
            confidence = res[0].confidence || 0.95;
          } else {
            interimTranscript += ' ' + res[0].transcript;
          }
        }

        if (newlyFinalChunk.trim()) {
          this.accumulatedFinalText = (this.accumulatedFinalText + ' ' + newlyFinalChunk).replace(/\s+/g, ' ').trim();
        }

        const fullCombined = (this.accumulatedFinalText + ' ' + interimTranscript).replace(/\s+/g, ' ').trim();

        if (fullCombined && this.callbacks?.onResult) {
          this.callbacks.onResult({
            transcript: fullCombined,
            isFinal: false, // We keep listening continuous until user clicks button again
            confidence,
          });
        }
      };

      instance.onerror = (event: any) => {
        const error = event.error;
        console.warn('Speech recognition status event:', error);

        if (this.userRequestedStop || error === 'aborted') {
          return;
        }

        // 'no-speech' is common when user pauses to think; do not abort, just quietly keep listening
        if (error === 'no-speech') {
          return;
        }

        if (error === 'not-allowed' || error === 'permission-denied') {
          this.userRequestedStop = true;
          this.callbacks?.onError?.('يرجى السماح بصلاحية الميكروفون من قفل الموقع بأعلى المتصفح.');
          return;
        }

        if (error === 'audio-capture') {
          this.userRequestedStop = true;
          this.callbacks?.onError?.('لم يتم العثور على ميكروفون يعمل أو أنه قيد الاستخدام في تطبيق آخر.');
          return;
        }

        if (error === 'network') {
          console.warn('Network issue during speech recognition, will retry');
          return;
        }
      };

      instance.onend = () => {
        this.isListening = false;
        this.isStarting = false;

        // CRITICAL: Continuous listening until the user clicks the button again!
        // Browsers close recognition after periods of silence. We seamlessly resume if user has not stopped it.
        if (!this.userRequestedStop && this.callbacks) {
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (!this.userRequestedStop && this.callbacks) {
              this.initAndStart(true);
            }
          }, 80);
          return;
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
        console.warn('Speech restart note:', err?.message || err);
        // If start failed because it was already running, just wait
        if (!this.userRequestedStop) {
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (!this.userRequestedStop) this.initAndStart(true);
          }, 200);
        }
      }
    } catch (e: any) {
      this.isStarting = false;
      this.isListening = false;
      console.warn('Failed to initialize speech recognition:', e);
      if (!isSilentRestart) {
        this.callbacks?.onError?.('تعذر تشغيل الميكروفون.');
      }
    }
  }

  public stop(): string {
    this.userRequestedStop = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const finalResult = this.accumulatedFinalText.trim();
    this.cleanupCurrentInstance();
    this.playChime('stop');
    this.callbacks?.onEnd?.();
    return finalResult;
  }

  public getAccumulatedText(): string {
    return this.accumulatedFinalText.trim();
  }

  public reset() {
    this.accumulatedFinalText = '';
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
        rec.stop?.();
        rec.abort?.();
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
