import React, { useState } from 'react';
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
  onEnterLiveRoom: (roomId: string) => void;
}

const CATEGORIES: Array<'All' | RoomCategory> = ['All', 'General', 'Major', 'Course', 'Interest'];

export function RoomsScreen({ rooms, profile, onEnterLiveRoom }: RoomsScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | RoomCategory>('All');

  const filteredRooms =
    selectedCategory === 'All'
      ? rooms
      : rooms.filter((room) => room.category === selectedCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Studyble</Text>
        <Text style={styles.headerSubtitle}>
          {profile.completedSessions} sessions completed · {profile.points} pts
        </Text>

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
              subtitle="Try switching back to All to see active live study rooms."
            />
          }
          renderItem={({ item }) => (
            <SectionCard style={styles.roomCard}>
              <View style={styles.roomTop}>
                <Text style={styles.roomBadge}>● LIVE · {item.category}</Text>
                <Text style={styles.roomStudents}>{item.activeStudents} studying</Text>
              </View>
              <Text style={styles.roomTitle}>{item.title}</Text>
              <View style={styles.roomFooter}>
                <Text style={styles.roomFocus}>
                  {item.focusMinutes} min block · {item.messages.length} live posts
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
    fontSize: 12,
    color: COLORS.textMuted,
  },
  joinBtn: {
    backgroundColor: COLORS.coral,
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
