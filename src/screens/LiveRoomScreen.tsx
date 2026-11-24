import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmptyStateBox } from '../components/EmptyStateBox';
import { SectionCard } from '../components/SectionCard';
import { COLORS } from '../theme/tokens';
import { StudyProfileState, StudyRoom } from '../types/studyble';

interface LiveRoomScreenProps {
  room: StudyRoom | undefined;
  profile: StudyProfileState;
  onLeaveRoom: (roomId: string) => void;
  onSendLiveMessage: (roomId: string, text: string, isQuestion: boolean) => void;
  onToggleLiveVote: (roomId: string, messageId: string) => void;
  onSessionComplete: (minutes: number) => void;
}

export function LiveRoomScreen({
  room,
  profile,
  onLeaveRoom,
  onSendLiveMessage,
  onToggleLiveVote,
  onSessionComplete,
}: LiveRoomScreenProps) {
  const [messageText, setMessageText] = useState<string>('');
  const [asQuestion, setAsQuestion] = useState<boolean>(true);
  const [secondsLeft, setSecondsLeft] = useState<number>(
    (room?.focusMinutes ?? profile.defaultFocusMinutes) * 60
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onSessionComplete(room?.focusMinutes ?? profile.defaultFocusMinutes);
          return (room?.focusMinutes ?? profile.defaultFocusMinutes) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, onSessionComplete, profile.defaultFocusMinutes, room?.focusMinutes]);

  if (!room) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <EmptyStateBox
            title="Live room unavailable"
            subtitle="Go back and join an active study room."
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleSend = () => {
    const clean = messageText.trim();
    if (!clean) return;
    onSendLiveMessage(room.id, clean, asQuestion);
    setMessageText('');
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const sortedMessages = [...room.messages].sort((a, b) => b.votes - a.votes);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable style={styles.leaveBtn} onPress={() => onLeaveRoom(room.id)}>
            <Text style={styles.leaveBtnText}>← Leave Live</Text>
          </Pressable>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>● LIVE · {room.activeStudents} studying</Text>
          </View>
        </View>

        <SectionCard style={styles.liveHeaderCard}>
          <Text style={styles.categoryText}>{room.category.toUpperCase()}</Text>
          <Text style={styles.roomTitle}>{room.title}</Text>
          <View style={styles.timerRow}>
            <Text style={styles.timerText}>{formatted}</Text>
            <View style={styles.timerBtns}>
              <Pressable
                style={styles.timerBtn}
                onPress={() => setIsRunning((prev) => !prev)}
              >
                <Text style={styles.timerBtnText}>{isRunning ? 'Pause' : 'Start'}</Text>
              </Pressable>
              <Pressable
                style={styles.doneBtn}
                onPress={() => {
                  setIsRunning(false);
                  onSessionComplete(room.focusMinutes);
                }}
              >
                <Text style={styles.doneBtnText}>+5 pts</Text>
              </Pressable>
            </View>
          </View>
        </SectionCard>

        <Text style={styles.sectionTitle}>Live Public Chat & Questions (Sorted by Votes)</Text>

        <FlatList
          data={sortedMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateBox
              title="No live chat messages yet"
              subtitle="Ask a question below so participants in the room can vote."
            />
          }
          renderItem={({ item }) => (
            <SectionCard style={styles.msgCard}>
              <View style={styles.msgHeader}>
                <Text style={styles.senderText}>{item.sender}</Text>
                <Text style={styles.tagText}>
                  {item.isQuestion ? 'Question' : 'Chat'} · {item.createdAt}
                </Text>
              </View>
              <Text style={styles.msgBody}>{item.text}</Text>
              <View style={styles.msgFooter}>
                <Pressable
                  style={[styles.voteBtn, item.hasVoted && styles.voteBtnActive]}
                  onPress={() => onToggleLiveVote(room.id, item.id)}
                >
                  <Text style={[styles.voteText, item.hasVoted && styles.voteTextActive]}>
                    ▲ Vote ({item.votes})
                  </Text>
                </Pressable>
              </View>
            </SectionCard>
          )}
        />

        <SectionCard style={styles.inputCard}>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeChip, asQuestion && styles.modeChipActive]}
              onPress={() => setAsQuestion(true)}
            >
              <Text style={[styles.modeText, asQuestion && styles.modeTextActive]}>
                Ask Question
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeChip, !asQuestion && styles.modeChipActive]}
              onPress={() => setAsQuestion(false)}
            >
              <Text style={[styles.modeText, !asQuestion && styles.modeTextActive]}>
                Public Chat
              </Text>
            </Pressable>
          </View>

          <View style={styles.sendRow}>
            <TextInput
              style={styles.input}
              placeholder={
                asQuestion
                  ? 'Type a question for the live room...'
                  : 'Send a message to public chat...'
              }
              placeholderTextColor={COLORS.textMuted}
              value={messageText}
              onChangeText={setMessageText}
            />
            <Pressable style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendBtnText}>Send</Text>
            </Pressable>
          </View>
        </SectionCard>
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
    paddingTop: 10,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  liveBadge: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
  },
  liveHeaderCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
    marginBottom: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.coral,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.surface,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.cream,
  },
  timerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  timerBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  timerBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 12,
  },
  doneBtn: {
    borderWidth: 1,
    borderColor: COLORS.cream,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  doneBtnText: {
    color: COLORS.cream,
    fontWeight: '700',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 8,
  },
  listContent: {
    gap: 8,
    paddingBottom: 10,
  },
  msgCard: {
    gap: 6,
    padding: 12,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  senderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  msgBody: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  msgFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  voteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voteBtnActive: {
    backgroundColor: COLORS.coral,
    borderColor: COLORS.coral,
  },
  voteText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  voteTextActive: {
    color: COLORS.surface,
  },
  inputCard: {
    padding: 10,
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modeTextActive: {
    color: COLORS.surface,
  },
  sendRow: {
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
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
  },
  sendBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
});
