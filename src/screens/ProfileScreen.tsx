import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AmbientMixerBar, getAmbientSummary } from '../components/AmbientMixerBar';
import { ProQuizModal } from '../components/ProQuizModal';
import { SectionCard } from '../components/SectionCard';
import { StudyReceiptModal } from '../components/StudyReceiptModal';
import { COLORS } from '../theme/tokens';
import { StudyMode, StudyProfileState } from '../types/studyble';
import {
  DAILY_VERIFIED_LIMIT_LOW_LEVEL,
  PRIVATE_HELP_REWARD_POINTS,
  QNA_VERIFIED_ANSWER_POINTS,
  getPeerCooldownRemainingMs,
  getProgressionInfo,
  getTodayVerifiedCount,
  isSubjectToDailyVerifiedCap,
} from '../utils/progression';

interface ProfileScreenProps {
  profile: StudyProfileState;
  joinedRoomsCount: number;
  questionsCount: number;
  onUpdateProfile: (next: Partial<StudyProfileState>) => void;
  onUnlockBadge: (badgeName: string) => void;
  onResetAll: () => void;
}

const FOCUS_OPTIONS = [15, 25, 45, 50];
const STUDY_MODES: Array<{ value: StudyMode; label: string }> = [
  { value: 'avatar', label: '🎨 Avatar' },
  { value: 'desk', label: '💡 Desk' },
  { value: 'face', label: '📷 Face' },
];

export function ProfileScreen({
  profile,
  joinedRoomsCount,
  questionsCount,
  onUpdateProfile,
  onUnlockBadge,
  onResetAll,
}: ProfileScreenProps) {
  const [nameInput, setNameInput] = useState<string>(profile.studentName);
  const [jurusanInput, setJurusanInput] = useState<string>(profile.jurusan);
  const [goalInput, setGoalInput] = useState<string>(profile.goal);
  const [motifInput, setMotifInput] = useState<string>(profile.privateChatMotif);
  const [quizVisible, setQuizVisible] = useState<boolean>(false);
  const [receiptVisible, setReceiptVisible] = useState<boolean>(false);
  const [mixerExpanded, setMixerExpanded] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    setNameInput(profile.studentName);
    setJurusanInput(profile.jurusan);
    setGoalInput(profile.goal);
    setMotifInput(profile.privateChatMotif);
  }, [
    profile.studentName,
    profile.jurusan,
    profile.goal,
    profile.privateChatMotif,
  ]);

  const progression = useMemo(
    () => getProgressionInfo(profile.points),
    [profile.points]
  );

  const todayVerifiedCount = useMemo(
    () =>
      getTodayVerifiedCount(
        profile.dailyVerifiedDate,
        profile.dailyVerifiedCount
      ),
    [profile.dailyVerifiedDate, profile.dailyVerifiedCount]
  );
  const hasDailyCap = isSubjectToDailyVerifiedCap(progression.level);

  const activeCooldownCount = useMemo(() => {
    const now = Date.now();
    return Object.keys(profile.privateChatCooldowns).filter(
      (peerId) =>
        getPeerCooldownRemainingMs(profile.privateChatCooldowns, peerId, now) > 0
    ).length;
  }, [profile.privateChatCooldowns]);

  const handleSaveProfile = () => {
    const cleanName = nameInput.trim();
    const cleanJurusan = jurusanInput.trim();
    const cleanGoal = goalInput.trim();

    if (!cleanName || !cleanJurusan || !cleanGoal) {
      setErrorMsg('Please fill in your display name, jurusan, and study goal.');
      return;
    }

    onUpdateProfile({
      studentName: cleanName,
      jurusan: cleanJurusan,
      goal: cleanGoal,
      privateChatMotif: motifInput.trim() || profile.privateChatMotif,
    });
    setErrorMsg('');
    setSavedNotice('Profile details saved locally.');
    setTimeout(() => setSavedNotice(''), 2200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Profile & Progression</Text>
        <Text style={styles.headerSubtitle}>
          Track your level, specialist badges, private help & focus settings
        </Text>

        {/* Hero Progression Card */}
        <SectionCard style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.rankBadge}>
              {progression.rankTitle.toUpperCase()} · LEVEL {progression.level}
            </Text>
            <Text style={styles.pointsChip}>{profile.points} pts</Text>
          </View>

          <Text style={styles.studentName}>{profile.studentName}</Text>
          <Text style={styles.jurusanText}>{profile.jurusan}</Text>
          <Text style={styles.goalPreview}>“{profile.goal}”</Text>

          {/* Level Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressMetaRow}>
              <Text style={styles.progressLabel}>
                {progression.pointsInCurrentLevel}/10 pts to Level {progression.level + 1}
              </Text>
              <Text style={styles.progressHint}>{progression.nextRankHint}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progression.progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.tierLegend}>
              0–9 pts: Pelajar · 10–100 pts: Helper · 110+ pts: Pro Helper
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.completedFocusMinutes}m</Text>
              <Text style={styles.statLabel}>Focus Time</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.completedSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{joinedRoomsCount}</Text>
              <Text style={styles.statLabel}>Rooms</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{questionsCount}</Text>
              <Text style={styles.statLabel}>Q&A</Text>
            </View>
          </View>

          <Pressable
            style={styles.receiptLaunchBtn}
            onPress={() => setReceiptVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open Study Receipt (Kartu Rekap)"
          >
            <Text style={styles.receiptLaunchText}>
              🧾 Study Receipt · Kartu Rekap
            </Text>
          </Pressable>
        </SectionCard>

        {/* Specialist "Pro At" Certification Badges */}
        <SectionCard style={styles.settingCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>SPECIALIST BADGES (“PRO AT”)</Text>
            <Pressable
              style={styles.quizBtn}
              onPress={() => setQuizVisible(true)}
            >
              <Text style={styles.quizBtnText}>Take Mini-Quiz</Text>
            </Pressable>
          </View>

          <Text style={styles.storageHint}>
            Score at least 4/5 in a short Statistics or Math quiz to earn a specialist badge shown on your profile and live room card.
          </Text>

          {profile.specialistBadges.length > 0 ? (
            <View style={styles.badgesWrap}>
              {profile.specialistBadges.map((badge) => (
                <View key={badge} style={styles.badgePill}>
                  <Text style={styles.badgePillText}>✦ {badge}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noBadgeBox}>
              <Text style={styles.noBadgeText}>
                No specialist badges unlocked yet — try the Statistics or Math mini-quiz!
              </Text>
            </View>
          )}
        </SectionCard>

        {/* Private Chat Availability */}
        <SectionCard style={styles.settingCard}>
          <View style={styles.switchHeaderRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.sectionLabel}>PRIVATE CHAT AVAILABILITY</Text>
              <Text style={styles.switchStatusText}>
                {profile.privateChatEnabled
                  ? 'ON — Open for "Ask" peer questions'
                  : 'OFF — Quiet study mode'}
              </Text>
            </View>
            <Switch
              value={profile.privateChatEnabled}
              onValueChange={(value) =>
                onUpdateProfile({ privateChatEnabled: value })
              }
              trackColor={{ false: COLORS.border, true: COLORS.sage }}
              thumbColor={COLORS.surface}
            />
          </View>

          {profile.privateChatEnabled ? (
            <>
              <Text style={styles.fieldLabel}>Ask Topic / Motif</Text>
              <TextInput
                style={styles.input}
                value={motifInput}
                onChangeText={setMotifInput}
                onEndEditing={() =>
                  onUpdateProfile({
                    privateChatMotif:
                      motifInput.trim() || profile.privateChatMotif,
                  })
                }
                placeholder="e.g. Ready to help with Statistics & Math"
                placeholderTextColor={COLORS.textMuted}
              />
            </>
          ) : null}

          {activeCooldownCount > 0 ? (
            <View style={styles.cooldownSummaryPill}>
              <Text style={styles.cooldownSummaryText}>
                ⏳ {activeCooldownCount} peer{activeCooldownCount > 1 ? 's' : ''} currently in 24h anti-farming cooldown
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {/* Dedicated Rules Section */}
        <SectionCard style={styles.settingCard}>
          <Text style={styles.sectionLabel}>RULES</Text>

          <View style={styles.rulesList}>
            <Text style={styles.ruleItem}>
              • <Text style={styles.ruleBold}>Verified Completion:</Text> In Private Chat, “Complete Verified” appears only after the peer replies with an answer and the questioner marks it as correct (+{PRIVATE_HELP_REWARD_POINTS} pts, 24h cooldown per peer). Verified Q&A answers award +{QNA_VERIFIED_ANSWER_POINTS} pt.
            </Text>
            <Text style={styles.ruleItem}>
              • <Text style={styles.ruleBold}>Question Lock:</Text> Once a question/ask receives at least 1 answer or has been verified once, asking again on that question is disabled (normal chat remains open).
            </Text>
            <Text style={styles.ruleItem}>
              • <Text style={styles.ruleBold}>Once-Per-Person Verification:</Text> Each individual user can verify a given answer only once.
            </Text>
            <Text style={styles.ruleItem}>
              • <Text style={styles.ruleBold}>Daily Limit (Levels 1–10):</Text> Users in Level 1–10 can earn up to {DAILY_VERIFIED_LIMIT_LOW_LEVEL} verified answers per day (resets automatically each new calendar day).
            </Text>
          </View>

          {hasDailyCap ? (
            <View style={styles.dailyCapPill}>
              <Text style={styles.dailyCapText}>
                Today’s verified answers (Lv.{progression.level}): {todayVerifiedCount} / {DAILY_VERIFIED_LIMIT_LOW_LEVEL}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {/* Study Profile Editor */}
        <SectionCard style={styles.settingCard}>
          <Text style={styles.sectionLabel}>STUDY PROFILE</Text>

          <Text style={styles.fieldLabel}>Default Study Mode</Text>
          <View style={styles.optionsRow}>
            {STUDY_MODES.map((mode) => {
              const active = profile.studyMode === mode.value;
              return (
                <Pressable
                  key={mode.value}
                  style={[styles.optionBtn, active && styles.optionBtnSage]}
                  onPress={() => onUpdateProfile({ studyMode: mode.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={nameInput}
            onChangeText={(text) => {
              setNameInput(text);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>Jurusan / Major</Text>
          <TextInput
            style={styles.input}
            value={jurusanInput}
            onChangeText={(text) => {
              setJurusanInput(text);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="e.g. Manajemen Sistem Informasi"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>Current Study Goal</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={goalInput}
            onChangeText={(text) => {
              setGoalInput(text);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="What do you want to finish today?"
            placeholderTextColor={COLORS.textMuted}
            multiline
          />

          <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </Pressable>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          {savedNotice ? <Text style={styles.noticeText}>{savedNotice}</Text> : null}
        </SectionCard>

        {/* Default Focus Duration */}
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

        {/* Ambient Sound Preferences */}
        <SectionCard style={styles.settingCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>AMBIENT SOUND MIXER</Text>
            <Pressable
              style={styles.quizBtn}
              onPress={() => setMixerExpanded((prev) => !prev)}
            >
              <Text style={styles.quizBtnText}>
                {mixerExpanded ? 'Hide Mixer' : 'Adjust Mix'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.storageHint}>
            Current mix: {getAmbientSummary(profile.ambientMixer)} (persisted automatically across live rooms).
          </Text>
          <AmbientMixerBar
            mixer={profile.ambientMixer}
            expanded={mixerExpanded}
            onToggleExpand={() => setMixerExpanded((prev) => !prev)}
            onChange={(ambientMixer) => onUpdateProfile({ ambientMixer })}
          />
        </SectionCard>

        {/* Local Storage & Reset */}
        <SectionCard style={styles.settingCard}>
          <Text style={styles.sectionLabel}>LOCAL STORAGE</Text>
          <Text style={styles.storageHint}>
            Rooms, live votes, verified archives, specialist badges, private chat cooldowns, and profile stats are persisted locally via AsyncStorage.
          </Text>
          <Pressable style={styles.resetBtn} onPress={onResetAll}>
            <Text style={styles.resetBtnText}>Reset Demo Data</Text>
          </Pressable>
        </SectionCard>
      </ScrollView>

      <ProQuizModal
        visible={quizVisible}
        unlockedBadges={profile.specialistBadges}
        onClose={() => setQuizVisible(false)}
        onUnlockBadge={onUnlockBadge}
      />

      <StudyReceiptModal
        visible={receiptVisible}
        profile={profile}
        onClose={() => setReceiptVisible(false)}
      />
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
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.coral,
    letterSpacing: 0.8,
  },
  pointsChip: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.cream,
    backgroundColor: COLORS.navySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  studentName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.surface,
  },
  jurusanText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A7D7D2',
  },
  goalPreview: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.cream,
  },
  progressSection: {
    marginTop: 6,
    marginBottom: 8,
    gap: 5,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.surface,
  },
  progressHint: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.navySoft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.coral,
    borderRadius: 999,
  },
  tierLegend: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.navySoft,
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
  receiptLaunchBtn: {
    marginTop: 8,
    backgroundColor: COLORS.coral,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  receiptLaunchText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.surface,
  },
  settingCard: {
    gap: 9,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
    letterSpacing: 0.7,
  },
  quizBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quizBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgePill: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.sage,
  },
  noBadgeBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
  },
  noBadgeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  switchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  cooldownSummaryPill: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cooldownSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  rulesList: {
    gap: 7,
  },
  ruleItem: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  ruleBold: {
    fontWeight: '800',
    color: COLORS.navy,
  },
  dailyCapPill: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dailyCapText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  input: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  multilineInput: {
    minHeight: 58,
    textAlignVertical: 'top',
  },
  saveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.sage,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  saveBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
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
  optionBtnSage: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  optionText: {
    fontSize: 12,
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
