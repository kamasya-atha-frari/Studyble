import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../theme/tokens';

interface PomodoroDurationModalProps {
  visible: boolean;
  focusMinutes: number;
  secondsLeft: number;
  isRunning: boolean;
  isAlarmFinished?: boolean;
  onSetFocusMinutes: (minutes: number) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onClose: () => void;
}

const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 120;
const POMODORO_ALARM_IMAGE = require('../../assets/pomodoro-alarm.png');

export function PomodoroDurationModal({
  visible,
  focusMinutes,
  secondsLeft,
  isRunning,
  isAlarmFinished = false,
  onSetFocusMinutes,
  onToggleTimer,
  onResetTimer,
  onClose,
}: PomodoroDurationModalProps) {
  const isRinging = isAlarmFinished || secondsLeft === 0;
  const mins = Math.floor(Math.max(0, secondsLeft) / 60);
  const secs = Math.max(0, secondsLeft) % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleStep = (nextMinutes: number) => {
    const clamped = Math.max(
      MIN_FOCUS_MINUTES,
      Math.min(MAX_FOCUS_MINUTES, Math.round(nextMinutes))
    );
    onSetFocusMinutes(clamped);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close Pomodoro settings"
        />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Image
              source={POMODORO_ALARM_IMAGE}
              resizeMode="contain"
              style={styles.mascot}
            />
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>POMODORO TIMER</Text>
              <Text style={styles.title}>Alarm Clock</Text>
            </View>
          </View>

          <View style={styles.stepperRow}>
            <Pressable
              style={[
                styles.stepBtn,
                focusMinutes <= MIN_FOCUS_MINUTES && styles.stepBtnDisabled,
              ]}
              onPress={() => handleStep(focusMinutes - 1)}
              disabled={focusMinutes <= MIN_FOCUS_MINUTES}
              accessibilityRole="button"
              accessibilityLabel="Decrease focus minutes"
            >
              <Text style={styles.stepBtnText}>-</Text>
            </Pressable>

            <View style={styles.readoutBox}>
              <Text
                style={[
                  styles.countdownText,
                  isRinging && styles.countdownTextRinging,
                ]}
              >
                {formattedTimer}
              </Text>
              <Text style={styles.minutesSubText}>{focusMinutes} min</Text>
            </View>

            <Pressable
              style={[
                styles.stepBtn,
                focusMinutes >= MAX_FOCUS_MINUTES && styles.stepBtnDisabled,
              ]}
              onPress={() => handleStep(focusMinutes + 1)}
              disabled={focusMinutes >= MAX_FOCUS_MINUTES}
              accessibilityRole="button"
              accessibilityLabel="Increase focus minutes"
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.controlsRow}>
            <Pressable
              style={[styles.startBtn, isRunning && styles.pauseBtn]}
              onPress={onToggleTimer}
              accessibilityRole="button"
              accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
            >
              <Text style={styles.startBtnText}>
                {isRunning ? 'Pause' : 'Start'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.resetBtn}
              onPress={onResetTimer}
              accessibilityRole="button"
              accessibilityLabel="Reset timer"
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.doneBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close settings modal"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.16)',
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mascot: {
    width: 46,
    height: 46,
    backgroundColor: 'transparent',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.coral,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.cream,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: COLORS.navySoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.38,
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.cream,
    lineHeight: 24,
  },
  readoutBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  countdownText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.cream,
    fontVariant: ['tabular-nums'],
    lineHeight: 40,
  },
  countdownTextRinging: {
    color: COLORS.coral,
  },
  minutesSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startBtn: {
    flex: 1,
    backgroundColor: COLORS.coral,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseBtn: {
    backgroundColor: COLORS.navySoft,
    borderWidth: 1.5,
    borderColor: COLORS.coral,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.surface,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.26)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.cream,
  },
  doneBtn: {
    backgroundColor: COLORS.sage,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.surface,
  },
});
