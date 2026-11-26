import { PageId, UserAccount } from '../types/music';

interface TopNavProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  user: UserAccount | null;
  onLogout: () => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Accueil' },
  { id: 'record', label: 'Enregistrer' },
  { id: 'studio', label: 'Studio' },
  { id: 'library', label: 'Bibliothèque' },
  { id: 'dashboard', label: 'Tableau de bord' },
];

export function TopNav({ currentPage, onNavigate, user, onLogout }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#07070D]/90 backdrop-blur-md border-b border-white/8">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
        >
          BEATMAKER AI
        </button>

        {/* Zone 2: Clean single-line text navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => {
            const active =
              currentPage === item.id ||
              (item.id === 'record' && (currentPage === 'analyze' || currentPage === 'beats')) ||
              (item.id === 'studio' && currentPage === 'export');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  active
                    ? 'text-white border-violet-500'
                    : 'text-slate-400 border-transparent hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action (visible on both Android mobile and Desktop) */}
        <div className="flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              title={`Connecté : ${user.email}`}
              className="px-3.5 py-2 text-xs font-semibold text-slate-100 bg-white/8 hover:bg-white/14 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            >
              {user.name.split(' ')[0]} · Déconnexion
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Connexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
