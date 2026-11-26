import { CheckCircle2, Download, FolderCheck, Layers, Music2 } from 'lucide-react';
import { useState } from 'react';
import { encodeMp3Blob, encodeWavBlob } from '../audio/audioUtils';
import { ListenMode, renderMixOffline, StemName } from '../audio/beatEngine';
import { BeatProposal, MixSettings, PageId } from '../types/music';

interface ExportPageProps {
  projectTitle: string;
  onTitleChange: (title: string) => void;
  coverImage: string;
  onCoverChange: (cover: string) => void;
  vocalBuffer: AudioBuffer | null;
  selectedProposal: BeatProposal | null;
  mixSettings: MixSettings;
  onSaveProject: () => Promise<void>;
  onNavigate: (page: PageId) => void;
}

const COVER_OPTIONS = [
  {
    src: '/src/assets/images/cover_afro_groove_1795714238674.jpg',
    label: 'Onde Basalte & Violet',
  },
  {
    src: '/src/assets/images/cover_urban_soul_1795714239508.jpg',
    label: 'Prisme Nocturne',
  },
];

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function sanitizeFilename(name: string): string {
  return (name || 'beatmaker-ai-track')
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'beatmaker-ai-track';
}

export function ExportPage({
  projectTitle,
  onTitleChange,
  coverImage,
  onCoverChange,
  vocalBuffer,
  selectedProposal,
  mixSettings,
  onSaveProject,
  onNavigate,
}: ExportPageProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!selectedProposal || !vocalBuffer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Music2 className="w-10 h-10 text-slate-600 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-white">
          Aucun morceau prêt à exporter
        </h1>
        <p className="text-sm text-slate-400">
          Enregistrez votre voix et sélectionnez un beat pour accéder aux téléchargements MP3, WAV et pistes séparées.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 cursor-pointer"
        >
          Aller à l&apos;enregistrement
        </button>
      </div>
    );
  }

  const baseName = sanitizeFilename(projectTitle);

  const handleExport = async (params: {
    key: string;
    format: 'mp3' | 'wav';
    listenMode: ListenMode;
    stemFilter?: StemName;
    suffix: string;
  }) => {
    setExportError(null);
    setBusyKey(params.key);
    try {
      const buffer = await renderMixOffline({
        proposal: selectedProposal,
        mix: mixSettings,
        vocalBuffer,
        listenMode: params.listenMode,
        stemFilter: params.stemFilter ?? 'all',
        sampleRate: 44100,
      });

      const blob =
        params.format === 'mp3' ? encodeMp3Blob(buffer, 192) : encodeWavBlob(buffer);
      triggerDownload(blob, `${baseName}-${params.suffix}.${params.format}`);
    } catch (err: any) {
      setExportError(err?.message || "Impossible de générer le fichier audio.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleSave = async () => {
    setBusyKey('save');
    try {
      await onSaveProject();
      setSavedOk(true);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Exportation et téléchargement haute qualité
          </h1>
          <p className="text-sm text-slate-400">
            Rendu stéréo 44.1 kHz prêt pour YouTube, TikTok, Instagram, Facebook et plateformes de streaming.
          </p>
        </div>

        <button
          type="button"
          disabled={busyKey === 'save'}
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          {savedOk ? <CheckCircle2 className="w-4 h-4" /> : <FolderCheck className="w-4 h-4" />}
          {savedOk ? 'Enregistré dans la bibliothèque' : 'Sauvegarder dans ma bibliothèque'}
        </button>
      </div>

      {exportError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-500/12 border border-red-500/30 text-sm text-red-200"
        >
          {exportError}
        </div>
      )}

      {/* Track Metadata & Cover */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-3 flex justify-center md:justify-start">
          <img
            src={coverImage}
            alt={projectTitle}
            referrerPolicy="no-referrer"
            className="w-40 h-40 rounded-xl object-cover border border-white/12"
          />
        </div>

        <div className="md:col-span-9 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="export-title" className="block text-xs font-medium text-slate-300">
              Nom du fichier et titre du morceau
            </label>
            <input
              id="export-title"
              type="text"
              value={projectTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              maxLength={100}
              className="w-full max-w-md px-3.5 py-2.5 rounded-lg bg-[#07070d] border border-white/12 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">Pochette :</span>
            {COVER_OPTIONS.map((c) => (
              <button
                key={c.src}
                type="button"
                onClick={() => onCoverChange(c.src)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  coverImage === c.src
                    ? 'border-violet-500 bg-violet-600/20 text-white'
                    : 'border-white/10 bg-[#07070d] text-slate-300 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-400 font-mono tabular-nums">
            {selectedProposal.style} · {mixSettings.tempoBpm} BPM · {selectedProposal.keyName} ·{' '}
            {mixSettings.vocalMode === 'original'
              ? 'Voix originale intacte'
              : 'Voix améliorée (identité préservée)'}
          </p>
        </div>
      </section>

      {/* Main Master Downloads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full Song */}
        <div className="rounded-xl border border-violet-500/35 bg-[#0d0d17] p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-white">Chanson complète</h2>
            <p className="text-xs text-slate-400">
              Voix originale synchronisée avec l&apos;accompagnement complet et le mastering stéréo.
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                handleExport({
                  key: 'full-mp3',
                  format: 'mp3',
                  listenMode: 'full',
                  suffix: 'chanson-complete',
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {busyKey === 'full-mp3' ? 'Encodage MP3...' : 'Télécharger MP3 (192 kbps)'}
            </button>

            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                handleExport({
                  key: 'full-wav',
                  format: 'wav',
                  listenMode: 'full',
                  suffix: 'chanson-complete',
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-slate-100 bg-white/8 hover:bg-white/14 border border-white/12 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400" />
              {busyKey === 'full-wav' ? 'Rendu WAV...' : 'Télécharger WAV Studio (PCM)'}
            </button>
          </div>
        </div>

        {/* Beat Only */}
        <div className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-white">Beat seul</h2>
            <p className="text-xs text-slate-400">
              L&apos;instrumental complet généré par l&apos;IA, sans la piste vocale.
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                handleExport({
                  key: 'inst-mp3',
                  format: 'mp3',
                  listenMode: 'instrumental',
                  suffix: 'instrumental',
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/16 border border-white/12 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-violet-400" />
              {busyKey === 'inst-mp3' ? 'Encodage MP3...' : 'Télécharger Beat MP3'}
            </button>

            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                handleExport({
                  key: 'inst-wav',
                  format: 'wav',
                  listenMode: 'instrumental',
                  suffix: 'instrumental',
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-slate-200 bg-white/6 hover:bg-white/12 border border-white/10 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400" />
              {busyKey === 'inst-wav' ? 'Rendu WAV...' : 'Télécharger Beat WAV'}
            </button>
          </div>
        </div>

        {/* Original Voice Only */}
        <div className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-white">Voix originale seule</h2>
            <p className="text-xs text-slate-400">
              Votre enregistrement vocal brut conservé sans aucune altération.
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                handleExport({
                  key: 'vox-mp3',
                  format: 'mp3',
                  listenMode: 'vocal',
                  suffix: 'voix-originale',
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/16 border border-white/12 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-violet-400" />
              {busyKey === 'vox-mp3' ? 'Encodage MP3...' : 'Télécharger Voix MP3'}
            </button>

            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                handleExport({
                  key: 'vox-wav',
                  format: 'wav',
                  listenMode: 'vocal',
                  suffix: 'voix-originale',
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-slate-200 bg-white/6 hover:bg-white/12 border border-white/10 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400" />
              {busyKey === 'vox-wav' ? 'Rendu WAV...' : 'Télécharger Voix WAV'}
            </button>
          </div>
        </div>
      </div>

      {/* Individual Stems Export */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Télécharger les pistes séparées (Stems WAV)
            </h2>
            <p className="text-xs text-slate-400">
              Chaque groupe d&apos;instruments exporté séparément pour un mixage externe ou une édition vidéo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(
            [
              { stem: 'drums', label: 'Batterie', suffix: 'stem-batterie' },
              { stem: 'percussions', label: 'Percussions', suffix: 'stem-percussions' },
              { stem: 'bass', label: 'Basse', suffix: 'stem-basse' },
              {
                stem: 'piano_harmonies',
                label: 'Piano & Harmonies',
                suffix: 'stem-piano-harmonies',
              },
              {
                stem: 'guitars_synths',
                label: 'Guitares & Synthés',
                suffix: 'stem-guitares-synthes',
              },
            ] as const
          ).map((item) => (
            <button
              key={item.stem}
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                handleExport({
                  key: item.stem,
                  format: 'wav',
                  listenMode: 'instrumental',
                  stemFilter: item.stem,
                  suffix: item.suffix,
                })
              }
              className="p-3.5 rounded-lg border border-white/10 bg-[#07070d] hover:border-violet-500/50 text-left flex items-center justify-between gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className="text-xs font-medium text-slate-200 truncate">
                {busyKey === item.stem ? 'Rendu...' : item.label}
              </span>
              <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
