import { AmbientChannelKey } from '../types/studyble';

export type AmbientAssetSource = number | string | null;

export const LOCAL_AMBIENT_SOURCES: Record<AmbientChannelKey, AmbientAssetSource> = {
  rain: require('../../assets/sounds/rain.mp3'),
  keyboard: require('../../assets/sounds/keyboard.mp3'),
  paper: require('../../assets/sounds/paper.mp3'),
  cafe: require('../../assets/sounds/cafe.mp3'),
};

export function hasLocalAmbientSource(channel: AmbientChannelKey): boolean {
  return LOCAL_AMBIENT_SOURCES[channel] !== null;
}

export function hasAnyLocalAmbientSources(): boolean {
  return Object.values(LOCAL_AMBIENT_SOURCES).some((src) => src !== null);
}
