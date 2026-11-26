import { ArrowRight, Check, RefreshCw, Sparkles } from 'lucide-react';
import {
  EMOTIONAL_CONTEXT_OPTIONS,
  EmotionalTag,
  PageId,
  VocalAnalysis,
} from '../types/music';

interface AnalyzePageProps {
  analysis: VocalAnalysis | null;
  loading: boolean;
  error: string | null;
  emotionalTags: EmotionalTag[];
  applyingEmotion: boolean;
  onToggleEmotionalTag: (tag: EmotionalTag) => void;
  onApplyEmotionalContext: () => Promise<void>;
  onRetryAnalyze: () => void;
  onNavigate: (page: PageId) => void;
}

export function AnalyzePage({
  analysis,
  loading,
  error,
  emotionalTags,
  applyingEmotion,
  onToggleEmotionalTag,
  onApplyEmotionalContext,
  onRetryAnalyze,
  onNavigate,
}: AnalyzePageProps) {
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/40 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-sky-400 animate-spin" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Analyse musicale de votre voix en cours
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
            L&apos;intelligence artificielle écoute votre tempo naturel, votre tonalité, vos mélodies, vos silences et votre émotion pour composer trois accompagnements sur mesure.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left">
          {[
            'Tempo & rythme',
            'Tonalité & gamme',
            'Variations mélodiques',
            'Composition 3 beats',
          ].map((label) => (
            <div
              key={label}
              className="p-3.5 rounded-lg border border-white/8 bg-[#0d0d17] text-xs text-slate-300"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 space-y-3">
          <h1 className="font-display text-xl font-bold text-white">
            L&apos;analyse vocale n&apos;a pas pu aboutir
          </h1>
          <p className="text-sm text-red-200">{error}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('record')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/12 transition-colors cursor-pointer"
          >
            Retour à l&apos;enregistrement
          </button>
          <button
            type="button"
            onClick={onRetryAnalyze}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réessayer l&apos;analyse
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">Aucune analyse disponible</h1>
        <p className="text-sm text-slate-400">
          Enregistrez ou importez d&apos;abord une prise vocale pour lancer l&apos;analyse.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 cursor-pointer"
        >
          Aller à l&apos;enregistrement
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Profil musical de votre voix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Voix originale conservée à 100 % · Affinez le contexte émotionnel avant de découvrir les trois instrumentaux.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onRetryAnalyze}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/12 border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réanalyser
          </button>
          <button
            type="button"
            onClick={() => onNavigate('beats')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all cursor-pointer"
          >
            Découvrir les 3 beats
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Acoustic KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Tempo naturel</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-white">
            {analysis.bpm} BPM
          </p>
        </div>
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Tonalité détectée</p>
          <p className="font-display text-2xl font-semibold text-sky-400">{analysis.keyName}</p>
        </div>
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Émotion dominante</p>
          <p className="font-display text-xl font-semibold text-white truncate">
            {analysis.emotion}
          </p>
        </div>
        <div className="p-5 rounded-xl border border-white/8 bg-[#0d0d17] space-y-1">
          <p className="text-xs text-slate-400">Énergie vocale</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-violet-400">
            {analysis.energyScore} %
          </p>
        </div>
      </div>

      {/* Deep Musical Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-white/8 bg-[#0d0d17] space-y-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Mélodie, rythme et nuances
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Mélodie chantée</dt>
              <dd className="text-slate-200 mt-0.5">{analysis.melodySummary}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Rythme et placement</dt>
              <dd className="text-slate-200 mt-0.5">{analysis.rhythmFeel}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Variations mélodiques</dt>
              <dd className="text-slate-200 mt-0.5">{analysis.melodicVariations}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Tessiture et note d&apos;accompagnement</dt>
              <dd className="text-slate-200 mt-0.5">{analysis.vocalRange}</dd>
            </div>
          </dl>
        </div>

        <div className="p-6 rounded-xl border border-white/8 bg-[#0d0d17] space-y-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Structure de la chanson & respirations
          </h2>

          <div className="space-y-2.5">
            {analysis.structure.map((seg, idx) => (
              <div
                key={`${seg.label}-${idx}`}
                className="p-3 rounded-lg bg-[#07070d] border border-white/6 flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">{seg.label}</p>
                  <p className="text-xs text-slate-400">{seg.description}</p>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-sky-400 shrink-0">
                  {seg.startSec.toFixed(1)}s – {seg.endSec.toFixed(1)}s
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/8 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Respirations et silences détectés : {analysis.silencesCount}</span>
            <span className="text-slate-300">
              Styles conseillés : {analysis.recommendedStyles.join(' · ')}
            </span>
          </div>
        </div>
      </div>

      {/* Emotional Context Interface */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-white">
              Contexte émotionnel des instrumentaux
            </h2>
            <p className="text-sm text-slate-400">
              Sélectionnez une ou plusieurs atmosphères émotionnelles pour orienter les harmonies, la basse, la batterie et les textures de vos trois propositions.
            </p>
          </div>
          {emotionalTags.length > 0 && (
            <span className="text-xs font-mono tabular-nums text-sky-400 shrink-0">
              {emotionalTags.length} sélectionné{emotionalTags.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EMOTIONAL_CONTEXT_OPTIONS.map((opt) => {
            const active = emotionalTags.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggleEmotionalTag(opt.id)}
                aria-pressed={active}
                className={`p-4 rounded-lg border text-left transition-colors cursor-pointer space-y-1.5 ${
                  active
                    ? 'border-violet-500 bg-violet-600/18'
                    : 'border-white/8 bg-[#07070d] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{opt.musicalHint}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/8">
          <p className="text-xs text-slate-400">
            {emotionalTags.length > 0
              ? `Direction active : ${emotionalTags.join(' · ')}`
              : 'Aucun filtre émotionnel forcé — les instruments suivent l’émotion naturelle détectée dans votre voix.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {emotionalTags.length > 0 && (
              <button
                type="button"
                disabled={applyingEmotion}
                onClick={onApplyEmotionalContext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-60 transition-all cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${applyingEmotion ? 'animate-spin' : ''}`} />
                {applyingEmotion
                  ? 'Adaptation des 3 beats...'
                  : 'Composer 3 beats selon ce contexte'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('beats')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-200 bg-white/8 hover:bg-white/14 border border-white/10 transition-colors cursor-pointer"
            >
              Voir les propositions actuelles
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Producer Note */}
      <div className="p-5 rounded-xl border border-violet-500/25 bg-violet-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-violet-300">Note du producteur IA</p>
          <p className="text-sm text-slate-200">{analysis.musicalNotes}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('beats')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          Écouter les 3 propositions
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
