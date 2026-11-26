import { Lock, Mail, User } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PageId, UserAccount } from '../types/music';
import { apiUrl } from '../utils/api';

interface AuthPageProps {
  onAuthenticated: (user: UserAccount, token: string) => void;
  onContinueLocal: () => void;
  onNavigate: (page: PageId) => void;
}

export function AuthPage({ onAuthenticated, onContinueLocal, onNavigate }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login' ? { email, password } : { name, email, password };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
        return;
      }
      onAuthenticated(data.user, data.token);
      onNavigate('dashboard');
    } catch {
      setError('Impossible de contacter le serveur studio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 sm:py-20">
      <div className="rounded-xl border border-white/10 bg-[#0d0d17] p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-white">
            {mode === 'login' ? 'Connexion au studio' : 'Créer un compte artiste'}
          </h1>
          <p className="text-sm text-slate-400">
            Retrouvez vos projets, analyses vocales et exports dans votre espace personnel.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#07070d] border border-white/8">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inscription
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-500/12 border border-red-500/30 text-xs text-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name" className="block text-xs font-medium text-slate-300">
                Nom d&apos;artiste ou prénom
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Awa Diallo"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#07070d] border border-white/12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artiste@exemple.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#07070d] border border-white/12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#07070d] border border-white/12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-60 transition-all cursor-pointer"
          >
            {loading
              ? 'Traitement en cours...'
              : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
          </button>
        </form>

        <div className="pt-4 border-t border-white/8 text-center space-y-2">
          <p className="text-xs text-slate-400">
            Vous souhaitez tester immédiatement sans créer de compte ?
          </p>
          <button
            type="button"
            onClick={onContinueLocal}
            className="w-full py-2.5 rounded-lg text-xs font-medium text-slate-200 bg-white/6 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            Continuer en mode Studio local
          </button>
        </div>
      </div>
    </div>
  );
}
