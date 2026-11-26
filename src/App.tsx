import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deserializeAudioBuffer,
  encodeCompactWavBase64,
  extractAcousticHints,
  serializeAudioBuffer,
} from './audio/audioUtils';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { OfflineIndicator } from './components/PWAInstallButton';
import { StudioStepper } from './components/StudioStepper';
import { TopNav } from './components/TopNav';
import { apiUrl } from './utils/api';
import { AnalyzePage } from './pages/AnalyzePage';
import { AuthPage } from './pages/AuthPage';
import { BeatsPage } from './pages/BeatsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExportPage } from './pages/ExportPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { RecordPage } from './pages/RecordPage';
import { StudioPage } from './pages/StudioPage';
import {
  deleteProjectFromDb,
  listProjectsFromDb,
  saveProjectToDb,
} from './storage/projectDb';
import {
  BeatProposal,
  DEFAULT_MIX_SETTINGS,
  EmotionalTag,
  MixSettings,
  MusicStyle,
  PageId,
  StoredProject,
  UserAccount,
  VocalAnalysis,
} from './types/music';

const DEFAULT_COVERS = [
  '/src/assets/images/cover_afro_groove_1795714238674.jpg',
  '/src/assets/images/cover_urban_soul_1795714239508.jpg',
];

export default function App() {
  const [page, setPage] = useState<PageId>('home');
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [projects, setProjects] = useState<StoredProject[]>([]);

  // Active song workflow state
  const [activeProjectId, setActiveProjectId] = useState<string>(() => crypto.randomUUID());
  const [projectTitle, setProjectTitle] = useState<string>('Ma création vocale');
  const [coverImage, setCoverImage] = useState<string>(DEFAULT_COVERS[0]);
  const [preferredStyle, setPreferredStyle] = useState<MusicStyle | ''>('');
  const [vocalBuffer, setVocalBuffer] = useState<AudioBuffer | null>(null);

  const [analysis, setAnalysis] = useState<VocalAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [proposals, setProposals] = useState<BeatProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [regeneratingBeats, setRegeneratingBeats] = useState<boolean>(false);
  const [mixSettings, setMixSettings] = useState<MixSettings>(() =>
    DEFAULT_MIX_SETTINGS(102)
  );
  const [lyrics, setLyrics] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [emotionalTags, setEmotionalTags] = useState<EmotionalTag[]>([]);
  const [applyingEmotion, setApplyingEmotion] = useState<boolean>(false);

  const refreshLibrary = useCallback(async (uid?: string) => {
    try {
      const list = await listProjectsFromDb(uid);
      setProjects(list);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    refreshLibrary(user?.id);
  }, [user?.id, refreshLibrary]);

  const selectedProposal = useMemo(
    () => proposals.find((p) => p.id === selectedProposalId) ?? null,
    [proposals, selectedProposalId]
  );

  const handleVocalReady = (buffer: AudioBuffer) => {
    setVocalBuffer(buffer);
    // Reset downstream AI state when a new vocal recording/trim is applied
    setAnalysis(null);
    setProposals([]);
    setSelectedProposalId(null);
    setActiveProjectId(crypto.randomUUID());
  };

  const handleClearVocal = () => {
    setVocalBuffer(null);
    setAnalysis(null);
    setProposals([]);
    setSelectedProposalId(null);
    setAnalyzeError(null);
    setLyrics('');
    setEmotionalTags([]);
  };

  const transcribeVocalBuffer = useCallback(async (buffer: AudioBuffer) => {
    setIsTranscribing(true);
    try {
      const audioBase64 = await encodeCompactWavBase64(buffer, 28);
      const res = await fetch(apiUrl('/api/transcribe-vocal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType: 'audio/wav' }),
      });
      const data = await res.json();
      if (res.ok && typeof data.transcript === 'string' && data.transcript.trim()) {
        setLyrics(data.transcript.trim());
      }
    } catch {
      // Keep live speech recognition text or manual editing available
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const toggleEmotionalTag = (tag: EmotionalTag) => {
    setEmotionalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const runVocalAnalysis = async () => {
    if (!vocalBuffer) return;
    setPage('analyze');
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const audioBase64 = await encodeCompactWavBase64(vocalBuffer, 25);
      const acousticHints = extractAcousticHints(vocalBuffer);

      const res = await fetch(apiUrl('/api/analyze-vocal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: 'audio/wav',
          durationSec: vocalBuffer.duration,
          acousticHints,
          preferredStyle,
          emotionalTags,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error || "Échec de l'analyse vocale.");
        return;
      }

      setAnalysis(data.analysis);
      setProposals(data.proposals);
      if (data.proposals?.[0]) {
        setSelectedProposalId(null);
        setMixSettings(DEFAULT_MIX_SETTINGS(data.analysis.bpm));
        setProjectTitle(
          `Session ${data.proposals[0].style} · ${data.analysis.keyName}`
        );
        const afroStyles = [
          'Afrobeats',
          'Afro Gospel',
          'Amapiano',
          'Coupé-décalé',
          'Zouk',
          'Musiques africaines traditionnelles',
        ];
        setCoverImage(
          afroStyles.includes(data.proposals[0].style)
            ? DEFAULT_COVERS[0]
            : DEFAULT_COVERS[1]
        );
      }
    } catch {
      setAnalyzeError("Impossible de joindre le moteur d'analyse IA.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRegenerateBeats = async (styles: MusicStyle[]) => {
    if (!analysis) return;
    setRegeneratingBeats(true);
    try {
      const res = await fetch(apiUrl('/api/generate-beats'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, styles, emotionalTags }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.proposals) && data.proposals.length > 0) {
        setProposals(data.proposals);
        setSelectedProposalId(null);
      }
    } finally {
      setRegeneratingBeats(false);
    }
  };

  const handleApplyEmotionalContext = async () => {
    if (!analysis) return;
    setApplyingEmotion(true);
    try {
      const styles = (analysis.recommendedStyles?.slice(0, 3) ?? [
        'Afrobeats',
        'R&B',
        'Pop',
      ]) as MusicStyle[];
      const res = await fetch(apiUrl('/api/generate-beats'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, styles, emotionalTags }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.proposals) && data.proposals.length > 0) {
        setProposals(data.proposals);
        setSelectedProposalId(null);
        setPage('beats');
      }
    } finally {
      setApplyingEmotion(false);
    }
  };

  const handleSelectBeat = (proposal: BeatProposal) => {
    setSelectedProposalId(proposal.id);
    setMixSettings((prev) => ({
      ...prev,
      tempoBpm: proposal.bpm,
    }));
    setPage('studio');
  };

  const handleSaveProject = async () => {
    if (!vocalBuffer || !analysis || !selectedProposal) return;
    const serialized = serializeAudioBuffer(vocalBuffer);
    const now = new Date().toISOString();

    const record: StoredProject = {
      id: activeProjectId,
      userId: user?.id ?? 'local-studio',
      title: projectTitle.trim() || 'Ma création vocale',
      style: selectedProposal.style,
      bpm: mixSettings.tempoBpm,
      keyName: selectedProposal.keyName,
      durationSec: vocalBuffer.duration,
      vocalMode: mixSettings.vocalMode,
      coverImage,
      createdAt: now,
      updatedAt: now,
      analysis,
      proposals,
      selectedProposalId: selectedProposal.id,
      mixSettings,
      vocalSampleRate: serialized.sampleRate,
      vocalChannels: serialized.channels,
      lyrics,
      emotionalContext: emotionalTags,
    };

    await saveProjectToDb(record);

    if (authToken) {
      await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: record.id,
          title: record.title,
          style: record.style,
          bpm: record.bpm,
          keyName: record.keyName,
          durationSec: record.durationSec,
          vocalMode: record.vocalMode,
          coverImage: record.coverImage,
        }),
      }).catch(() => {});
    }

    await refreshLibrary(user?.id);
  };

  const handleOpenProject = async (
    proj: StoredProject,
    targetPage: 'studio' | 'export'
  ) => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const restoredVocal = deserializeAudioBuffer(
      ctx,
      proj.vocalSampleRate,
      proj.vocalChannels
    );
    await ctx.close().catch(() => {});

    setActiveProjectId(proj.id);
    setProjectTitle(proj.title);
    setCoverImage(proj.coverImage);
    setVocalBuffer(restoredVocal);
    setAnalysis(proj.analysis);
    setProposals(proj.proposals);
    setSelectedProposalId(proj.selectedProposalId);
    setMixSettings(proj.mixSettings);
    setLyrics(proj.lyrics ?? '');
    setEmotionalTags(proj.emotionalContext ?? []);
    setPage(targetPage);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProjectFromDb(id);
    if (authToken) {
      await fetch(apiUrl(`/api/projects/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    await refreshLibrary(user?.id);
  };

  const handleAuthenticated = (acc: UserAccount, token: string) => {
    setUser(acc);
    setAuthToken(token);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    setPage('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07070D] text-slate-100 pb-16 md:pb-0">
      <TopNav
        currentPage={page}
        onNavigate={setPage}
        user={user}
        onLogout={handleLogout}
      />

      <StudioStepper
        currentPage={page}
        hasVocal={Boolean(vocalBuffer)}
        hasAnalysis={Boolean(analysis)}
        hasSelectedBeat={Boolean(selectedProposal)}
        onNavigate={setPage}
      />

      <main className="flex-1">
        {page === 'home' && (
          <HomePage
            onNavigate={setPage}
            onSelectStyleAndStart={(style) => {
              setPreferredStyle(style);
              setPage('record');
            }}
          />
        )}

        {page === 'auth' && (
          <AuthPage
            onAuthenticated={handleAuthenticated}
            onContinueLocal={() => setPage('record')}
            onNavigate={setPage}
          />
        )}

        {page === 'dashboard' && (
          <DashboardPage
            user={user}
            projects={projects}
            onNavigate={setPage}
            onOpenProject={handleOpenProject}
          />
        )}

        {page === 'record' && (
          <RecordPage
            vocalBuffer={vocalBuffer}
            preferredStyle={preferredStyle}
            lyrics={lyrics}
            isTranscribing={isTranscribing}
            onPreferredStyleChange={setPreferredStyle}
            onLyricsChange={setLyrics}
            onVocalReady={handleVocalReady}
            onTranscribeBuffer={transcribeVocalBuffer}
            onClearVocal={handleClearVocal}
            onProceedToAnalyze={runVocalAnalysis}
          />
        )}

        {page === 'analyze' && (
          <AnalyzePage
            analysis={analysis}
            loading={analyzing}
            error={analyzeError}
            emotionalTags={emotionalTags}
            applyingEmotion={applyingEmotion}
            onToggleEmotionalTag={toggleEmotionalTag}
            onApplyEmotionalContext={handleApplyEmotionalContext}
            onRetryAnalyze={runVocalAnalysis}
            onNavigate={setPage}
          />
        )}

        {page === 'beats' && (
          <BeatsPage
            analysis={analysis}
            proposals={proposals}
            selectedProposalId={selectedProposalId}
            vocalBuffer={vocalBuffer}
            emotionalTags={emotionalTags}
            regenerating={regeneratingBeats}
            onToggleEmotionalTag={toggleEmotionalTag}
            onSelectBeat={handleSelectBeat}
            onRegenerateBeats={handleRegenerateBeats}
          />
        )}

        {page === 'studio' && (
          <StudioPage
            projectTitle={projectTitle}
            onTitleChange={setProjectTitle}
            vocalBuffer={vocalBuffer}
            proposals={proposals}
            selectedProposal={selectedProposal}
            mixSettings={mixSettings}
            lyrics={lyrics}
            isTranscribing={isTranscribing}
            onLyricsChange={setLyrics}
            onRetranscribe={async () => {
              if (vocalBuffer) await transcribeVocalBuffer(vocalBuffer);
            }}
            onSelectProposal={(prop) => {
              setSelectedProposalId(prop.id);
              setMixSettings((prev) => ({ ...prev, tempoBpm: prop.bpm }));
            }}
            onMixChange={setMixSettings}
            onSaveProject={handleSaveProject}
            onNavigate={setPage}
          />
        )}

        {page === 'export' && (
          <ExportPage
            projectTitle={projectTitle}
            onTitleChange={setProjectTitle}
            coverImage={coverImage}
            onCoverChange={setCoverImage}
            vocalBuffer={vocalBuffer}
            selectedProposal={selectedProposal}
            mixSettings={mixSettings}
            onSaveProject={handleSaveProject}
            onNavigate={setPage}
          />
        )}

        {page === 'library' && (
          <LibraryPage
            projects={projects}
            onOpenProject={handleOpenProject}
            onDeleteProject={handleDeleteProject}
            onNavigate={setPage}
          />
        )}
      </main>

      <footer className="hidden md:block border-t border-white/8 bg-[#07070D]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>BEATMAKER AI · Studio vocal Android · Voix originale préservée</span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setPage('record')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setPage('library')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Bibliothèque
            </button>
            <button
              type="button"
              onClick={() => setPage('dashboard')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Tableau de bord
            </button>
          </div>
        </div>
      </footer>

      <AndroidBottomNav currentPage={page} onNavigate={setPage} />
      <OfflineIndicator />
    </div>
  );
}
