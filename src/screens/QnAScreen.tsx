import React, { useMemo, useState } from 'react';
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
import { VERIFIED_VOTE_THRESHOLD } from '../storage/storage';
import { COLORS } from '../theme/tokens';
import {
  LiveMessageItem,
  QuestionItem,
  RoomCategory,
  StudyRoom,
} from '../types/studyble';

interface QnAScreenProps {
  rooms: StudyRoom[];
  questions: QuestionItem[];
  onAddQuestion: (title: string, detail: string, topic: string) => void;
  onToggleVote: (questionId: string) => void;
  onOpenQuestion: (questionId: string) => void;
}

type QnATab = 'archive' | 'threads';

interface ArchivedLiveQuestion extends LiveMessageItem {
  roomId: string;
  roomTitle: string;
  roomCategory: RoomCategory;
}

export function QnAScreen({
  rooms,
  questions,
  onAddQuestion,
  onToggleVote,
  onOpenQuestion,
}: QnAScreenProps) {
  const [activeTab, setActiveTab] = useState<QnATab>('archive');
  const [title, setTitle] = useState<string>('');
  const [detail, setDetail] = useState<string>('');
  const [topic, setTopic] = useState<string>('General');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Aggregate ALL public questions ever asked across ALL live study rooms, newest-first
  const liveArchiveItems = useMemo<ArchivedLiveQuestion[]>(() => {
    const collected: ArchivedLiveQuestion[] = [];
    for (const room of rooms) {
      for (const msg of room.messages) {
        if (msg.kind !== 'question') continue;
        collected.push({
          ...msg,
          roomId: room.id,
          roomTitle: room.title,
          roomCategory: room.category,
        });
      }
    }
    return collected.sort(
      (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)
    );
  }, [rooms]);

  const handleSubmit = () => {
    const cleanTitle = title.trim();
    const cleanDetail = detail.trim();

    if (!cleanTitle || !cleanDetail) {
      setErrorMsg('Please fill in both a question title and short context.');
      return;
    }

    onAddQuestion(cleanTitle, cleanDetail, topic.trim() || 'General');
    setTitle('');
    setDetail('');
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Peer Q&A</Text>
        <Text style={styles.headerSubtitle}>
          All live room questions & community answers in one archive
        </Text>

        {/* Central Archive vs Peer Threads Switcher */}
        <View style={styles.tabBar}>
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === 'archive' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('archive')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'archive' && styles.tabTextActive,
              ]}
            >
              Live Archive ({liveArchiveItems.length})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === 'threads' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('threads')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'threads' && styles.tabTextActive,
              ]}
            >
              Q&A Threads ({questions.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === 'archive' ? (
          <FlatList
            data={liveArchiveItems}
            keyExtractor={(item) => `${item.roomId}-${item.id}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyStateBox
                title="No live room questions yet"
                subtitle="Questions asked in any live study room appear here automatically, newest first."
              />
            }
            renderItem={({ item }) => {
              const isDiscarded = item.status === 'discarded';
              const isAccepted =
                !isDiscarded &&
                (item.status === 'accepted' ||
                  item.verified ||
                  item.votes >= VERIFIED_VOTE_THRESHOLD);

              return (
                <SectionCard
                  style={[
                    styles.questionCard,
                    isAccepted && styles.acceptedCard,
                    isDiscarded && styles.discardedCard,
                  ]}
                >
                  <View style={styles.archiveTopRow}>
                    <View
                      style={[
                        styles.roomBadge,
                        isDiscarded && styles.roomBadgeDiscarded,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roomBadgeText,
                          isDiscarded && styles.discardedMutedText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.roomTitle} · {item.roomCategory}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{item.createdAt}</Text>
                  </View>

                  <View style={styles.askerRow}>
                    <Text
                      style={[
                        styles.askerName,
                        isDiscarded && styles.discardedMutedText,
                      ]}
                    >
                      Asked by {item.sender}
                    </Text>
                    {isAccepted ? (
                      <View style={styles.acceptedPill}>
                        <Text style={styles.acceptedPillText}>✓ Accepted</Text>
                      </View>
                    ) : isDiscarded ? (
                      <View style={styles.discardedPill}>
                        <Text style={styles.discardedPillText}>Downvoted</Text>
                      </View>
                    ) : (
                      <View style={styles.openPill}>
                        <Text style={styles.openPillText}>Open</Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.questionTitle,
                      isDiscarded && styles.discardedMutedText,
                    ]}
                  >
                    {item.text}
                  </Text>

                  {item.answerText ? (
                    <View
                      style={[
                        styles.archiveAnswerBox,
                        isDiscarded && styles.archiveAnswerBoxDiscarded,
                      ]}
                    >
                      <Text
                        style={[
                          styles.archiveAnswerAuthor,
                          isDiscarded && styles.discardedMutedText,
                        ]}
                      >
                        Answer · {item.answererName ?? 'Peer'}
                      </Text>
                      <Text
                        style={[
                          styles.archiveAnswerText,
                          isDiscarded && styles.discardedMutedText,
                        ]}
                      >
                        {item.answerText}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.awaitingText}>
                      Awaiting an answer in the live room
                    </Text>
                  )}

                  <View style={styles.archiveFooter}>
                    <Text
                      style={[
                        styles.statusNote,
                        isAccepted && styles.statusNoteAccepted,
                        isDiscarded && styles.discardedMutedText,
                      ]}
                    >
                      {item.resolutionNote ??
                        (isDiscarded
                          ? 'Downvoted · Discarded (+0 pts)'
                          : isAccepted
                          ? 'Accepted · Ready to use'
                          : `${item.votes} upvotes`)}
                    </Text>
                    {typeof item.upVotes === 'number' ||
                    typeof item.downVotes === 'number' ? (
                      <Text
                        style={[
                          styles.tallyText,
                          isDiscarded && styles.discardedMutedText,
                        ]}
                      >
                        ▲ {item.upVotes ?? 0} · ▼ {item.downVotes ?? 0}
                      </Text>
                    ) : null}
                  </View>
                </SectionCard>
              );
            }}
          />
        ) : (
          <>
            <SectionCard style={styles.formCard}>
              <Text style={styles.formLabel}>NEW QUESTION</Text>
              <TextInput
                style={styles.input}
                placeholder="What topic or concept are you stuck on?"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errorMsg) setErrorMsg('');
                }}
              />
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Add brief context or what you already tried..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={detail}
                onChangeText={(text) => {
                  setDetail(text);
                  if (errorMsg) setErrorMsg('');
                }}
              />
              <View style={styles.formBottomRow}>
                <TextInput
                  style={[styles.input, styles.topicInput]}
                  placeholder="Topic (e.g. Math, CS)"
                  placeholderTextColor={COLORS.textMuted}
                  value={topic}
                  onChangeText={setTopic}
                />
                <Pressable style={styles.postBtn} onPress={handleSubmit}>
                  <Text style={styles.postBtnText}>Post Question</Text>
                </Pressable>
              </View>
              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            </SectionCard>

            <FlatList
              data={questions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <EmptyStateBox
                  title="No questions yet"
                  subtitle="Be the first to post a study question above."
                />
              }
              renderItem={({ item }) => {
                const isLocked =
                  item.answers.length >= 1 ||
                  Boolean(item.verified) ||
                  item.answers.some(
                    (a) => Boolean(a.verified) || (a.verifiedBy?.length ?? 0) > 0
                  );

                return (
                  <SectionCard style={styles.questionCard}>
                    <Pressable onPress={() => onOpenQuestion(item.id)}>
                      <View style={styles.metaRow}>
                        <Text style={styles.topicBadge}>{item.topic}</Text>
                        <View style={styles.metaRight}>
                          {isLocked ? (
                            <Text style={styles.lockedTag}>Ask locked</Text>
                          ) : null}
                          <Text style={styles.answerCount}>
                            {item.answers.length} answers
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.questionTitle}>{item.title}</Text>
                      <Text style={styles.questionDetail} numberOfLines={2}>
                        {item.detail}
                      </Text>
                    </Pressable>

                    <View style={styles.cardActions}>
                      <Pressable
                        style={[
                          styles.voteBtn,
                          item.hasVoted && styles.voteBtnActive,
                        ]}
                        onPress={() => onToggleVote(item.id)}
                      >
                        <Text
                          style={[
                            styles.voteText,
                            item.hasVoted && styles.voteTextActive,
                          ]}
                        >
                          {item.hasVoted ? 'Upvoted' : 'Upvote'} ({item.votes})
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.detailLink}
                        onPress={() => onOpenQuestion(item.id)}
                      >
                        <Text style={styles.detailLinkText}>Open Thread →</Text>
                      </Pressable>
                    </View>
                  </SectionCard>
                );
              }}
            />
          </>
        )}
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
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.navy,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.surface,
  },
  formCard: {
    marginBottom: 12,
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
    letterSpacing: 0.7,
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formBottomRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  topicInput: {
    flex: 1,
  },
  postBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  postBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: COLORS.coral,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  questionCard: {
    gap: 8,
  },
  acceptedCard: {
    borderColor: COLORS.sage,
    backgroundColor: '#FAFDFC',
  },
  discardedCard: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  discardedMutedText: {
    color: '#6B7280',
  },
  archiveTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  roomBadge: {
    flexShrink: 1,
    backgroundColor: COLORS.sageSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roomBadgeDiscarded: {
    backgroundColor: '#D1D5DB',
  },
  roomBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.sage,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  askerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  askerName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  acceptedPill: {
    backgroundColor: COLORS.sageSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  acceptedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.sage,
  },
  discardedPill: {
    backgroundColor: '#D1D5DB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discardedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  openPill: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  openPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  archiveAnswerBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  archiveAnswerBoxDiscarded: {
    backgroundColor: '#D1D5DB',
    borderColor: '#9CA3AF',
  },
  archiveAnswerAuthor: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.sage,
  },
  archiveAnswerText: {
    fontSize: 13,
    color: COLORS.navy,
    lineHeight: 18,
  },
  awaitingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  archiveFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusNote: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  statusNoteAccepted: {
    color: COLORS.sage,
  },
  tallyText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  topicBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
  },
  answerCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  questionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  questionDetail: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  voteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voteBtnActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  voteText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  voteTextActive: {
    color: COLORS.surface,
  },
  detailLink: {
    paddingVertical: 4,
  },
  detailLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.coral,
  },
});
