import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../theme/tokens';
import { StudyParticipant } from '../types/studyble';
import {
  DAILY_VERIFIED_LIMIT_LOW_LEVEL,
  PRIVATE_HELP_REWARD_POINTS,
  VerificationResult,
  formatCooldownRemaining,
} from '../utils/progression';

interface PrivateChatMessage {
  id: string;
  sender: string;
  text: string;
  isSelf: boolean;
  isIntro?: boolean;
  isQuestion?: boolean;
  isAnswer?: boolean;
}

type ComposerMode = 'ask' | 'chat';

interface PrivateChatModalProps {
  visible: boolean;
  peer: StudyParticipant | null;
  studentName: string;
  cooldownRemainingMs: number;
  verifiedItemIds: string[];
  onClose: () => void;
  onCompleteVerifiedSession: (
    peerId: string,
    answerId: string
  ) => VerificationResult;
}

export function PrivateChatModal({
  visible,
  peer,
  studentName,
  cooldownRemainingMs,
  verifiedItemIds,
  onClose,
  onCompleteVerifiedSession,
}: PrivateChatModalProps) {
  const [messages, setMessages] = useState<PrivateChatMessage[]>([]);
  const [composerMode, setComposerMode] = useState<ComposerMode>('ask');
  const [draft, setDraft] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [verifiedInThreadIds, setVerifiedInThreadIds] = useState<string[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  useEffect(() => {
    if (!peer || !visible) return;
    setMessages([
      {
        id: `intro-${peer.id}`,
        sender: peer.name,
        text: peer.privateChatMotif
          ? `Hi ${studentName}! ${peer.privateChatMotif}. What are you working on right now?`
          : `Hi ${studentName}! Feel free to share your study question here.`,
        isSelf: false,
        isIntro: true,
      },
    ]);
    setComposerMode('ask');
    setDraft('');
    setErrorMsg('');
    setSelectedAnswerId(null);
    setVerifiedInThreadIds([]);
    setFeedbackMsg('');
  }, [peer, studentName, visible]);

  if (!peer) return null;

  const isOnCooldown = cooldownRemainingMs > 0;
  const hasAnswer = messages.some((m) => !m.isSelf && m.isAnswer);
  const hasVerifiedAnswer = verifiedInThreadIds.length > 0;
  // Lock Ask once a question already has at least 1 answer OR has already been verified once
  const isAskLocked = hasAnswer || hasVerifiedAnswer;

  const selectedAnswerKey = selectedAnswerId
    ? `private:${peer.id}:${selectedAnswerId}`
    : null;
  const isSelectedAlreadyVerified = Boolean(
    selectedAnswerId &&
      (verifiedInThreadIds.includes(selectedAnswerId) ||
        (selectedAnswerKey && verifiedItemIds.includes(selectedAnswerKey)))
  );

  // Show Complete Verified ONLY when the other user has replied with an answer marked correct by the questioner
  const canShowCompleteVerified = Boolean(
    selectedAnswerId && !isSelectedAlreadyVerified
  );

  const handleSelectMode = (mode: ComposerMode) => {
    if (mode === 'ask' && isAskLocked) return;
    setComposerMode(mode);
    if (errorMsg) setErrorMsg('');
  };

  const handleSend = () => {
    const clean = draft.trim();
    if (!clean) {
      setErrorMsg('Please write a message before sending.');
      return;
    }

    const sendingAsk = composerMode === 'ask' && !isAskLocked;
    const now = Date.now();

    const userMsg: PrivateChatMessage = {
      id: `u-${now}`,
      sender: studentName,
      text: clean,
      isSelf: true,
      isQuestion: sendingAsk,
    };

    if (sendingAsk) {
      const peerAnswer: PrivateChatMessage = {
        id: `p-${now + 1}`,
        sender: peer.name,
        text: 'Great question! Break the problem into smaller steps first, verify the key formula, and test it on a small example.',
        isSelf: false,
        isAnswer: true,
      };
      setMessages((prev) => [...prev, userMsg, peerAnswer]);
      // Automatically switch to normal Chat mode once an answer arrives (Ask is now locked)
      setComposerMode('chat');
    } else {
      setMessages((prev) => [...prev, userMsg]);
    }

    setDraft('');
    setErrorMsg('');
  };

  const handleToggleMarkCorrect = (answerId: string) => {
    const itemKey = `private:${peer.id}:${answerId}`;
    if (
      verifiedInThreadIds.includes(answerId) ||
      verifiedItemIds.includes(itemKey)
    ) {
      return;
    }
    setSelectedAnswerId((prev) => (prev === answerId ? null : answerId));
    if (feedbackMsg) setFeedbackMsg('');
  };

  const handleCompleteVerified = () => {
    if (!selectedAnswerId) return;
    const result = onCompleteVerifiedSession(peer.id, selectedAnswerId);
    if (result.awarded) {
      setVerifiedInThreadIds((prev) =>
        prev.includes(selectedAnswerId) ? prev : [...prev, selectedAnswerId]
      );
      setSelectedAnswerId(null);
      setComposerMode('chat');
      setFeedbackMsg(`✓ Verified! +${PRIVATE_HELP_REWARD_POINTS} pts awarded.`);
    } else if (result.reason === 'already_verified') {
      setFeedbackMsg('You already verified this answer.');
    } else if (result.reason === 'daily_limit') {
      setFeedbackMsg(
        `Daily limit reached (${DAILY_VERIFIED_LIMIT_LOW_LEVEL}/${DAILY_VERIFIED_LIMIT_LOW_LEVEL} verified answers today for Lv.1–10).`
      );
    } else if (result.reason === 'cooldown') {
      setFeedbackMsg(
        `Cooldown active for ${peer.name} (${formatCooldownRemaining(result.remainingMs)}).`
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.peerName}>
                {peer.avatarEmoji} {peer.name} · Lv.{peer.level}
              </Text>
              {peer.specialistBadge ? (
                <Text style={styles.badgeText}>✦ {peer.specialistBadge}</Text>
              ) : null}
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>

          {/* Chat Thread */}
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            renderItem={({ item }) => {
              const itemKey = `private:${peer.id}:${item.id}`;
              const isItemVerified =
                verifiedInThreadIds.includes(item.id) ||
                verifiedItemIds.includes(itemKey);
              const isMarkedCorrect = selectedAnswerId === item.id;

              return (
                <View
                  style={[
                    styles.bubble,
                    item.isSelf ? styles.bubbleSelf : styles.bubblePeer,
                  ]}
                >
                  <View style={styles.bubbleTopRow}>
                    <Text
                      style={[
                        styles.bubbleSender,
                        item.isSelf && styles.bubbleSenderSelf,
                      ]}
                    >
                      {item.sender}
                    </Text>
                    {item.isQuestion ? (
                      <Text style={styles.askTag}>Ask</Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.bubbleText,
                      item.isSelf && styles.bubbleTextSelf,
                    ]}
                  >
                    {item.text}
                  </Text>

                  {!item.isSelf && item.isAnswer ? (
                    <Pressable
                      style={[
                        styles.markCorrectBtn,
                        isMarkedCorrect && styles.markCorrectBtnActive,
                        isItemVerified && styles.markCorrectBtnVerified,
                      ]}
                      onPress={() => handleToggleMarkCorrect(item.id)}
                      disabled={isItemVerified}
                    >
                      <Text
                        style={[
                          styles.markCorrectText,
                          isMarkedCorrect && styles.markCorrectTextActive,
                          isItemVerified && styles.markCorrectTextVerified,
                        ]}
                      >
                        {isItemVerified
                          ? '✓ Verified'
                          : isMarkedCorrect
                          ? '✓ Marked Correct'
                          : 'Mark as Correct'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            }}
          />

          {/* Show Complete Verified ONLY when peer has replied with an answer marked correct */}
          {canShowCompleteVerified ? (
            <Pressable
              style={[
                styles.completeBtn,
                isOnCooldown && styles.completeBtnDisabled,
              ]}
              onPress={handleCompleteVerified}
              disabled={isOnCooldown}
            >
              <Text style={styles.completeBtnText}>
                {isOnCooldown
                  ? `Cooldown Active (${formatCooldownRemaining(cooldownRemainingMs)})`
                  : 'Complete Verified'}
              </Text>
            </Pressable>
          ) : null}

          {feedbackMsg ? (
            <Text style={styles.feedbackText}>{feedbackMsg}</Text>
          ) : null}

          {/* Mode Pills: Ask (locked once answered/verified) vs normal Chat */}
          <View style={styles.modeRow}>
            <Pressable
              style={[
                styles.modeChip,
                composerMode === 'ask' && !isAskLocked && styles.modeChipActive,
                isAskLocked && styles.modeChipDisabled,
              ]}
              onPress={() => handleSelectMode('ask')}
              disabled={isAskLocked}
            >
              <Text
                style={[
                  styles.modeChipText,
                  composerMode === 'ask' &&
                    !isAskLocked &&
                    styles.modeChipTextActive,
                  isAskLocked && styles.modeChipTextDisabled,
                ]}
              >
                {isAskLocked ? 'Ask (Locked)' : 'Ask'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeChip,
                composerMode === 'chat' && styles.modeChipActive,
              ]}
              onPress={() => handleSelectMode('chat')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  composerMode === 'chat' && styles.modeChipTextActive,
                ]}
              >
                Chat
              </Text>
            </Pressable>
          </View>

          {/* Composer */}
          <View style={styles.composerRow}>
            <TextInput
              style={styles.input}
              placeholder={
                composerMode === 'ask' && !isAskLocked
                  ? `Ask ${peer.name} a question...`
                  : `Send a chat message to ${peer.name}...`
              }
              placeholderTextColor={COLORS.textMuted}
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                if (errorMsg) setErrorMsg('');
              }}
              onSubmitEditing={handleSend}
            />
            <Pressable style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendBtnText}>Send</Text>
            </Pressable>
          </View>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.48)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '86%',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  peerName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.navy,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
  closeBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  messageList: {
    maxHeight: 260,
  },
  messageContent: {
    gap: 8,
    paddingVertical: 4,
  },
  bubble: {
    padding: 10,
    borderRadius: 12,
    maxWidth: '88%',
    gap: 4,
  },
  bubblePeer: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleSelf: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.navy,
  },
  bubbleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  bubbleSenderSelf: {
    color: '#CBD5E1',
  },
  askTag: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.coral,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  bubbleTextSelf: {
    color: COLORS.surface,
  },
  markCorrectBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  markCorrectBtnActive: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  markCorrectBtnVerified: {
    backgroundColor: COLORS.sageSoft,
    borderColor: COLORS.sage,
  },
  markCorrectText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  markCorrectTextActive: {
    color: COLORS.surface,
  },
  markCorrectTextVerified: {
    color: COLORS.sage,
  },
  completeBtn: {
    backgroundColor: COLORS.sage,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  completeBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.surface,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  modeChipDisabled: {
    backgroundColor: COLORS.surfaceSoft,
    borderColor: COLORS.border,
    opacity: 0.55,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modeChipTextActive: {
    color: COLORS.surface,
  },
  modeChipTextDisabled: {
    color: COLORS.textMuted,
  },
  composerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderRadius: 10,
  },
  sendBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
});
