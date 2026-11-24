# Studyble Ambient Sound Assets Setup Guide

Studyble's 4-channel Ambient Sound Mixer (`Rain`, `Keyboard`, `Paper`, `Cafe`) works out of the box without any missing-asset crashes:
- **Expo Web (`npx expo start --web`)**: Automatically synthesizes real-time looping ambient audio via the browser Web Audio API when no local files are configured.
- **iOS / Android (`Expo Go`)**: Includes a built-in procedural WAV generator (`src/audio/proceduralWav.ts`) and a pluggable native audio adapter (`registerNativeAudioAdapter`).

---

## Step 1: Drop Real Loopable Audio Files Here

Place four seamless, loop-friendly `.mp3` files directly inside `assets/sounds/` using these exact filenames:

```text
assets/sounds/
├── rain.mp3       # Soft rain on window (recommended: 15–60s loop, 128–192 kbps)
├── keyboard.mp3   # Gentle mechanical keyboard typing loop
├── paper.mp3      # Soft page-turning / notebook writing loop
└── cafe.mp3       # Warm distant coffee-shop ambience loop
```

## Step 2: Register Local Files in `src/audio/ambientSources.ts`

Open `src/audio/ambientSources.ts` and replace the `null` entries with static `require(...)` calls (required by Metro bundler):

```ts
export const LOCAL_AMBIENT_SOURCES: Record<AmbientChannelKey, AmbientAssetSource> = {
  rain: require('../../assets/sounds/rain.mp3'),
  keyboard: require('../../assets/sounds/keyboard.mp3'),
  paper: require('../../assets/sounds/paper.mp3'),
  cafe: require('../../assets/sounds/cafe.mp3'),
};
```

## Step 3: Enable Native Speaker Playback in Expo Go (iOS & Android)

Install `expo-audio` (recommended for Expo SDK 58+) or `expo-av`:

```bash
npx expo install expo-audio
```

Then register the adapter once in `App.tsx` before rendering:

```ts
import { createAudioPlayer } from 'expo-audio';
import { registerNativeAudioAdapter } from './src/audio/ambientAudioEngine';

registerNativeAudioAdapter({
  async createLoopingPlayer(source, initialVolume) {
    const player = createAudioPlayer(source);
    player.loop = true;
    player.volume = initialVolume;
    return {
      play: () => player.play(),
      pause: () => player.pause(),
      setVolume: (vol) => {
        player.volume = vol;
      },
      release: () => player.remove(),
    };
  },
});
```

*(Prefer `expo-av`? Run `npx expo install expo-av` and wrap `Audio.Sound.createAsync(source, { isLooping: true, volume: initialVolume })` inside `registerNativeAudioAdapter` instead.)*

Once registered, Studyble will immediately loop your real `assets/sounds/*.mp3` files—or automatically fall back to the built-in procedural WAV loops for any channel left as `null`—and cleanly release all players on unmount.
