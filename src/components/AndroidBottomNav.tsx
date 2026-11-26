import { Home, LayoutDashboard, Library, Mic, Sliders } from 'lucide-react';
import { PageId } from '../types/music';

interface AndroidBottomNavProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const TABS: { id: PageId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'record', label: 'Chanter', icon: Mic },
  { id: 'studio', label: 'Studio', icon: Sliders },
  { id: 'library', label: 'Biblio', icon: Library },
  { id: 'dashboard', label: 'Tableau', icon: LayoutDashboard },
];

export function AndroidBottomNav({ currentPage, onNavigate }: AndroidBottomNavProps) {
  const handleSelect = (id: PageId) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
    onNavigate(id);
  };

  return (
    <nav
      aria-label="Navigation Android"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0b14]/95 backdrop-blur-md border-t border-white/10 pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-[58px]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active =
            currentPage === tab.id ||
            (tab.id === 'record' && (currentPage === 'analyze' || currentPage === 'beats')) ||
            (tab.id === 'studio' && currentPage === 'export');

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                active ? 'text-sky-400' : 'text-slate-400 active:text-white'
              }`}
            >
              <div
                className={`px-3 py-1 rounded-full transition-colors ${
                  active ? 'bg-violet-600/25 text-sky-400' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium tracking-tight leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
