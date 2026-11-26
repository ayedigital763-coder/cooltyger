import { ArrowRight, Disc3, Mic, Sliders, Upload } from 'lucide-react';
import { PageId, StoredProject, UserAccount } from '../types/music';

interface DashboardPageProps {
  user: UserAccount | null;
  projects: StoredProject[];
  onNavigate: (page: PageId) => void;
  onOpenProject: (project: StoredProject, targetPage: 'studio' | 'export') => void;
}

export function DashboardPage({
  user,
  projects,
  onNavigate,
  onOpenProject,
}: DashboardPageProps) {
  const totalTracks = projects.length;
  const avgBpm =
    totalTracks > 0
      ? Math.round(projects.reduce((acc, p) => acc + p.bpm, 0) / totalTracks)
      : 0;
  const totalSeconds = projects.reduce((acc, p) => acc + Math.round(p.durationSec), 0);

  const styleCounts = new Map<string, number>();
  for (const p of projects) {
    styleCounts.set(p.style, (styleCounts.get(p.style) ?? 0) + 1);
  }
  let topStyle = 'Aucun';
  let maxCount = 0;
  for (const [st, count] of styleCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topStyle = st;
    }
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {user ? `Tableau de bord · ${user.name}` : 'Tableau de bord du studio'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user
              ? 'Vos sessions vocales, accompagnements et exports récents.'
              : 'Mode Studio local actif — vos projets sont sauvegardés sur cet appareil.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          Nouvel enregistrement
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Chansons produites</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-white">{totalTracks}</p>
        </div>
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Tempo moyen</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-white">
            {avgBpm > 0 ? `${avgBpm} BPM` : '—'}
          </p>
        </div>
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Style dominant</p>
          <p className="font-display text-xl font-semibold text-sky-400 truncate">{topStyle}</p>
        </div>
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Durée vocale cumulée</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-white">
            {totalSeconds > 0 ? `${totalSeconds} s` : '0 s'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="p-6 rounded-xl border border-white/10 bg-[#0e0e19] hover:border-violet-500/50 text-left transition-colors flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-semibold text-white">
              Chanter au microphone
            </h2>
            <p className="text-sm text-slate-400">
              Enregistrement direct avec pause, reprise, découpe et visualisation en direct.
            </p>
          </div>
          <Mic className="w-6 h-6 text-violet-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="p-6 rounded-xl border border-white/10 bg-[#0e0e19] hover:border-sky-500/50 text-left transition-colors flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-semibold text-white">
              Importer une prise vocale
            </h2>
            <p className="text-sm text-slate-400">
              Importez un fichier MP3, WAV ou M4A et laissez l&apos;IA composer l&apos;instrumental.
            </p>
          </div>
          <Upload className="w-6 h-6 text-sky-400 shrink-0" />
        </button>
      </div>

      {/* Recent Creations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">Projets récents</h2>
          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
            >
              Tout voir <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="p-10 rounded-xl border border-white/8 bg-[#0b0b14] text-center space-y-3">
            <Disc3 className="w-9 h-9 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-200">
              Aucun morceau enregistré pour le moment
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Lancez votre premier enregistrement vocal a cappella : l&apos;IA analysera votre voix et créera trois propositions instrumentales adaptées.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('record')}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors cursor-pointer"
              >
                Créer mon premier titre
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/8 rounded-xl border border-white/8 bg-[#0d0d17] overflow-hidden">
            {projects.slice(0, 5).map((proj) => (
              <div
                key={proj.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={proj.coverImage}
                    alt={proj.title}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{proj.title}</h3>
                    <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5 truncate">
                      {proj.style} · {proj.bpm} BPM · {proj.keyName} · {Math.round(proj.durationSec)}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj, 'studio')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/6 hover:bg-white/12 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj, 'export')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600/80 hover:bg-violet-600 transition-colors cursor-pointer"
                  >
                    Exporter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
