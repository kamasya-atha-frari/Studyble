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
  onClose: () => void;
}

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

export function BreakGameModal({ visible, onClose }: BreakGameModalProps) {
  const [cards, setCards] = useState<MemoryCard[]>(() => createShuffledDeck());
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimer = () => {
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPendingTimer();
  }, []);

  const handleRestart = () => {
    clearPendingTimer();
    setCards(createShuffledDeck());
    setFlippedIds([]);
    setMoves(0);
    setIsLocked(false);
  };

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const isComplete = matchedPairs === STUDY_PAIRS.length;

  const handlePressCard = (card: MemoryCard) => {
    if (isLocked || card.matched || flippedIds.includes(card.id)) return;

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length < 2) return;

    setMoves((prev) => prev + 1);
    const firstCard = cards.find((c) => c.id === nextFlipped[0]);
    if (!firstCard) return;

    if (firstCard.pairId === card.pairId) {
      setCards((prev) =>
        prev.map((item) =>
          item.pairId === card.pairId ? { ...item, matched: true } : item
        )
      );
      setFlippedIds([]);
    } else {
      setIsLocked(true);
      clearPendingTimer();
      flipTimerRef.current = setTimeout(() => {
        setFlippedIds([]);
        setIsLocked(false);
        flipTimerRef.current = null;
      }, 650);
    }
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
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Back to Room</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Match all 6 cozy study pairs to refresh your mind. Your active room and timer stay safely intact.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statText}>
                Pairs: {matchedPairs} / {STUDY_PAIRS.length}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statText}>Moves: {moves}</Text>
            </View>
            <Pressable style={styles.resetPill} onPress={handleRestart}>
              <Text style={styles.resetPillText}>Shuffle ↻</Text>
            </Pressable>
          </View>

          {isComplete ? (
            <View style={styles.winBanner}>
              <Text style={styles.winTitle}>🎉 Nice mental reset!</Text>
              <Text style={styles.winSub}>
                You matched all 6 pairs in {moves} moves. Ready for your next focus block?
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

          <View style={styles.footerRow}>
            <Pressable style={styles.secondaryBtn} onPress={handleRestart}>
              <Text style={styles.secondaryBtnText}>Play Again</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={onClose}>
              <Text style={styles.primaryBtnText}>Resume Studying</Text>
            </Pressable>
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
    alignItems: 'flex-start',
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
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  resetPill: {
    marginLeft: 'auto',
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  resetPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
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
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.coral,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
