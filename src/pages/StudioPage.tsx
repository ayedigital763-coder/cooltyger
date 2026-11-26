import {
  ArrowRight,
  Check,
  Copy,
  FileText,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  Square,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ListenMode, LiveStudioPlayer } from '../audio/beatEngine';
import { LiveAudioVisualizer } from '../components/AudioVisualizer';
import {
  BeatProposal,
  MixSettings,
  PageId,
  StudioEffects,
} from '../types/music';

interface StudioPageProps {
  projectTitle: string;
  onTitleChange: (title: string) => void;
  vocalBuffer: AudioBuffer | null;
  proposals: BeatProposal[];
  selectedProposal: BeatProposal | null;
  mixSettings: MixSettings;
  lyrics: string;
  isTranscribing: boolean;
  onLyricsChange: (lyrics: string) => void;
  onRetranscribe: () => Promise<void>;
  onSelectProposal: (proposal: BeatProposal) => void;
  onMixChange: (next: MixSettings) => void;
  onSaveProject: () => Promise<void>;
  onNavigate: (page: PageId) => void;
}

export function StudioPage({
  projectTitle,
  onTitleChange,
  vocalBuffer,
  proposals,
  selectedProposal,
  mixSettings,
  lyrics,
  isTranscribing,
  onLyricsChange,
  onRetranscribe,
  onSelectProposal,
  onMixChange,
  onSaveProject,
  onNavigate,
}: StudioPageProps) {
  const [listenMode, setListenMode] = useState<ListenMode>('full');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({ cur: 0, dur: vocalBuffer?.duration ?? 16 });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  const playerRef = useRef<LiveStudioPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new LiveStudioPlayer();
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (playerRef.current?.getIsPlaying()) {
      playerRef.current.updateLiveMix(mixSettings, listenMode);
    }
  }, [mixSettings, listenMode]);

  if (!selectedProposal || !vocalBuffer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Sliders className="w-10 h-10 text-slate-600 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-white">
          Le studio attend votre voix et votre beat
        </h1>
        <p className="text-sm text-slate-400">
          Enregistrez une voix puis sélectionnez l&apos;une des trois propositions instrumentales pour ouvrir le studio de mixage.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 cursor-pointer"
        >
          Commencer un enregistrement
        </button>
      </div>
    );
  }

  const startPlayback = async (
    overrideProposal?: BeatProposal,
    overrideMix?: MixSettings,
    overrideMode?: ListenMode
  ) => {
    const player = playerRef.current;
    if (!player) return;
    setIsPlaying(true);
    await player.play({
      proposal: overrideProposal ?? selectedProposal,
      mix: overrideMix ?? mixSettings,
      vocalBuffer,
      listenMode: overrideMode ?? listenMode,
      onProgress: (cur, dur) => setProgress({ cur, dur }),
      onEnded: () => {
        setIsPlaying(false);
        setProgress({ cur: 0, dur: vocalBuffer.duration });
      },
    });
  };

  const togglePlay = async () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
      setProgress({ cur: 0, dur: vocalBuffer.duration });
      return;
    }
    await startPlayback();
  };

  const handleTempoChange = (bpm: number) => {
    const next = { ...mixSettings, tempoBpm: bpm };
    onMixChange(next);
    if (isPlaying) {
      startPlayback(selectedProposal, next, listenMode);
    }
  };

  const handleVocalModeChange = (mode: 'original' | 'enhanced') => {
    const next = { ...mixSettings, vocalMode: mode };
    onMixChange(next);
    if (isPlaying) {
      startPlayback(selectedProposal, next, listenMode);
    }
  };

  const toggleEffect = (key: keyof StudioEffects) => {
    const next: MixSettings = {
      ...mixSettings,
      effects: {
        ...mixSettings.effects,
        [key]: !mixSettings.effects[key],
      },
    };
    onMixChange(next);
    if (isPlaying) {
      startPlayback(selectedProposal, next, listenMode);
    }
  };

  const handleBeatSwitch = (proposal: BeatProposal) => {
    onSelectProposal(proposal);
    if (isPlaying) {
      startPlayback(proposal, { ...mixSettings, tempoBpm: proposal.bpm }, listenMode);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveProject();
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Studio Top Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 max-w-xl">
          <label htmlFor="studio-title" className="text-xs text-slate-400">
            Titre du morceau
          </label>
          <input
            id="studio-title"
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={100}
            className="w-full font-display text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-white/15 focus:border-violet-500 pb-1 focus:outline-none"
          />
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            {selectedProposal.style} · {mixSettings.tempoBpm} BPM · {selectedProposal.keyName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-100 bg-white/8 hover:bg-white/14 border border-white/12 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-sky-400" />
            {saving ? 'Sauvegarde...' : savedNotice ? 'Sauvegardé' : 'Sauvegarder'}
          </button>

          <button
            type="button"
            onClick={() => {
              playerRef.current?.stop();
              setIsPlaying(false);
              onNavigate('export');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all cursor-pointer"
          >
            Passer à l&apos;exportation
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transport & Listening Mode Console */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-4 h-4" />
                  Arrêter
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Lire le mix
                </>
              )}
            </button>

            <div className="font-mono tabular-nums text-sm text-sky-400">
              {progress.cur.toFixed(1)} s / {progress.dur.toFixed(1)} s
            </div>
          </div>

          {/* 3 Listen Modes */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#07070d] border border-white/8 self-start md:self-auto">
            {(
              [
                { id: 'full', label: 'Chanson complète' },
                { id: 'vocal', label: 'Voix seule' },
                { id: 'instrumental', label: 'Instrumental seul' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setListenMode(m.id)}
                className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  listenMode === m.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <LiveAudioVisualizer
          analyser={playerRef.current?.getAnalyser() ?? null}
          active={isPlaying}
          height={96}
          variant="bars"
        />
      </section>

      {/* Main Mixing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vocal Mode + Main Volumes + Tempo */}
        <div className="lg:col-span-7 space-y-6">
          {/* Vocal Preservation Mode */}
          <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-white">
                Traitement de la voix
              </h2>
              <span className="text-xs text-sky-400">Identité vocale 100 % préservée</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleVocalModeChange('original')}
                className={`p-4 rounded-lg border text-left transition-colors cursor-pointer space-y-1 ${
                  mixSettings.vocalMode === 'original'
                    ? 'border-violet-500 bg-violet-600/15'
                    : 'border-white/10 bg-[#07070d] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  Mode Voix Originale (défaut)
                </div>
                <p className="text-xs text-slate-400">
                  Aucune modification vocale. Signal brut intact à 100 %.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleVocalModeChange('enhanced')}
                className={`p-4 rounded-lg border text-left transition-colors cursor-pointer space-y-1 ${
                  mixSettings.vocalMode === 'enhanced'
                    ? 'border-violet-500 bg-violet-600/15'
                    : 'border-white/10 bg-[#07070d] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Mode Amélioration (facultatif)
                </div>
                <p className="text-xs text-slate-400">
                  Clarté douce et équilibre dynamique léger sans dénaturer votre timbre.
                </p>
              </button>
            </div>
          </section>

          {/* Master & Stem Volumes + Tempo */}
          <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-5">
            <h2 className="font-display text-lg font-semibold text-white">
              Balance et tempo
            </h2>

            <div className="space-y-4">
              {/* Vocal Volume */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="vol-vocal" className="font-medium text-white">
                    Volume de la voix originale
                  </label>
                  <span className="font-mono tabular-nums text-sky-400">
                    {Math.round(mixSettings.vocalVolume * 100)} %
                  </span>
                </div>
                <input
                  id="vol-vocal"
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.02}
                  value={mixSettings.vocalVolume}
                  onChange={(e) =>
                    onMixChange({ ...mixSettings, vocalVolume: Number(e.target.value) })
                  }
                  className="studio-slider w-full"
                />
              </div>

              {/* Instrumental Master Volume */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="vol-inst" className="font-medium text-white">
                    Volume global des instruments
                  </label>
                  <span className="font-mono tabular-nums text-sky-400">
                    {Math.round(mixSettings.instrumentalVolume * 100)} %
                  </span>
                </div>
                <input
                  id="vol-inst"
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.02}
                  value={mixSettings.instrumentalVolume}
                  onChange={(e) =>
                    onMixChange({
                      ...mixSettings,
                      instrumentalVolume: Number(e.target.value),
                    })
                  }
                  className="studio-slider w-full"
                />
              </div>

              {/* Tempo BPM */}
              <div className="space-y-1.5 pt-2 border-t border-white/8">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="mix-tempo" className="font-medium text-white">
                    Tempo de l&apos;accompagnement
                  </label>
                  <span className="font-mono tabular-nums text-violet-400">
                    {mixSettings.tempoBpm} BPM
                  </span>
                </div>
                <input
                  id="mix-tempo"
                  type="range"
                  min={65}
                  max={165}
                  step={1}
                  value={mixSettings.tempoBpm}
                  onChange={(e) => handleTempoChange(Number(e.target.value))}
                  className="studio-slider w-full"
                />
              </div>
            </div>

            {/* Stem Faders */}
            <div className="pt-4 border-t border-white/8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { key: 'drumVolume', label: 'Batterie' },
                  { key: 'percussionVolume', label: 'Percussions' },
                  { key: 'bassVolume', label: 'Basse' },
                  { key: 'pianoVolume', label: 'Piano & Harmonies' },
                  { key: 'guitarSynthVolume', label: 'Guitares & Synthétiseurs' },
                ] as const
              ).map((stem) => (
                <div key={stem.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{stem.label}</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {Math.round(mixSettings[stem.key] * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.4}
                    step={0.05}
                    value={mixSettings[stem.key]}
                    onChange={(e) =>
                      onMixChange({ ...mixSettings, [stem.key]: Number(e.target.value) })
                    }
                    className="studio-slider w-full"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Beat Switcher + Instrumental Effects */}
        <div className="lg:col-span-5 space-y-6">
          {/* Switch Beat Proposal */}
          <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">
                Modifier le beat
              </h2>
              <button
                type="button"
                onClick={() => {
                  playerRef.current?.stop();
                  setIsPlaying(false);
                  onNavigate('beats');
                }}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                Autres styles
              </button>
            </div>

            <div className="space-y-2.5">
              {proposals.map((prop, idx) => {
                const active = prop.id === selectedProposal.id;
                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => handleBeatSwitch(prop)}
                    className={`w-full p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-violet-500 bg-violet-600/15'
                        : 'border-white/8 bg-[#07070d] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {prop.title}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-sky-400 shrink-0">
                        V{idx + 1} · {prop.bpm} BPM
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {prop.style} · {prop.mood}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Instrumental Effects */}
          <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-white">
                Effets instrumentaux
              </h2>
              <p className="text-xs text-slate-400">
                Ces effets s&apos;appliquent uniquement sur les instruments, jamais sur votre voix.
              </p>
            </div>

            <div className="space-y-2.5">
              {(
                [
                  {
                    key: 'reverb',
                    label: 'Réverbération de salle',
                    desc: 'Ajoute de la profondeur autour des accords et percussions.',
                  },
                  {
                    key: 'delay',
                    label: 'Delay rythmique synchronisé',
                    desc: 'Écho calé sur le tempo pour les guitares et synthétiseurs.',
                  },
                  {
                    key: 'warmth',
                    label: 'Chaleur analogique',
                    desc: 'Saturation douce inspirée des consoles studio.',
                  },
                  {
                    key: 'stereoWidth',
                    label: 'Élargissement stéréo',
                    desc: 'Ouvre l’espace stéréo des harmonies pour laisser la voix au centre.',
                  },
                  {
                    key: 'lofiFilter',
                    label: 'Filtre chaud feutré',
                    desc: 'Adoucit les aigus des instruments pour une ambiance intime.',
                  },
                ] as const
              ).map((fx) => {
                const enabled = mixSettings.effects[fx.key];
                return (
                  <button
                    key={fx.key}
                    type="button"
                    onClick={() => toggleEffect(fx.key)}
                    className={`w-full p-3.5 rounded-lg border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      enabled
                        ? 'border-sky-500/50 bg-sky-500/10'
                        : 'border-white/8 bg-[#07070d] hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">{fx.label}</p>
                      <p className="text-[11px] text-slate-400">{fx.desc}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold shrink-0 ${
                        enabled
                          ? 'bg-sky-500/25 text-sky-300'
                          : 'bg-white/6 text-slate-400'
                      }`}
                    >
                      {enabled ? 'Actif' : 'Inactif'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Dedicated Lyrics & Speech-to-Text Panel */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <h2 className="font-display text-lg font-semibold text-white">
                Paroles & Transcription vocale
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Texte extrait automatiquement de votre voix. Modifiez librement les paroles ou relancez la transcription IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isTranscribing}
              onClick={onRetranscribe}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-100 bg-white/8 hover:bg-white/14 border border-white/10 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTranscribing ? 'animate-spin' : ''}`} />
              {isTranscribing ? 'Transcription...' : 'Transcrire à nouveau (IA)'}
            </button>

            <button
              type="button"
              disabled={!lyrics.trim()}
              onClick={() => {
                navigator.clipboard?.writeText(lyrics).catch(() => {});
                setCopiedLyrics(true);
                setTimeout(() => setCopiedLyrics(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-white/6 hover:bg-white/12 border border-white/10 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {copiedLyrics ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLyrics ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={lyrics}
          onChange={(e) => onLyricsChange(e.target.value)}
          placeholder="Aucune parole transcrite pour le moment. Cliquez sur « Transcrire à nouveau (IA) » ou saisissez vos paroles ici..."
          aria-label="Paroles de la chanson"
          className="w-full px-4 py-3 rounded-lg bg-[#07070d] border border-white/10 text-sm text-slate-100 leading-relaxed placeholder:text-slate-600 focus:outline-none focus:border-violet-500 resize-y"
        />

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
          <span>
            {lyrics.trim() ? lyrics.trim().split(/\s+/).length : 0} mot(s) ·{' '}
            {lyrics ? lyrics.split('\n').filter((l) => l.trim().length > 0).length : 0} ligne(s)
          </span>
          <span>Sauvegardé avec le projet</span>
        </div>
      </section>
    </div>
  );
}
