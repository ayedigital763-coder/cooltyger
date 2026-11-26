import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/16 border border-white/14 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]'
            : 'inline-flex items-center gap-2.5 px-5 py-3.5 rounded-lg text-sm font-semibold text-slate-100 bg-white/8 hover:bg-white/14 border border-white/14 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[48px]'
        }
      >
        {isInstallable ? (
          <Download className="w-4 h-4 text-sky-400" />
        ) : (
          <Smartphone className="w-4 h-4 text-sky-400" />
        )}
        <span>
          {isInstallable ? "Installer l'app Android" : 'Installer sur Android'}
        </span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="android-install-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0e0e18] p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 id="android-install-title" className="font-display text-lg font-bold text-white">
                  {isIOS ? "Installer sur iPhone / iPad" : "Installer BEATMAKER AI sur Android"}
                </h2>
                <p className="text-xs text-slate-400">
                  Lancez le studio en plein écran depuis votre écran d&apos;accueil Android.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
                <li>Appuyez sur le bouton <strong>Partager</strong> dans Safari.</li>
                <li>Sélectionnez <strong>Sur l&apos;écran d&apos;accueil</strong>.</li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                <li>
                  Ouvrez cette page dans <strong>Google Chrome</strong> sur votre téléphone Android.
                </li>
                <li>
                  Appuyez sur le menu <strong>⋮</strong> en haut à droite de Chrome.
                </li>
                <li>
                  Appuyez sur <strong>Installer l&apos;application</strong> ou{' '}
                  <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 sm:right-auto z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/95 text-xs font-semibold text-slate-950"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Mode hors ligne Android — studio local et bibliothèque disponibles.</span>
    </div>
  );
}
