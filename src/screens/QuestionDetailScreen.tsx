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

interface QuestionDetailScreenProps {
  question: QuestionItem | undefined;
  onAddAnswer: (questionId: string, body: string) => void;
  onBack: () => void;
}

export function QuestionDetailScreen({
  question,
  onAddAnswer,
  onBack,
}: QuestionDetailScreenProps) {
  const [answerText, setAnswerText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>← Back to Q&A</Text>
          </Pressable>
          <EmptyStateBox
            title="Question not found"
            subtitle="This question may have been removed or reset."
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleReply = () => {
    const clean = answerText.trim();
    if (!clean) {
      setErrorMsg('Please write an answer before posting.');
      return;
    }
    onAddAnswer(question.id, clean);
    setAnswerText('');
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Back to Q&A</Text>
        </Pressable>

        <SectionCard style={styles.mainCard}>
          <Text style={styles.topic}>{question.topic}</Text>
          <Text style={styles.title}>{question.title}</Text>
          <Text style={styles.detail}>{question.detail}</Text>
          <Text style={styles.meta}>
            {question.votes} upvotes · {question.answers.length} answers
          </Text>
        </SectionCard>

        <Text style={styles.sectionHeading}>Answers</Text>

        <FlatList
          data={question.answers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateBox
              title="No answers yet"
              subtitle="Share a helpful explanation below (+3 pts)."
            />
          }
          renderItem={({ item }) => (
            <SectionCard style={styles.answerCard}>
              <View style={styles.answerHeader}>
                <Text style={styles.author}>{item.author}</Text>
                <Text style={styles.time}>{item.createdAt}</Text>
              </View>
              <Text style={styles.answerBody}>{item.body}</Text>
            </SectionCard>
          )}
        />

        <SectionCard style={styles.replyBox}>
          <TextInput
            style={styles.input}
            placeholder="Write a clear, helpful answer..."
            placeholderTextColor={COLORS.textMuted}
            value={answerText}
            onChangeText={(text) => {
              setAnswerText(text);
              if (errorMsg) setErrorMsg('');
            }}
          />
          <Pressable style={styles.sendBtn} onPress={handleReply}>
            <Text style={styles.sendBtnText}>Reply</Text>
          </Pressable>
        </SectionCard>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
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
    paddingBottom: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  mainCard: {
    gap: 8,
    marginBottom: 14,
  },
  topic: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  detail: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 8,
  },
  listContent: {
    gap: 10,
    paddingBottom: 12,
  },
  answerCard: {
    gap: 6,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  time: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  answerBody: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  replyBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 10,
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
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: COLORS.coral,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
