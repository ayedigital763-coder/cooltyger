import { Check } from 'lucide-react';
import { PageId } from '../types/music';

interface StudioStepperProps {
  currentPage: PageId;
  hasVocal: boolean;
  hasAnalysis: boolean;
  hasSelectedBeat: boolean;
  onNavigate: (page: PageId) => void;
}

const STEPS: { id: PageId; num: string; label: string }[] = [
  { id: 'record', num: '01', label: 'Enregistrement' },
  { id: 'analyze', num: '02', label: 'Analyse IA' },
  { id: 'beats', num: '03', label: 'Sélection des beats' },
  { id: 'studio', num: '04', label: 'Studio de mixage' },
  { id: 'export', num: '05', label: 'Exportation' },
];

export function StudioStepper({
  currentPage,
  hasVocal,
  hasAnalysis,
  hasSelectedBeat,
  onNavigate,
}: StudioStepperProps) {
  const activeIdx = STEPS.findIndex((s) => s.id === currentPage);
  if (activeIdx === -1) return null;

  const isReachable = (id: PageId): boolean => {
    if (id === 'record') return true;
    if (id === 'analyze') return hasVocal;
    if (id === 'beats') return hasAnalysis;
    if (id === 'studio' || id === 'export') return hasSelectedBeat;
    return false;
  };

  return (
    <div className="border-b border-white/8 bg-[#0b0b13]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3 overflow-x-auto">
        <ol className="flex items-center gap-2 sm:gap-4 min-w-max">
          {STEPS.map((step, idx) => {
            const active = step.id === currentPage;
            const completed = idx < activeIdx && isReachable(step.id);
            const reachable = isReachable(step.id);

            return (
              <li key={step.id} className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onNavigate(step.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-violet-600/25 text-white border border-violet-500/50'
                      : reachable
                        ? 'text-slate-300 hover:text-white hover:bg-white/6 cursor-pointer'
                        : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span className="font-mono tabular-nums text-[11px] text-sky-400">
                    {completed ? <Check className="w-3.5 h-3.5 text-sky-400" /> : step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <span className="text-slate-700 text-xs select-none" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
