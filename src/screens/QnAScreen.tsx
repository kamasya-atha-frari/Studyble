import React, { useState } from 'react';
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
import { QuestionItem } from '../types/studyble';

interface QnAScreenProps {
  questions: QuestionItem[];
  onAddQuestion: (title: string, detail: string, topic: string) => void;
  onToggleVote: (questionId: string) => void;
  onOpenQuestion: (questionId: string) => void;
}

export function QnAScreen({
  questions,
  onAddQuestion,
  onToggleVote,
  onOpenQuestion,
}: QnAScreenProps) {
  const [title, setTitle] = useState<string>('');
  const [detail, setDetail] = useState<string>('');
  const [topic, setTopic] = useState<string>('General');
  const [errorMsg, setErrorMsg] = useState<string>('');

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
        <Text style={styles.headerSubtitle}>Ask questions, vote helpful posts, and share answers</Text>

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
          renderItem={({ item }) => (
            <SectionCard style={styles.questionCard}>
              <Pressable onPress={() => onOpenQuestion(item.id)}>
                <View style={styles.metaRow}>
                  <Text style={styles.topicBadge}>{item.topic}</Text>
                  <Text style={styles.answerCount}>{item.answers.length} answers</Text>
                </View>
                <Text style={styles.questionTitle}>{item.title}</Text>
                <Text style={styles.questionDetail} numberOfLines={2}>
                  {item.detail}
                </Text>
              </Pressable>

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.voteBtn, item.hasVoted && styles.voteBtnActive]}
                  onPress={() => onToggleVote(item.id)}
                >
                  <Text style={[styles.voteText, item.hasVoted && styles.voteTextActive]}>
                    {item.hasVoted ? 'Voted' : 'Upvote'} ({item.votes})
                  </Text>
                </Pressable>
                <Pressable style={styles.detailLink} onPress={() => onOpenQuestion(item.id)}>
                  <Text style={styles.detailLinkText}>Open Thread →</Text>
                </Pressable>
              </View>
            </SectionCard>
          )}
        />
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
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
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
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
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
