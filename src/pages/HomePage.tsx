import { ArrowRight, Mic, ShieldCheck, Sliders, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { MUSIC_STYLES, MusicStyle, PageId } from '../types/music';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
  onSelectStyleAndStart: (style: MusicStyle) => void;
}

export function HomePage({ onNavigate, onSelectStyleAndStart }: HomePageProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-20">
      {/* Split Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <p className="text-xs font-medium tracking-wide text-sky-400">
            Studio de production vocale · Voix originale préservée à 100 %
          </p>

          <h1
            className="font-display font-bold tracking-tight text-white leading-[1.08]"
            style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
          >
            Chantez librement. L&apos;IA compose l&apos;orchestration autour de votre voix.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
            Enregistrez votre chant sans instrument ni métronome. BEATMAKER AI analyse votre tempo naturel, votre tonalité et vos émotions pour bâtir trois accompagnements sur mesure tout en gardant votre voix exactement telle qu&apos;elle est.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('record')}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Mic className="w-4 h-4" />
              Enregistrer ma voix
            </button>

            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg text-sm font-medium text-slate-200 bg-white/6 hover:bg-white/10 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explorer ma bibliothèque
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 flex">
          <div className="relative w-full min-h-[280px] lg:min-h-[420px] rounded-xl overflow-hidden border border-white/10 bg-[#10101a]">
            {!heroImgFailed ? (
              <img
                src="/src/assets/images/hero_studio_console_1795714238524.jpg"
                alt="Cabine d'enregistrement vocal professionnelle avec microphone statique et console analogique"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-violet-950/60 via-[#0d0d18] to-blue-950/60">
                <Mic className="w-12 h-12 text-violet-400 mb-3" />
                <p className="text-sm text-slate-300 font-medium">Cabine vocale BEATMAKER AI</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07070d]/90 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
              <span>Enregistrement direct ou import MP3 / WAV / M4A</span>
              <span className="font-mono tabular-nums text-sky-300">44.1 kHz · Stéréo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Absolute Vocal Preservation Rule */}
      <section className="rounded-xl border border-white/10 bg-[#0e0e18] p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Priorité absolue</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white" style={{ textWrap: 'balance' }}>
              Votre voix originale reste intacte, sans aucun clonage ni transformation.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Votre piste vocale brute est conservée comme voix principale. L&apos;intelligence artificielle compose uniquement les instruments autour de votre timbre, de vos respirations et de votre interprétation naturelle.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t lg:border-t-0 lg:border-l border-white/8 pt-6 lg:pt-0 lg:pl-8">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-white">Aucune voix synthétique</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                L&apos;IA ne remplace jamais votre chant et ne recrée aucune interprétation artificielle à votre place.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-white">Timbre et identité préservés</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Aucun changement de genre vocal, d&apos;accent ou de caractère naturel n&apos;est appliqué automatiquement.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-white">Mode Voix Originale par défaut</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Les réglages de clarté vocale restent facultatifs et désactivés tant que vous ne les activez pas.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-white">Synchronisation sur mesure</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Batterie, basse, piano, guitares et nappes harmoniques suivent votre placement et votre tempo réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Editorial Workflow */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              De la prise a cappella au master prêt à publier
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Un parcours guidé en quatre temps, sans solfège ni matériel de studio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: '01',
              title: 'Enregistrez ou importez',
              desc: 'Chantez au micro avec pause, reprise et découpe, ou importez un fichier MP3, WAV ou M4A.',
              icon: Mic,
            },
            {
              num: '02',
              title: 'Analyse musicale IA',
              desc: 'Détection du tempo naturel, de la tonalité, du phrasé, des silences et de l’énergie émotionnelle.',
              icon: Sparkles,
            },
            {
              num: '03',
              title: 'Comparez 3 beats',
              desc: 'Écoutez trois compositions multi-pistes distinctes et sélectionnez celle qui sublime votre chant.',
              icon: Sliders,
            },
            {
              num: '04',
              title: 'Mixez et exportez',
              desc: 'Ajustez volumes, tempo et effets instrumentaux puis téléchargez en MP3, WAV ou pistes séparées.',
              icon: ArrowRight,
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="p-6 rounded-xl border border-white/8 bg-[#0c0c15] space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-sky-400">
                  <span>{step.num}</span>
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 14 Genres Directory */}
      <section className="space-y-6 pb-8">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-white">
            14 styles musicaux disponibles
          </h2>
          <p className="text-sm text-slate-400">
            Cliquez sur un style pour démarrer un enregistrement avec cette direction artistique.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {MUSIC_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onSelectStyleAndStart(style)}
              className="px-3.5 py-3 rounded-lg border border-white/8 bg-[#0e0e18] hover:border-violet-500/60 hover:bg-violet-600/12 text-left text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition-colors cursor-pointer truncate"
              title={`Créer un beat ${style}`}
            >
              {style}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
