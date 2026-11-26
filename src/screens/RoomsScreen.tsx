import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ContainerBounds,
  DraggablePomodoroClock,
} from '../components/DraggablePomodoroClock';
import { EmptyStateBox } from '../components/EmptyStateBox';
import { PomodoroDurationModal } from '../components/PomodoroDurationModal';
import { COLORS } from '../theme/tokens';
import { RoomCategory, StudyProfileState, StudyRoom } from '../types/studyble';

interface RoomsScreenProps {
  rooms: StudyRoom[];
  profile: StudyProfileState;
  onEnterLiveRoom: (roomId: string) => void;
  focusMinutes: number;
  secondsLeft: number;
  isRunning: boolean;
  isAlarmFinished: boolean;
  onSetFocusMinutes: (minutes: number) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onCreateInterestRoom: (title: string, coverImageUrl?: string) => void;
}

interface RoomCoverTheme {
  uri: string;
  fallbackBg: string;
}

interface CoverPresetOption {
  id: string;
  label: string;
  uri: string;
  fallbackBg: string;
}

const CATEGORIES: ReadonlyArray<RoomCategory> = [
  'General',
  'Major',
  'Course',
  'Interest',
];

const INTEREST_COVER_PRESETS: ReadonlyArray<CoverPresetOption> = [
  {
    id: 'art',
    label: 'Art',
    uri: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#EEDFD5',
  },
  {
    id: 'food',
    label: 'Food & Drink',
    uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#EFE6D8',
  },
  {
    id: 'sports',
    label: 'Sports & Gym',
    uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#D8E3EC',
  },
  {
    id: 'social',
    label: 'Social Impact',
    uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#DCE8E5',
  },
  {
    id: 'reading',
    label: 'Books',
    uri: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#F4E4DC',
  },
  {
    id: 'music',
    label: 'Music',
    uri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#E3DFEC',
  },
];

const ROOM_COVER_BY_ID: Record<string, RoomCoverTheme> = {
  'room-1': {
    uri: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#DCE8E5',
  },
  'room-2': {
    uri: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#EFE6D8',
  },
  'room-3': {
    uri: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#DDE5F0',
  },
  'room-interest-art': {
    uri: INTEREST_COVER_PRESETS[0].uri,
    fallbackBg: INTEREST_COVER_PRESETS[0].fallbackBg,
  },
  'room-interest-food': {
    uri: INTEREST_COVER_PRESETS[1].uri,
    fallbackBg: INTEREST_COVER_PRESETS[1].fallbackBg,
  },
  'room-interest-sports': {
    uri: INTEREST_COVER_PRESETS[2].uri,
    fallbackBg: INTEREST_COVER_PRESETS[2].fallbackBg,
  },
  'room-interest-social': {
    uri: INTEREST_COVER_PRESETS[3].uri,
    fallbackBg: INTEREST_COVER_PRESETS[3].fallbackBg,
  },
};

const ROOM_COVER_BY_CATEGORY: Record<RoomCategory, RoomCoverTheme> = {
  Course: {
    uri: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#DCE8E5',
  },
  General: {
    uri: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#EFE6D8',
  },
  Major: {
    uri: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=80',
    fallbackBg: '#DDE5F0',
  },
  Interest: {
    uri: INTEREST_COVER_PRESETS[4].uri,
    fallbackBg: INTEREST_COVER_PRESETS[4].fallbackBg,
  },
};

function getRoomCover(room: StudyRoom): RoomCoverTheme {
  if (room.coverImageUrl) {
    const presetMatch = INTEREST_COVER_PRESETS.find(
      (p) => p.uri === room.coverImageUrl
    );
    return {
      uri: room.coverImageUrl,
      fallbackBg: presetMatch?.fallbackBg ?? '#E8E3D9',
    };
  }
  return ROOM_COVER_BY_ID[room.id] ?? ROOM_COVER_BY_CATEGORY[room.category];
}

export function RoomsScreen({
  rooms,
  onEnterLiveRoom,
  focusMinutes,
  secondsLeft,
  isRunning,
  isAlarmFinished,
  onSetFocusMinutes,
  onToggleTimer,
  onResetTimer,
  onCreateInterestRoom,
}: RoomsScreenProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory>('General');
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newGroupTitle, setNewGroupTitle] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    INTEREST_COVER_PRESETS[0].id
  );
  const [createError, setCreateError] = useState<string>('');
  const [clockSettingsOpen, setClockSettingsOpen] = useState<boolean>(false);
  const [stageBounds, setStageBounds] = useState<ContainerBounds>({
    width: windowWidth,
    height: Math.max(320, windowHeight - 140),
  });

  const isAlarmRinging = isAlarmFinished || secondsLeft === 0;
  const isInterestView = selectedCategory === 'Interest';

  const handleStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setStageBounds((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  const handleOpenCreateGroup = () => {
    setNewGroupTitle('');
    setSelectedPresetId(INTEREST_COVER_PRESETS[0].id);
    setCreateError('');
    setCreateModalVisible(true);
  };

  const handleSubmitCreateGroup = () => {
    const clean = newGroupTitle.trim();
    if (!clean) {
      setCreateError('Please enter a group name.');
      return;
    }
    const chosenPreset =
      INTEREST_COVER_PRESETS.find((p) => p.id === selectedPresetId) ??
      INTEREST_COVER_PRESETS[0];
    onCreateInterestRoom(clean, chosenPreset.uri);
    setCreateModalVisible(false);
    setNewGroupTitle('');
    setCreateError('');
  };

  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.category === selectedCategory),
    [rooms, selectedCategory]
  );

  const cardWidth = Math.max(
    148,
    Math.min(200, Math.floor((stageBounds.width - 46) / 2))
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex} onLayout={handleStageLayout}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            isInterestView && styles.scrollContentWithFab,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Centered Studyble Header (no student member card, no points label) */}
          <View style={styles.headerBlock}>
            <Text style={styles.brandEyebrow}>CO-WORKING STUDY SPACE</Text>
            <Text style={styles.headerTitle}>Studyble</Text>
          </View>

          {/* Centered Category Filter Chips */}
          <View style={styles.filterContainer}>
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Centered Study Room Grid (Cover Image + Centered Subject Title) */}
          {filteredRooms.length > 0 ? (
            <View style={styles.roomsGrid}>
              {filteredRooms.map((item) => {
                const cover = getRoomCover(item);
                const coverFailed = Boolean(failedCoverIds[item.id]);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.roomCard,
                      { width: cardWidth },
                      pressed && styles.roomCardPressed,
                    ]}
                    onPress={() => onEnterLiveRoom(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Enter ${item.title}`}
                  >
                    <View
                      style={[
                        styles.coverWrap,
                        { backgroundColor: cover.fallbackBg },
                      ]}
                    >
                      {!coverFailed ? (
                        <Image
                          source={{ uri: cover.uri }}
                          style={styles.coverImage}
                          resizeMode="cover"
                          onError={() =>
                            setFailedCoverIds((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                        />
                      ) : null}
                    </View>
                    <View style={styles.roomCardBody}>
                      <Text style={styles.roomTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : isInterestView ? (
            <View style={styles.emptyWrap}>
              <EmptyStateBox
                title="No interest groups yet"
                subtitle="Tap Create Group below to start a new Interest study room."
                actionLabel="Create Group"
                onAction={handleOpenCreateGroup}
              />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyStateBox
                title={`No live rooms in ${selectedCategory}`}
                subtitle="There are no active study tables in this category right now. Switch to General to join another session."
                actionLabel={
                  selectedCategory !== 'General' ? 'Show General Rooms' : undefined
                }
                onAction={
                  selectedCategory !== 'General'
                    ? () => setSelectedCategory('General')
                    : undefined
                }
              />
            </View>
          )}
        </ScrollView>

        {/* Floating Create Group Pill Button (Interest View Only) */}
        {isInterestView ? (
          <Pressable
            style={({ pressed }) => [
              styles.createGroupFab,
              pressed && styles.createGroupFabPressed,
            ]}
            onPress={handleOpenCreateGroup}
            accessibilityRole="button"
            accessibilityLabel="Create Group"
          >
            <Text style={styles.createGroupFabIcon}>👥</Text>
            <Text style={styles.createGroupFabText}>Create Group</Text>
          </Pressable>
        ) : null}

        {/* Draggable Transparent Pomodoro Alarm Clock Mascot (1x Tap: Start/Pause, 2x Tap: Settings) */}
        <DraggablePomodoroClock
          size={104}
          zIndex={50}
          initialCorner="bottom-left"
          containerBounds={stageBounds}
          isRunning={isRunning}
          isAlarmRinging={isAlarmRinging}
          onSingleTap={onToggleTimer}
          onDoubleTap={() => setClockSettingsOpen(true)}
        />
      </View>

      {/* Create Interest Group Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>NEW INTEREST GROUP</Text>
            <Text style={styles.modalTitle}>Create Study Group</Text>

            <Text style={styles.modalLabel}>Group Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newGroupTitle}
              onChangeText={(text) => {
                setNewGroupTitle(text);
                if (createError) setCreateError('');
              }}
              placeholder="e.g. Photography, Book Club, Coding..."
              placeholderTextColor={COLORS.textMuted}
              maxLength={32}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmitCreateGroup}
            />
            {createError ? (
              <Text style={styles.modalError}>{createError}</Text>
            ) : null}

            <Text style={styles.modalLabel}>Cover Style</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetRow}
            >
              {INTEREST_COVER_PRESETS.map((preset) => {
                const active = selectedPresetId === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    style={[
                      styles.presetTile,
                      { backgroundColor: preset.fallbackBg },
                      active && styles.presetTileActive,
                    ]}
                    onPress={() => setSelectedPresetId(preset.id)}
                  >
                    <Image
                      source={{ uri: preset.uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    <View style={styles.presetScrim}>
                      <Text style={styles.presetLabel} numberOfLines={1}>
                        {preset.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalCreateBtn}
                onPress={handleSubmitCreateGroup}
              >
                <Text style={styles.modalCreateText}>Create Group</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <PomodoroDurationModal
        visible={clockSettingsOpen}
        focusMinutes={focusMinutes}
        secondsLeft={secondsLeft}
        isRunning={isRunning}
        isAlarmFinished={isAlarmFinished}
        onSetFocusMinutes={onSetFocusMinutes}
        onToggleTimer={onToggleTimer}
        onResetTimer={onResetTimer}
        onClose={() => setClockSettingsOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 32,
  },
  scrollContentWithFab: {
    paddingBottom: 92,
  },
  headerBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 2,
  },
  brandEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.sage,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
  },
  filterContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  chipTextActive: {
    color: COLORS.surface,
  },
  roomsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  roomCard: {
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  roomCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  coverWrap: {
    width: '100%',
    height: 122,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  roomCardBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.navy,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  createGroupFab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FDE047',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  createGroupFabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  createGroupFabIcon: {
    fontSize: 15,
  },
  createGroupFabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14213D',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 10,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.sage,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.navy,
    textAlign: 'center',
  },
  modalError: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  presetTile: {
    width: 86,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetTileActive: {
    borderColor: '#14213D',
  },
  presetScrim: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modalCreateBtn: {
    backgroundColor: '#FDE047',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCreateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14213D',
  },
});
