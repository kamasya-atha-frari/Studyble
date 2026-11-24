import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../theme/tokens';

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface QuizTrack {
  id: 'statistics' | 'math';
  badgeName: string;
  subtitle: string;
  questions: QuizQuestion[];
}

const PASSING_SCORE = 4;

const QUIZ_TRACKS: QuizTrack[] = [
  {
    id: 'statistics',
    badgeName: 'Pro at Statistics',
    subtitle: '5 quick questions on distributions, central tendency & inference',
    questions: [
      {
        id: 'st-1',
        prompt: 'Which measure of central tendency is least affected by extreme outliers?',
        options: ['Arithmetic Mean', 'Median', 'Range', 'Variance'],
        correctIndex: 1,
      },
      {
        id: 'st-2',
        prompt: 'In hypothesis testing, if p-value < α (e.g., 0.05), what is the standard decision?',
        options: [
          'Reject the null hypothesis (H0)',
          'Prove H0 is 100% true',
          'Increase sample variance',
          'Discard the alternative hypothesis',
        ],
        correctIndex: 0,
      },
      {
        id: 'st-3',
        prompt: 'Standard deviation is the square root of which metric?',
        options: ['Median', 'Interquartile Range', 'Variance', 'Mode'],
        correctIndex: 2,
      },
      {
        id: 'st-4',
        prompt: 'For a normal distribution, roughly what percentage of data lies within ±1 standard deviation of the mean?',
        options: ['50%', '68%', '95%', '99.7%'],
        correctIndex: 1,
      },
      {
        id: 'st-5',
        prompt: 'A Pearson correlation coefficient of r = -0.92 indicates:',
        options: [
          'No linear relationship',
          'Weak positive linear relationship',
          'Strong negative linear relationship',
          'Direct causal proof',
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'math',
    badgeName: 'Pro at Math',
    subtitle: '5 quick questions on calculus, algebra & linear matrices',
    questions: [
      {
        id: 'ma-1',
        prompt: 'What is the derivative of f(x) = x³ with respect to x?',
        options: ['x²', '3x²', '3x³', '2x'],
        correctIndex: 1,
      },
      {
        id: 'ma-2',
        prompt: 'What is the value of log₁₀(1000)?',
        options: ['2', '3', '10', '100'],
        correctIndex: 1,
      },
      {
        id: 'ma-3',
        prompt: 'What is the determinant of the 2×2 matrix [[3, 2], [1, 4]]?',
        options: ['10', '12', '14', '6'],
        correctIndex: 0,
      },
      {
        id: 'ma-4',
        prompt: 'If 2x - 5 = 11, what is the value of x?',
        options: ['3', '6', '8', '16'],
        correctIndex: 2,
      },
      {
        id: 'ma-5',
        prompt: 'What is the sum of the interior angles of any triangle?',
        options: ['90°', '180°', '270°', '360°'],
        correctIndex: 1,
      },
    ],
  },
];

interface ProQuizModalProps {
  visible: boolean;
  unlockedBadges: string[];
  onClose: () => void;
  onUnlockBadge: (badgeName: string) => void;
}

export function ProQuizModal({
  visible,
  unlockedBadges,
  onClose,
  onUnlockBadge,
}: ProQuizModalProps) {
  const [selectedTrack, setSelectedTrack] = useState<QuizTrack | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [finished, setFinished] = useState<boolean>(false);

  const resetQuizState = () => {
    setSelectedTrack(null);
    setQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setFinished(false);
  };

  const handleClose = () => {
    resetQuizState();
    onClose();
  };

  const handleStartTrack = (track: QuizTrack) => {
    setSelectedTrack(track);
    setQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setFinished(false);
  };

  const handleNext = () => {
    if (!selectedTrack || selectedOption === null) return;
    const currentQ = selectedTrack.questions[questionIndex];
    const nextScore =
      selectedOption === currentQ.correctIndex ? score + 1 : score;

    if (questionIndex + 1 < selectedTrack.questions.length) {
      setScore(nextScore);
      setQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setScore(nextScore);
      setFinished(true);
      if (nextScore >= PASSING_SCORE) {
        onUnlockBadge(selectedTrack.badgeName);
      }
    }
  };

  const currentQuestion = selectedTrack
    ? selectedTrack.questions[questionIndex]
    : null;
  const passed = score >= PASSING_SCORE;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>SPECIALIST CERTIFICATION</Text>
              <Text style={styles.title}>
                {selectedTrack ? selectedTrack.badgeName : '“Pro At” Mini-Quiz'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {!selectedTrack ? (
              <View style={styles.trackList}>
                <Text style={styles.introText}>
                  Score at least {PASSING_SCORE}/5 to unlock a specialist badge shown on your profile and live participant card.
                </Text>

                {QUIZ_TRACKS.map((track) => {
                  const alreadyUnlocked = unlockedBadges.includes(track.badgeName);
                  return (
                    <Pressable
                      key={track.id}
                      style={[
                        styles.trackCard,
                        alreadyUnlocked && styles.trackCardUnlocked,
                      ]}
                      onPress={() => handleStartTrack(track)}
                    >
                      <View style={styles.trackTop}>
                        <Text style={styles.trackTitle}>✦ {track.badgeName}</Text>
                        <Text
                          style={[
                            styles.trackStatus,
                            alreadyUnlocked && styles.trackStatusDone,
                          ]}
                        >
                          {alreadyUnlocked ? 'Unlocked ✓' : 'Start Quiz →'}
                        </Text>
                      </View>
                      <Text style={styles.trackSubtitle}>{track.subtitle}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : finished ? (
              <View style={styles.resultBox}>
                <Text style={styles.resultEmoji}>{passed ? '🎉' : '📚'}</Text>
                <Text style={styles.resultTitle}>
                  {passed
                    ? `Badge Unlocked: ${selectedTrack.badgeName}`
                    : 'Almost there! Keep practicing'}
                </Text>
                <Text style={styles.resultScore}>
                  Your Score: {score} / {selectedTrack.questions.length}
                </Text>
                <Text style={styles.resultHint}>
                  {passed
                    ? 'Your specialist badge is now saved to your profile and visible on your Live Study Room card.'
                    : `Score at least ${PASSING_SCORE}/5 to unlock the ${selectedTrack.badgeName} badge.`}
                </Text>

                <View style={styles.resultActions}>
                  {!passed ? (
                    <Pressable
                      style={styles.retryBtn}
                      onPress={() => handleStartTrack(selectedTrack)}
                    >
                      <Text style={styles.retryBtnText}>Try Again</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.doneBtn} onPress={handleClose}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ) : currentQuestion ? (
              <View style={styles.questionBox}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>
                    Question {questionIndex + 1} of {selectedTrack.questions.length}
                  </Text>
                  <Text style={styles.progressHint}>Need {PASSING_SCORE}/5</Text>
                </View>

                <Text style={styles.questionPrompt}>{currentQuestion.prompt}</Text>

                <View style={styles.optionsList}>
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    return (
                      <Pressable
                        key={option}
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemSelected,
                        ]}
                        onPress={() => setSelectedOption(idx)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.quizFooter}>
                  <Pressable style={styles.backLink} onPress={resetQuizState}>
                    <Text style={styles.backLinkText}>← Change Topic</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.nextBtn,
                      selectedOption === null && styles.nextBtnDisabled,
                    ]}
                    disabled={selectedOption === null}
                    onPress={handleNext}
                  >
                    <Text style={styles.nextBtnText}>
                      {questionIndex + 1 === selectedTrack.questions.length
                        ? 'Finish Quiz'
                        : 'Next →'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: COLORS.cream,
    borderRadius: 18,
    padding: 18,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.sage,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.navy,
  },
  closeBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  body: {
    paddingBottom: 6,
  },
  trackList: {
    gap: 10,
  },
  introText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
  trackCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  trackCardUnlocked: {
    borderColor: COLORS.sage,
    backgroundColor: '#FAFDFC',
  },
  trackTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navy,
  },
  trackStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
  },
  trackStatusDone: {
    color: COLORS.sage,
  },
  trackSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  questionBox: {
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
  progressHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  questionPrompt: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    lineHeight: 22,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  optionItemSelected: {
    backgroundColor: COLORS.sageSoft,
    borderColor: COLORS.sage,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  optionTextSelected: {
    color: COLORS.sage,
    fontWeight: '700',
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  backLink: {
    paddingVertical: 6,
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  nextBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  nextBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  nextBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  resultBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  resultEmoji: {
    fontSize: 34,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
  },
  resultScore: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.sage,
  },
  resultHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  retryBtn: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  doneBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
