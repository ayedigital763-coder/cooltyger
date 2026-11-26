import { Menu, X } from 'lucide-react';
import { useState } from 'react';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#07070D]/90 backdrop-blur-md border-b border-white/8">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
        >
          BEATMAKER AI
        </button>

        {/* Zone 2: Clean single-line text navigation */}
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
                onClick={() => handleNav(item.id)}
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

        {/* Zone 3: Single Primary Action */}
        <div className="hidden md:flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              title={`Connecté : ${user.email}`}
              className="px-4 py-2 text-xs font-semibold text-slate-100 bg-white/8 hover:bg-white/14 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user.name.split(' ')[0]} · Déconnexion
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('auth')}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Connexion
            </button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-[#0b0b14] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === item.id
                  ? 'bg-violet-600/20 text-white'
                  : 'text-slate-300 hover:bg-white/6 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-white/8">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setMobileOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left text-sm font-medium text-slate-300 hover:text-white"
              >
                Déconnexion ({user.name})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('auth')}
                className="w-full px-4 py-2.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 rounded-lg"
              >
                Connexion / Inscription
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
