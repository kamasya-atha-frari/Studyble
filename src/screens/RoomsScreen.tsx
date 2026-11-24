import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
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
  onToggleJoinRoom: (roomId: string) => void;
  onSessionComplete: (minutes: number) => void;
}

const CATEGORIES: Array<'All' | RoomCategory> = ['All', 'General', 'Major', 'Course', 'Interest'];

export function RoomsScreen({
  rooms,
  profile,
  onToggleJoinRoom,
  onSessionComplete,
}: RoomsScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | RoomCategory>('All');
  const [secondsLeft, setSecondsLeft] = useState<number>(profile.defaultFocusMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(profile.defaultFocusMinutes * 60);
    }
  }, [profile.defaultFocusMinutes, isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onSessionComplete(profile.defaultFocusMinutes);
          return profile.defaultFocusMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onSessionComplete, profile.defaultFocusMinutes]);

  const filteredRooms =
    selectedCategory === 'All'
      ? rooms
      : rooms.filter((room) => room.category === selectedCategory);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Studyble</Text>
        <Text style={styles.headerSubtitle}>Live study rooms & focus sessions</Text>

        <SectionCard style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>FOCUS TIMER</Text>
            <Text style={styles.timerMeta}>{profile.completedSessions} sessions done</Text>
          </View>
          <Text style={styles.timerClock}>{formattedTimer}</Text>
          <View style={styles.timerActions}>
            <Pressable
              style={[styles.primaryBtn, isRunning && styles.secondaryBtn]}
              onPress={() => setIsRunning((prev) => !prev)}
            >
              <Text style={styles.btnText}>{isRunning ? 'Pause' : 'Start Focus'}</Text>
            </Pressable>
            <Pressable
              style={styles.outlineBtn}
              onPress={() => {
                setIsRunning(false);
                onSessionComplete(profile.defaultFocusMinutes);
                setSecondsLeft(profile.defaultFocusMinutes * 60);
              }}
            >
              <Text style={styles.outlineBtnText}>Complete (+5 pts)</Text>
            </Pressable>
          </View>
        </SectionCard>

        <View style={styles.filterRow}>
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
        </View>

        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateBox
              title="No rooms in this category"
              subtitle="Try switching back to All to see active study rooms."
            />
          }
          renderItem={({ item }) => (
            <SectionCard style={styles.roomCard}>
              <View style={styles.roomTop}>
                <Text style={styles.roomBadge}>{item.category}</Text>
                <Text style={styles.roomStudents}>{item.activeStudents} studying</Text>
              </View>
              <Text style={styles.roomTitle}>{item.title}</Text>
              <View style={styles.roomFooter}>
                <Text style={styles.roomFocus}>{item.focusMinutes} min block</Text>
                <Pressable
                  style={[styles.joinBtn, item.isJoined && styles.joinedBtn]}
                  onPress={() => onToggleJoinRoom(item.id)}
                >
                  <Text style={styles.joinBtnText}>
                    {item.isJoined ? 'Joined' : 'Join Room'}
                  </Text>
                </Pressable>
              </View>
            </SectionCard>
          )}
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
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  timerCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
    marginBottom: 12,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
    letterSpacing: 0.8,
  },
  timerMeta: {
    fontSize: 12,
    color: COLORS.cream,
  },
  timerClock: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.surface,
    marginVertical: 8,
  },
  timerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.coral,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#3A4A6B',
  },
  btnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cream,
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: COLORS.cream,
    fontWeight: '600',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.coral,
    borderColor: COLORS.coral,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chipTextActive: {
    color: COLORS.surface,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  roomCard: {
    gap: 8,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
  },
  roomStudents: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  roomFocus: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  joinBtn: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinedBtn: {
    backgroundColor: COLORS.success,
  },
  joinBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 12,
  },
});
