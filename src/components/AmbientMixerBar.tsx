import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

const LEVEL_STEPS = [25, 50, 75, 100] as const;

export function getAmbientSummary(mixer: AmbientMixerState): string {
  const activeLabels = CHANNELS.filter((ch) => mixer[ch.key].active && mixer[ch.key].level > 0)
    .map((ch) => `${ch.label} ${mixer[ch.key].level}%`);

  if (activeLabels.length === 0) return 'Off';
  return activeLabels.join(' · ');
}

export function AmbientMixerBar({
  mixer,
  expanded,
  onToggleExpand,
  onChange,
}: AmbientMixerBarProps) {
  const activeSummary = getAmbientSummary(mixer);
  const hasActive = activeSummary !== 'Off';

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
    const clamped = Math.max(0, Math.min(100, nextLevel));
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
        rain: { active: true, level: 50 },
        keyboard: { active: false, level: 25 },
        paper: { active: false, level: 25 },
        cafe: { active: true, level: 50 },
      });
      return;
    }

    onChange({
      rain: { active: true, level: 25 },
      keyboard: { active: true, level: 75 },
      paper: { active: true, level: 50 },
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
            {hasActive
              ? `Playing mix: ${activeSummary}`
              : 'All 4 ambient channels paused · Saved to device'}
          </Text>
        </View>
        <Pressable style={styles.collapseBtn} onPress={onToggleExpand}>
          <Text style={styles.collapseBtnText}>Hide</Text>
        </Pressable>
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
          return (
            <View key={ch.key} style={styles.channelRow}>
              <Pressable
                style={[
                  styles.channelToggle,
                  state.active && styles.channelToggleActive,
                ]}
                onPress={() => handleToggleChannel(ch.key)}
              >
                <Text
                  style={[
                    styles.channelToggleText,
                    state.active && styles.channelToggleTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {ch.icon} {ch.label}
                </Text>
              </Pressable>

              <View style={styles.levelControls}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => handleSetLevel(ch.key, state.level - 25)}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>

                <View style={styles.barsRow}>
                  {LEVEL_STEPS.map((step) => {
                    const filled = state.active && state.level >= step;
                    return (
                      <Pressable
                        key={step}
                        style={[
                          styles.levelBar,
                          filled && styles.levelBarFilled,
                        ]}
                        onPress={() => handleSetLevel(ch.key, step)}
                      />
                    );
                  })}
                </View>

                <Pressable
                  style={styles.stepBtn}
                  onPress={() => handleSetLevel(ch.key, state.level + 25)}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>

                <Text style={styles.percentText}>
                  {state.active ? `${state.level}%` : 'OFF'}
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
    gap: 7,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  channelToggle: {
    width: 104,
    paddingHorizontal: 9,
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
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  levelBar: {
    flex: 1,
    height: 10,
    borderRadius: 4,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelBarFilled: {
    backgroundColor: COLORS.coral,
    borderColor: COLORS.coral,
  },
  percentText: {
    width: 34,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
});
