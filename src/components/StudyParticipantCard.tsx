import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme/tokens';
import { StudyMode, StudyParticipant } from '../types/studyble';

interface StudyParticipantCardProps {
  participant: StudyParticipant;
  isTopContributor?: boolean;
  isOnCooldown?: boolean;
  onAskPrivateChat?: (participant: StudyParticipant) => void;
  onCycleStudyMode?: () => void;
}

const STUDY_MODE_META: Record<
  StudyMode,
  { label: string; icon: string; stageBg: string; pillBg: string; pillText: string }
> = {
  avatar: {
    label: 'Avatar',
    icon: '🎨',
    stageBg: '#F4EFE4',
    pillBg: COLORS.surface,
    pillText: COLORS.navy,
  },
  desk: {
    label: 'Desk',
    icon: '💡',
    stageBg: '#EAE4D6',
    pillBg: COLORS.navy,
    pillText: COLORS.cream,
  },
  face: {
    label: 'Face',
    icon: '📷',
    stageBg: '#E6F0EE',
    pillBg: COLORS.sage,
    pillText: COLORS.surface,
  },
};

export function StudyParticipantCard({
  participant,
  isTopContributor = false,
  isOnCooldown = false,
  onAskPrivateChat,
  onCycleStudyMode,
}: StudyParticipantCardProps) {
  const modeMeta = STUDY_MODE_META[participant.studyMode];

  return (
    <View
      style={[
        styles.card,
        participant.isCurrentUser && styles.currentUserCard,
        isTopContributor && !participant.isCurrentUser && styles.topContributorCard,
        participant.isBot && styles.botCard,
      ]}
    >
      {/* Visual Study Mode Stage */}
      <View style={[styles.visualStage, { backgroundColor: modeMeta.stageBg }]}>
        <View style={styles.stageTopRow}>
          <View style={[styles.modePill, { backgroundColor: modeMeta.pillBg }]}>
            <Text style={[styles.modePillText, { color: modeMeta.pillText }]}>
              {modeMeta.icon} {modeMeta.label}
            </Text>
          </View>

          {isTopContributor && !participant.isBot ? (
            <View style={styles.topWeeklyPill}>
              <Text style={styles.topWeeklyText}>
                ★ Top · {participant.weeklyHelpfulCount}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.avatarCircle,
            participant.studyMode === 'desk' && styles.deskFrame,
            participant.studyMode === 'face' && styles.faceFrame,
          ]}
        >
          <Text style={styles.avatarEmoji}>{participant.avatarEmoji}</Text>
        </View>

        {participant.studyMode === 'desk' ? (
          <Text style={styles.stageSubLabel}>Desk lamp on</Text>
        ) : participant.studyMode === 'face' ? (
          <Text style={styles.stageSubLabel}>Cam focus active</Text>
        ) : (
          <Text style={styles.stageSubLabel}>
            {participant.isBot ? 'Companion bot' : 'Calm avatar'}
          </Text>
        )}
      </View>

      {/* Identity & Badges */}
      <View style={styles.infoBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {participant.name}
            {participant.isCurrentUser ? ' (You)' : ''}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Lv.{participant.level}</Text>
          </View>
        </View>

        {participant.specialistBadge ? (
          <View
            style={[
              styles.specialistBadge,
              participant.isBot && styles.botBadge,
            ]}
          >
            <Text
              style={[
                styles.specialistBadgeText,
                participant.isBot && styles.botBadgeText,
              ]}
              numberOfLines={1}
            >
              ✦ {participant.specialistBadge}
            </Text>
          </View>
        ) : null}

        <Text style={styles.goalText} numberOfLines={1}>
          {participant.currentGoal}
        </Text>
      </View>

      {/* Card Action Footer */}
      {participant.isCurrentUser && onCycleStudyMode ? (
        <Pressable style={styles.modeSwitchBtn} onPress={onCycleStudyMode}>
          <Text style={styles.modeSwitchText}>Switch Mode ↻</Text>
        </Pressable>
      ) : participant.privateChatEnabled && !participant.isBot && onAskPrivateChat ? (
        <Pressable
          style={[styles.askBtn, isOnCooldown && styles.askBtnCooldown]}
          onPress={() => onAskPrivateChat(participant)}
        >
          <Text
            style={[
              styles.askBtnText,
              isOnCooldown && styles.askBtnCooldownText,
            ]}
            numberOfLines={1}
          >
            {isOnCooldown ? '1-on-1 (Cooldown)' : 'Ask 1-on-1'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.quietFooter}>
          <Text style={styles.quietFooterText} numberOfLines={1}>
            {participant.isBot ? 'Quiet study companion' : 'Quiet focus mode'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 8,
  },
  currentUserCard: {
    borderColor: COLORS.coral,
    borderWidth: 1.5,
    backgroundColor: '#FFFBF8',
  },
  topContributorCard: {
    borderColor: COLORS.sage,
    borderWidth: 1.5,
  },
  botCard: {
    borderStyle: 'dashed',
    borderColor: COLORS.sage,
    backgroundColor: '#FAFDFC',
  },
  visualStage: {
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 5,
  },
  stageTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  modePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  topWeeklyPill: {
    backgroundColor: COLORS.coralSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  topWeeklyText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.coral,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deskFrame: {
    borderRadius: 10,
    borderColor: COLORS.navy,
  },
  faceFrame: {
    borderColor: COLORS.sage,
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  stageSubLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  infoBlock: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  nameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  levelBadge: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.navy,
  },
  specialistBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.sageSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    maxWidth: '100%',
  },
  specialistBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.sage,
  },
  botBadge: {
    backgroundColor: COLORS.cream,
  },
  botBadgeText: {
    color: COLORS.textMuted,
  },
  goalText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  askBtn: {
    backgroundColor: COLORS.coral,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  askBtnCooldown: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  askBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.surface,
  },
  askBtnCooldownText: {
    color: COLORS.textMuted,
  },
  modeSwitchBtn: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeSwitchText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sage,
  },
  quietFooter: {
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 8,
  },
  quietFooterText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
