import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../theme/tokens';
import { StudyMode, StudyParticipant } from '../types/studyble';

interface StudyParticipantCardProps {
  participant: StudyParticipant;
  isScreenFocused?: boolean;
  isTopContributor?: boolean;
  isOnCooldown?: boolean;
  onAskPrivateChat?: (participant: StudyParticipant) => void;
  onSelectStudyMode?: (mode: StudyMode) => void;
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
  isScreenFocused = true,
  isTopContributor = false,
  isOnCooldown = false,
  onAskPrivateChat,
  onSelectStudyMode,
}: StudyParticipantCardProps) {
  const modeMeta = STUDY_MODE_META[participant.studyMode];
  const [permission, requestPermission] = useCameraPermissions();
  const hasAutoRequestedRef = useRef<boolean>(false);

  const [deskFacing, setDeskFacing] = useState<CameraType>('back');
  const [faceConfirmed, setFaceConfirmed] = useState<boolean>(false);
  const [facePromptVisible, setFacePromptVisible] = useState<boolean>(false);

  const isDeskActive = participant.studyMode === 'desk';
  const isFaceActive = participant.studyMode === 'face' && faceConfirmed;
  const isCameraOn = isDeskActive || isFaceActive;

  // Reset desk lens default to back on desk entry; clear face confirmation whenever leaving face or blurring
  useEffect(() => {
    if (participant.studyMode === 'desk') {
      setDeskFacing('back');
      setFaceConfirmed(false);
    } else if (participant.studyMode === 'avatar') {
      setFaceConfirmed(false);
      setFacePromptVisible(false);
    }
  }, [participant.studyMode]);

  useEffect(() => {
    if (!isScreenFocused) {
      setFaceConfirmed(false);
      setFacePromptVisible(false);
    }
  }, [isScreenFocused]);

  const wantsLiveCamera = Boolean(
    participant.isCurrentUser && isCameraOn && isScreenFocused
  );
  const canRenderLiveCamera = Boolean(wantsLiveCamera && permission?.granted);

  // Request camera permission only once the user has actively enabled Desk or confirmed Face mode
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

  const requestCameraPermissionIfNeeded = () => {
    if (!permission?.granted && (permission === null || permission.canAskAgain)) {
      hasAutoRequestedRef.current = true;
      void requestPermission().catch(() => {});
    }
  };

  const handleToggleCamera = () => {
    if (!onSelectStudyMode) return;
    if (isCameraOn) {
      setFaceConfirmed(false);
      setFacePromptVisible(false);
      onSelectStudyMode('avatar');
      return;
    }

    // Turning camera ON defaults safely to Desk (rear camera) so Face never opens unexpectedly
    setDeskFacing('back');
    requestCameraPermissionIfNeeded();
    onSelectStudyMode('desk');
  };

  const handleSelectDeskMode = () => {
    if (!onSelectStudyMode) return;
    setFaceConfirmed(false);
    setFacePromptVisible(false);
    setDeskFacing('back');
    requestCameraPermissionIfNeeded();
    onSelectStudyMode('desk');
  };

  const handleRequestFaceMode = () => {
    if (!onSelectStudyMode) return;
    if (isFaceActive) return;
    // Always show heads-up confirmation gate before activating front camera
    setFacePromptVisible(true);
  };

  const handleCancelFacePrompt = () => {
    setFacePromptVisible(false);
  };

  const handleConfirmFaceCamera = () => {
    if (!onSelectStudyMode) return;
    setFacePromptVisible(false);
    setFaceConfirmed(true);
    requestCameraPermissionIfNeeded();
    onSelectStudyMode('face');
  };

  const handleFlipDeskCamera = () => {
    setDeskFacing((prev) => (prev === 'back' ? 'front' : 'back'));
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
      <View
        style={[
          styles.visualStage,
          { backgroundColor: modeMeta.stageBg },
          canRenderLiveCamera && styles.visualStageCamera,
        ]}
      >
        {canRenderLiveCamera ? (
          <View style={styles.cameraContainer}>
            <CameraView
              facing={activeCameraFacing}
              style={styles.cameraPreview}
            />
            <View style={styles.cameraOverlayTop}>
              <View style={[styles.modePill, { backgroundColor: modeMeta.pillBg }]}>
                <Text style={[styles.modePillText, { color: modeMeta.pillText }]}>
                  {isFaceActive ? '● Face' : '● Desk'}
                </Text>
              </View>

              {/* Flip Front/Back is available in Desk mode only; Face stays strictly Front */}
              {isDeskActive ? (
                <Pressable
                  style={styles.flipBtn}
                  onPress={handleFlipDeskCamera}
                  hitSlop={6}
                  accessibilityLabel="Flip desk camera between front and back"
                >
                  <Text style={styles.flipBtnText}>
                    ⇄ {deskFacing === 'back' ? 'Back' : 'Front'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <>
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

            {wantsLiveCamera ? (
              permissionBlocked ? (
                <Text style={styles.permissionDeniedText} numberOfLines={2}>
                  Camera permission blocked — enable in Settings
                </Text>
              ) : (
                <Pressable
                  style={styles.permissionBtn}
                  onPress={handleRequestCameraPermission}
                >
                  <Text style={styles.permissionBtnText}>
                    Tap to allow camera
                  </Text>
                </Pressable>
              )
            ) : participant.studyMode === 'desk' ? (
              <Text style={styles.stageSubLabel}>Desk lamp on</Text>
            ) : participant.studyMode === 'face' ? (
              <Text style={styles.stageSubLabel}>
                {participant.isCurrentUser ? 'Camera off' : 'Cam focus active'}
              </Text>
            ) : (
              <Text style={styles.stageSubLabel}>
                {participant.isBot
                  ? 'Companion bot'
                  : participant.isCurrentUser
                  ? 'Camera off'
                  : 'Calm avatar'}
              </Text>
            )}
          </>
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
      {participant.isCurrentUser && onSelectStudyMode ? (
        <View style={styles.cameraControlsWrap}>
          <Pressable
            style={[styles.camToggleBtn, isCameraOn && styles.camToggleBtnOn]}
            onPress={handleToggleCamera}
            accessibilityRole="switch"
            accessibilityState={{ checked: isCameraOn }}
          >
            <Text
              style={[
                styles.camToggleText,
                isCameraOn && styles.camToggleTextOn,
              ]}
            >
              {isCameraOn ? '📷 Cam On · Turn Off' : '📷 Cam Off · Turn On'}
            </Text>
          </Pressable>

          <View style={styles.camModeRow}>
            <Pressable
              style={[
                styles.camModePill,
                isDeskActive && styles.camModePillActive,
              ]}
              onPress={handleSelectDeskMode}
            >
              <Text
                style={[
                  styles.camModePillText,
                  isDeskActive && styles.camModePillTextActive,
                ]}
              >
                Desk
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.camModePill,
                isFaceActive && styles.camModePillActive,
              ]}
              onPress={handleRequestFaceMode}
            >
              <Text
                style={[
                  styles.camModePillText,
                  isFaceActive && styles.camModePillTextActive,
                ]}
              >
                Face
              </Text>
            </Pressable>
          </View>
        </View>
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

      {/* Privacy Confirmation Gate Modal before opening Front Camera ('face') */}
      {participant.isCurrentUser ? (
        <Modal
          visible={facePromptVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCancelFacePrompt}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalEyebrow}>FRONT CAMERA HEADS-UP</Text>
              <Text style={styles.modalTitle}>Ready to show your face?</Text>
              <Text style={styles.modalBody}>
                Turning on Face mode activates your front-facing camera in the live study room. Take a moment to get ready—for example, put on your hijab or adjust your desk—before continuing.
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={handleCancelFacePrompt}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmFaceCamera}
                >
                  <Text style={styles.modalConfirmText}>Turn On Front Cam</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
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
    minHeight: 96,
    justifyContent: 'center',
  },
  visualStageCamera: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  cameraContainer: {
    width: '100%',
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  cameraOverlayTop: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  flipBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.45)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  flipBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.surface,
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
  permissionBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  permissionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.surface,
  },
  permissionDeniedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.danger,
    textAlign: 'center',
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
  cameraControlsWrap: {
    gap: 6,
  },
  camToggleBtn: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  camToggleBtnOn: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  camToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.navy,
  },
  camToggleTextOn: {
    color: COLORS.surface,
  },
  camModeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  camModePill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  camModePillActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  camModePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  camModePillTextActive: {
    color: COLORS.surface,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 10,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.coral,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },
  modalBody: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
