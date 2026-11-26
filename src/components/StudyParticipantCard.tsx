import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../theme/tokens';
import { StudyMode, StudyParticipant } from '../types/studyble';

const MAX_GOAL_LENGTH = 20;

interface StudyParticipantCardProps {
  participant: StudyParticipant;
  roomTitle?: string;
  isScreenFocused?: boolean;
  isTopContributor?: boolean;
  isOnCooldown?: boolean;
  compact?: boolean;
  isCameraConfirmed?: boolean;
  onAskPrivateChat?: (participant: StudyParticipant) => void;
  onUpdateGoal?: (nextGoal: string) => void;
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
  face: {
    label: 'Face',
    icon: '📷',
    stageBg: '#E6F0EE',
    pillBg: COLORS.sage,
    pillText: COLORS.surface,
  },
  desk: {
    label: 'Desk',
    icon: '💡',
    stageBg: '#EAE4D6',
    pillBg: COLORS.navy,
    pillText: COLORS.cream,
  },
  screen: {
    label: 'Screen',
    icon: '🖥️',
    stageBg: '#1E293B',
    pillBg: COLORS.coral,
    pillText: COLORS.surface,
  },
};

export function StudyParticipantCard({
  participant,
  roomTitle,
  isScreenFocused = true,
  isTopContributor = false,
  isOnCooldown = false,
  compact = false,
  isCameraConfirmed = false,
  onAskPrivateChat,
  onUpdateGoal,
}: StudyParticipantCardProps) {
  const modeMeta = STUDY_MODE_META[participant.studyMode];
  const [permission, requestPermission] = useCameraPermissions();
  const hasAutoRequestedRef = useRef<boolean>(false);

  const [deskFacing, setDeskFacing] = useState<CameraType>('back');
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [goalDraft, setGoalDraft] = useState<string>(
    participant.currentGoal.slice(0, MAX_GOAL_LENGTH)
  );

  useEffect(() => {
    if (!isEditingGoal) {
      setGoalDraft(participant.currentGoal.slice(0, MAX_GOAL_LENGTH));
    }
  }, [participant.currentGoal, isEditingGoal]);

  const isFaceActive = participant.studyMode === 'face' && isCameraConfirmed;
  const isDeskActive = participant.studyMode === 'desk' && isCameraConfirmed;
  const isCameraOn = isFaceActive || isDeskActive;
  const isScreenSharing =
    participant.studyMode === 'screen' &&
    (!participant.isCurrentUser || isScreenFocused);

  // Reset desk lens default to rear camera whenever entering Desk mode
  useEffect(() => {
    if (participant.studyMode === 'desk') {
      setDeskFacing('back');
    }
  }, [participant.studyMode]);

  useEffect(() => {
    if (!isScreenFocused) {
      setIsEditingGoal(false);
    }
  }, [isScreenFocused]);

  const wantsLiveCamera = Boolean(
    participant.isCurrentUser && isCameraOn && isScreenFocused
  );
  const canRenderLiveCamera = Boolean(wantsLiveCamera && permission?.granted);

  // Request camera permission only after the user confirms turning the camera ON
  useEffect(() => {
    if (!wantsLiveCamera) {
      hasAutoRequestedRef.current = false;
      return;
    }

    if (permission?.granted || hasAutoRequestedRef.current) {
      return;
    }

    if (permission === null || permission.canAskAgain) {
      hasAutoRequestedRef.current = true;
      void requestPermission().catch(() => {});
    }
  }, [wantsLiveCamera, permission, requestPermission]);

  const handleFlipDeskCamera = () => {
    setDeskFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleStartEditGoal = () => {
    setGoalDraft(participant.currentGoal.slice(0, MAX_GOAL_LENGTH));
    setIsEditingGoal(true);
  };

  const handleSaveGoal = () => {
    const trimmed = goalDraft.trim().slice(0, MAX_GOAL_LENGTH);
    if (trimmed.length > 0 && onUpdateGoal) {
      onUpdateGoal(trimmed);
    } else {
      setGoalDraft(participant.currentGoal.slice(0, MAX_GOAL_LENGTH));
    }
    setIsEditingGoal(false);
  };

  const handleRequestCameraPermission = () => {
    void requestPermission().catch(() => {});
  };

  const permissionBlocked = Boolean(
    wantsLiveCamera &&
      permission &&
      !permission.granted &&
      permission.canAskAgain === false
  );

  const activeCameraFacing: CameraType = isFaceActive ? 'front' : deskFacing;
  const isDarkStageOverlay = canRenderLiveCamera || isScreenSharing;
  const canAskPeer = Boolean(
    !participant.isCurrentUser &&
      participant.privateChatEnabled &&
      !participant.isBot &&
      onAskPrivateChat
  );

  const displayName = participant.isCurrentUser
    ? 'You'
    : participant.name.split(' ')[0];

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        participant.isCurrentUser && styles.currentUserCard,
        isTopContributor && !participant.isCurrentUser && styles.topContributorCard,
        participant.isBot && styles.botCard,
      ]}
    >
      {/* Clean Stage: Live CameraView, Screen Share Preview, or Circular Avatar */}
      <View
        style={[
          styles.visualStage,
          compact && styles.visualStageCompact,
          {
            backgroundColor: canRenderLiveCamera
              ? 'transparent'
              : modeMeta.stageBg,
          },
        ]}
      >
        {canRenderLiveCamera ? (
          <CameraView
            facing={activeCameraFacing}
            style={StyleSheet.absoluteFill}
          />
        ) : isScreenSharing ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.screenShareStage,
              compact && styles.screenShareStageCompact,
            ]}
          >
            <View
              style={[
                styles.screenPreviewFrame,
                compact && styles.screenPreviewFrameCompact,
              ]}
            >
              <Text
                style={[
                  styles.screenShareLiveTag,
                  compact && styles.screenShareLiveTagCompact,
                ]}
                numberOfLines={1}
              >
                ● LIVE SCREEN SHARE
              </Text>
              <Text
                style={[
                  styles.screenShareIcon,
                  compact && styles.screenShareIconCompact,
                ]}
              >
                🖥️
              </Text>
              <Text
                style={[
                  styles.screenShareSub,
                  compact && styles.screenShareSubCompact,
                ]}
                numberOfLines={1}
              >
                {roomTitle ?? participant.currentGoal}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.avatarCenterWrap,
              compact && styles.avatarCenterWrapCompact,
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                compact && styles.avatarCircleCompact,
                participant.studyMode === 'desk' && styles.deskFrame,
                participant.studyMode === 'face' && styles.faceFrame,
              ]}
            >
              <Text
                style={[
                  styles.avatarEmoji,
                  compact && styles.avatarEmojiCompact,
                ]}
              >
                {participant.avatarEmoji}
              </Text>
            </View>

            {wantsLiveCamera ? (
              permissionBlocked ? (
                <Text
                  style={[
                    styles.permissionDeniedText,
                    compact && styles.permissionDeniedTextCompact,
                  ]}
                  numberOfLines={1}
                >
                  No cam perm
                </Text>
              ) : (
                <Pressable
                  style={[
                    styles.permissionBtn,
                    compact && styles.permissionBtnCompact,
                  ]}
                  onPress={handleRequestCameraPermission}
                >
                  <Text
                    style={[
                      styles.permissionBtnText,
                      compact && styles.permissionBtnTextCompact,
                    ]}
                  >
                    Allow cam
                  </Text>
                </Pressable>
              )
            ) : null}
          </View>
        )}

        {/* Top Overlay inside Stage: Mode pill + Top star / Desk lens flip */}
        <View
          style={[
            styles.stageTopOverlay,
            compact && styles.stageTopOverlayCompact,
          ]}
        >
          <View
            style={[
              styles.modePill,
              compact && styles.modePillCompact,
              { backgroundColor: modeMeta.pillBg },
            ]}
          >
            <Text
              style={[
                styles.modePillText,
                compact && styles.modePillTextCompact,
                { color: modeMeta.pillText },
              ]}
            >
              {canRenderLiveCamera
                ? isFaceActive
                  ? '● Face'
                  : '● Desk'
                : isScreenSharing
                ? compact
                  ? '● LIVE SCREEN'
                  : '● LIVE SCREEN SHARE'
                : compact
                ? modeMeta.icon
                : `${modeMeta.icon} ${modeMeta.label}`}
            </Text>
          </View>

          {canRenderLiveCamera && isDeskActive ? (
            <Pressable
              style={[styles.flipBtn, compact && styles.flipBtnCompact]}
              onPress={handleFlipDeskCamera}
              hitSlop={6}
              accessibilityLabel="Flip desk camera between front and back"
            >
              <Text
                style={[
                  styles.flipBtnText,
                  compact && styles.flipBtnTextCompact,
                ]}
              >
                {compact
                  ? '⇄'
                  : `⇄ ${deskFacing === 'back' ? 'Back' : 'Front'}`}
              </Text>
            </Pressable>
          ) : isTopContributor && !participant.isBot ? (
            <View
              style={[
                styles.topWeeklyPill,
                compact && styles.topWeeklyPillCompact,
              ]}
            >
              <Text
                style={[
                  styles.topWeeklyText,
                  compact && styles.topWeeklyTextCompact,
                ]}
              >
                {compact ? '★' : `★ Top · ${participant.weeklyHelpfulCount}`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Info inside Stage (no gray tint/veil) */}
        <View
          style={[
            styles.stageBottomOverlay,
            compact && styles.stageBottomOverlayCompact,
          ]}
        >
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.nameText,
                compact && styles.nameTextCompact,
                isDarkStageOverlay && styles.cameraOverlayText,
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              style={[
                styles.levelInlineText,
                compact && styles.levelInlineTextCompact,
                isDarkStageOverlay && styles.cameraOverlaySubText,
              ]}
            >
              Lv.{participant.level}
            </Text>
          </View>

          {!compact && participant.specialistBadge ? (
            <Text
              style={[
                styles.specialistInlineText,
                isDarkStageOverlay && styles.cameraOverlaySubText,
              ]}
              numberOfLines={1}
            >
              ✦ {participant.specialistBadge}
            </Text>
          ) : null}

          {participant.isCurrentUser && onUpdateGoal ? (
            isEditingGoal ? (
              <View style={styles.goalEditRow}>
                <TextInput
                  style={[styles.goalInput, compact && styles.goalInputCompact]}
                  value={goalDraft}
                  onChangeText={(text) =>
                    setGoalDraft(text.slice(0, MAX_GOAL_LENGTH))
                  }
                  maxLength={MAX_GOAL_LENGTH}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveGoal}
                  placeholder="Topic..."
                  placeholderTextColor={COLORS.textMuted}
                  accessibilityLabel="Edit study topic (max 20 characters)"
                />
                <Pressable
                  style={[
                    styles.goalSaveBtn,
                    compact && styles.goalSaveBtnCompact,
                  ]}
                  onPress={handleSaveGoal}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Save study topic"
                >
                  <Text
                    style={[
                      styles.goalSaveBtnText,
                      compact && styles.goalSaveBtnTextCompact,
                    ]}
                  >
                    ✓
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.goalRow}>
                <Text
                  style={[
                    styles.goalOverlayTextFlex,
                    compact && styles.goalOverlayTextCompact,
                    isDarkStageOverlay && styles.cameraOverlaySubText,
                  ]}
                  numberOfLines={1}
                >
                  {participant.currentGoal}
                </Text>
                <Pressable
                  style={styles.goalEditBtn}
                  onPress={handleStartEditGoal}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Edit study topic"
                >
                  <Text
                    style={[
                      styles.goalEditIcon,
                      compact && styles.goalEditIconCompact,
                    ]}
                  >
                    ✏️
                  </Text>
                </Pressable>
              </View>
            )
          ) : (
            <Text
              style={[
                styles.goalOverlayText,
                compact && styles.goalOverlayTextCompact,
                isDarkStageOverlay && styles.cameraOverlaySubText,
              ]}
              numberOfLines={1}
            >
              {participant.isBot ? 'Companion bot' : participant.currentGoal}
            </Text>
          )}
        </View>
      </View>

      {/* Ask action flush & integrated inside the bottom of peer cards */}
      {canAskPeer && onAskPrivateChat ? (
        <Pressable
          style={[
            styles.askBtn,
            compact && styles.askBtnCompact,
            isOnCooldown && styles.askBtnCooldown,
          ]}
          onPress={() => onAskPrivateChat(participant)}
        >
          <Text
            style={[
              styles.askBtnText,
              compact && styles.askBtnTextCompact,
              isOnCooldown && styles.askBtnCooldownText,
            ]}
            numberOfLines={1}
          >
            {isOnCooldown ? 'Cooldown' : 'Ask'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  cardCompact: {
    borderRadius: 12,
  },
  currentUserCard: {
    borderColor: COLORS.coral,
    borderWidth: 1.5,
  },
  topContributorCard: {
    borderColor: COLORS.sage,
    borderWidth: 1.5,
  },
  botCard: {
    borderStyle: 'dashed',
    borderColor: COLORS.sage,
  },
  visualStage: {
    flex: 1,
    width: '100%',
    minHeight: 176,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  visualStageCompact: {
    minHeight: 118,
  },
  screenShareStage: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: '#1E293B',
  },
  screenShareStageCompact: {
    paddingHorizontal: 5,
    paddingTop: 16,
    paddingBottom: 24,
  },
  screenPreviewFrame: {
    width: '90%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: COLORS.coral,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  screenPreviewFrameCompact: {
    width: '94%',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 1.5,
  },
  screenShareLiveTag: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: COLORS.coral,
    textAlign: 'center',
  },
  screenShareLiveTagCompact: {
    fontSize: 6.5,
    letterSpacing: 0.2,
  },
  screenShareIcon: {
    fontSize: 22,
  },
  screenShareIconCompact: {
    fontSize: 16,
  },
  screenShareSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.cream,
    textAlign: 'center',
  },
  screenShareSubCompact: {
    fontSize: 7,
  },
  avatarCenterWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 28,
    gap: 4,
  },
  avatarCenterWrapCompact: {
    paddingBottom: 24,
    gap: 2,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleCompact: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  deskFrame: {
    borderColor: COLORS.navy,
  },
  faceFrame: {
    borderColor: COLORS.sage,
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 38,
  },
  avatarEmojiCompact: {
    fontSize: 27,
  },
  stageTopOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingTop: 7,
    gap: 4,
    zIndex: 2,
  },
  stageTopOverlayCompact: {
    paddingHorizontal: 5,
    paddingTop: 5,
    gap: 2,
  },
  modePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  modePillCompact: {
    paddingHorizontal: 4.5,
    paddingVertical: 1,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modePillTextCompact: {
    fontSize: 8.5,
  },
  flipBtn: {
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.cream,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  flipBtnCompact: {
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
  },
  flipBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.surface,
  },
  flipBtnTextCompact: {
    fontSize: 9,
  },
  topWeeklyPill: {
    backgroundColor: COLORS.coralSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  topWeeklyPillCompact: {
    paddingHorizontal: 4.5,
    paddingVertical: 1,
  },
  topWeeklyText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.coral,
  },
  topWeeklyTextCompact: {
    fontSize: 8.5,
  },
  permissionBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  permissionBtnCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  permissionBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.surface,
  },
  permissionBtnTextCompact: {
    fontSize: 8,
  },
  permissionDeniedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.danger,
  },
  permissionDeniedTextCompact: {
    fontSize: 8,
  },
  stageBottomOverlay: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    zIndex: 2,
  },
  stageBottomOverlayCompact: {
    paddingHorizontal: 5.5,
    paddingVertical: 4,
    gap: 1.5,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 3,
  },
  nameText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.navy,
  },
  nameTextCompact: {
    fontSize: 10,
  },
  levelInlineText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.sage,
  },
  levelInlineTextCompact: {
    fontSize: 8.5,
  },
  specialistInlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.sage,
  },
  goalOverlayText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    lineHeight: 13,
  },
  goalOverlayTextFlex: {
    flex: 1,
    fontSize: 10.5,
    color: COLORS.textMuted,
    lineHeight: 13,
  },
  goalOverlayTextCompact: {
    fontSize: 8.5,
    lineHeight: 11,
  },
  cameraOverlayText: {
    color: COLORS.surface,
    textShadowColor: 'rgba(15, 23, 42, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraOverlaySubText: {
    color: COLORS.surface,
    textShadowColor: 'rgba(15, 23, 42, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2.5,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  goalEditBtn: {
    paddingHorizontal: 2,
    paddingVertical: 0.5,
    borderRadius: 4,
  },
  goalEditIcon: {
    fontSize: 10.5,
  },
  goalEditIconCompact: {
    fontSize: 9,
  },
  goalEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  goalInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 10,
    color: COLORS.navy,
  },
  goalInputCompact: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    fontSize: 8.5,
  },
  goalSaveBtn: {
    backgroundColor: COLORS.sage,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalSaveBtnCompact: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goalSaveBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.surface,
  },
  goalSaveBtnTextCompact: {
    fontSize: 9,
  },
  askBtn: {
    width: '100%',
    backgroundColor: COLORS.coral,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 253, 249, 0.2)',
  },
  askBtnCompact: {
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  askBtnCooldown: {
    backgroundColor: COLORS.surfaceSoft,
    borderTopColor: COLORS.border,
  },
  askBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.surface,
  },
  askBtnTextCompact: {
    fontSize: 9.5,
  },
  askBtnCooldownText: {
    color: COLORS.textMuted,
  },
});
