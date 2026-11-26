import { Download, Mic, Play, Search, Sliders, Square, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { deserializeAudioBuffer } from '../audio/audioUtils';
import { LiveStudioPlayer } from '../audio/beatEngine';
import { MUSIC_STYLES, PageId, StoredProject } from '../types/music';

interface LibraryPageProps {
  projects: StoredProject[];
  onOpenProject: (project: StoredProject, targetPage: 'studio' | 'export') => void;
  onDeleteProject: (id: string) => void;
  onNavigate: (page: PageId) => void;
}

export function LibraryPage({
  projects,
  onOpenProject,
  onDeleteProject,
  onNavigate,
}: LibraryPageProps) {
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState<string>('Tous');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playerRef = useRef<LiveStudioPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new LiveStudioPlayer();
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesStyle = styleFilter === 'Tous' || p.style === styleFilter;
      const q = search.trim().toLowerCase();
      const matchesText =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.style.toLowerCase().includes(q) ||
        p.keyName.toLowerCase().includes(q);
      return matchesStyle && matchesText;
    });
  }, [projects, search, styleFilter]);

  const togglePlay = async (proj: StoredProject) => {
    const player = playerRef.current;
    if (!player) return;

    if (playingId === proj.id) {
      player.stop();
      setPlayingId(null);
      return;
    }

    const selectedProposal =
      proj.proposals.find((p) => p.id === proj.selectedProposalId) || proj.proposals[0];
    if (!selectedProposal) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const tempCtx = new AudioCtx();
    const vocalBuffer = deserializeAudioBuffer(
      tempCtx,
      proj.vocalSampleRate,
      proj.vocalChannels
    );
    await tempCtx.close().catch(() => {});

    setPlayingId(proj.id);
    await player.play({
      proposal: selectedProposal,
      mix: proj.mixSettings,
      vocalBuffer,
      listenMode: 'full',
      onEnded: () => setPlayingId(null),
    });
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Bibliothèque musicale
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Retrouvez toutes vos créations vocales, réécoutez-les et réouvrez-les dans le studio.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          Nouveau titre
        </button>
      </div>

      {/* Search & Genre Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, style ou tonalité..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0d0d17] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <select
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value)}
          aria-label="Filtrer par style musical"
          className="px-4 py-2.5 rounded-lg bg-[#0d0d17] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="Tous">Tous les styles</option>
          {MUSIC_STYLES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Track List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-xl border border-white/8 bg-[#0b0b14] text-center space-y-3">
          <p className="text-sm font-medium text-slate-200">
            {projects.length === 0
              ? 'Votre bibliothèque est vide pour le moment'
              : 'Aucun morceau ne correspond à votre recherche'}
          </p>
          <p className="text-xs text-slate-400">
            Enregistrez une chanson et sauvegardez-la depuis le studio ou la page d&apos;exportation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proj) => {
            const isPlaying = playingId === proj.id;
            return (
              <article
                key={proj.id}
                className="rounded-xl border border-white/10 bg-[#0d0d17] overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 flex items-start gap-4">
                  <img
                    src={proj.coverImage}
                    alt={proj.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="font-display text-base font-bold text-white truncate">
                      {proj.title}
                    </h2>
                    <p className="text-xs text-sky-400 font-mono tabular-nums truncate">
                      {proj.style} · {proj.bpm} BPM · {proj.keyName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono tabular-nums">
                      {Math.round(proj.durationSec)} s ·{' '}
                      {proj.vocalMode === 'original' ? 'Voix originale' : 'Voix améliorée'}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-white/8 bg-[#090912] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => togglePlay(proj)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-red-600 text-white'
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

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playerRef.current?.stop();
                        setPlayingId(null);
                        onOpenProject(proj, 'studio');
                      }}
                      title="Ouvrir dans le studio"
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playerRef.current?.stop();
                        setPlayingId(null);
                        onOpenProject(proj, 'export');
                      }}
                      title="Exporter"
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlaying) {
                          playerRef.current?.stop();
                          setPlayingId(null);
                        }
                        onDeleteProject(proj.id);
                      }}
                      title="Supprimer"
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
