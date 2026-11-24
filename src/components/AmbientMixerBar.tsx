import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getAudioEngineStatus } from '../audio/ambientAudioEngine';
import { COLORS } from '../theme/tokens';
import { AmbientChannelKey, AmbientMixerState } from '../types/studyble';

interface AmbientMixerBarProps {
  mixer: AmbientMixerState;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (next: AmbientMixerState) => void;
}

const CHANNELS: ReadonlyArray<{
  key: AmbientChannelKey;
  label: string;
  icon: string;
}> = [
  { key: 'rain', label: 'Rain', icon: '🌧️' },
  { key: 'keyboard', label: 'Keyboard', icon: '⌨️' },
  { key: 'paper', label: 'Paper', icon: '📖' },
  { key: 'cafe', label: 'Cafe', icon: '☕' },
];

export function getAmbientSummary(mixer: AmbientMixerState): string {
  const activeLabels = CHANNELS.filter(
    (ch) => mixer[ch.key].active && mixer[ch.key].level > 0
  ).map((ch) => `${ch.label} ${mixer[ch.key].level}%`);

  if (activeLabels.length === 0) return 'Off';
  return activeLabels.join(' · ');
}

interface VolumeSliderProps {
  value: number;
  active: boolean;
  onValueChange: (next: number) => void;
}

function VolumeSlider({ value, active, onValueChange }: VolumeSliderProps) {
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const trackWidthRef = useRef<number>(0);
  const startValueRef = useRef<number>(value);
  const onChangeRef = useRef(onValueChange);

  useEffect(() => {
    onChangeRef.current = onValueChange;
  }, [onValueChange]);

  const computeFromLocationX = (locationX: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return value;
    const ratio = Math.max(0, Math.min(1, locationX / width));
    return Math.round((ratio * 100) / 5) * 5;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const next = computeFromLocationX(evt.nativeEvent.locationX);
          startValueRef.current = next;
          onChangeRef.current(next);
        },
        onPanResponderMove: (_evt, gestureState) => {
          const width = trackWidthRef.current;
          if (width <= 0) return;
          const deltaPercent = (gestureState.dx / width) * 100;
          const raw = Math.max(0, Math.min(100, startValueRef.current + deltaPercent));
          const snapped = Math.round(raw / 5) * 5;
          onChangeRef.current(snapped);
        },
      }),
    []
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  };

  const visualPercent = active ? Math.max(0, Math.min(100, value)) : 0;
  const thumbOffset =
    trackWidth > 0 ? Math.max(0, Math.min(trackWidth - 16, (visualPercent / 100) * (trackWidth - 16))) : 0;

  return (
    <View
      style={styles.sliderTouchArea}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.sliderTrack}>
        <View
          style={[
            styles.sliderFill,
            { width: `${visualPercent}%` },
          ]}
        />
      </View>
      <View
        style={[
          styles.sliderThumb,
          active && visualPercent > 0 && styles.sliderThumbActive,
          { left: thumbOffset },
        ]}
      />
    </View>
  );
}

export function AmbientMixerBar({
  mixer,
  expanded,
  onToggleExpand,
  onChange,
}: AmbientMixerBarProps) {
  const activeSummary = getAmbientSummary(mixer);
  const hasActive = activeSummary !== 'Off';
  const engineStatus = useMemo(() => getAudioEngineStatus(mixer), [mixer]);

  const handleToggleChannel = (key: AmbientChannelKey) => {
    const current = mixer[key];
    const nextActive = !current.active;
    const nextLevel = nextActive && current.level === 0 ? 50 : current.level;
    onChange({
      ...mixer,
      [key]: { active: nextActive, level: nextLevel },
    });
  };

  const handleSetLevel = (key: AmbientChannelKey, nextLevel: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(nextLevel)));
    onChange({
      ...mixer,
      [key]: {
        active: clamped > 0,
        level: clamped,
      },
    });
  };

  const handleApplyPreset = (preset: 'rainy-cafe' | 'focus-desk' | 'mute') => {
    if (preset === 'mute') {
      onChange({
        rain: { active: false, level: mixer.rain.level },
        keyboard: { active: false, level: mixer.keyboard.level },
        paper: { active: false, level: mixer.paper.level },
        cafe: { active: false, level: mixer.cafe.level },
      });
      return;
    }

    if (preset === 'rainy-cafe') {
      onChange({
        rain: { active: true, level: 55 },
        keyboard: { active: false, level: 25 },
        paper: { active: false, level: 25 },
        cafe: { active: true, level: 50 },
      });
      return;
    }

    onChange({
      rain: { active: true, level: 25 },
      keyboard: { active: true, level: 70 },
      paper: { active: true, level: 45 },
      cafe: { active: false, level: 25 },
    });
  };

  if (!expanded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Ambient Sound Mixer</Text>
          <Text style={styles.statusLine} numberOfLines={1}>
            {hasActive ? `Active: ${activeSummary}` : 'All 4 channels muted'}
          </Text>
        </View>
        <Pressable style={styles.collapseBtn} onPress={onToggleExpand}>
          <Text style={styles.collapseBtnText}>Hide</Text>
        </Pressable>
      </View>

      <View style={styles.engineNoteBox}>
        <Text style={styles.engineNoteText}>
          {hasActive ? '● ' : '○ '}
          {engineStatus.note}
        </Text>
      </View>

      <View style={styles.presetRow}>
        <Pressable
          style={styles.presetChip}
          onPress={() => handleApplyPreset('rainy-cafe')}
        >
          <Text style={styles.presetText}>🌧️ Rainy Cafe</Text>
        </Pressable>
        <Pressable
          style={styles.presetChip}
          onPress={() => handleApplyPreset('focus-desk')}
        >
          <Text style={styles.presetText}>⌨️ Focus Desk</Text>
        </Pressable>
        <Pressable
          style={styles.muteChip}
          onPress={() => handleApplyPreset('mute')}
        >
          <Text style={styles.muteChipText}>Mute All</Text>
        </Pressable>
      </View>

      <View style={styles.channelList}>
        {CHANNELS.map((ch) => {
          const state = mixer[ch.key];
          const isPlaying = state.active && state.level > 0;
          return (
            <View key={ch.key} style={styles.channelRow}>
              <Pressable
                style={[
                  styles.channelToggle,
                  isPlaying && styles.channelToggleActive,
                ]}
                onPress={() => handleToggleChannel(ch.key)}
              >
                <Text
                  style={[
                    styles.channelToggleText,
                    isPlaying && styles.channelToggleTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {ch.icon} {ch.label}
                </Text>
              </Pressable>

              <View style={styles.levelControls}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => handleSetLevel(ch.key, state.level - 15)}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>

                <VolumeSlider
                  value={state.level}
                  active={state.active}
                  onValueChange={(val) => handleSetLevel(ch.key, val)}
                />

                <Pressable
                  style={styles.stepBtn}
                  onPress={() =>
                    handleSetLevel(
                      ch.key,
                      state.active ? state.level + 15 : Math.max(25, state.level)
                    )
                  }
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>

                <Text style={styles.percentText}>
                  {isPlaying ? `${state.level}%` : 'OFF'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    gap: 9,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  statusLine: {
    fontSize: 11,
    color: COLORS.sage,
    fontWeight: '600',
  },
  collapseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  collapseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  engineNoteBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  engineNoteText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetChip: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  muteChip: {
    marginLeft: 'auto',
    backgroundColor: COLORS.coralSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  muteChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.coral,
  },
  channelList: {
    gap: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  channelToggle: {
    width: 98,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  channelToggleActive: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  channelToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  channelToggleTextActive: {
    color: COLORS.surface,
  },
  levelControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navy,
    lineHeight: 16,
  },
  sliderTouchArea: {
    flex: 1,
    height: 26,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.coral,
    borderRadius: 999,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  sliderThumbActive: {
    borderColor: COLORS.coral,
    backgroundColor: COLORS.surface,
  },
  percentText: {
    width: 34,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
});
