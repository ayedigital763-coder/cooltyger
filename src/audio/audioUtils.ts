import { Mp3Encoder } from '@breezystack/lamejs';

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function trimAudioBuffer(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const safeStart = Math.max(0, Math.min(startSec, buffer.duration - 0.1));
  const safeEnd = Math.max(safeStart + 0.1, Math.min(endSec, buffer.duration));
  const startSample = Math.floor(safeStart * buffer.sampleRate);
  const endSample = Math.floor(safeEnd * buffer.sampleRate);
  const frameCount = Math.max(1, endSample - startSample);

  const trimmed = ctx.createBuffer(buffer.numberOfChannels, frameCount, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = trimmed.getChannelData(ch);
    dst.set(src.subarray(startSample, startSample + frameCount));
  }
  return trimmed;
}

export function serializeAudioBuffer(buffer: AudioBuffer): {
  sampleRate: number;
  channels: Float32Array[];
} {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    channels.push(new Float32Array(buffer.getChannelData(ch)));
  }
  return { sampleRate: buffer.sampleRate, channels };
}

export function deserializeAudioBuffer(
  ctx: BaseAudioContext,
  sampleRate: number,
  channels: Float32Array[]
): AudioBuffer {
  const numChannels = Math.max(1, channels.length);
  const length = channels[0]?.length ?? 1;
  const buf = ctx.createBuffer(numChannels, length, sampleRate || 44100);
  for (let ch = 0; ch < numChannels; ch++) {
    buf.getChannelData(ch).set(channels[ch]);
  }
  return buf;
}

export function encodeWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const ch0 = buffer.getChannelData(0);
  const ch1 = numChannels > 1 ? buffer.getChannelData(1) : ch0;
  let offset = 44;

  for (let i = 0; i < length; i++) {
    const s0 = Math.max(-1, Math.min(1, ch0[i]));
    view.setInt16(offset, s0 < 0 ? s0 * 0x8000 : s0 * 0x7fff, true);
    offset += 2;
    if (numChannels > 1) {
      const s1 = Math.max(-1, Math.min(1, ch1[i]));
      view.setInt16(offset, s1 < 0 ? s1 * 0x8000 : s1 * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function encodeMp3Blob(buffer: AudioBuffer, kbps = 192): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);

  const toInt16 = (floatArr: Float32Array): Int16Array => {
    const out = new Int16Array(floatArr.length);
    for (let i = 0; i < floatArr.length; i++) {
      const s = Math.max(-1, Math.min(1, floatArr[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };

  const left = toInt16(buffer.getChannelData(0));
  const right = numChannels > 1 ? toInt16(buffer.getChannelData(1)) : left;

  const mp3Chunks: BlobPart[] = [];
  const blockSize = 1152;
  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize);
    const rightChunk = right.subarray(i, i + blockSize);
    const buf =
      numChannels === 1
        ? encoder.encodeBuffer(leftChunk)
        : encoder.encodeBuffer(leftChunk, rightChunk);
    if (buf.length > 0) {
      mp3Chunks.push(new Uint8Array(buf));
    }
  }
  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3Chunks.push(new Uint8Array(endBuf));
  }
  return new Blob(mp3Chunks, { type: 'audio/mp3' });
}

export async function encodeCompactWavBase64(buffer: AudioBuffer, maxSec = 25): Promise<string> {
  const targetRate = 16000;
  const dur = Math.min(buffer.duration, maxSec);
  const targetFrames = Math.max(1600, Math.floor(dur * targetRate));
  const offline = new OfflineAudioContext(1, targetFrames, targetRate);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0, 0, dur);
  const rendered = await offline.startRendering();
  const wavBlob = encodeWavBlob(rendered);
  const arrayBuf = await wavBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function extractAcousticHints(buffer: AudioBuffer): {
  durationSec: number;
  peakDb: number;
  rmsDb: number;
  detectedSilences: number;
  estimatedOnsetsPerSec: number;
} {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const windowSize = Math.floor(sr * 0.1);
  let peak = 0;
  let sumSq = 0;
  let silenceCount = 0;
  let inSilence = false;
  let onsets = 0;
  let prevRms = 0;

  for (let i = 0; i < data.length; i += windowSize) {
    let wSum = 0;
    const end = Math.min(data.length, i + windowSize);
    for (let j = i; j < end; j++) {
      const v = Math.abs(data[j]);
      if (v > peak) peak = v;
      wSum += v * v;
    }
    const rms = Math.sqrt(wSum / Math.max(1, end - i));
    sumSq += wSum;
    if (rms < 0.015) {
      if (!inSilence) {
        inSilence = true;
        silenceCount++;
      }
    } else {
      inSilence = false;
      if (rms > prevRms * 1.65 && rms > 0.03) {
        onsets++;
      }
    }
    prevRms = rms;
  }

  const totalRms = Math.sqrt(sumSq / Math.max(1, data.length));
  return {
    durationSec: Number(buffer.duration.toFixed(2)),
    peakDb: Number((20 * Math.log10(Math.max(1e-5, peak))).toFixed(1)),
    rmsDb: Number((20 * Math.log10(Math.max(1e-5, totalRms))).toFixed(1)),
    detectedSilences: silenceCount,
    estimatedOnsetsPerSec: Number((onsets / Math.max(1, buffer.duration)).toFixed(2)),
  };
}

export function computeWaveformPeaks(buffer: AudioBuffer, bars = 120): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    const start = i * step;
    const end = Math.min(data.length, start + step);
    let max = 0;
    for (let j = start; j < end; j++) {
      const a = Math.abs(data[j]);
      if (a > max) max = a;
    }
    peaks.push(max);
  }
  return peaks;
}
