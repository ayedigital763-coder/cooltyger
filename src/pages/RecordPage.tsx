import {
  ArrowRight,
  FileText,
  Mic,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Scissors,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { computeWaveformPeaks, trimAudioBuffer } from '../audio/audioUtils';
import { LiveAudioVisualizer, WaveformOverview } from '../components/AudioVisualizer';
import { MUSIC_STYLES, MusicStyle } from '../types/music';

interface RecordPageProps {
  vocalBuffer: AudioBuffer | null;
  preferredStyle: MusicStyle | '';
  lyrics: string;
  isTranscribing: boolean;
  onPreferredStyleChange: (style: MusicStyle | '') => void;
  onLyricsChange: (lyrics: string) => void;
  onVocalReady: (buffer: AudioBuffer) => void;
  onTranscribeBuffer: (buffer: AudioBuffer) => Promise<void>;
  onClearVocal: () => void;
  onProceedToAnalyze: () => void;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

export function RecordPage({
  vocalBuffer,
  preferredStyle,
  lyrics,
  isTranscribing,
  onPreferredStyleChange,
  onLyricsChange,
  onVocalReady,
  onTranscribeBuffer,
  onClearVocal,
  onProceedToAnalyze,
}: RecordPageProps) {
  const [recState, setRecState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [liveInterim, setLiveInterim] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const previewSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewRafRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalSpeechRef = useRef<string>('');

  useEffect(() => {
    if (vocalBuffer) {
      setTrimStart(0);
      setTrimEnd(Number(vocalBuffer.duration.toFixed(2)));
    } else {
      setTrimStart(0);
      setTrimEnd(0);
    }
  }, [vocalBuffer]);

  useEffect(() => {
    return () => {
      stopPreview();
      cleanupRecording();
    };
  }, []);

  const peaks = useMemo(
    () => (vocalBuffer ? computeWaveformPeaks(vocalBuffer, 110) : []),
    [vocalBuffer]
  );

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setLiveInterim('');
  };

  const startSpeechRecognition = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const RecCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!RecCtor) return;

    try {
      const rec = new RecCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'fr-FR';
      rec.onresult = (event: any) => {
        let interim = '';
        let finals = finalSpeechRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const txt = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finals = finals ? `${finals}\n${txt.trim()}` : txt.trim();
          } else {
            interim += txt;
          }
        }
        finalSpeechRef.current = finals;
        setLiveInterim(interim.trim());
        if (finals) {
          onLyricsChange(finals);
        }
      };
      rec.onerror = () => {
        // Silent fallback: Gemini 3.5 Transcribe will handle post-recording transcription
      };
      rec.start();
      recognitionRef.current = rec;
    } catch {
      // Fallback handled post-recording
    }
  };

  const cleanupRecording = () => {
    stopSpeechRecognition();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setAnalyserNode(null);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    stopPreview();
    finalSpeechRef.current = '';
    setLiveInterim('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      setAnalyserNode(analyser);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupRecording();
        try {
          setIsDecoding(true);
          const decodeCtx = new AudioCtx();
          const arr = await blob.arrayBuffer();
          const decoded = await decodeCtx.decodeAudioData(arr);
          await decodeCtx.close().catch(() => {});
          onVocalReady(decoded);
          // Run high-accuracy Gemini Speech-to-Text post-recording
          void onTranscribeBuffer(decoded);
        } catch {
          setErrorMsg("Impossible de décoder l'enregistrement audio.");
        } finally {
          setIsDecoding(false);
          setRecState('idle');
        }
      };

      recorder.start(120);
      setElapsedSec(0);
      setRecState('recording');
      startSpeechRecognition();

      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => Number((prev + 0.1).toFixed(1)));
      }, 100);
    } catch {
      setErrorMsg(
        "L'accès au microphone a été refusé ou aucun microphone n'est disponible. Vous pouvez également importer un fichier MP3, WAV ou M4A."
      );
      cleanupRecording();
      setRecState('idle');
    }
  };

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (rec.state === 'recording') {
      rec.pause();
      stopSpeechRecognition();
      setRecState('paused');
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (rec.state === 'paused') {
      rec.resume();
      startSpeechRecognition();
      setRecState('recording');
      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => Number((prev + 0.1).toFixed(1)));
      }, 100);
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    } else {
      cleanupRecording();
      setRecState('idle');
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    stopPreview();
    setIsDecoding(true);

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const arr = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arr);
      await ctx.close().catch(() => {});
      onVocalReady(decoded);
      void onTranscribeBuffer(decoded);
    } catch {
      setErrorMsg('Format audio non pris en charge. Utilisez un fichier MP3, WAV ou M4A valide.');
    } finally {
      setIsDecoding(false);
      e.target.value = '';
    }
  };

  const stopPreview = () => {
    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = 0;
    }
    if (previewSrcRef.current) {
      try {
        previewSrcRef.current.stop();
      } catch {
        // ignore
      }
      previewSrcRef.current = null;
    }
    if (previewCtxRef.current) {
      previewCtxRef.current.close().catch(() => {});
      previewCtxRef.current = null;
    }
    setIsPlayingPreview(false);
    setPreviewTime(0);
  };

  const togglePreview = async () => {
    if (!vocalBuffer) return;
    if (isPlayingPreview) {
      stopPreview();
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    previewCtxRef.current = ctx;

    const src = ctx.createBufferSource();
    src.buffer = vocalBuffer;
    src.connect(ctx.destination);
    previewSrcRef.current = src;

    const playDur = Math.max(0.2, trimEnd - trimStart);
    const startAt = ctx.currentTime;
    src.start(startAt, trimStart, playDur);
    setIsPlayingPreview(true);

    const tick = () => {
      if (!previewCtxRef.current) return;
      const elapsed = previewCtxRef.current.currentTime - startAt;
      if (elapsed >= playDur) {
        stopPreview();
        return;
      }
      setPreviewTime(trimStart + elapsed);
      previewRafRef.current = requestAnimationFrame(tick);
    };
    previewRafRef.current = requestAnimationFrame(tick);
  };

  const applyTrim = () => {
    if (!vocalBuffer) return;
    stopPreview();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const trimmed = trimAudioBuffer(ctx, vocalBuffer, trimStart, trimEnd);
    ctx.close().catch(() => {});
    onVocalReady(trimmed);
    void onTranscribeBuffer(trimmed);
  };

  const resetVocal = () => {
    stopPreview();
    setElapsedSec(0);
    setErrorMsg(null);
    finalSpeechRef.current = '';
    setLiveInterim('');
    onClearVocal();
  };

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Enregistrement vocal a cappella
          </h1>
          <p className="text-sm text-slate-400">
            Chantez librement sans musique de fond. Votre voix originale est conservée telle quelle et transcrite automatiquement.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-100 bg-white/8 hover:bg-white/12 border border-white/12 transition-colors cursor-pointer whitespace-nowrap shrink-0">
          <Upload className="w-4 h-4 text-sky-400" />
          <span>Importer MP3 / WAV / M4A</span>
          <input
            type="file"
            accept=".mp3,.wav,.m4a,audio/*"
            onChange={handleFileUpload}
            className="sr-only"
          />
        </label>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-500/12 border border-red-500/30 text-sm text-red-200"
        >
          {errorMsg}
        </div>
      )}

      {/* Live Microphone Studio Console */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">
              {recState === 'recording'
                ? 'Enregistrement en cours — chantez librement'
                : recState === 'paused'
                  ? 'Enregistrement en pause'
                  : 'Prêt à enregistrer votre voix'}
            </h2>
            <p className="text-xs text-slate-400">
              Conseil : gardez une distance régulière de 15 à 20 cm avec le microphone.
            </p>
          </div>

          <div className="font-mono tabular-nums text-2xl font-semibold text-sky-400">
            {formatTime(elapsedSec)}
          </div>
        </div>

        <LiveAudioVisualizer
          analyser={analyserNode}
          active={recState === 'recording'}
          height={120}
          variant="bars"
        />

        {/* Real-time live speech-to-text stream during recording */}
        {recState !== 'idle' && (
          <div className="p-4 rounded-lg bg-[#07070d] border border-white/8 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-sky-400">Transcription vocale en direct</span>
              <span className="text-slate-500">Affinée par l&apos;IA après la prise</span>
            </div>
            <p className="text-sm text-slate-200 min-h-[24px] whitespace-pre-wrap">
              {lyrics || liveInterim
                ? `${lyrics}${lyrics && liveInterim ? '\n' : ''}${liveInterim}`
                : 'En attente de votre voix...'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {recState === 'idle' ? (
            <button
              type="button"
              disabled={isDecoding}
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-60 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              {vocalBuffer ? 'Nouvel enregistrement' : 'Commencer à chanter'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={pauseRecording}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/12 transition-colors cursor-pointer"
              >
                {recState === 'paused' ? (
                  <>
                    <Play className="w-4 h-4 text-sky-400" />
                    Reprendre
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 text-amber-400" />
                    Mettre en pause
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-red-600/90 hover:bg-red-600 transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4" />
                Terminer la prise
              </button>
            </>
          )}

          {isDecoding && (
            <span className="text-xs text-sky-300">Décodage audio haute qualité en cours...</span>
          )}
        </div>
      </section>

      {/* Recorded / Imported Vocal Review, Trim & Lyrics Section */}
      {vocalBuffer && (
        <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Réécoute et découpe de votre prise vocale
              </h2>
              <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                Durée totale : {vocalBuffer.duration.toFixed(1)} s · {vocalBuffer.sampleRate} Hz ·{' '}
                {vocalBuffer.numberOfChannels === 2 ? 'Stéréo' : 'Mono'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePreview}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/12 transition-colors cursor-pointer"
              >
                {isPlayingPreview ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-red-400" />
                    Arrêter
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-sky-400" />
                    Réécouter la sélection
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopPreview();
                  setTrimStart(0);
                  setTrimEnd(Number(vocalBuffer.duration.toFixed(2)));
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/6 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser sélection
              </button>

              <button
                type="button"
                onClick={resetVocal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer et recommencer
              </button>
            </div>
          </div>

          <WaveformOverview
            peaks={peaks}
            durationSec={vocalBuffer.duration}
            currentSec={previewTime}
            trimStartSec={trimStart}
            trimEndSec={trimEnd}
            height={104}
          />

          {/* Trim Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="trim-start" className="text-slate-300 font-medium">
                  Début de la voix
                </label>
                <span className="font-mono tabular-nums text-sky-400">
                  {trimStart.toFixed(2)} s
                </span>
              </div>
              <input
                id="trim-start"
                type="range"
                min={0}
                max={Math.max(0.1, trimEnd - 0.5)}
                step={0.05}
                value={trimStart}
                onChange={(e) => setTrimStart(Number(e.target.value))}
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="trim-end" className="text-slate-300 font-medium">
                  Fin de la voix
                </label>
                <span className="font-mono tabular-nums text-sky-400">
                  {trimEnd.toFixed(2)} s
                </span>
              </div>
              <input
                id="trim-end"
                type="range"
                min={Math.min(vocalBuffer.duration, trimStart + 0.5)}
                max={Number(vocalBuffer.duration.toFixed(2))}
                step={0.05}
                value={trimEnd}
                onChange={(e) => setTrimEnd(Number(e.target.value))}
                className="studio-slider w-full"
              />
            </div>
          </div>

          {/* Post-recording / Post-import Speech-to-Text Lyrics Preview */}
          <div className="p-4 rounded-xl bg-[#07070d] border border-white/8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-white">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Paroles transcrites (éditables également dans le Studio)</span>
              </div>
              <button
                type="button"
                disabled={isTranscribing}
                onClick={() => onTranscribeBuffer(vocalBuffer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/14 border border-white/10 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTranscribing ? 'animate-spin' : ''}`} />
                {isTranscribing ? 'Transcription en cours...' : 'Transcrire avec l’IA'}
              </button>
            </div>

            <textarea
              rows={3}
              value={lyrics}
              onChange={(e) => onLyricsChange(e.target.value)}
              placeholder={
                isTranscribing
                  ? 'Transcription de votre voix par l’IA en cours...'
                  : 'Les paroles détectées apparaîtront ici. Vous pouvez aussi les saisir ou les corriger manuellement.'
              }
              className="w-full px-3 py-2.5 rounded-lg bg-[#0d0d17] border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/8">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={trimStart === 0 && trimEnd >= vocalBuffer.duration - 0.05}
                onClick={applyTrim}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-100 bg-white/8 hover:bg-white/14 border border-white/12 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-sky-400" />
                Appliquer la découpe ({(trimEnd - trimStart).toFixed(1)} s)
              </button>

              <div className="flex items-center gap-2">
                <label htmlFor="style-hint" className="text-xs text-slate-400 whitespace-nowrap">
                  Style souhaité (facultatif) :
                </label>
                <select
                  id="style-hint"
                  value={preferredStyle}
                  onChange={(e) => onPreferredStyleChange(e.target.value as MusicStyle | '')}
                  className="px-3 py-2 rounded-lg bg-[#07070d] border border-white/12 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                >
                  <option value="">Laisser l&apos;IA choisir librement</option>
                  {MUSIC_STYLES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                stopPreview();
                onProceedToAnalyze();
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Analyser ma voix avec l&apos;IA
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
