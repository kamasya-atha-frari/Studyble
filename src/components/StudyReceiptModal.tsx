import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../theme/tokens';
import { StudyProfileState } from '../types/studyble';
import { getProgressionInfo } from '../utils/progression';

interface StudyReceiptModalProps {
  visible: boolean;
  profile: StudyProfileState;
  roomTitle?: string;
  onClose: () => void;
}

export function StudyReceiptModal({
  visible,
  profile,
  roomTitle,
  onClose,
}: StudyReceiptModalProps) {
  const [shareFeedback, setShareFeedback] = useState<string>('');

  const progression = useMemo(
    () => getProgressionInfo(profile.points),
    [profile.points]
  );

  const dateStamp = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [visible]);

  const buildShareText = () => {
    const badgesText =
      profile.specialistBadges.length > 0
        ? profile.specialistBadges.join(', ')
        : 'None yet';

    const lines = [
      '☕ STUDYBLE — STUDY RECEIPT',
      `Date: ${dateStamp}`,
      '------------------------------',
      `Student: ${profile.studentName}`,
      `Major / Jurusan: ${profile.jurusan}`,
      `Role & Level: ${progression.rankTitle} (Level ${progression.level})`,
      ...(roomTitle ? [`Room: ${roomTitle}`] : []),
      `Completed Focus: ${profile.completedFocusMinutes} min (${profile.completedSessions} sessions)`,
      `Current Goal: ${profile.goal}`,
      `Pro At Badges: ${badgesText}`,
      '------------------------------',
      `TOTAL POINTS: ${profile.points} pts`,
      'Keep showing up calmly, one focus block at a time.',
    ];
    return lines.join('\n');
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        title: 'Studyble Study Receipt',
        message: buildShareText(),
      });
      if (result.action === Share.sharedAction) {
        setShareFeedback('Study Receipt shared!');
      } else {
        setShareFeedback('Share sheet closed.');
      }
    } catch {
      setShareFeedback('Unable to open share sheet on this device.');
    }
  };

  const handleClose = () => {
    setShareFeedback('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.shell}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.receiptPaper}>
              <View style={styles.header}>
                <Text style={styles.brandMark}>☕ STUDYBLE CO-WORKING</Text>
                <Text style={styles.receiptTitle}>STUDY RECEIPT</Text>
                <Text style={styles.dateText}>{dateStamp}</Text>
              </View>

              <View style={styles.dashedDivider} />

              <View style={styles.rowList}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>STUDENT</Text>
                  <Text style={styles.kvValue}>{profile.studentName}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>MAJOR / JURUSAN</Text>
                  <Text style={styles.kvValue}>{profile.jurusan}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>ROLE & LEVEL</Text>
                  <Text style={styles.kvValue}>
                    {progression.rankTitle} · Lv.{progression.level}
                  </Text>
                </View>
                {roomTitle ? (
                  <View style={styles.kvRow}>
                    <Text style={styles.kvLabel}>ACTIVE ROOM</Text>
                    <Text style={styles.kvValue} numberOfLines={2}>
                      {roomTitle}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.dashedDivider} />

              <View style={styles.rowList}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>FOCUS MINUTES</Text>
                  <Text style={styles.kvValue}>
                    {profile.completedFocusMinutes} min ({profile.completedSessions}{' '}
                    {profile.completedSessions === 1 ? 'session' : 'sessions'})
                  </Text>
                </View>
                <View style={styles.goalBlock}>
                  <Text style={styles.kvLabel}>CURRENT STUDY GOAL</Text>
                  <Text style={styles.goalValue}>{profile.goal}</Text>
                </View>
                <View style={styles.goalBlock}>
                  <Text style={styles.kvLabel}>EARNED “PRO AT” BADGES</Text>
                  {profile.specialistBadges.length > 0 ? (
                    <View style={styles.badgesWrap}>
                      {profile.specialistBadges.map((badge) => (
                        <View key={badge} style={styles.badgePill}>
                          <Text style={styles.badgePillText}>✦ {badge}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.mutedValue}>
                      None unlocked yet (score 4/5 in Pro At Quiz)
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.solidDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL POINTS</Text>
                <Text style={styles.totalValue}>{profile.points} PTS</Text>
              </View>

              <View style={styles.stampContainer}>
                <View style={styles.stampBox}>
                  <Text style={styles.stampText}>WELL DONE ✦</Text>
                </View>
              </View>

              <Text style={styles.footerQuote}>
                “Small, steady study blocks build lasting mastery.”
              </Text>
            </View>
          </ScrollView>

          {shareFeedback ? (
            <Text style={styles.feedbackText}>{shareFeedback}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>Share Receipt</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  shell: {
    maxHeight: '88%',
    gap: 10,
  },
  receiptPaper: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    gap: 3,
  },
  brandMark: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.sage,
  },
  receiptTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.navy,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  solidDivider: {
    borderBottomWidth: 2,
    borderColor: COLORS.navy,
  },
  rowList: {
    gap: 9,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  kvLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.textMuted,
  },
  kvValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'right',
    flexShrink: 1,
  },
  goalBlock: {
    gap: 4,
  },
  goalValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sage,
  },
  mutedValue: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.navy,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.sage,
  },
  stampContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  stampBox: {
    borderWidth: 2,
    borderColor: COLORS.coral,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    transform: [{ rotate: '-2deg' }],
  },
  stampText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.coral,
  },
  footerQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cream,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: COLORS.coral,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.surface,
  },
  closeBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
});
