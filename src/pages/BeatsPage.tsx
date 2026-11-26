import { Check, Play, RefreshCw, Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LiveStudioPlayer } from '../audio/beatEngine';
import { LiveAudioVisualizer } from '../components/AudioVisualizer';
import {
  BeatProposal,
  DEFAULT_MIX_SETTINGS,
  EMOTIONAL_CONTEXT_OPTIONS,
  EmotionalTag,
  MUSIC_STYLES,
  MusicStyle,
  VocalAnalysis,
} from '../types/music';

interface BeatsPageProps {
  analysis: VocalAnalysis | null;
  proposals: BeatProposal[];
  selectedProposalId: string | null;
  vocalBuffer: AudioBuffer | null;
  emotionalTags: EmotionalTag[];
  regenerating: boolean;
  onToggleEmotionalTag: (tag: EmotionalTag) => void;
  onSelectBeat: (proposal: BeatProposal) => void;
  onRegenerateBeats: (styles: MusicStyle[]) => void;
}

export function BeatsPage({
  analysis,
  proposals,
  selectedProposalId,
  vocalBuffer,
  emotionalTags,
  regenerating,
  onToggleEmotionalTag,
  onSelectBeat,
  onRegenerateBeats,
}: BeatsPageProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewWithVocal, setPreviewWithVocal] = useState<boolean>(true);
  const [progress, setProgress] = useState<{ cur: number; dur: number }>({ cur: 0, dur: 16 });
  const [customStyles, setCustomStyles] = useState<MusicStyle[]>(() => [
    analysis?.recommendedStyles?.[0] || 'Afrobeats',
    analysis?.recommendedStyles?.[1] || 'Amapiano',
    analysis?.recommendedStyles?.[2] || 'R&B',
  ]);

  const playerRef = useRef<LiveStudioPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new LiveStudioPlayer();
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (analysis?.recommendedStyles?.length) {
      setCustomStyles([
        analysis.recommendedStyles[0] || 'Afrobeats',
        analysis.recommendedStyles[1] || 'R&B',
        analysis.recommendedStyles[2] || 'Pop',
      ]);
    }
  }, [analysis]);

  const togglePlay = async (proposal: BeatProposal) => {
    const player = playerRef.current;
    if (!player) return;

    if (playingId === proposal.id) {
      player.stop();
      setPlayingId(null);
      setProgress({ cur: 0, dur: 16 });
      return;
    }

    setPlayingId(proposal.id);
    const mix = DEFAULT_MIX_SETTINGS(proposal.bpm);
    await player.play({
      proposal,
      mix,
      vocalBuffer,
      listenMode: previewWithVocal && vocalBuffer ? 'full' : 'instrumental',
      onProgress: (cur, dur) => setProgress({ cur, dur }),
      onEnded: () => {
        setPlayingId(null);
        setProgress({ cur: 0, dur: 16 });
      },
    });
  };

  const handleChoose = (proposal: BeatProposal) => {
    playerRef.current?.stop();
    setPlayingId(null);
    onSelectBeat(proposal);
  };

  const updateStyleAt = (idx: number, value: MusicStyle) => {
    setCustomStyles((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Trois propositions d&apos;accompagnements sur mesure
          </h1>
          <p className="text-sm text-slate-400">
            Comparez les trois lecteurs audio, écoutez avec ou sans votre voix originale, puis choisissez votre beat.
            {emotionalTags.length > 0 && (
              <span className="text-sky-400"> · Contexte : {emotionalTags.join(', ')}</span>
            )}
          </p>
        </div>

        {/* Preview Listen Toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0d0d17] border border-white/10 shrink-0 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => {
              playerRef.current?.stop();
              setPlayingId(null);
              setPreviewWithVocal(true);
            }}
            className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              previewWithVocal
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Avec ma voix originale
          </button>
          <button
            type="button"
            onClick={() => {
              playerRef.current?.stop();
              setPlayingId(null);
              setPreviewWithVocal(false);
            }}
            className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              !previewWithVocal
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Instrumental seul
          </button>
        </div>
      </div>

      {/* Live Spectrum Strip when playing */}
      {playingId && (
        <div className="p-4 rounded-xl border border-violet-500/30 bg-[#0d0d17] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="inline-flex items-center gap-2 font-medium text-white">
              <Volume2 className="w-4 h-4 text-sky-400" />
              Lecture : {proposals.find((p) => p.id === playingId)?.title}
            </span>
            <span className="font-mono tabular-nums text-sky-400">
              {progress.cur.toFixed(1)}s / {progress.dur.toFixed(1)}s
            </span>
          </div>
          <LiveAudioVisualizer
            analyser={playerRef.current?.getAnalyser() ?? null}
            active={Boolean(playingId)}
            height={68}
            variant="bars"
          />
        </div>
      )}

      {/* 3 Audio Players Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {proposals.map((proposal, index) => {
          const isPlaying = playingId === proposal.id;
          const isSelected = selectedProposalId === proposal.id;

          return (
            <article
              key={proposal.id}
              className={`rounded-xl border p-6 flex flex-col justify-between gap-6 transition-colors bg-[#0d0d17] ${
                isSelected
                  ? 'border-violet-500/70'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-mono tabular-nums text-sky-400">
                    Version instrumentale {index + 1} · {proposal.style}
                  </p>
                  <h2 className="font-display text-xl font-bold text-white">
                    {proposal.title}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono tabular-nums">
                    {proposal.bpm} BPM · {proposal.keyName} · {proposal.mood}
                  </p>
                </div>

                {/* Built-in Player Bar */}
                <div className="p-4 rounded-lg bg-[#07070d] border border-white/8 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlay(proposal)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-red-600/90 hover:bg-red-600 text-white'
                        : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Écouter
                      </>
                    )}
                  </button>

                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      style={{
                        width: isPlaying
                          ? `${Math.min(100, (progress.cur / Math.max(1, progress.dur)) * 100)}%`
                          : '0%',
                      }}
                      className="h-full bg-gradient-to-r from-violet-500 to-sky-400 transition-all duration-100"
                    />
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {proposal.arrangementSummary}
                </p>

                <div className="space-y-2 pt-2 border-t border-white/8 text-xs">
                  <div>
                    <span className="text-slate-400">Instrumentation : </span>
                    <span className="text-slate-200">
                      {proposal.instrumentsIncluded.join(' · ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Transitions : </span>
                    <span className="text-slate-300">{proposal.transitionsDescription}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleChoose(proposal)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all cursor-pointer"
              >
                {isSelected && <Check className="w-4 h-4" />}
                Choisir ce beat
              </button>
            </article>
          );
        })}
      </div>

      {/* Generate New Proposals Panel */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Générer de nouvelles propositions
            </h2>
            <p className="text-xs text-slate-400">
              Choisissez trois styles parmi les 14 genres disponibles pour composer de nouvelles versions autour de votre voix.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="space-y-1.5">
              <label
                htmlFor={`gen-style-${idx}`}
                className="block text-xs font-medium text-slate-300"
              >
                Style pour la proposition {idx + 1}
              </label>
              <select
                id={`gen-style-${idx}`}
                value={customStyles[idx]}
                onChange={(e) => updateStyleAt(idx, e.target.value as MusicStyle)}
                className="w-full px-3 py-2.5 rounded-lg bg-[#07070d] border border-white/12 text-xs sm:text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {MUSIC_STYLES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-300">
            Contexte émotionnel appliqué à la génération :
          </p>
          <div className="flex flex-wrap gap-2">
            {EMOTIONAL_CONTEXT_OPTIONS.map((opt) => {
              const active = emotionalTags.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onToggleEmotionalTag(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'border-violet-500 bg-violet-600/25 text-white'
                      : 'border-white/10 bg-[#07070d] text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={regenerating}
          onClick={() => {
            playerRef.current?.stop();
            setPlayingId(null);
            onRegenerateBeats(customStyles);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/12 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating
            ? 'Composition de 3 nouveaux beats...'
            : 'Générer de nouvelles propositions'}
        </button>
      </section>
    </div>
  );
}
