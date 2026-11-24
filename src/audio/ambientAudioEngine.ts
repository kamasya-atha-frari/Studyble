import { Platform } from 'react-native';
import {
  AmbientChannelKey,
  AmbientMixerState,
} from '../types/studyble';
import {
  AmbientAssetSource,
  LOCAL_AMBIENT_SOURCES,
  hasAnyLocalAmbientSources,
} from './ambientSources';
import { getProceduralWavUri } from './proceduralWav';

export type AudioPlaybackMode =
  | 'web-procedural'
  | 'web-local'
  | 'native-player'
  | 'native-fallback-visual';

export interface NativeAudioPlayerHandle {
  play: () => void | Promise<void>;
  pause: () => void | Promise<void>;
  setVolume: (volume: number) => void | Promise<void>;
  release: () => void | Promise<void>;
}

export interface NativeAudioAdapter {
  createLoopingPlayer: (
    source: number | { uri: string },
    initialVolume: number
  ) => Promise<NativeAudioPlayerHandle>;
}

/**
 * Optional native adapter hook for `expo-audio` or `expo-av`.
 * Register your installed Expo audio module once at app startup (see `assets/sounds/README.md`)
 * so native iOS/Android Expo Go builds play local MP3s or procedural WAV fallbacks directly.
 */
let registeredNativeAdapter: NativeAudioAdapter | null = null;

export function registerNativeAudioAdapter(adapter: NativeAudioAdapter | null): void {
  registeredNativeAdapter = adapter;
}

const ALL_CHANNELS: ReadonlyArray<AmbientChannelKey> = [
  'rain',
  'keyboard',
  'paper',
  'cafe',
];

type GlobalWithWebAudio = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export interface AudioEngineStatus {
  mode: AudioPlaybackMode;
  activeChannels: AmbientChannelKey[];
  note: string;
}

export function getAudioEngineStatus(mixer: AmbientMixerState): AudioEngineStatus {
  const activeChannels = ALL_CHANNELS.filter(
    (ch) => mixer[ch].active && mixer[ch].level > 0
  );

  if (Platform.OS === 'web') {
    const usingLocal = hasAnyLocalAmbientSources();
    return {
      mode: usingLocal ? 'web-local' : 'web-procedural',
      activeChannels,
      note: usingLocal
        ? 'Looping local audio tracks active'
        : activeChannels.length > 0
        ? 'Live procedural Web Audio playing (drop MP3s in assets/sounds to customize)'
        : 'Web Audio synth ready — toggle a channel or drag a slider above 0%',
    };
  }

  if (registeredNativeAdapter) {
    return {
      mode: 'native-player',
      activeChannels,
      note: hasAnyLocalAmbientSources()
        ? 'Looping local MP3 tracks via Expo audio'
        : 'Looping procedural WAV audio via Expo audio',
    };
  }

  return {
    mode: 'native-fallback-visual',
    activeChannels,
    note:
      activeChannels.length > 0
        ? 'Mix saved · Run `npx expo install expo-audio` (see assets/sounds/README.md) for native speaker audio'
        : 'No native audio package installed yet — see assets/sounds/README.md to enable iOS/Android playback',
  };
}

/**
 * Cross-platform looping 4-channel ambient audio controller.
 * - Web: Uses HTML5 Audio when local MP3 sources are configured, or a zero-asset
 *   Web Audio API procedural synthesizer (Rain, Keyboard, Paper, Cafe) out of the box.
 * - Native (iOS/Android): Uses a registered Expo native adapter (`expo-audio` / `expo-av`)
 *   with local MP3s or procedural WAV fallback URIs; falls back gracefully without crashing
 *   when no native audio package is installed yet.
 */
export class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private gains: Partial<Record<AmbientChannelKey, GainNode>> = {};
  private continuousNodes: AudioScheduledSourceNode[] = [];
  private pinkBuffer: AudioBuffer | null = null;
  private whiteBuffer: AudioBuffer | null = null;
  private timers: Partial<Record<AmbientChannelKey, ReturnType<typeof setTimeout>>> = {};
  private volumes: Record<AmbientChannelKey, number> = {
    rain: 0,
    keyboard: 0,
    paper: 0,
    cafe: 0,
  };

  private htmlPlayers: Partial<Record<AmbientChannelKey, HTMLAudioElement>> = {};
  private nativePlayers: Partial<Record<AmbientChannelKey, NativeAudioPlayerHandle>> = {};
  private nativeCreatingPromises: Partial<
    Record<AmbientChannelKey, Promise<NativeAudioPlayerHandle | null>>
  > = {};
  private disposed = false;

  public getStatus(mixer: AmbientMixerState): AudioEngineStatus {
    return getAudioEngineStatus(mixer);
  }

  public syncMixer(mixer: AmbientMixerState): void {
    if (this.disposed) return;

    for (const channel of ALL_CHANNELS) {
      const chState = mixer[channel];
      const targetVolume = chState.active
        ? Math.max(0, Math.min(1, chState.level / 100))
        : 0;
      this.applyChannelVolume(channel, targetVolume);
    }
  }

  private applyChannelVolume(channel: AmbientChannelKey, normalizedVolume: number): void {
    const prev = this.volumes[channel];
    this.volumes[channel] = normalizedVolume;

    if (Platform.OS === 'web') {
      const localSrc = LOCAL_AMBIENT_SOURCES[channel];
      if (typeof localSrc === 'string' && localSrc.length > 0) {
        this.applyWebHtmlAudio(channel, localSrc, normalizedVolume);
      } else {
        this.applyWebProceduralAudio(channel, prev, normalizedVolume);
      }
      return;
    }

    if (registeredNativeAdapter) {
      void this.applyNativeAudio(channel, normalizedVolume);
    }
  }

  // --------------------------------------------------------------------------
  // WEB HTML5 AUDIO (when local MP3 files are provided)
  // --------------------------------------------------------------------------

  private applyWebHtmlAudio(
    channel: AmbientChannelKey,
    src: string,
    volume: number
  ): void {
    if (typeof globalThis.Audio !== 'function') return;

    let player = this.htmlPlayers[channel];
    if (volume <= 0.001) {
      if (player) {
        player.volume = 0;
        player.pause();
      }
      return;
    }

    if (!player) {
      player = new globalThis.Audio(src);
      player.loop = true;
      this.htmlPlayers[channel] = player;
    }

    player.volume = volume;
    if (player.paused) {
      void player.play().catch(() => {
        // Ignore browser autoplay rejection until next user gesture
      });
    }
  }

  // --------------------------------------------------------------------------
  // WEB AUDIO API PROCEDURAL SYNTHESIZER (Zero-asset fallback)
  // --------------------------------------------------------------------------

  private ensureWebAudioContext(): boolean {
    const g = globalThis as GlobalWithWebAudio;
    const AudioCtx = g.AudioContext ?? g.webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      if (!this.ctx) return false;

      const ctx = this.ctx;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(ctx.destination);
      this.masterGain = masterGain;

      this.pinkBuffer = this.createPinkNoiseBuffer(ctx, 4);
      this.whiteBuffer = this.createWhiteNoiseBuffer(ctx, 2);

      this.setupRainWebChannel(ctx);
      this.setupSimpleGainChannel(ctx, 'keyboard');
      this.setupSimpleGainChannel(ctx, 'paper');
      this.setupCafeWebChannel(ctx);
    }

    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return true;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.085;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private setupSimpleGainChannel(
    ctx: AudioContext,
    channel: AmbientChannelKey
  ): void {
    if (!this.masterGain) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    this.gains[channel] = gain;
  }

  private setupRainWebChannel(ctx: AudioContext): void {
    if (!this.masterGain || !this.pinkBuffer) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    this.gains.rain = gain;

    const src = ctx.createBufferSource();
    src.buffer = this.pinkBuffer;
    src.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 260;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gain);

    src.start();
    lfo.start();
    this.continuousNodes.push(src, lfo);
  }

  private setupCafeWebChannel(ctx: AudioContext): void {
    if (!this.masterGain || !this.pinkBuffer) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    this.gains.cafe = gain;

    const src = ctx.createBufferSource();
    src.buffer = this.pinkBuffer;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 460;

    const formant = ctx.createBiquadFilter();
    formant.type = 'peaking';
    formant.frequency.value = 600;
    formant.Q.value = 1.8;
    formant.gain.value = 4;

    src.connect(lp);
    lp.connect(formant);
    formant.connect(gain);

    src.start();
    this.continuousNodes.push(src);
  }

  private applyWebProceduralAudio(
    channel: AmbientChannelKey,
    prevVolume: number,
    nextVolume: number
  ): void {
    if (nextVolume > 0.001) {
      const ready = this.ensureWebAudioContext();
      if (!ready) return;
    }

    const ctx = this.ctx;
    const gainNode = this.gains[channel];
    if (!ctx || !gainNode) return;

    const now = ctx.currentTime;
    const scaled =
      channel === 'rain'
        ? nextVolume * 0.5
        : channel === 'cafe'
        ? nextVolume * 0.6
        : nextVolume * 0.8;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(scaled, now, 0.05);

    if (nextVolume <= 0.001) {
      this.clearChannelTimer(channel);
      return;
    }

    if (prevVolume <= 0.001) {
      if (channel === 'keyboard') this.scheduleKeyboardBurst(4);
      else if (channel === 'paper') this.schedulePaperTurn(true);
      else if (channel === 'cafe') this.scheduleCafeClink();
    }
  }

  private scheduleKeyboardBurst(remaining: number): void {
    this.clearChannelTimer('keyboard');
    const ctx = this.ctx;
    const whiteBuffer = this.whiteBuffer;
    const channelGain = this.gains.keyboard;
    if (
      this.disposed ||
      !ctx ||
      !whiteBuffer ||
      !channelGain ||
      this.volumes.keyboard <= 0.001
    ) {
      return;
    }

    const count = remaining > 0 ? remaining : 3 + Math.floor(Math.random() * 6);
    const isSpace = count === 1 && Math.random() > 0.35;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = whiteBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = isSpace ? 1300 : 2100 + Math.random() * 750;
    bp.Q.value = 1.9;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(isSpace ? 0.32 : 0.25, now + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    src.connect(bp);
    bp.connect(g);
    g.connect(channelGain);
    src.start(now, Math.random() * 1.1, 0.035);

    const delayMs = count > 1 ? 100 + Math.random() * 110 : 500 + Math.random() * 1000;
    this.timers.keyboard = setTimeout(() => this.scheduleKeyboardBurst(count - 1), delayMs);
  }

  private triggerPaperRustle(): void {
    const ctx = this.ctx;
    const whiteBuffer = this.whiteBuffer;
    const channelGain = this.gains.paper;
    if (
      this.disposed ||
      !ctx ||
      !whiteBuffer ||
      !channelGain ||
      this.volumes.paper <= 0.001
    ) {
      return;
    }

    const now = ctx.currentTime;
    const dur = 0.34;
    const src = ctx.createBufferSource();
    src.buffer = whiteBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(900, now);
    bp.frequency.exponentialRampToValueAtTime(2300, now + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(950, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.26, now + dur * 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(bp);
    bp.connect(env);
    env.connect(channelGain);
    src.start(now, Math.random() * 0.7, dur + 0.04);
  }

  private schedulePaperTurn(immediate: boolean): void {
    this.clearChannelTimer('paper');
    if (this.disposed || this.volumes.paper <= 0.001) return;

    if (immediate) {
      this.triggerPaperRustle();
    }

    const nextMs = 2800 + Math.random() * 3200;
    this.timers.paper = setTimeout(() => {
      this.triggerPaperRustle();
      this.schedulePaperTurn(false);
    }, nextMs);
  }

  private scheduleCafeClink(): void {
    this.clearChannelTimer('cafe');
    const ctx = this.ctx;
    const channelGain = this.gains.cafe;
    if (this.disposed || !ctx || !channelGain || this.volumes.cafe <= 0.001) {
      return;
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 2250 + Math.random() * 250;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.025, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(g);
    g.connect(channelGain);
    osc.start(now);
    osc.stop(now + 0.18);

    const nextMs = 4800 + Math.random() * 5200;
    this.timers.cafe = setTimeout(() => this.scheduleCafeClink(), nextMs);
  }

  // --------------------------------------------------------------------------
  // NATIVE EXPO ADAPTER (iOS / Android when `expo-audio` / `expo-av` registered)
  // --------------------------------------------------------------------------

  private resolveNativeSource(
    channel: AmbientChannelKey
  ): number | { uri: string } {
    const local: AmbientAssetSource = LOCAL_AMBIENT_SOURCES[channel];
    if (typeof local === 'number') return local;
    if (typeof local === 'string' && local.length > 0) return { uri: local };
    return { uri: getProceduralWavUri(channel) };
  }

  private async stopAndReleaseNativePlayer(
    handle: NativeAudioPlayerHandle
  ): Promise<void> {
    let setVolResult: void | Promise<void>;
    let pauseResult: void | Promise<void>;

    try {
      setVolResult = handle.setVolume(0);
    } catch {
      // Ignore volume errors during teardown
    }
    try {
      pauseResult = handle.pause();
    } catch {
      // Ignore pause errors during teardown
    }

    try {
      await Promise.all([setVolResult, pauseResult]);
    } catch {
      // Ignore async teardown errors
    }

    try {
      await handle.release();
    } catch {
      // Ignore release errors during teardown
    }
  }

  private async applyNativeAudio(
    channel: AmbientChannelKey,
    volume: number
  ): Promise<void> {
    const adapter = registeredNativeAdapter;
    if (!adapter || this.disposed) return;

    const existing = this.nativePlayers[channel];
    if (volume <= 0.001) {
      if (existing) {
        try {
          await existing.setVolume(0);
          await existing.pause();
        } catch {
          // Ignore stop errors during cleanup
        }
      }
      return;
    }

    if (existing) {
      try {
        await existing.setVolume(volume);
        if (this.disposed) {
          delete this.nativePlayers[channel];
          await this.stopAndReleaseNativePlayer(existing);
          return;
        }
        await existing.play();
      } catch {
        // Keep UI responsive
      }
      return;
    }

    if (this.nativeCreatingPromises[channel]) return;

    const creationPromise: Promise<NativeAudioPlayerHandle | null> = (async () => {
      try {
        const source = this.resolveNativeSource(channel);
        const handle = await adapter.createLoopingPlayer(source, volume);

        if (this.disposed) {
          await this.stopAndReleaseNativePlayer(handle);
          return null;
        }

        this.nativePlayers[channel] = handle;
        const latestVolume = this.volumes[channel];
        if (latestVolume > 0.001 && !this.disposed) {
          await handle.setVolume(latestVolume);
          if (this.disposed) {
            delete this.nativePlayers[channel];
            await this.stopAndReleaseNativePlayer(handle);
            return null;
          }
          await handle.play();
          if (this.disposed) {
            delete this.nativePlayers[channel];
            await this.stopAndReleaseNativePlayer(handle);
            return null;
          }
        } else {
          await handle.setVolume(0);
          await handle.pause();
        }
        return handle;
      } catch {
        // Fail safely without crashing Expo Go
        return null;
      } finally {
        if (this.nativeCreatingPromises[channel] === creationPromise) {
          delete this.nativeCreatingPromises[channel];
        }
      }
    })();

    this.nativeCreatingPromises[channel] = creationPromise;
    await creationPromise;
  }

  private clearChannelTimer(channel: AmbientChannelKey): void {
    const timer = this.timers[channel];
    if (timer) {
      clearTimeout(timer);
      delete this.timers[channel];
    }
  }

  // --------------------------------------------------------------------------
  // CLEANUP / DISPOSE (Zero memory leaks on unmount)
  // --------------------------------------------------------------------------

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    for (const channel of ALL_CHANNELS) {
      this.clearChannelTimer(channel);
      this.volumes[channel] = 0;

      const htmlPlayer = this.htmlPlayers[channel];
      if (htmlPlayer) {
        try {
          htmlPlayer.pause();
          htmlPlayer.src = '';
        } catch {
          // Ignore
        }
        delete this.htmlPlayers[channel];
      }

      const nativePlayer = this.nativePlayers[channel];
      if (nativePlayer) {
        delete this.nativePlayers[channel];
        void this.stopAndReleaseNativePlayer(nativePlayer);
      }

      const pendingCreation = this.nativeCreatingPromises[channel];
      if (pendingCreation) {
        delete this.nativeCreatingPromises[channel];
        void pendingCreation
          .then((handle) => {
            if (handle) {
              return this.stopAndReleaseNativePlayer(handle);
            }
            return undefined;
          })
          .catch(() => {});
      }
    }

    for (const node of this.continuousNodes) {
      try {
        node.stop();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.continuousNodes = [];

    if (this.ctx) {
      const ctxToClose = this.ctx;
      this.ctx = null;
      this.masterGain = null;
      this.gains = {};
      void ctxToClose.close().catch(() => {});
    }
  }
}
