import { AmbientChannelKey } from '../types/studyble';

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;
    output += BASE64_CHARS[(triplet >> 18) & 0x3f];
    output += BASE64_CHARS[(triplet >> 12) & 0x3f];
    output += i + 1 < bytes.length ? BASE64_CHARS[(triplet >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? BASE64_CHARS[triplet & 0x3f] : '=';
  }
  return output;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Generates a lightweight, valid 16-bit mono PCM WAV data URI for a channel.
 * Used as a zero-asset fallback loop when local MP3 files are not bundled yet.
 */
function buildProceduralWavDataUri(channel: AmbientChannelKey): string {
  const sampleRate = 11025;
  const durationSec = 2;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let lpState = 0;
  let lpState2 = 0;
  // Deterministic LCG PRNG for smooth repeatable fallback textures
  let seed =
    channel === 'rain'
      ? 101
      : channel === 'keyboard'
      ? 202
      : channel === 'paper'
      ? 303
      : 404;

  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const fadeEdge = Math.min(1, i / 400, (numSamples - 1 - i) / 400);
    const white = nextRandom();
    let sample = 0;

    if (channel === 'rain') {
      // Soft low-passed rain hiss with gentle wave swell
      lpState += 0.14 * (white - lpState);
      const swell = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.5 * t);
      sample = lpState * 0.28 * swell;
    } else if (channel === 'keyboard') {
      // Soft rhythmic tactile keystroke impulses
      const beat = (i % 1900) / sampleRate;
      const env = beat < 0.018 ? Math.exp(-beat * 180) : 0;
      sample =
        (white * 0.35 + Math.sin(2 * Math.PI * 210 * t) * 0.45) * env * 0.45;
    } else if (channel === 'paper') {
      // Gentle periodic page-turn rustle
      const cycle = t % 2;
      const env =
        cycle > 0.35 && cycle < 0.7
          ? Math.sin(((cycle - 0.35) / 0.35) * Math.PI)
          : 0;
      lpState += 0.25 * (white - lpState);
      sample = (white - lpState) * 0.25 * env;
    } else {
      // Warm low-frequency cafe murmur + soft harmonic chime
      lpState += 0.06 * (white - lpState);
      lpState2 += 0.04 * (lpState - lpState2);
      const hum = Math.sin(2 * Math.PI * 196 * t) * 0.025;
      sample = lpState2 * 0.42 + hum;
    }

    const clamped = Math.max(-1, Math.min(1, sample * fadeEdge));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return `data:audio/wav;base64,${bytesToBase64(new Uint8Array(buffer))}`;
}

const wavCache: Partial<Record<AmbientChannelKey, string>> = {};

export function getProceduralWavUri(channel: AmbientChannelKey): string {
  if (!wavCache[channel]) {
    wavCache[channel] = buildProceduralWavDataUri(channel);
  }
  return wavCache[channel] as string;
}
