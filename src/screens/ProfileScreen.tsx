import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { COLORS } from '../theme/tokens';
import { StudyProfileState } from '../types/studyble';

interface ProfileScreenProps {
  profile: StudyProfileState;
  joinedRoomsCount: number;
  questionsCount: number;
  onUpdateProfile: (next: Partial<StudyProfileState>) => void;
  onResetAll: () => void;
}

const FOCUS_OPTIONS = [15, 25, 45, 50];

export function ProfileScreen({
  profile,
  joinedRoomsCount,
  questionsCount,
  onUpdateProfile,
  onResetAll,
}: ProfileScreenProps) {
  const [nameInput, setNameInput] = useState<string>(profile.studentName);
  const [savedNotice, setSavedNotice] = useState<string>('');

  const level = Math.floor(profile.points / 10) + 1;
  const rankTitle =
    level >= 5 ? 'Pro Helper' : level >= 3 ? 'Helper' : 'Pelajar';

  const handleSaveName = () => {
    const clean = nameInput.trim();
    if (!clean) return;
    onUpdateProfile({ studentName: clean });
    setSavedNotice('Profile name updated.');
    setTimeout(() => setSavedNotice(''), 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <Text style={styles.headerSubtitle}>Track your study milestones and preferences</Text>

        <SectionCard style={styles.heroCard}>
          <Text style={styles.rankBadge}>{rankTitle.toUpperCase()} · LEVEL {level}</Text>
          <Text style={styles.studentName}>{profile.studentName}</Text>
          <Text style={styles.pointsText}>{profile.points} total points</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.completedSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{joinedRoomsCount}</Text>
              <Text style={styles.statLabel}>Joined Rooms</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{questionsCount}</Text>
              <Text style={styles.statLabel}>Q&A Posts</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard style={styles.settingCard}>
          <Text style={styles.sectionLabel}>DISPLAY NAME</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveName}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
          {savedNotice ? <Text style={styles.noticeText}>{savedNotice}</Text> : null}
        </SectionCard>

        <SectionCard style={styles.settingCard}>
          <Text style={styles.sectionLabel}>DEFAULT FOCUS DURATION</Text>
          <View style={styles.optionsRow}>
            {FOCUS_OPTIONS.map((mins) => {
              const active = profile.defaultFocusMinutes === mins;
              return (
                <Pressable
                  key={mins}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                  onPress={() => onUpdateProfile({ defaultFocusMinutes: mins })}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {mins} min
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard style={styles.settingCard}>
          <Text style={styles.sectionLabel}>LOCAL STORAGE</Text>
          <Text style={styles.storageHint}>
            All rooms, Q&A threads, votes, and points are persisted locally via AsyncStorage.
          </Text>
          <Pressable style={styles.resetBtn} onPress={onResetAll}>
            <Text style={styles.resetBtnText}>Reset Demo Data</Text>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
    gap: 6,
  },
  rankBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.coral,
    letterSpacing: 0.8,
  },
  studentName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.surface,
  },
  pointsText: {
    fontSize: 13,
    color: COLORS.cream,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E2F54',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.surface,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.cream,
    marginTop: 2,
  },
  settingCard: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
    letterSpacing: 0.7,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  saveBtn: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
  },
  saveBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  noticeText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: COLORS.coral,
    borderColor: COLORS.coral,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  optionTextActive: {
    color: COLORS.surface,
  },
  storageHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  resetBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  resetBtnText: {
    color: COLORS.coral,
    fontWeight: '700',
    fontSize: 13,
  },
});
