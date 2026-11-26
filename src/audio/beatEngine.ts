import { BeatProposal, MixSettings } from '../types/music';
import { midiToFreq } from './audioUtils';

export type StemName =
  | 'all'
  | 'drums'
  | 'percussions'
  | 'bass'
  | 'piano_harmonies'
  | 'guitars_synths';

export type ListenMode = 'full' | 'vocal' | 'instrumental';

interface BusNodes {
  master: GainNode;
  instrumentalBus: GainNode;
  drumsGain: GainNode;
  percussionsGain: GainNode;
  bassGain: GainNode;
  pianoGain: GainNode;
  guitarSynthGain: GainNode;
  vocalGain: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
}

function createNoiseBuffer(ctx: BaseAudioContext, durationSec = 1): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * durationSec);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function createImpulseResponse(ctx: BaseAudioContext, seconds = 1.6, decay = 2.6): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function makeWarmthCurve(amount = 18): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function buildAudioGraph(
  ctx: BaseAudioContext,
  destination: AudioNode,
  mix: MixSettings,
  listenMode: ListenMode,
  stemFilter: StemName
): BusNodes {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -10;
  compressor.knee.value = 14;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;
  compressor.connect(destination);

  const master = ctx.createGain();
  master.gain.value = 0.94;
  master.connect(compressor);

  // Instrumental Master Bus with optional effects
  const instrumentalBus = ctx.createGain();
  const instVol = listenMode === 'vocal' ? 0 : mix.instrumentalVolume;
  instrumentalBus.gain.value = instVol;

  let instTail: AudioNode = instrumentalBus;

  if (mix.effects.lofiFilter) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3400;
    lp.Q.value = 1.1;
    instTail.connect(lp);
    instTail = lp;
  }

  if (mix.effects.warmth) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeWarmthCurve(12);
    shaper.oversample = '2x';
    instTail.connect(shaper);
    instTail = shaper;
  }

  instTail.connect(master);

  // Reverb & Delay Sends
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = mix.effects.reverb ? 0.28 : 0;
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 1.8, 2.8);
  reverbSend.connect(convolver);
  convolver.connect(instTail);

  const delaySend = ctx.createGain();
  delaySend.gain.value = mix.effects.delay ? 0.22 : 0;
  const delayNode = ctx.createDelay(1.5);
  delayNode.delayTime.value = (60 / Math.max(60, mix.tempoBpm)) * 0.75;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.34;
  const delayFilter = ctx.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = 2600;
  delaySend.connect(delayNode);
  delayNode.connect(delayFilter);
  delayFilter.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayFilter.connect(instTail);

  const stemGain = (target: StemName, value: number): GainNode => {
    const g = ctx.createGain();
    g.gain.value = stemFilter === 'all' || stemFilter === target ? value : 0;
    g.connect(instrumentalBus);
    return g;
  };

  const drumsGain = stemGain('drums', mix.drumVolume);
  const percussionsGain = stemGain('percussions', mix.percussionVolume);
  const bassGain = stemGain('bass', mix.bassVolume);
  const pianoGain = stemGain('piano_harmonies', mix.pianoVolume);
  const guitarSynthGain = stemGain('guitars_synths', mix.guitarSynthVolume);

  // Vocal Chain — STRICT PRESERVATION
  const vocalGain = ctx.createGain();
  vocalGain.gain.value =
    listenMode === 'instrumental' || stemFilter !== 'all' ? 0 : mix.vocalVolume;

  if (mix.vocalMode === 'original') {
    // Mode Voix Originale: direct bit-faithful pass-through without EQ, compression, or pitch/timbre alteration
    vocalGain.connect(master);
  } else {
    // Mode Amélioration: optional, gentle clarity & space while preserving 100% vocal identity
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 82;
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3400;
    presence.gain.value = 2.0;
    presence.Q.value = 0.9;
    const vComp = ctx.createDynamicsCompressor();
    vComp.threshold.value = -16;
    vComp.ratio.value = 2.2;
    vComp.attack.value = 0.01;
    vComp.release.value = 0.18;

    vocalGain.connect(hp);
    hp.connect(presence);
    presence.connect(vComp);
    vComp.connect(master);
  }

  return {
    master,
    instrumentalBus,
    drumsGain,
    percussionsGain,
    bassGain,
    pianoGain,
    guitarSynthGain,
    vocalGain,
    reverbSend,
    delaySend,
  };
}

function triggerKick(ctx: BaseAudioContext, out: AudioNode, time: number, vel: number, tone: string) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  const startFreq = tone === 'sub808' ? 140 : 155;
  const endFreq = tone === 'sub808' ? 40 : 48;
  const decay = tone === 'sub808' ? 0.42 : 0.26;
  osc.frequency.setValueAtTime(startFreq, time);
  osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.075);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.85 * vel, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

  osc.connect(gain);
  gain.connect(out);
  osc.start(time);
  osc.stop(time + decay + 0.02);
}

function triggerSnare(
  ctx: BaseAudioContext,
  out: AudioNode,
  reverb: AudioNode,
  noiseBuf: AudioBuffer,
  time: number,
  vel: number
) {
  // Noise burst
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1900, time);
  filter.Q.value = 0.9;

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.48 * vel, time);
  nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

  src.connect(filter);
  filter.connect(nGain);
  nGain.connect(out);
  nGain.connect(reverb);
  src.start(time);
  src.stop(time + 0.18);

  // Tonal punch
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(195, time);
  osc.frequency.exponentialRampToValueAtTime(110, time + 0.06);
  oGain.gain.setValueAtTime(0.32 * vel, time);
  oGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
  osc.connect(oGain);
  oGain.connect(out);
  osc.start(time);
  osc.stop(time + 0.1);
}

function triggerHiHat(
  ctx: BaseAudioContext,
  out: AudioNode,
  noiseBuf: AudioBuffer,
  time: number,
  vel: number,
  open = false
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(7500, time);

  const dur = open ? 0.22 : 0.055;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.2 * vel, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);

  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(time);
  src.stop(time + dur + 0.01);
}

function triggerPercussion(
  ctx: BaseAudioContext,
  out: AudioNode,
  reverb: AudioNode,
  noiseBuf: AudioBuffer,
  time: number,
  vel: number,
  type: string,
  rootMidi: number
) {
  if (type === 'shaker_clave') {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5400;
    bp.Q.value = 2.0;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(time);
    src.stop(time + 0.08);
    return;
  }

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  if (type === 'logdrum') {
    osc.type = 'triangle';
    const base = midiToFreq(rootMidi - 12);
    osc.frequency.setValueAtTime(base * 2.1, time);
    osc.frequency.exponentialRampToValueAtTime(base, time + 0.05);
    g.gain.setValueAtTime(0.55 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    osc.connect(g);
    g.connect(out);
    osc.start(time);
    osc.stop(time + 0.26);
  } else if (type === 'woodblock') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(860, time);
    g.gain.setValueAtTime(0.28 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
    osc.connect(g);
    g.connect(out);
    g.connect(reverb);
    osc.start(time);
    osc.stop(time + 0.08);
  } else {
    // Conga / Djembe
    osc.type = 'sine';
    const startF = type === 'djembe' ? 320 : 260;
    const endF = type === 'djembe' ? 165 : 145;
    osc.frequency.setValueAtTime(startF, time);
    osc.frequency.exponentialRampToValueAtTime(endF, time + 0.06);
    g.gain.setValueAtTime(0.36 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(g);
    g.connect(out);
    g.connect(reverb);
    osc.start(time);
    osc.stop(time + 0.18);
  }
}

function triggerBass(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  dur: number,
  midiNote: number,
  tone: string
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const freq = midiToFreq(midiNote);

  if (tone === 'sub808' || tone === 'logdrum') {
    osc.type = tone === 'logdrum' ? 'triangle' : 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tone === 'logdrum' ? 420 : 280, time);
  } else if (tone === 'reese') {
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + dur);
  } else {
    osc.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(680, time);
    filter.frequency.exponentialRampToValueAtTime(240, time + dur);
  }

  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.45, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, time + Math.max(0.14, dur));

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  osc.start(time);
  osc.stop(time + Math.max(0.16, dur + 0.03));
}

function triggerChord(
  ctx: BaseAudioContext,
  out: AudioNode,
  reverb: AudioNode,
  time: number,
  dur: number,
  notes: number[],
  tone: string
) {
  for (const midi of notes) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = tone === 'organ' || tone === 'warm_pad' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(midiToFreq(midi), time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tone === 'grand' ? 2400 : 1450, time);

    const attack = tone === 'warm_pad' ? 0.16 : 0.015;
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.11, time + attack);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(out);
    g.connect(reverb);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
}

function triggerGuitarOrSynth(
  ctx: BaseAudioContext,
  out: AudioNode,
  reverb: AudioNode,
  delay: AudioNode,
  time: number,
  dur: number,
  midi: number,
  isGuitar: boolean,
  tone: string
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();

  osc.type = isGuitar ? 'triangle' : tone === 'lush_pad' ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(midiToFreq(midi), time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(isGuitar ? 2300 : 1850, time);
  filter.frequency.exponentialRampToValueAtTime(620, time + Math.max(0.12, dur));

  const peak = isGuitar ? 0.16 : 0.12;
  g.gain.setValueAtTime(0.001, time);
  g.gain.linearRampToValueAtTime(peak, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, time + Math.max(0.14, dur));

  osc.connect(filter);
  filter.connect(g);
  g.connect(out);
  g.connect(reverb);
  g.connect(delay);
  osc.start(time);
  osc.stop(time + Math.max(0.16, dur + 0.04));
}

function triggerTransitionCrash(
  ctx: BaseAudioContext,
  out: AudioNode,
  reverb: AudioNode,
  noiseBuf: AudioBuffer,
  time: number
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(4200, time);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.16, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.85);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  g.connect(reverb);
  src.start(time);
  src.stop(time + 0.9);
}

export function scheduleBeatArrangement(
  ctx: BaseAudioContext,
  buses: BusNodes,
  proposal: BeatProposal,
  tempoBpm: number,
  startTime: number,
  totalDurationSec: number
) {
  const p = proposal.patterns;
  const noiseBuf = createNoiseBuffer(ctx, 1.0);
  const stepDur = 60 / Math.max(55, Math.min(180, tempoBpm)) / 4; // 16th note
  const totalSteps = Math.ceil(totalDurationSec / stepDur);

  for (let s = 0; s < totalSteps; s++) {
    const stepInBar = s % 16;
    const barIndex = Math.floor(s / 16);
    const swingOffset = stepInBar % 2 === 1 ? p.swing * stepDur : 0;
    const t = startTime + s * stepDur + swingOffset;

    if (t > startTime + totalDurationSec) break;

    // Transition crash every 4 bars
    if (stepInBar === 0 && barIndex % 4 === 0 && barIndex > 0) {
      triggerTransitionCrash(ctx, buses.drumsGain, buses.reverbSend, noiseBuf, t);
    }

    const kickVel = p.kick[stepInBar] ?? 0;
    if (kickVel > 0.05) {
      triggerKick(ctx, buses.drumsGain, t, kickVel, p.bassTone);
    }

    const snareVel = p.snare[stepInBar] ?? 0;
    if (snareVel > 0.05) {
      triggerSnare(ctx, buses.drumsGain, buses.reverbSend, noiseBuf, t, snareVel);
    }

    const hhVel = p.hihat[stepInBar] ?? 0;
    if (hhVel > 0.05) {
      triggerHiHat(ctx, buses.drumsGain, noiseBuf, t, hhVel, stepInBar === 14);
    }

    const percVel = p.percussion[stepInBar] ?? 0;
    if (percVel > 0.05) {
      triggerPercussion(
        ctx,
        buses.percussionsGain,
        buses.reverbSend,
        noiseBuf,
        t,
        percVel,
        p.percussionType,
        proposal.rootMidi
      );
    }

    const bassOffset = p.bassSteps[stepInBar];
    if (bassOffset !== null && bassOffset !== undefined) {
      const chord = p.chordProgression[barIndex % p.chordProgression.length];
      const chordRoot = chord?.[0] ? chord[0] - 12 : proposal.rootMidi - 12;
      triggerBass(ctx, buses.bassGain, t, stepDur * 2.2, chordRoot + bassOffset, p.bassTone);
    }

    // Piano / Harmonies chord hits on beat 1 and beat 3 (or bar start)
    if (stepInBar === 0 || stepInBar === 8) {
      const chord = p.chordProgression[barIndex % p.chordProgression.length];
      if (chord && chord.length > 0) {
        triggerChord(
          ctx,
          buses.pianoGain,
          buses.reverbSend,
          t,
          stepDur * (stepInBar === 0 ? 7.5 : 7.0),
          chord,
          p.pianoTone
        );
      }
    }

    const gOffset = p.guitarPattern[stepInBar];
    if (gOffset !== null && gOffset !== undefined) {
      triggerGuitarOrSynth(
        ctx,
        buses.guitarSynthGain,
        buses.reverbSend,
        buses.delaySend,
        t,
        stepDur * 1.8,
        proposal.rootMidi + gOffset,
        true,
        p.guitarTone
      );
    }

    const synOffset = p.synthPattern[stepInBar];
    if (synOffset !== null && synOffset !== undefined) {
      triggerGuitarOrSynth(
        ctx,
        buses.guitarSynthGain,
        buses.reverbSend,
        buses.delaySend,
        t,
        stepDur * 2.4,
        proposal.rootMidi + 12 + synOffset,
        false,
        p.synthTone
      );
    }
  }
}

export async function renderMixOffline(params: {
  proposal: BeatProposal;
  mix: MixSettings;
  vocalBuffer: AudioBuffer | null;
  listenMode: ListenMode;
  stemFilter?: StemName;
  sampleRate?: number;
}): Promise<AudioBuffer> {
  const {
    proposal,
    mix,
    vocalBuffer,
    listenMode,
    stemFilter = 'all',
    sampleRate = 44100,
  } = params;

  const durationSec = Math.max(8, vocalBuffer ? vocalBuffer.duration : 16);
  const frameCount = Math.ceil(durationSec * sampleRate);
  const offline = new OfflineAudioContext(2, frameCount, sampleRate);
  const buses = buildAudioGraph(offline, offline.destination, mix, listenMode, stemFilter);

  if (vocalBuffer && listenMode !== 'instrumental' && stemFilter === 'all') {
    const vSrc = offline.createBufferSource();
    vSrc.buffer = vocalBuffer;
    vSrc.connect(buses.vocalGain);
    vSrc.start(0);
  }

  if (listenMode !== 'vocal') {
    scheduleBeatArrangement(offline, buses, proposal, mix.tempoBpm, 0, durationSec);
  }

  return offline.startRendering();
}

export class LiveStudioPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buses: BusNodes | null = null;
  private isRunning = false;
  private rafId = 0;
  private startAtCtx = 0;
  private durationSec = 16;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getIsPlaying(): boolean {
    return this.isRunning;
  }

  async play(params: {
    proposal: BeatProposal;
    mix: MixSettings;
    vocalBuffer: AudioBuffer | null;
    listenMode: ListenMode;
    onProgress?: (currentSec: number, durationSec: number) => void;
    onEnded?: () => void;
  }): Promise<void> {
    this.stop();
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.ctx.destination);

    this.buses = buildAudioGraph(this.ctx, this.analyser, params.mix, params.listenMode, 'all');
    this.durationSec = Math.max(8, params.vocalBuffer ? params.vocalBuffer.duration : 16);
    this.startAtCtx = this.ctx.currentTime + 0.05;
    this.isRunning = true;

    if (params.vocalBuffer && params.listenMode !== 'instrumental') {
      const vSrc = this.ctx.createBufferSource();
      vSrc.buffer = params.vocalBuffer;
      vSrc.connect(this.buses.vocalGain);
      vSrc.start(this.startAtCtx);
    }

    if (params.listenMode !== 'vocal') {
      scheduleBeatArrangement(
        this.ctx,
        this.buses,
        params.proposal,
        params.mix.tempoBpm,
        this.startAtCtx,
        this.durationSec
      );
    }

    const tick = () => {
      if (!this.isRunning || !this.ctx) return;
      const elapsed = Math.max(0, this.ctx.currentTime - this.startAtCtx);
      params.onProgress?.(Math.min(elapsed, this.durationSec), this.durationSec);
      if (elapsed >= this.durationSec) {
        this.stop();
        params.onEnded?.();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  updateLiveMix(mix: MixSettings, listenMode: ListenMode): void {
    if (!this.buses || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.buses.vocalGain.gain.setTargetAtTime(
      listenMode === 'instrumental' ? 0 : mix.vocalVolume,
      t,
      0.02
    );
    this.buses.instrumentalBus.gain.setTargetAtTime(
      listenMode === 'vocal' ? 0 : mix.instrumentalVolume,
      t,
      0.02
    );
    this.buses.drumsGain.gain.setTargetAtTime(mix.drumVolume, t, 0.02);
    this.buses.percussionsGain.gain.setTargetAtTime(mix.percussionVolume, t, 0.02);
    this.buses.bassGain.gain.setTargetAtTime(mix.bassVolume, t, 0.02);
    this.buses.pianoGain.gain.setTargetAtTime(mix.pianoVolume, t, 0.02);
    this.buses.guitarSynthGain.gain.setTargetAtTime(mix.guitarSynthVolume, t, 0.02);
    this.buses.reverbSend.gain.setTargetAtTime(mix.effects.reverb ? 0.28 : 0, t, 0.03);
    this.buses.delaySend.gain.setTargetAtTime(mix.effects.delay ? 0.22 : 0, t, 0.03);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.analyser = null;
    this.buses = null;
  }
}
