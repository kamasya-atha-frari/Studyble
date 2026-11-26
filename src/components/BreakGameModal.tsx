import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme/tokens';

interface MemoryCard {
  id: string;
  pairId: string;
  emoji: string;
  label: string;
  matched: boolean;
}

interface BreakGameModalProps {
  visible: boolean;
  breakSecondsLeft?: number | null;
  onClose: () => void;
}

const MAX_MOVES = 12;
const AUTO_RETURN_DELAY_MS = 500;
const MISMATCH_FLIP_DELAY_MS = 650;
const AUTO_SHUFFLE_DELAY_MS = 450;
const SHUFFLE_NOTICE_DURATION_MS = 2400;

const STUDY_PAIRS: ReadonlyArray<{ pairId: string; emoji: string; label: string }> = [
  { pairId: 'coffee', emoji: '☕', label: 'Coffee' },
  { pairId: 'book', emoji: '📖', label: 'Notes' },
  { pairId: 'music', emoji: '🎧', label: 'Lo-fi' },
  { pairId: 'idea', emoji: '💡', label: 'Idea' },
  { pairId: 'plant', emoji: '🌱', label: 'Focus' },
  { pairId: 'pencil', emoji: '✏️', label: 'Sketch' },
];

function createShuffledDeck(): MemoryCard[] {
  const doubled: MemoryCard[] = STUDY_PAIRS.flatMap((pair) => [
    { id: `${pair.pairId}-a`, ...pair, matched: false },
    { id: `${pair.pairId}-b`, ...pair, matched: false },
  ]);

  for (let i = doubled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = doubled[i];
    doubled[i] = doubled[j];
    doubled[j] = temp;
  }
  return doubled;
}

export function BreakGameModal({
  visible,
  breakSecondsLeft = null,
  onClose,
}: BreakGameModalProps) {
  const [cards, setCards] = useState<MemoryCard[]>(() => createShuffledDeck());
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [shuffleNotice, setShuffleNotice] = useState<string>('');

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const clearAllTimers = () => {
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
    if (shuffleTimerRef.current) {
      clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  // Deal a fresh board each time the modal opens, and clear timers on hide/unmount
  useEffect(() => {
    clearAllTimers();
    if (visible) {
      setCards(createShuffledDeck());
      setFlippedIds([]);
      setMoves(0);
      setIsLocked(false);
      setShuffleNotice('');
    }
    return () => clearAllTimers();
  }, [visible]);

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const isComplete = matchedPairs === STUDY_PAIRS.length;

  // Automatically return to the live room shortly after all pairs are matched
  useEffect(() => {
    if (!visible || !isComplete) return;
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    autoCloseTimerRef.current = setTimeout(() => {
      autoCloseTimerRef.current = null;
      onCloseRef.current();
    }, AUTO_RETURN_DELAY_MS);

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [visible, isComplete]);

  const triggerAutoShuffle = () => {
    setIsLocked(true);
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
    if (shuffleTimerRef.current) {
      clearTimeout(shuffleTimerRef.current);
    }
    setShuffleNotice(`${MAX_MOVES}-move limit exceeded — auto-shuffling new board...`);
    shuffleTimerRef.current = setTimeout(() => {
      shuffleTimerRef.current = null;
      setCards(createShuffledDeck());
      setFlippedIds([]);
      setMoves(0);
      setIsLocked(false);
      setShuffleNotice('↻ New board dealt! Moves reset to 0.');

      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
      noticeTimerRef.current = setTimeout(() => {
        noticeTimerRef.current = null;
        setShuffleNotice('');
      }, SHUFFLE_NOTICE_DURATION_MS);
    }, AUTO_SHUFFLE_DELAY_MS);
  };

  const formattedBreakTimer =
    typeof breakSecondsLeft === 'number' && breakSecondsLeft > 0
      ? `${String(Math.floor(breakSecondsLeft / 60)).padStart(2, '0')}:${String(
          breakSecondsLeft % 60
        ).padStart(2, '0')}`
      : null;

  const handlePressCard = (card: MemoryCard) => {
    if (isLocked || isComplete || card.matched || flippedIds.includes(card.id)) {
      return;
    }

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);

    const firstCard = cards.find((c) => c.id === nextFlipped[0]);
    if (!firstCard) return;

    const isMatch = firstCard.pairId === card.pairId;
    const willComplete = isMatch && matchedPairs + 1 === STUDY_PAIRS.length;

    if (isMatch) {
      setCards((prev) =>
        prev.map((item) =>
          item.pairId === card.pairId ? { ...item, matched: true } : item
        )
      );
      setFlippedIds([]);
      if (!willComplete && nextMoves > MAX_MOVES) {
        triggerAutoShuffle();
      }
      return;
    }

    if (nextMoves > MAX_MOVES) {
      triggerAutoShuffle();
      return;
    }

    setIsLocked(true);
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = setTimeout(() => {
      setFlippedIds([]);
      setIsLocked(false);
      flipTimerRef.current = null;
    }, MISMATCH_FLIP_DELAY_MS);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>TAKE A BREAK · MINI-GAME</Text>
              <Text style={styles.title}>Study Memory Match</Text>
            </View>
            {formattedBreakTimer ? (
              <View style={styles.breakTimerPill}>
                <Text style={styles.breakTimerText}>⏱ {formattedBreakTimer}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.subtitle}>
            Match all 6 cozy study pairs within {MAX_MOVES} moves. Exceeding {MAX_MOVES} moves automatically deals a fresh board.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statText}>
                Pairs: {matchedPairs} / {STUDY_PAIRS.length}
              </Text>
            </View>
            <View
              style={[
                styles.statPill,
                moves >= MAX_MOVES && styles.statPillWarning,
              ]}
            >
              <Text
                style={[
                  styles.statText,
                  moves >= MAX_MOVES && styles.statTextWarning,
                ]}
              >
                Moves: {Math.min(moves, MAX_MOVES)} / {MAX_MOVES}
              </Text>
            </View>
          </View>

          {shuffleNotice ? (
            <View style={styles.shuffleBanner}>
              <Text style={styles.shuffleBannerText}>{shuffleNotice}</Text>
            </View>
          ) : null}

          {isComplete ? (
            <View style={styles.winBanner}>
              <Text style={styles.winTitle}>🎉 All 6 pairs matched!</Text>
              <Text style={styles.winSub}>
                Returning to your live study room...
              </Text>
            </View>
          ) : null}

          {/* 3 x 4 Grid (12 cards) */}
          <View style={styles.grid}>
            {cards.map((item) => {
              const isRevealed = item.matched || flippedIds.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.tile,
                    isRevealed && styles.tileRevealed,
                    item.matched && styles.tileMatched,
                  ]}
                  onPress={() => handlePressCard(item)}
                >
                  {isRevealed ? (
                    <>
                      <Text style={styles.tileEmoji}>{item.emoji}</Text>
                      <Text style={styles.tileLabel}>{item.label}</Text>
                    </>
                  ) : (
                    <Text style={styles.tileBackMark}>✦</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.52)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.cream,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakTimerPill: {
    backgroundColor: COLORS.coral,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  breakTimerText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.surface,
    fontVariant: ['tabular-nums'],
  },
  statPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  statPillWarning: {
    backgroundColor: COLORS.coralSoft,
    borderColor: COLORS.coral,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  statTextWarning: {
    color: COLORS.coral,
  },
  shuffleBanner: {
    backgroundColor: COLORS.coralSoft,
    borderWidth: 1,
    borderColor: COLORS.coral,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  shuffleBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.coral,
  },
  winBanner: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  winTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.sage,
  },
  winSub: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
  },
  tile: {
    width: '31.5%',
    height: 76,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  tileRevealed: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.coral,
  },
  tileMatched: {
    backgroundColor: COLORS.sageSoft,
    borderColor: COLORS.sage,
  },
  tileBackMark: {
    fontSize: 20,
    color: COLORS.cream,
  },
  tileEmoji: {
    fontSize: 24,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.navy,
  },
});
