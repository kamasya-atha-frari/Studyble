import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EmptyStateBox } from '../components/EmptyStateBox';
import { SectionCard } from '../components/SectionCard';
import { COLORS } from '../theme/tokens';
import { RoomCategory, StudyProfileState, StudyRoom } from '../types/studyble';

interface RoomsScreenProps {
  rooms: StudyRoom[];
  profile: StudyProfileState;
  onEnterLiveRoom: (roomId: string) => void;
  onSessionComplete: (minutes: number) => void;
  onUpdateFocusMinutes: (minutes: number) => void;
}

type CategoryFilter = 'All' | RoomCategory;
type PomodoroPhase = 'focus' | 'shortBreak';

const SHORT_BREAK_MINUTES = 5;
const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 120;
const FOCUS_PRESET_MINUTES: ReadonlyArray<number> = [15, 25, 45, 50];
const POMODORO_ALARM_IMAGE = require('../../assets/pomodoro-alarm.png');

const CATEGORIES: ReadonlyArray<CategoryFilter> = [
  'All',
  'General',
  'Major',
  'Course',
  'Interest',
];

export function RoomsScreen({
  rooms,
  profile,
  onEnterLiveRoom,
  onSessionComplete,
  onUpdateFocusMinutes,
}: RoomsScreenProps) {
  const focusMinutes = Math.max(1, profile.defaultFocusMinutes);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(focusMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pomodoroNotice, setPomodoroNotice] = useState<string>('');

  // Keep idle focus duration synced when user updates Default Focus Duration in Profile
  useEffect(() => {
    if (phase === 'focus' && !isRunning) {
      setSecondsLeft(focusMinutes * 60);
    }
  }, [focusMinutes, phase, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || secondsLeft > 0) return;
    setIsRunning(false);
    if (phase === 'focus') {
      onSessionComplete(focusMinutes);
      setPhase('shortBreak');
      setSecondsLeft(SHORT_BREAK_MINUTES * 60);
      setPomodoroNotice(
        `Focus block finished! +5 pts earned — ready for a ${SHORT_BREAK_MINUTES}m short break.`
      );
    } else {
      setPhase('focus');
      setSecondsLeft(focusMinutes * 60);
      setPomodoroNotice(
        `Short break done! Ready for a ${focusMinutes}m focus block.`
      );
    }
  }, [isRunning, secondsLeft, phase, focusMinutes, onSessionComplete]);

  useEffect(() => {
    if (!pomodoroNotice) return;
    const timer = setTimeout(() => setPomodoroNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [pomodoroNotice]);

  const handleSelectPhase = (nextPhase: PomodoroPhase) => {
    setIsRunning(false);
    setPhase(nextPhase);
    setSecondsLeft(
      (nextPhase === 'focus' ? focusMinutes : SHORT_BREAK_MINUTES) * 60
    );
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(
      (phase === 'focus' ? focusMinutes : SHORT_BREAK_MINUTES) * 60
    );
  };

  const handleAdjustFocusMinutes = (nextMinutes: number) => {
    const clamped = Math.max(
      MIN_FOCUS_MINUTES,
      Math.min(MAX_FOCUS_MINUTES, Math.round(nextMinutes))
    );
    onUpdateFocusMinutes(clamped);
    if (phase === 'focus' && !isRunning) {
      setSecondsLeft(clamped * 60);
    }
  };

  const handleCompleteSession = () => {
    setIsRunning(false);
    onSessionComplete(focusMinutes);
    setPhase('focus');
    setSecondsLeft(focusMinutes * 60);
    setPomodoroNotice(
      `Session completed! +5 pts and +${focusMinutes}m added to your profile.`
    );
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const filteredRooms = useMemo(() => {
    if (selectedCategory === 'All') return rooms;
    return rooms.filter((room) => room.category === selectedCategory);
  }, [rooms, selectedCategory]);

  const listFooter = (
    <View style={styles.listFooterWrap}>
      {/* Standalone Pomodoro Timer at the bottom (below live rooms) */}
      <SectionCard style={styles.pomodoroCard}>
        <View style={styles.pomodoroTopRow}>
          <View style={styles.pomodoroTitleGroup}>
            <View style={styles.pomodoroMascotBadge}>
              <Image
                source={POMODORO_ALARM_IMAGE}
                style={styles.pomodoroMascotImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.pomodoroEyebrow}>SOLO POMODORO TIMER</Text>
              <Text style={styles.pomodoroSubtitle}>
                Study anytime — no live room required
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.phaseStatusPill,
              phase === 'shortBreak' && styles.phaseStatusPillBreak,
            ]}
          >
            <Text style={styles.phaseStatusText}>
              {isRunning
                ? phase === 'focus'
                  ? '● Focusing'
                  : '● On Break'
                : phase === 'focus'
                ? 'Focus'
                : 'Break'}
            </Text>
          </View>
        </View>

        {/* Focus Duration Controls: Preset pills + - / + stepper */}
        <View style={styles.durationSection}>
          <View style={styles.durationHeaderRow}>
            <Text style={styles.durationLabel}>FOCUS DURATION</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={[
                  styles.stepperBtn,
                  focusMinutes <= MIN_FOCUS_MINUTES && styles.stepperBtnDisabled,
                ]}
                onPress={() => handleAdjustFocusMinutes(focusMinutes - 5)}
                disabled={focusMinutes <= MIN_FOCUS_MINUTES}
                accessibilityLabel="Decrease focus duration by 5 minutes"
              >
                <Text style={styles.stepperBtnText}>−5</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.stepperBtn,
                  focusMinutes <= MIN_FOCUS_MINUTES && styles.stepperBtnDisabled,
                ]}
                onPress={() => handleAdjustFocusMinutes(focusMinutes - 1)}
                disabled={focusMinutes <= MIN_FOCUS_MINUTES}
                accessibilityLabel="Decrease focus duration by 1 minute"
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{focusMinutes}m</Text>
              <Pressable
                style={[
                  styles.stepperBtn,
                  focusMinutes >= MAX_FOCUS_MINUTES && styles.stepperBtnDisabled,
                ]}
                onPress={() => handleAdjustFocusMinutes(focusMinutes + 1)}
                disabled={focusMinutes >= MAX_FOCUS_MINUTES}
                accessibilityLabel="Increase focus duration by 1 minute"
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.stepperBtn,
                  focusMinutes >= MAX_FOCUS_MINUTES && styles.stepperBtnDisabled,
                ]}
                onPress={() => handleAdjustFocusMinutes(focusMinutes + 5)}
                disabled={focusMinutes >= MAX_FOCUS_MINUTES}
                accessibilityLabel="Increase focus duration by 5 minutes"
              >
                <Text style={styles.stepperBtnText}>+5</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.presetRow}>
            {FOCUS_PRESET_MINUTES.map((preset) => {
              const active = focusMinutes === preset;
              return (
                <Pressable
                  key={preset}
                  style={[styles.presetPill, active && styles.presetPillActive]}
                  onPress={() => handleAdjustFocusMinutes(preset)}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      active && styles.presetPillTextActive,
                    ]}
                  >
                    {preset}m
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.phaseRow}>
          <Pressable
            style={[styles.phaseTab, phase === 'focus' && styles.phaseTabActive]}
            onPress={() => handleSelectPhase('focus')}
          >
            <Text
              style={[
                styles.phaseTabText,
                phase === 'focus' && styles.phaseTabTextActive,
              ]}
            >
              Focus ({focusMinutes}m)
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.phaseTab,
              phase === 'shortBreak' && styles.phaseTabBreakActive,
            ]}
            onPress={() => handleSelectPhase('shortBreak')}
          >
            <Text
              style={[
                styles.phaseTabText,
                phase === 'shortBreak' && styles.phaseTabTextActive,
              ]}
            >
              Short Break ({SHORT_BREAK_MINUTES}m)
            </Text>
          </Pressable>
        </View>

        <View style={styles.pomodoroMainRow}>
          <Text style={styles.pomodoroTime}>{formattedTimer}</Text>
          <View style={styles.pomodoroControls}>
            <Pressable
              style={[
                styles.pomodoroStartBtn,
                isRunning && styles.pomodoroPauseBtn,
              ]}
              onPress={() => setIsRunning((prev) => !prev)}
            >
              <Text style={styles.pomodoroStartText}>
                {isRunning ? 'Pause' : 'Start'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.pomodoroResetBtn}
              onPress={handleResetTimer}
            >
              <Text style={styles.pomodoroResetText}>Reset</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.pomodoroCompleteBtn}
          onPress={handleCompleteSession}
        >
          <Text style={styles.pomodoroCompleteText}>Complete (+5 pts)</Text>
        </Pressable>

        {pomodoroNotice ? (
          <View style={styles.pomodoroNoticeBanner}>
            <Text style={styles.pomodoroNoticeText}>✓ {pomodoroNotice}</Text>
          </View>
        ) : null}
      </SectionCard>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandEyebrow}>CO-WORKING STUDY SPACE</Text>
            <Text style={styles.headerTitle}>Studyble</Text>
          </View>
          <View style={styles.pointsPill}>
            <Text style={styles.pointsPillValue}>{profile.points} pts</Text>
            <Text style={styles.pointsPillLabel}>
              {profile.completedSessions} sessions
            </Text>
          </View>
        </View>

        <SectionCard style={styles.welcomeCard}>
          <View style={styles.welcomeTop}>
            <Text style={styles.welcomeName}>{profile.studentName}</Text>
            <View style={styles.majorBadge}>
              <Text style={styles.majorBadgeText}>{profile.jurusan}</Text>
            </View>
          </View>
          <Text style={styles.goalText} numberOfLines={2}>
            Goal: {profile.goal}
          </Text>
        </SectionCard>

        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyStateBox
              title={`No live rooms in ${selectedCategory}`}
              subtitle="There are no active study tables in this category right now. Switch back to All to join another session."
              actionLabel="Show All Rooms"
              onAction={() => setSelectedCategory('All')}
            />
          }
          renderItem={({ item }) => {
            const verifiedCount = item.messages.filter((m) => m.verified).length;
            return (
              <SectionCard style={styles.roomCard}>
                <View style={styles.roomTop}>
                  <View style={styles.badgeRow}>
                    <View style={styles.livePill}>
                      <Text style={styles.livePillText}>● LIVE</Text>
                    </View>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.roomStudents}>
                    {item.activeStudents} studying
                  </Text>
                </View>

                <Text style={styles.roomTitle}>{item.title}</Text>

                <View style={styles.roomMetaRow}>
                  <Text style={styles.roomFocus}>
                    {item.focusMinutes} min block · {item.messages.length} posts
                  </Text>
                  {verifiedCount > 0 ? (
                    <View style={styles.verifiedMiniBadge}>
                      <Text style={styles.verifiedMiniText}>
                        ✓ {verifiedCount} verified
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.roomFooter}>
                  <Text style={styles.roomStatusHint}>
                    {item.isJoined
                      ? 'You are seated at this table'
                      : 'Open co-working table'}
                  </Text>
                  <Pressable
                    style={[styles.joinBtn, item.isJoined && styles.joinedBtn]}
                    onPress={() => onEnterLiveRoom(item.id)}
                  >
                    <Text style={styles.joinBtnText}>
                      {item.isJoined ? 'Enter Live →' : 'Join Live'}
                    </Text>
                  </Pressable>
                </View>
              </SectionCard>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.sage,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.navy,
  },
  pointsPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  pointsPillValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.coral,
  },
  pointsPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  listFooterWrap: {
    marginTop: 6,
  },
  pomodoroCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
    padding: 14,
    gap: 10,
  },
  pomodoroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pomodoroTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  pomodoroMascotBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  pomodoroMascotImage: {
    width: 28,
    height: 28,
  },
  durationSection: {
    backgroundColor: COLORS.navySoft,
    borderRadius: 10,
    padding: 9,
    gap: 8,
  },
  durationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#CBD5E1',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepperBtn: {
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    minWidth: 28,
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.cream,
  },
  stepperValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.cream,
    minWidth: 34,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.16)',
    alignItems: 'center',
  },
  presetPillActive: {
    backgroundColor: COLORS.coral,
    borderColor: COLORS.coral,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  presetPillTextActive: {
    color: COLORS.surface,
  },
  pomodoroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.coral,
  },
  pomodoroSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  phaseStatusPill: {
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: COLORS.coral,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  phaseStatusPillBreak: {
    borderColor: COLORS.sage,
  },
  phaseStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cream,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: COLORS.navySoft,
    alignItems: 'center',
  },
  phaseTabActive: {
    backgroundColor: COLORS.coral,
  },
  phaseTabBreakActive: {
    backgroundColor: COLORS.sage,
  },
  phaseTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  phaseTabTextActive: {
    color: COLORS.surface,
  },
  pomodoroMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  pomodoroTime: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.cream,
    fontVariant: ['tabular-nums'],
  },
  pomodoroControls: {
    flexDirection: 'row',
    gap: 8,
  },
  pomodoroStartBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  pomodoroPauseBtn: {
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  pomodoroStartText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
  pomodoroResetBtn: {
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.25)',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },
  pomodoroResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cream,
  },
  pomodoroCompleteBtn: {
    backgroundColor: COLORS.sage,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pomodoroCompleteText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.surface,
  },
  pomodoroNoticeBanner: {
    backgroundColor: 'rgba(42, 111, 104, 0.28)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pomodoroNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cream,
  },
  welcomeCard: {
    padding: 13,
    gap: 6,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  welcomeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  welcomeName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    flexShrink: 1,
  },
  majorBadge: {
    backgroundColor: COLORS.sageSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  majorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sage,
  },
  goalText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chipTextActive: {
    color: COLORS.surface,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  roomCard: {
    gap: 9,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePill: {
    backgroundColor: COLORS.coralSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.coral,
  },
  categoryPill: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  roomStudents: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.sage,
  },
  roomTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.navy,
  },
  roomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomFocus: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  verifiedMiniBadge: {
    backgroundColor: COLORS.sageSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sage,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  roomStatusHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  joinBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinedBtn: {
    backgroundColor: COLORS.sage,
  },
  joinBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 12,
  },
});
