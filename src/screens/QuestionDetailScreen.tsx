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
import {
  DAILY_VERIFIED_LIMIT_LOW_LEVEL,
  QNA_VERIFIED_ANSWER_POINTS,
  VerificationResult,
} from '../utils/progression';

interface QuestionDetailScreenProps {
  question: QuestionItem | undefined;
  studentName: string;
  verifiedItemIds: string[];
  onAddAnswer: (questionId: string, body: string) => void;
  onVerifyAnswer: (questionId: string, answerId: string) => VerificationResult;
  onBack: () => void;
}

export function QuestionDetailScreen({
  question,
  studentName,
  verifiedItemIds,
  onAddAnswer,
  onVerifyAnswer,
  onBack,
}: QuestionDetailScreenProps) {
  const [answerText, setAnswerText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [verifyNotice, setVerifyNotice] = useState<string>('');

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

  const hasAnyVerifiedAnswer =
    Boolean(question.verified) ||
    question.answers.some(
      (a) => Boolean(a.verified) || (a.verifiedBy?.length ?? 0) > 0
    );
  const isQuestionLocked = question.answers.length >= 1 || hasAnyVerifiedAnswer;

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

  const handleVerify = (answerId: string) => {
    const result = onVerifyAnswer(question.id, answerId);
    if (result.awarded) {
      setVerifyNotice(
        `✓ Answer verified! +${QNA_VERIFIED_ANSWER_POINTS} pt awarded.`
      );
    } else if (result.reason === 'already_verified') {
      setVerifyNotice('You already verified this answer (once per person).');
    } else if (result.reason === 'daily_limit') {
      setVerifyNotice(
        `Daily limit reached (${DAILY_VERIFIED_LIMIT_LOW_LEVEL}/${DAILY_VERIFIED_LIMIT_LOW_LEVEL} verified answers today for Lv.1–10).`
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Back to Q&A</Text>
        </Pressable>

        <SectionCard style={styles.mainCard}>
          <View style={styles.topRow}>
            <Text style={styles.topic}>{question.topic}</Text>
            {isQuestionLocked ? (
              <View style={styles.lockedPill}>
                <Text style={styles.lockedPillText}>
                  {hasAnyVerifiedAnswer
                    ? '✓ Verified · Ask locked'
                    : 'Answered · Ask locked'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>{question.title}</Text>
          <Text style={styles.detail}>{question.detail}</Text>
          <Text style={styles.meta}>
            {question.votes} upvotes · {question.answers.length} answers
          </Text>
        </SectionCard>

        <Text style={styles.sectionHeading}>Answers</Text>

        {verifyNotice ? (
          <Text style={styles.verifyNotice}>{verifyNotice}</Text>
        ) : null}

        <FlatList
          data={question.answers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateBox
              title="No answers yet"
              subtitle="Share a clear explanation below so peers can verify it."
            />
          }
          renderItem={({ item }) => {
            const itemKey = `qna:${question.id}:${item.id}`;
            const hasVerifiedBySelf =
              verifiedItemIds.includes(itemKey) ||
              Boolean(item.verifiedBy?.includes(studentName));
            const isVerified = Boolean(item.verified) || hasVerifiedBySelf;

            return (
              <SectionCard
                style={[styles.answerCard, isVerified && styles.answerCardVerified]}
              >
                <View style={styles.answerHeader}>
                  <Text style={styles.author}>{item.author}</Text>
                  <Text style={styles.time}>{item.createdAt}</Text>
                </View>
                <Text style={styles.answerBody}>{item.body}</Text>

                <View style={styles.answerFooter}>
                  {isVerified ? (
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedTagText}>✓ Verified</Text>
                    </View>
                  ) : (
                    <View />
                  )}

                  <Pressable
                    style={[
                      styles.verifyBtn,
                      hasVerifiedBySelf && styles.verifyBtnDisabled,
                    ]}
                    onPress={() => handleVerify(item.id)}
                    disabled={hasVerifiedBySelf}
                  >
                    <Text
                      style={[
                        styles.verifyBtnText,
                        hasVerifiedBySelf && styles.verifyBtnTextDisabled,
                      ]}
                    >
                      {hasVerifiedBySelf ? 'Verified ✓' : 'Verify Answer'}
                    </Text>
                  </Pressable>
                </View>
              </SectionCard>
            );
          }}
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  topic: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
  },
  lockedPill: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  lockedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
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
    marginBottom: 6,
  },
  verifyNotice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
    marginBottom: 8,
  },
  listContent: {
    gap: 10,
    paddingBottom: 12,
  },
  answerCard: {
    gap: 8,
  },
  answerCardVerified: {
    borderColor: COLORS.sage,
    backgroundColor: '#FAFDFC',
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
  answerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  verifiedTag: {
    backgroundColor: COLORS.sageSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.sage,
  },
  verifyBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyBtnDisabled: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  verifyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.surface,
  },
  verifyBtnTextDisabled: {
    color: COLORS.textMuted,
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
