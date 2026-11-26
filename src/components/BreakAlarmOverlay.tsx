import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { COLORS } from '../theme/tokens';

const POMODORO_ALARM_IMAGE = require('../../assets/pomodoro-alarm.png');

export type BreakAlarmOverlayMode = 'break-cue' | 'back-to-study' | null;

interface BreakAlarmOverlayProps {
  mode: BreakAlarmOverlayMode;
  countdown: number | null;
  onStartNextFocus: () => void;
  onDismiss: () => void;
}

export function BreakAlarmOverlay({
  mode,
  countdown,
  onStartNextFocus,
  onDismiss,
}: BreakAlarmOverlayProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // Block Android hardware back button during the locked 5 -> 1 BREAK TIME countdown
  useEffect(() => {
    if (mode !== 'break-cue') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [mode]);

  // Trigger device vibration when the 5-minute break ends ("Small progress is still progress")
  useEffect(() => {
    if (mode !== 'back-to-study') return;
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 350, 200, 350, 200, 350]);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 400, 400]);
      } else {
        Vibration.vibrate(400);
      }
    } catch {
      // Ignore vibration failures on unsupported platforms/simulators
    }

    return () => {
      try {
        Vibration.cancel();
      } catch {
        // Ignore cancel errors
      }
    };
  }, [mode]);

  // Run large scale-up + fast left-right shake + rapid vertical hopping while active
  useEffect(() => {
    if (!mode) {
      rotateAnim.stopAnimation();
      jumpAnim.stopAnimation();
      scaleAnim.stopAnimation();
      rotateAnim.setValue(0);
      jumpAnim.setValue(0);
      scaleAnim.setValue(0.85);
      return;
    }

    rotateAnim.setValue(0);
    jumpAnim.setValue(0);
    scaleAnim.setValue(0.85);

    const scaleSequence = Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.08,
        friction: 5,
        tension: 110,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 280,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.03,
            duration: 280,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 18,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -18,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    const hopLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(jumpAnim, {
          toValue: -20,
          duration: 115,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(jumpAnim, {
          toValue: 0,
          duration: 115,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(jumpAnim, {
          toValue: -12,
          duration: 95,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(jumpAnim, {
          toValue: 0,
          duration: 95,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const combined = Animated.parallel([scaleSequence, shakeLoop, hopLoop]);
    combined.start();

    return () => {
      combined.stop();
    };
  }, [mode, rotateAnim, jumpAnim, scaleAnim]);

  if (!mode) return null;

  const rotateDeg = rotateAnim.interpolate({
    inputRange: [-18, 18],
    outputRange: ['-18deg', '18deg'],
  });

  const isBreakCue = mode === 'break-cue';

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.overlay]}
      pointerEvents="auto"
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <View style={styles.content}>
        <Animated.Image
          source={POMODORO_ALARM_IMAGE}
          resizeMode="contain"
          style={[
            styles.mascotImage,
            {
              transform: [
                { translateY: jumpAnim },
                { scale: scaleAnim },
                { rotate: rotateDeg },
              ],
            },
          ]}
        />

        {isBreakCue ? (
          <View style={styles.copyBlock}>
            <Text style={styles.breakTimeTitle}>BREAK TIME</Text>
            <Text style={styles.countdownNumber}>{countdown ?? 1}</Text>
          </View>
        ) : (
          <View style={styles.copyBlock}>
            <Text style={styles.breakFinishedTitle}>
              Small progress is still progress
            </Text>
            <Text style={styles.breakFinishedSub}>
              Your 5-minute break is finished — ready for your next focus session?
            </Text>

            <View style={styles.actionRow}>
              <Pressable
                style={styles.dismissBtn}
                onPress={onDismiss}
                accessibilityRole="button"
                accessibilityLabel="Dismiss break finished alarm"
              >
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </Pressable>
              <Pressable
                style={styles.startNextBtn}
                onPress={onStartNextFocus}
                accessibilityRole="button"
                accessibilityLabel="Start next focus session"
              >
                <Text style={styles.startNextBtnText}>Start Next Focus</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 24,
    backgroundColor: 'transparent',
  },
  mascotImage: {
    width: 220,
    height: 220,
    backgroundColor: 'transparent',
  },
  copyBlock: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  breakTimeTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
    color: COLORS.cream,
    textAlign: 'center',
  },
  countdownNumber: {
    fontSize: 78,
    fontWeight: '900',
    color: COLORS.coral,
    lineHeight: 84,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  breakFinishedTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.cream,
    textAlign: 'center',
    lineHeight: 36,
  },
  breakFinishedSub: {
    fontSize: 15,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    width: '100%',
    maxWidth: 320,
  },
  dismissBtn: {
    flex: 1,
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.28)',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.cream,
  },
  startNextBtn: {
    flex: 1.4,
    backgroundColor: COLORS.coral,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  startNextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.surface,
  },
});
