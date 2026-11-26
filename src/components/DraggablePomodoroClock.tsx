import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
} from 'react-native';

const POMODORO_ALARM_IMAGE = require('../../assets/pomodoro-alarm.png');
const DRAG_THRESHOLD_PX = 10;
const DOUBLE_TAP_WINDOW_MS = 320;
const EDGE_MARGIN = 12;

export interface ContainerBounds {
  width: number;
  height: number;
}

interface DraggablePomodoroClockProps {
  size?: number;
  zIndex?: number;
  initialCorner?: 'bottom-left' | 'bottom-right';
  containerBounds: ContainerBounds;
  isRunning: boolean;
  isAlarmRinging: boolean;
  onSingleTap: () => void;
  onDoubleTap: () => void;
  accessibilityLabel?: string;
}

export function DraggablePomodoroClock({
  size = 100,
  zIndex = 50,
  initialCorner = 'bottom-left',
  containerBounds,
  isRunning,
  isAlarmRinging,
  onSingleTap,
  onDoubleTap,
  accessibilityLabel,
}: DraggablePomodoroClockProps) {
  const mascotRotateAnim = useRef(new Animated.Value(0)).current;
  const mascotJumpAnim = useRef(new Animated.Value(0)).current;
  const mascotPressScale = useRef(new Animated.Value(1)).current;

  const boundsRef = useRef<ContainerBounds>(containerBounds);
  boundsRef.current = containerBounds;

  const sizeRef = useRef<number>(size);
  sizeRef.current = size;

  const onSingleTapRef = useRef(onSingleTap);
  onSingleTapRef.current = onSingleTap;

  const onDoubleTapRef = useRef(onDoubleTap);
  onDoubleTapRef.current = onDoubleTap;

  const clampPosition = (x: number, y: number) => {
    const currentSize = sizeRef.current;
    const maxX = Math.max(
      EDGE_MARGIN,
      boundsRef.current.width - currentSize - EDGE_MARGIN
    );
    const maxY = Math.max(
      EDGE_MARGIN,
      boundsRef.current.height - currentSize - EDGE_MARGIN
    );
    return {
      x: Math.min(maxX, Math.max(EDGE_MARGIN, x)),
      y: Math.min(maxY, Math.max(EDGE_MARGIN, y)),
    };
  };

  const computeDefaultPos = () => {
    const defaultX =
      initialCorner === 'bottom-right'
        ? boundsRef.current.width - size - EDGE_MARGIN - 4
        : EDGE_MARGIN + 4;
    const defaultY = boundsRef.current.height - size - 20;
    return clampPosition(defaultX, defaultY);
  };

  const initialPos = computeDefaultPos();
  const clockPan = useRef(new Animated.ValueXY(initialPos)).current;
  const clockPosRef = useRef(initialPos);
  const initializedFromMeasuredBoundsRef = useRef(false);

  const dragStartPosRef = useRef(initialPos);
  const hasDraggedRef = useRef(false);
  const lastTapAtRef = useRef<number>(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSingleTapTimer = () => {
    if (singleTapTimerRef.current !== null) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearSingleTapTimer();
    };
  }, []);

  // Initialize once container has measured layout, and clamp on subsequent resizes
  useEffect(() => {
    if (containerBounds.width <= 0 || containerBounds.height <= 0) return;

    if (!initializedFromMeasuredBoundsRef.current) {
      initializedFromMeasuredBoundsRef.current = true;
      const startPos = computeDefaultPos();
      clockPosRef.current = startPos;
      clockPan.setValue(startPos);
      return;
    }

    const clamped = clampPosition(
      clockPosRef.current.x,
      clockPosRef.current.y
    );
    clockPosRef.current = clamped;
    clockPan.setValue(clamped);
  }, [containerBounds.width, containerBounds.height]);

  // Rocking animation (calmer when paused, livelier when running, energetic shake+hop when ringing)
  useEffect(() => {
    mascotRotateAnim.stopAnimation();
    mascotJumpAnim.stopAnimation();

    if (isAlarmRinging) {
      mascotRotateAnim.setValue(0);
      mascotJumpAnim.setValue(0);

      const shakeLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(mascotRotateAnim, {
            toValue: 18,
            duration: 65,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(mascotRotateAnim, {
            toValue: -18,
            duration: 130,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(mascotRotateAnim, {
            toValue: 0,
            duration: 65,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );

      const hopLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(mascotJumpAnim, {
            toValue: -10,
            duration: 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(mascotJumpAnim, {
            toValue: 0,
            duration: 110,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

      const combined = Animated.parallel([shakeLoop, hopLoop]);
      combined.start();

      return () => {
        combined.stop();
      };
    }

    mascotJumpAnim.setValue(0);
    mascotRotateAnim.setValue(0);

    const swayAngle = isRunning ? 12 : 7;
    const swayDuration = isRunning ? 260 : 480;

    const wiggleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotRotateAnim, {
          toValue: swayAngle,
          duration: swayDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(mascotRotateAnim, {
          toValue: -swayAngle,
          duration: swayDuration * 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(mascotRotateAnim, {
          toValue: 0,
          duration: swayDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    wiggleLoop.start();

    return () => {
      wiggleLoop.stop();
    };
  }, [isAlarmRinging, isRunning, mascotRotateAnim, mascotJumpAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) =>
        Math.hypot(gestureState.dx, gestureState.dy) > DRAG_THRESHOLD_PX,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.hypot(gestureState.dx, gestureState.dy) > DRAG_THRESHOLD_PX,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        hasDraggedRef.current = false;
        dragStartPosRef.current = { ...clockPosRef.current };
        Animated.spring(mascotPressScale, {
          toValue: 0.91,
          friction: 7,
          tension: 190,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_evt, gestureState) => {
        const movedDistance = Math.hypot(gestureState.dx, gestureState.dy);
        if (!hasDraggedRef.current && movedDistance > DRAG_THRESHOLD_PX) {
          hasDraggedRef.current = true;
          clearSingleTapTimer();
          lastTapAtRef.current = 0;
        }
        if (hasDraggedRef.current) {
          const next = clampPosition(
            dragStartPosRef.current.x + gestureState.dx,
            dragStartPosRef.current.y + gestureState.dy
          );
          clockPosRef.current = next;
          clockPan.setValue(next);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        Animated.spring(mascotPressScale, {
          toValue: 1,
          friction: 6,
          tension: 170,
          useNativeDriver: true,
        }).start();

        const movedDistance = Math.hypot(gestureState.dx, gestureState.dy);
        const wasTap = !hasDraggedRef.current && movedDistance <= DRAG_THRESHOLD_PX;
        hasDraggedRef.current = false;

        if (!wasTap) {
          clearSingleTapTimer();
          lastTapAtRef.current = 0;
          return;
        }

        const now = Date.now();
        if (
          lastTapAtRef.current > 0 &&
          now - lastTapAtRef.current <= DOUBLE_TAP_WINDOW_MS
        ) {
          clearSingleTapTimer();
          lastTapAtRef.current = 0;
          onDoubleTapRef.current();
          return;
        }

        lastTapAtRef.current = now;
        clearSingleTapTimer();
        singleTapTimerRef.current = setTimeout(() => {
          singleTapTimerRef.current = null;
          lastTapAtRef.current = 0;
          onSingleTapRef.current();
        }, DOUBLE_TAP_WINDOW_MS);
      },
      onPanResponderTerminate: () => {
        Animated.spring(mascotPressScale, {
          toValue: 1,
          friction: 6,
          tension: 170,
          useNativeDriver: true,
        }).start();
        hasDraggedRef.current = false;
      },
    })
  ).current;

  const mascotRotateDeg = mascotRotateAnim.interpolate({
    inputRange: [-18, 18],
    outputRange: ['-18deg', '18deg'],
  });

  return (
    <Animated.View
      collapsable={false}
      pointerEvents="box-only"
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          zIndex,
          elevation: zIndex,
        },
        clockPan.getLayout(),
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (isRunning
          ? 'Pomodoro alarm clock running. Single tap to pause, double tap for timer controls, or drag to move.'
          : 'Pomodoro alarm clock paused. Single tap to start, double tap for timer controls, or drag to move.')
      }
      {...panResponder.panHandlers}
    >
      <Animated.Image
        pointerEvents="none"
        source={POMODORO_ALARM_IMAGE}
        resizeMode="contain"
        style={[
          styles.image,
          {
            width: size,
            height: size,
            transform: [
              { translateY: mascotJumpAnim },
              { scale: mascotPressScale },
              { rotate: mascotRotateDeg },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
