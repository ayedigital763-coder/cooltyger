import { useEffect, useRef } from 'react';

interface LiveVisualizerProps {
  analyser: AnalyserNode | null;
  active: boolean;
  height?: number;
  variant?: 'bars' | 'wave';
}

export function LiveAudioVisualizer({
  analyser,
  active,
  height = 112,
  variant = 'bars',
}: LiveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.max(300, Math.floor(rect.width * dpr));
        canvas.height = Math.floor(height * dpr);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Subtle studio centerline
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (analyser && active) {
        if (variant === 'wave') {
          const data = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(data);

          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, '#8b5cf6');
          grad.addColorStop(0.5, '#6366f1');
          grad.addColorStop(1, '#38bdf8');

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5 * dpr;
          ctx.beginPath();
          const slice = w / data.length;
          for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(0, y);
            else ctx.lineTo(i * slice, y);
          }
          ctx.stroke();
        } else {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const barCount = Math.min(64, data.length);
          const gap = 3 * dpr;
          const barW = Math.max(2 * dpr, (w - gap * (barCount - 1)) / barCount);

          const grad = ctx.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#7c3aed');
          grad.addColorStop(0.55, '#6366f1');
          grad.addColorStop(1, '#38bdf8');
          ctx.fillStyle = grad;

          for (let i = 0; i < barCount; i++) {
            const val = data[i] / 255;
            const barH = Math.max(4 * dpr, val * (h * 0.86));
            const x = i * (barW + gap);
            const y = (h - barH) / 2;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barH, 2 * dpr);
            ctx.fill();
          }
        }
      } else {
        // Idle calm bars
        const barCount = 48;
        const gap = 4 * dpr;
        const barW = Math.max(2 * dpr, (w - gap * (barCount - 1)) / barCount);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.22)';
        for (let i = 0; i < barCount; i++) {
          const barH = 4 * dpr + Math.sin(i * 0.45) * 3 * dpr + 3 * dpr;
          const x = i * (barW + gap);
          const y = (h - barH) / 2;
          ctx.beginPath();
          ctx.roundRect(x, y, barW, barH, 2 * dpr);
          ctx.fill();
        }
      }

      if (active) {
        rafId = requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [analyser, active, height, variant]);

  return (
    <canvas
      ref={canvasRef}
      style={{ height: `${height}px` }}
      className="w-full block rounded-lg bg-[#0b0b14] border border-white/8"
      aria-label="Visualisation audio en temps réel"
    />
  );
}

interface WaveformOverviewProps {
  peaks: number[];
  durationSec: number;
  currentSec?: number;
  trimStartSec?: number;
  trimEndSec?: number;
  height?: number;
}

export function WaveformOverview({
  peaks,
  durationSec,
  currentSec = 0,
  trimStartSec = 0,
  trimEndSec,
  height = 96,
}: WaveformOverviewProps) {
  const effectiveEnd = trimEndSec ?? durationSec;
  const startRatio = durationSec > 0 ? trimStartSec / durationSec : 0;
  const endRatio = durationSec > 0 ? effectiveEnd / durationSec : 1;
  const playRatio = durationSec > 0 ? Math.min(1, Math.max(0, currentSec / durationSec)) : 0;

  return (
    <div
      style={{ height: `${height}px` }}
      className="relative w-full rounded-lg bg-[#0b0b14] border border-white/8 overflow-hidden flex items-center px-2 gap-[2px]"
      aria-label="Forme d'onde de l'enregistrement vocal"
    >
      {/* Trim masked left */}
      {startRatio > 0 && (
        <div
          style={{ width: `${startRatio * 100}%` }}
          className="absolute inset-y-0 left-0 bg-black/65 border-r border-sky-400/70 pointer-events-none z-10"
        />
      )}
      {/* Trim masked right */}
      {endRatio < 1 && (
        <div
          style={{ width: `${(1 - endRatio) * 100}%` }}
          className="absolute inset-y-0 right-0 bg-black/65 border-l border-sky-400/70 pointer-events-none z-10"
        />
      )}
      {/* Playhead */}
      {currentSec > 0 && (
        <div
          style={{ left: `${playRatio * 100}%` }}
          className="absolute inset-y-0 w-[2px] bg-sky-400 pointer-events-none z-20"
        />
      )}

      {peaks.map((pk, idx) => {
        const ratio = idx / Math.max(1, peaks.length);
        const insideTrim = ratio >= startRatio && ratio <= endRatio;
        const barPct = Math.max(8, Math.min(92, Math.round(pk * 100)));
        return (
          <div
            key={idx}
            style={{ height: `${barPct}%` }}
            className={`flex-1 rounded-full transition-colors duration-150 ${
              insideTrim
                ? ratio <= playRatio && currentSec > 0
                  ? 'bg-sky-400'
                  : 'bg-gradient-to-t from-violet-600 to-sky-400'
                : 'bg-slate-700/40'
            }`}
          />
        );
      })}
    </div>
  );
}
