import React, { useMemo, useState } from 'react';
import {
  FlatList,
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
}

type CategoryFilter = 'All' | RoomCategory;

const CATEGORIES: ReadonlyArray<CategoryFilter> = [
  'All',
  'General',
  'Major',
  'Course',
  'Interest',
];

export function RoomsScreen({ rooms, profile, onEnterLiveRoom }: RoomsScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  const filteredRooms = useMemo(() => {
    if (selectedCategory === 'All') return rooms;
    return rooms.filter((room) => room.category === selectedCategory);
  }, [rooms, selectedCategory]);

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
