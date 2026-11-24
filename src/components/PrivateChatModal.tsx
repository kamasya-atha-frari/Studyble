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
  PRIVATE_HELP_REWARD_POINTS,
  formatCooldownRemaining,
} from '../utils/progression';

interface PrivateChatMessage {
  id: string;
  sender: string;
  text: string;
  isSelf: boolean;
}

interface PrivateChatModalProps {
  visible: boolean;
  peer: StudyParticipant | null;
  studentName: string;
  cooldownRemainingMs: number;
  onClose: () => void;
  onCompleteVerifiedSession: (peerId: string) => {
    awarded: boolean;
    remainingMs: number;
  };
}

export function PrivateChatModal({
  visible,
  peer,
  studentName,
  cooldownRemainingMs,
  onClose,
  onCompleteVerifiedSession,
}: PrivateChatModalProps) {
  const [messages, setMessages] = useState<PrivateChatMessage[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rewardFeedback, setRewardFeedback] = useState<string>('');

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
      },
    ]);
    setDraft('');
    setErrorMsg('');
    setRewardFeedback('');
  }, [peer, studentName, visible]);

  if (!peer) return null;

  const isOnCooldown = cooldownRemainingMs > 0;

  const handleSend = () => {
    const clean = draft.trim();
    if (!clean) {
      setErrorMsg('Please write a message before sending.');
      return;
    }

    const userMsg: PrivateChatMessage = {
      id: `u-${Date.now()}`,
      sender: studentName,
      text: clean,
      isSelf: true,
    };

    const peerReply: PrivateChatMessage = {
      id: `p-${Date.now() + 1}`,
      sender: peer.name,
      text: 'Great question! Break the problem into smaller steps first, verify the key formula, and test it on a small example.',
      isSelf: false,
    };

    setMessages((prev) => [...prev, userMsg, peerReply]);
    setDraft('');
    setErrorMsg('');
  };

  const handleCompleteHelp = () => {
    const result = onCompleteVerifiedSession(peer.id);
    if (result.awarded) {
      setRewardFeedback(
        `Verified 1-on-1 completed! +${PRIVATE_HELP_REWARD_POINTS} pts awarded. 24h anti-farming cooldown started for ${peer.name}.`
      );
    } else {
      setRewardFeedback(
        `24h cooldown active for ${peer.name} (${formatCooldownRemaining(result.remainingMs)}). No extra points awarded.`
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
              <Text style={styles.eyebrow}>1-ON-1 PEER HELP</Text>
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

          {/* Anti-farming reward bar */}
          <View
            style={[
              styles.rewardBox,
              isOnCooldown && styles.rewardBoxCooldown,
            ]}
          >
            <Text style={styles.rewardDesc}>
              {isOnCooldown
                ? `Anti-farming cooldown active with ${peer.name} (${formatCooldownRemaining(
                    cooldownRemainingMs
                  )}). You can still chat, and the +${PRIVATE_HELP_REWARD_POINTS} pts reward resets after 24h.`
                : `Completing a verified 1-on-1 help session awards +${PRIVATE_HELP_REWARD_POINTS} pts (limited to once every 24h per peer).`}
            </Text>
            <Pressable
              style={[
                styles.completeBtn,
                isOnCooldown && styles.completeBtnDisabled,
              ]}
              onPress={handleCompleteHelp}
              disabled={isOnCooldown}
            >
              <Text style={styles.completeBtnText}>
                {isOnCooldown
                  ? 'Cooldown Active (24h)'
                  : `Complete Verified 1-on-1 (+${PRIVATE_HELP_REWARD_POINTS} pts)`}
              </Text>
            </Pressable>
            {rewardFeedback ? (
              <Text style={styles.feedbackText}>{rewardFeedback}</Text>
            ) : null}
          </View>

          {/* Chat Thread */}
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.isSelf ? styles.bubbleSelf : styles.bubblePeer,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleSender,
                    item.isSelf && styles.bubbleSenderSelf,
                  ]}
                >
                  {item.sender}
                </Text>
                <Text
                  style={[
                    styles.bubbleText,
                    item.isSelf && styles.bubbleTextSelf,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            )}
          />

          {/* Composer */}
          <View style={styles.composerRow}>
            <TextInput
              style={styles.input}
              placeholder={`Ask ${peer.name} a question...`}
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
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.sage,
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
  rewardBox: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 12,
    padding: 11,
    gap: 8,
  },
  rewardBoxCooldown: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  rewardDesc: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  completeBtn: {
    backgroundColor: COLORS.sage,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: 'center',
  },
  completeBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
  messageList: {
    maxHeight: 240,
  },
  messageContent: {
    gap: 8,
    paddingVertical: 4,
  },
  bubble: {
    padding: 10,
    borderRadius: 12,
    maxWidth: '88%',
    gap: 3,
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
  bubbleSender: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  bubbleSenderSelf: {
    color: '#CBD5E1',
  },
  bubbleText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  bubbleTextSelf: {
    color: COLORS.surface,
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
