import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { registerNativeAudioAdapter } from './src/audio/ambientAudioEngine';
import {
  BreakAlarmOverlay,
  BreakAlarmOverlayMode,
} from './src/components/BreakAlarmOverlay';
import { BreakGameModal } from './src/components/BreakGameModal';
import { LiveRoomScreen } from './src/screens/LiveRoomScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { QnAScreen } from './src/screens/QnAScreen';
import { QuestionDetailScreen } from './src/screens/QuestionDetailScreen';
import { RoomsScreen } from './src/screens/RoomsScreen';
import {
  INITIAL_PROFILE,
  INITIAL_QUESTIONS,
  INITIAL_ROOMS,
  VERIFIED_VOTE_THRESHOLD,
  loadBreakEndAtMs,
  loadStudybleData,
  resetStudybleData,
  saveBreakEndAtMs,
  saveProfile,
  saveQuestions,
  saveRooms,
} from './src/storage/storage';
import { COLORS } from './src/theme/tokens';
import {
  ActiveLiveAnswer,
  ActiveLiveQuestion,
  AmbientMixerState,
  LiveMessageKind,
  LiveVoteChoice,
  QuestionItem,
  StudyMode,
  StudyProfileState,
  StudyRoom,
} from './src/types/studyble';
import {
  DAILY_VERIFIED_LIMIT_LOW_LEVEL,
  PRIVATE_CHAT_COOLDOWN_MS,
  PRIVATE_HELP_REWARD_POINTS,
  QNA_VERIFIED_ANSWER_POINTS,
  VerificationResult,
  getLocalDateKey,
  getPeerCooldownRemainingMs,
  getProgressionInfo,
  getTodayVerifiedCount,
  isSubjectToDailyVerifiedCap,
} from './src/utils/progression';

type RootTabParamList = {
  RoomsTab: undefined;
  QnATab: undefined;
  ProfileTab: undefined;
};

type RoomsStackParamList = {
  RoomsList: undefined;
  LiveRoom: { roomId: string };
};

type QnAStackParamList = {
  QnAList: undefined;
  QuestionDetail: { questionId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const RoomsStack = createNativeStackNavigator<RoomsStackParamList>();
const QnAStack = createNativeStackNavigator<QnAStackParamList>();

const BREAK_DURATION_SECONDS = 5 * 60;
const BREAK_CUE_SECONDS = 5;
const LIVE_ANSWER_VOTE_DURATION_MS = 30 * 1000;
const BASE_TAB_BAR_STYLE = {
  backgroundColor: COLORS.surface,
  borderTopColor: COLORS.border,
} as const;

registerNativeAudioAdapter({
  async createLoopingPlayer(source, initialVolume) {
    const player = createAudioPlayer(source);
    player.loop = true;
    player.volume = initialVolume;
    return {
      play: () => player.play(),
      pause: () => player.pause(),
      setVolume: (vol) => {
        player.volume = vol;
      },
      release: () => {
        try {
          player.loop = false;
          player.pause();
          player.volume = 0;
        } finally {
          player.remove();
        }
      },
    };
  },
});

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rooms, setRooms] = useState<StudyRoom[]>(INITIAL_ROOMS);
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_QUESTIONS);
  const [profile, setProfile] = useState<StudyProfileState>(INITIAL_PROFILE);

  // Shared Pomodoro timer state synced across Home (RoomsScreen) and Join Live (LiveRoomScreen)
  const focusMinutes = Math.max(1, profile.defaultFocusMinutes);
  const [secondsLeft, setSecondsLeft] = useState<number>(
    INITIAL_PROFILE.defaultFocusMinutes * 60
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isAlarmFinished, setIsAlarmFinished] = useState<boolean>(false);

  // Full-screen BREAK TIME lock (5 -> 1), 5-minute wall-clock break timer, and break-finished alarm ("Small progress is still progress")
  const [breakCueCountdown, setBreakCueCountdown] = useState<number | null>(null);
  const [breakEndAtMs, setBreakEndAtMs] = useState<number | null>(null);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState<number>(0);
  const [isBreakFinished, setIsBreakFinished] = useState<boolean>(false);
  const [breakGameOpen, setBreakGameOpen] = useState<boolean>(false);

  const breakEndAtMsRef = useRef<number | null>(breakEndAtMs);
  useEffect(() => {
    breakEndAtMsRef.current = breakEndAtMs;
  }, [breakEndAtMs]);

  const profileRef = useRef<StudyProfileState>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const roomsRef = useRef<StudyRoom[]>(rooms);
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [data, persistedBreakEndAtMs] = await Promise.all([
        loadStudybleData(),
        loadBreakEndAtMs(),
      ]);
      if (!active) return;
      setRooms(data.rooms);
      setQuestions(data.questions);
      // Always start with camera OFF ('avatar') on app startup
      const loadedProfile: StudyProfileState = {
        ...data.profile,
        studyMode: 'avatar',
      };
      setProfile(loadedProfile);
      setSecondsLeft(Math.max(1, loadedProfile.defaultFocusMinutes) * 60);
      setIsRunning(false);
      setIsAlarmFinished(false);

      if (persistedBreakEndAtMs !== null) {
        const remaining = Math.ceil((persistedBreakEndAtMs - Date.now()) / 1000);
        if (remaining > 0) {
          setBreakEndAtMs(persistedBreakEndAtMs);
          setBreakSecondsLeft(remaining);
          setIsBreakFinished(false);
        } else {
          // 5-minute break already elapsed while app was closed/backgrounded
          void saveBreakEndAtMs(null);
          setBreakEndAtMs(null);
          setBreakSecondsLeft(0);
          setIsBreakFinished(true);
        }
      }

      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleEnterLiveRoom = useCallback((roomId: string) => {
    setRooms((prev) => {
      const updated = prev.map((room) => {
        if (room.id !== roomId || room.isJoined) return room;
        return {
          ...room,
          isJoined: true,
          activeStudents: room.activeStudents + 1,
        };
      });
      void saveRooms(updated);
      return updated;
    });
  }, []);

  const handleCreateInterestRoom = useCallback(
    (title: string, coverImageUrl?: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;

      const newRoom: StudyRoom = {
        id: `room-interest-${Date.now()}`,
        title: cleanTitle,
        category: 'Interest',
        coverImageUrl,
        activeStudents: 1,
        focusMinutes: Math.max(1, profileRef.current.defaultFocusMinutes),
        isJoined: false,
        participants: [],
        messages: [],
      };

      setRooms((prev) => {
        const updated = [...prev, newRoom];
        roomsRef.current = updated;
        void saveRooms(updated);
        return updated;
      });
    },
    []
  );

  const handleLeaveRoom = useCallback((roomId: string) => {
    setRooms((prev) => {
      const updated = prev.map((room) => {
        if (room.id !== roomId || !room.isJoined) return room;
        return {
          ...room,
          isJoined: false,
          activeStudents: Math.max(0, room.activeStudents - 1),
        };
      });
      void saveRooms(updated);
      return updated;
    });
  }, []);

  const handleSendLiveMessage = useCallback(
    (roomId: string, text: string, kind: LiveMessageKind = 'question') => {
      setRooms((prev) => {
        const now = Date.now();
        const msgId = `m-${now}`;
        const senderName = profileRef.current.studentName;
        const updated = prev.map((room) => {
          if (room.id !== roomId) return room;
          const nextQuestion: ActiveLiveQuestion | null | undefined =
            kind === 'question'
              ? {
                  id: msgId,
                  roomId,
                  askerName: senderName,
                  text,
                  createdAt: 'Just now',
                }
              : room.activeLiveQuestion;
          const nextAnswer: ActiveLiveAnswer | null | undefined =
            kind === 'question' &&
            room.activeLiveAnswer &&
            room.activeLiveAnswer.status !== 'voting'
              ? null
              : room.activeLiveAnswer;

          return {
            ...room,
            activeLiveQuestion: nextQuestion,
            activeLiveAnswer: nextAnswer,
            messages: [
              {
                id: msgId,
                sender: senderName,
                text,
                kind: 'question' as LiveMessageKind,
                votes: 1,
                hasVoted: true,
                verified: false,
                createdAt: 'Just now',
                createdAtMs: now,
              },
              ...room.messages,
            ],
          };
        });
        roomsRef.current = updated;
        void saveRooms(updated);
        return updated;
      });
    },
    []
  );

  const handleSubmitLiveAnswer = useCallback(
    (roomId: string, questionId: string, answerText: string) => {
      const clean = answerText.trim();
      if (!clean) return;

      const now = Date.now();
      const answererName = profileRef.current.studentName;

      setRooms((prev) => {
        const updated = prev.map((room) => {
          if (room.id !== roomId) return room;
          const activeQ = room.activeLiveQuestion;
          if (!activeQ || activeQ.id !== questionId) return room;

          const newAnswer: ActiveLiveAnswer = {
            id: `ans-${now}`,
            roomId,
            questionId: activeQ.id,
            questionText: activeQ.text,
            askerName: activeQ.askerName,
            answererName,
            answererIsSelf: true,
            text: clean,
            upVotes: 0,
            downVotes: 0,
            userVote: null,
            voteEndsAtMs: now + LIVE_ANSWER_VOTE_DURATION_MS,
            status: 'voting',
            pointAwarded: false,
          };

          const hasQuestionMsg = room.messages.some((m) => m.id === activeQ.id);
          const nextMessages = hasQuestionMsg
            ? room.messages.map((m) =>
                m.id === activeQ.id
                  ? {
                      ...m,
                      answerText: clean,
                      answererName,
                      createdAtMs: now,
                    }
                  : m
              )
            : [
                {
                  id: activeQ.id,
                  sender: activeQ.askerName,
                  text: activeQ.text,
                  kind: 'question' as LiveMessageKind,
                  votes: 1,
                  hasVoted: false,
                  verified: false,
                  answerText: clean,
                  answererName,
                  createdAt: 'Just now',
                  createdAtMs: now,
                },
                ...room.messages,
              ];

          return {
            ...room,
            activeLiveQuestion: null,
            activeLiveAnswer: newAnswer,
            messages: nextMessages,
          };
        });
        roomsRef.current = updated;
        void saveRooms(updated);
        return updated;
      });
    },
    []
  );

  const handleVoteLiveAnswer = useCallback(
    (roomId: string, answerId: string, choice: LiveVoteChoice) => {
      setRooms((prev) => {
        const updated = prev.map((room) => {
          if (room.id !== roomId) return room;
          const ans = room.activeLiveAnswer;
          if (!ans || ans.id !== answerId || ans.status !== 'voting') {
            return room;
          }

          let upVotes = ans.upVotes;
          let downVotes = ans.downVotes;
          let nextVote: LiveVoteChoice | null = choice;

          if (ans.userVote === choice) {
            // Toggle off existing vote
            if (choice === 'up') upVotes = Math.max(0, upVotes - 1);
            else downVotes = Math.max(0, downVotes - 1);
            nextVote = null;
          } else {
            // Remove previous vote if switching sides
            if (ans.userVote === 'up') upVotes = Math.max(0, upVotes - 1);
            if (ans.userVote === 'down') downVotes = Math.max(0, downVotes - 1);
            // Apply new vote
            if (choice === 'up') upVotes += 1;
            else downVotes += 1;
          }

          return {
            ...room,
            activeLiveAnswer: {
              ...ans,
              upVotes,
              downVotes,
              userVote: nextVote,
            },
          };
        });
        void saveRooms(updated);
        return updated;
      });
    },
    []
  );

  const handleDismissLiveAnswer = useCallback((roomId: string) => {
    setRooms((prev) => {
      const updated = prev.map((room) => {
        if (room.id !== roomId) return room;
        if (!room.activeLiveAnswer || room.activeLiveAnswer.status === 'voting') {
          return room;
        }
        return {
          ...room,
          activeLiveAnswer: null,
        };
      });
      void saveRooms(updated);
      return updated;
    });
  }, []);

  // Resolve any active 30-second live answer vote once its countdown ends
  const hasVotingLiveAnswer = rooms.some(
    (r) => r.activeLiveAnswer?.status === 'voting'
  );

  useEffect(() => {
    if (!hasVotingLiveAnswer) return;

    const resolveExpiredVotes = () => {
      const now = Date.now();
      const currentRooms = roomsRef.current;
      const currentProfile = profileRef.current;
      const level = getProgressionInfo(currentProfile.points).level;
      let runningTodayCount = getTodayVerifiedCount(
        currentProfile.dailyVerifiedDate,
        currentProfile.dailyVerifiedCount
      );

      let changed = false;
      let pointsDelta = 0;
      const newlyVerifiedKeys: string[] = [];

      const updatedRooms = currentRooms.map((room) => {
        const ans = room.activeLiveAnswer;
        if (!ans || ans.status !== 'voting' || now < ans.voteEndsAtMs) {
          return room;
        }

        changed = true;
        const isAccepted = ans.upVotes > ans.downVotes;

        if (!isAccepted) {
          // Downvoted / Discarded: keep visible in history with grayed-out style & +0 pts
          const discardedNote = 'Downvoted · Discarded (+0 pts)';
          const hasQuestionMsg = room.messages.some(
            (m) => m.id === ans.questionId
          );
          const nextMessages = hasQuestionMsg
            ? room.messages.map((m) =>
                m.id === ans.questionId
                  ? {
                      ...m,
                      status: 'discarded' as const,
                      verified: false,
                      answerText: ans.text,
                      answererName: ans.answererName,
                      upVotes: ans.upVotes,
                      downVotes: ans.downVotes,
                      resolutionNote: discardedNote,
                      createdAtMs: now,
                    }
                  : m
              )
            : [
                {
                  id: ans.questionId || `m-discarded-${ans.id}`,
                  sender: ans.askerName,
                  text: ans.questionText,
                  kind: 'question' as LiveMessageKind,
                  votes: ans.upVotes,
                  hasVoted: false,
                  verified: false,
                  status: 'discarded' as const,
                  answerText: ans.text,
                  answererName: ans.answererName,
                  upVotes: ans.upVotes,
                  downVotes: ans.downVotes,
                  resolutionNote: discardedNote,
                  createdAt: 'Just now',
                  createdAtMs: now,
                },
                ...room.messages,
              ];

          return {
            ...room,
            activeLiveAnswer: {
              ...ans,
              status: 'discarded' as const,
              pointAwarded: false,
              resolutionNote: discardedNote,
            },
            messages: nextMessages,
          };
        }

        // Accepted (upVotes > downVotes): keep in history & archive, award +1 pt subject to daily cap
        const itemKey = `live-answer:${room.id}:${ans.id}`;
        const alreadyVerified =
          currentProfile.verifiedItemIds.includes(itemKey) ||
          newlyVerifiedKeys.includes(itemKey);
        const cappedForToday =
          isSubjectToDailyVerifiedCap(level) &&
          runningTodayCount >= DAILY_VERIFIED_LIMIT_LOW_LEVEL;

        let pointAwarded = false;
        let resolutionNote = 'Accepted · Ready to use';

        if (ans.answererIsSelf && !alreadyVerified && !cappedForToday) {
          pointAwarded = true;
          pointsDelta += QNA_VERIFIED_ANSWER_POINTS;
          runningTodayCount += 1;
          newlyVerifiedKeys.push(itemKey);
          resolutionNote = `Accepted · Ready to use (+${QNA_VERIFIED_ANSWER_POINTS} pt)`;
        } else if (ans.answererIsSelf && cappedForToday) {
          resolutionNote = `Accepted · Daily verified limit (${DAILY_VERIFIED_LIMIT_LOW_LEVEL}/${DAILY_VERIFIED_LIMIT_LOW_LEVEL} for Lv.1–10) reached (+0 pts)`;
        }

        const hasQuestionMsg = room.messages.some(
          (m) => m.id === ans.questionId
        );
        const nextMessages = hasQuestionMsg
          ? room.messages.map((m) =>
              m.id === ans.questionId
                ? {
                    ...m,
                    status: 'accepted' as const,
                    verified: true,
                    votes: Math.max(VERIFIED_VOTE_THRESHOLD, ans.upVotes),
                    answerText: ans.text,
                    answererName: ans.answererName,
                    upVotes: ans.upVotes,
                    downVotes: ans.downVotes,
                    resolutionNote,
                    createdAtMs: now,
                  }
                : m
            )
          : [
              {
                id: ans.questionId || `m-verified-${ans.id}`,
                sender: ans.askerName,
                text: ans.questionText,
                kind: 'question' as LiveMessageKind,
                votes: Math.max(VERIFIED_VOTE_THRESHOLD, ans.upVotes),
                hasVoted: true,
                verified: true,
                status: 'accepted' as const,
                answerText: ans.text,
                answererName: ans.answererName,
                upVotes: ans.upVotes,
                downVotes: ans.downVotes,
                resolutionNote,
                createdAt: 'Verified',
                createdAtMs: now,
              },
              ...room.messages,
            ];

        return {
          ...room,
          activeLiveAnswer: {
            ...ans,
            status: 'accepted' as const,
            pointAwarded,
            resolutionNote,
          },
          messages: nextMessages,
        };
      });

      if (!changed) return;

      roomsRef.current = updatedRooms;
      setRooms(updatedRooms);
      void saveRooms(updatedRooms);

      if (pointsDelta > 0 || newlyVerifiedKeys.length > 0) {
        const todayKey = getLocalDateKey();
        const prevToday = getTodayVerifiedCount(
          currentProfile.dailyVerifiedDate,
          currentProfile.dailyVerifiedCount
        );
        const nextProfile: StudyProfileState = {
          ...currentProfile,
          points: currentProfile.points + pointsDelta,
          dailyVerifiedDate: todayKey,
          dailyVerifiedCount: prevToday + newlyVerifiedKeys.length,
          verifiedItemIds: Array.from(
            new Set([...currentProfile.verifiedItemIds, ...newlyVerifiedKeys])
          ),
        };
        profileRef.current = nextProfile;
        setProfile(nextProfile);
        void saveProfile(nextProfile);
      }
    };

    resolveExpiredVotes();
    const intervalId = setInterval(resolveExpiredVotes, 500);
    return () => clearInterval(intervalId);
  }, [hasVotingLiveAnswer]);

  const handleToggleLiveVote = useCallback((roomId: string, messageId: string) => {
    setRooms((prev) => {
      const updated = prev.map((room) => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          messages: room.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
            const nextVoted = !msg.hasVoted;
            const nextVotes = Math.max(0, msg.votes + (nextVoted ? 1 : -1));
            return {
              ...msg,
              hasVoted: nextVoted,
              votes: nextVotes,
              verified: nextVotes >= VERIFIED_VOTE_THRESHOLD,
            };
          }),
        };
      });
      void saveRooms(updated);
      return updated;
    });
  }, []);

  const handleSessionComplete = useCallback((minutes: number) => {
    const earnedMinutes = Math.max(1, Math.floor(minutes));
    setProfile((prev) => {
      const updatedProfile: StudyProfileState = {
        ...prev,
        completedSessions: prev.completedSessions + 1,
        completedFocusMinutes: prev.completedFocusMinutes + earnedMinutes,
      };
      void saveProfile(updatedProfile);
      return updatedProfile;
    });
  }, []);

  // Shared Pomodoro countdown interval
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Trigger full-screen locked BREAK TIME 5 -> 1 countdown when focus timer hits 00:00 (0 points)
  useEffect(() => {
    if (!isRunning || secondsLeft > 0) return;
    setIsRunning(false);
    setIsAlarmFinished(true);
    setIsBreakFinished(false);
    setBreakGameOpen(false);
    setBreakCueCountdown(BREAK_CUE_SECONDS);
    handleSessionComplete(focusMinutes);
  }, [isRunning, secondsLeft, focusMinutes, handleSessionComplete]);

  // Tick locked BREAK TIME 5 -> 1 countdown every 1 second
  const isBreakCueActive = breakCueCountdown !== null && breakCueCountdown > 0;
  useEffect(() => {
    if (!isBreakCueActive) return;
    const intervalId = setInterval(() => {
      setBreakCueCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isBreakCueActive]);

  // Transition automatically to BreakGameModal + wall-clock 5-minute break timer once 5 -> 1 finishes
  useEffect(() => {
    if (breakCueCountdown !== 0) return;
    const endAtMs = Date.now() + BREAK_DURATION_SECONDS * 1000;
    setBreakCueCountdown(null);
    setIsAlarmFinished(false);
    setSecondsLeft(focusMinutes * 60);
    setBreakEndAtMs(endAtMs);
    setBreakSecondsLeft(BREAK_DURATION_SECONDS);
    setIsBreakFinished(false);
    setBreakGameOpen(true);
    void saveBreakEndAtMs(endAtMs);
  }, [breakCueCountdown, focusMinutes]);

  const syncBreakTimerWithWallClock = useCallback(() => {
    const targetEndAt = breakEndAtMsRef.current;
    if (targetEndAt === null) return;
    const remaining = Math.ceil((targetEndAt - Date.now()) / 1000);
    if (remaining <= 0) {
      breakEndAtMsRef.current = null;
      setBreakEndAtMs(null);
      setBreakSecondsLeft(0);
      setBreakGameOpen(false);
      setIsBreakFinished(true);
      void saveBreakEndAtMs(null);
    } else {
      setBreakSecondsLeft(remaining);
    }
  }, []);

  // Tick 5-minute break timer against real wall clock while active
  useEffect(() => {
    if (breakEndAtMs === null) return;
    syncBreakTimerWithWallClock();
    const intervalId = setInterval(syncBreakTimerWithWallClock, 1000);
    return () => clearInterval(intervalId);
  }, [breakEndAtMs, syncBreakTimerWithWallClock]);

  // Recalculate remaining break time immediately when returning to Expo Go from another app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncBreakTimerWithWallClock();
      }
    });
    return () => subscription.remove();
  }, [syncBreakTimerWithWallClock]);

  const handleCloseBreakGame = useCallback(() => {
    setBreakGameOpen(false);
  }, []);

  const handleOpenBreakGame = useCallback(() => {
    setBreakGameOpen(true);
  }, []);

  const handleDismissBreakAlarm = useCallback(() => {
    setIsBreakFinished(false);
    setIsAlarmFinished(false);
    setIsRunning(false);
    setSecondsLeft(focusMinutes * 60);
  }, [focusMinutes]);

  const handleStartNextFocusAfterBreak = useCallback(() => {
    setIsBreakFinished(false);
    setIsAlarmFinished(false);
    setSecondsLeft(focusMinutes * 60);
    setIsRunning(true);
  }, [focusMinutes]);

  const handleSetFocusMinutes = useCallback((mins: number) => {
    const clamped = Math.max(1, Math.min(120, Math.round(mins)));
    setProfile((prev) => {
      const updated: StudyProfileState = {
        ...prev,
        defaultFocusMinutes: clamped,
      };
      void saveProfile(updated);
      return updated;
    });
    setIsRunning(false);
    setIsAlarmFinished(false);
    setBreakCueCountdown(null);
    setSecondsLeft(clamped * 60);
  }, []);

  const handleToggleTimer = useCallback(() => {
    if (breakCueCountdown !== null) return;

    if (isAlarmFinished) {
      setIsAlarmFinished(false);
      setIsRunning(false);
      setSecondsLeft(focusMinutes * 60);
      return;
    }

    if (secondsLeft <= 0) {
      setSecondsLeft(focusMinutes * 60);
      setIsRunning(true);
      return;
    }

    setIsRunning((prev) => !prev);
  }, [breakCueCountdown, isAlarmFinished, secondsLeft, focusMinutes]);

  const handleResetTimer = useCallback(() => {
    if (breakCueCountdown !== null) return;
    setIsRunning(false);
    setIsAlarmFinished(false);
    setSecondsLeft(focusMinutes * 60);
  }, [breakCueCountdown, focusMinutes]);

  const handleUpdateAmbientMixer = useCallback((ambientMixer: AmbientMixerState) => {
    setProfile((prev) => {
      const updated: StudyProfileState = { ...prev, ambientMixer };
      void saveProfile(updated);
      return updated;
    });
  }, []);

  const handleChangeStudyMode = useCallback((studyMode: StudyMode) => {
    setProfile((prev) => {
      if (prev.studyMode === studyMode) return prev;
      const updated: StudyProfileState = { ...prev, studyMode };
      void saveProfile(updated);
      return updated;
    });
  }, []);

  const handleCompletePrivateHelp = useCallback(
    (peerId: string, answerId: string): VerificationResult => {
      const now = Date.now();
      const current = profileRef.current;
      const itemKey = `private:${peerId}:${answerId}`;
      const todayKey = getLocalDateKey();
      const todayCount = getTodayVerifiedCount(
        current.dailyVerifiedDate,
        current.dailyVerifiedCount
      );

      // Once-per-person verification guard
      if (current.verifiedItemIds.includes(itemKey)) {
        return {
          awarded: false,
          reason: 'already_verified',
          remainingMs: 0,
          todayCount,
        };
      }

      const remainingMs = getPeerCooldownRemainingMs(
        current.privateChatCooldowns,
        peerId,
        now
      );

      if (remainingMs > 0) {
        return {
          awarded: false,
          reason: 'cooldown',
          remainingMs,
          todayCount,
        };
      }

      // Daily verified answer limit (max 2/day) for Levels 1-10
      const level = getProgressionInfo(current.points).level;
      if (
        isSubjectToDailyVerifiedCap(level) &&
        todayCount >= DAILY_VERIFIED_LIMIT_LOW_LEVEL
      ) {
        return {
          awarded: false,
          reason: 'daily_limit',
          remainingMs: 0,
          todayCount,
        };
      }

      const nextTodayCount = todayCount + 1;
      const updatedProfile: StudyProfileState = {
        ...current,
        points: current.points + PRIVATE_HELP_REWARD_POINTS,
        privateChatCooldowns: {
          ...current.privateChatCooldowns,
          [peerId]: now,
        },
        dailyVerifiedDate: todayKey,
        dailyVerifiedCount: nextTodayCount,
        verifiedItemIds: [...current.verifiedItemIds, itemKey],
      };
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);
      void saveProfile(updatedProfile);

      return {
        awarded: true,
        reason: 'ok',
        remainingMs: PRIVATE_CHAT_COOLDOWN_MS,
        todayCount: nextTodayCount,
      };
    },
    []
  );

  const handleVerifyAnswer = useCallback(
    (questionId: string, answerId: string): VerificationResult => {
      const current = profileRef.current;
      const itemKey = `qna:${questionId}:${answerId}`;
      const todayKey = getLocalDateKey();
      const todayCount = getTodayVerifiedCount(
        current.dailyVerifiedDate,
        current.dailyVerifiedCount
      );

      if (current.verifiedItemIds.includes(itemKey)) {
        return {
          awarded: false,
          reason: 'already_verified',
          remainingMs: 0,
          todayCount,
        };
      }

      const level = getProgressionInfo(current.points).level;
      if (
        isSubjectToDailyVerifiedCap(level) &&
        todayCount >= DAILY_VERIFIED_LIMIT_LOW_LEVEL
      ) {
        return {
          awarded: false,
          reason: 'daily_limit',
          remainingMs: 0,
          todayCount,
        };
      }

      const nextTodayCount = todayCount + 1;
      const updatedProfile: StudyProfileState = {
        ...current,
        points: current.points + QNA_VERIFIED_ANSWER_POINTS,
        dailyVerifiedDate: todayKey,
        dailyVerifiedCount: nextTodayCount,
        verifiedItemIds: [...current.verifiedItemIds, itemKey],
      };
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);
      void saveProfile(updatedProfile);

      setQuestions((prev) => {
        const updated = prev.map((q) => {
          if (q.id !== questionId) return q;
          return {
            ...q,
            verified: true,
            answers: q.answers.map((a) => {
              if (a.id !== answerId) return a;
              const existingVerifiers = a.verifiedBy ?? [];
              const nextVerifiers = existingVerifiers.includes(
                current.studentName
              )
                ? existingVerifiers
                : [...existingVerifiers, current.studentName];
              return {
                ...a,
                verified: true,
                verifiedBy: nextVerifiers,
              };
            }),
          };
        });
        void saveQuestions(updated);
        return updated;
      });

      return {
        awarded: true,
        reason: 'ok',
        remainingMs: 0,
        todayCount: nextTodayCount,
      };
    },
    []
  );

  const handleUnlockBadge = useCallback((badgeName: string) => {
    setProfile((prev) => {
      if (prev.specialistBadges.includes(badgeName)) return prev;
      const updated: StudyProfileState = {
        ...prev,
        specialistBadges: [badgeName, ...prev.specialistBadges],
      };
      void saveProfile(updated);
      return updated;
    });
  }, []);

  const handleAddQuestion = useCallback((title: string, detail: string, topic: string) => {
    const newQuestion: QuestionItem = {
      id: `q-${Date.now()}`,
      title,
      detail,
      topic,
      votes: 1,
      hasVoted: true,
      answers: [],
    };
    setQuestions((prev) => {
      const updated = [newQuestion, ...prev];
      void saveQuestions(updated);
      return updated;
    });

    setProfile((prev) => {
      const updatedProfile = { ...prev, points: prev.points + 1 };
      void saveProfile(updatedProfile);
      return updatedProfile;
    });
  }, []);

  const handleToggleVote = useCallback((questionId: string) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.id !== questionId) return q;
        const nextVoted = !q.hasVoted;
        return {
          ...q,
          hasVoted: nextVoted,
          votes: Math.max(0, q.votes + (nextVoted ? 1 : -1)),
        };
      });
      void saveQuestions(updated);
      return updated;
    });
  }, []);

  const handleAddAnswer = useCallback((questionId: string, body: string) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          answers: [
            ...q.answers,
            {
              id: `a-${Date.now()}`,
              author: profileRef.current.studentName,
              body,
              createdAt: 'Just now',
            },
          ],
        };
      });
      void saveQuestions(updated);
      return updated;
    });

    setProfile((prev) => {
      const updatedProfile = { ...prev, points: prev.points + 3 };
      void saveProfile(updatedProfile);
      return updatedProfile;
    });
  }, []);

  const handleUpdateProfile = useCallback((next: Partial<StudyProfileState>) => {
    if (typeof next.defaultFocusMinutes === 'number') {
      const clamped = Math.max(1, Math.min(120, Math.round(next.defaultFocusMinutes)));
      setIsRunning(false);
      setIsAlarmFinished(false);
      setSecondsLeft(clamped * 60);
    }
    setProfile((prev) => {
      const updated = { ...prev, ...next };
      void saveProfile(updated);
      return updated;
    });
  }, []);

  const handleUpdateGoal = useCallback(
    (nextGoal: string) => {
      const clean = nextGoal.trim().slice(0, 20);
      if (!clean) return;
      handleUpdateProfile({ goal: clean });
    },
    [handleUpdateProfile]
  );

  const handleResetAll = useCallback(async () => {
    await resetStudybleData();
    setRooms(INITIAL_ROOMS);
    setQuestions(INITIAL_QUESTIONS);
    setProfile(INITIAL_PROFILE);
    setIsRunning(false);
    setIsAlarmFinished(false);
    setBreakCueCountdown(null);
    setBreakEndAtMs(null);
    setBreakSecondsLeft(0);
    setIsBreakFinished(false);
    setBreakGameOpen(false);
    setSecondsLeft(INITIAL_PROFILE.defaultFocusMinutes * 60);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={COLORS.coral} />
        <Text style={styles.loadingText}>Loading Studyble...</Text>
      </SafeAreaView>
    );
  }

  const breakOverlayMode: BreakAlarmOverlayMode =
    breakCueCountdown !== null && breakCueCountdown > 0
      ? 'break-cue'
      : isBreakFinished
      ? 'back-to-study'
      : null;

  return (
    <View style={styles.root}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.sage,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarStyle: BASE_TAB_BAR_STYLE,
            tabBarLabelStyle: {
              fontWeight: '700',
              fontSize: 12,
            },
          }}
        >
          <Tab.Screen
            name="RoomsTab"
            options={({ route }) => {
              const focusedRoute =
                getFocusedRouteNameFromRoute(route) ?? 'RoomsList';
              const isInLiveRoom = focusedRoute === 'LiveRoom';
              return {
                title: 'Study Rooms',
                tabBarStyle: isInLiveRoom
                  ? { display: 'none' }
                  : BASE_TAB_BAR_STYLE,
              };
            }}
          >
            {() => (
              <RoomsStack.Navigator screenOptions={{ headerShown: false }}>
                <RoomsStack.Screen name="RoomsList">
                  {({ navigation }) => (
                    <RoomsScreen
                      rooms={rooms}
                      profile={profile}
                      onEnterLiveRoom={(roomId) => {
                        handleEnterLiveRoom(roomId);
                        navigation.navigate('LiveRoom', { roomId });
                      }}
                      focusMinutes={focusMinutes}
                      secondsLeft={secondsLeft}
                      isRunning={isRunning}
                      isAlarmFinished={isAlarmFinished}
                      onSetFocusMinutes={handleSetFocusMinutes}
                      onToggleTimer={handleToggleTimer}
                      onResetTimer={handleResetTimer}
                      onCreateInterestRoom={handleCreateInterestRoom}
                    />
                  )}
                </RoomsStack.Screen>
                <RoomsStack.Screen name="LiveRoom">
                  {({ navigation, route }) => (
                    <LiveRoomScreen
                      room={rooms.find((r) => r.id === route.params.roomId)}
                      profile={profile}
                      onLeaveRoom={(roomId) => {
                        handleLeaveRoom(roomId);
                        navigation.goBack();
                      }}
                      onSendLiveMessage={handleSendLiveMessage}
                      onToggleLiveVote={handleToggleLiveVote}
                      onSubmitLiveAnswer={handleSubmitLiveAnswer}
                      onVoteLiveAnswer={handleVoteLiveAnswer}
                      onDismissLiveAnswer={handleDismissLiveAnswer}
                      onChangeStudyMode={handleChangeStudyMode}
                      onUpdateGoal={handleUpdateGoal}
                      onCompletePrivateHelp={handleCompletePrivateHelp}
                      onUpdateAmbientMixer={handleUpdateAmbientMixer}
                      focusMinutes={focusMinutes}
                      secondsLeft={secondsLeft}
                      breakSecondsLeft={
                        breakEndAtMs !== null ? breakSecondsLeft : null
                      }
                      isRunning={isRunning}
                      isAlarmFinished={isAlarmFinished}
                      isBreakOverlayActive={breakOverlayMode !== null}
                      onSetFocusMinutes={handleSetFocusMinutes}
                      onToggleTimer={handleToggleTimer}
                      onResetTimer={handleResetTimer}
                      onOpenBreakGame={handleOpenBreakGame}
                    />
                  )}
                </RoomsStack.Screen>
              </RoomsStack.Navigator>
            )}
          </Tab.Screen>

          <Tab.Screen name="QnATab" options={{ title: 'Peer Q&A' }}>
            {() => (
              <QnAStack.Navigator screenOptions={{ headerShown: false }}>
                <QnAStack.Screen name="QnAList">
                  {({ navigation }) => (
                    <QnAScreen
                      rooms={rooms}
                      questions={questions}
                      onAddQuestion={handleAddQuestion}
                      onToggleVote={handleToggleVote}
                      onOpenQuestion={(questionId) =>
                        navigation.navigate('QuestionDetail', { questionId })
                      }
                    />
                  )}
                </QnAStack.Screen>
                <QnAStack.Screen name="QuestionDetail">
                  {({ navigation, route }) => (
                    <QuestionDetailScreen
                      question={questions.find((q) => q.id === route.params.questionId)}
                      studentName={profile.studentName}
                      verifiedItemIds={profile.verifiedItemIds}
                      onAddAnswer={handleAddAnswer}
                      onVerifyAnswer={handleVerifyAnswer}
                      onBack={() => navigation.goBack()}
                    />
                  )}
                </QnAStack.Screen>
              </QnAStack.Navigator>
            )}
          </Tab.Screen>

          <Tab.Screen name="ProfileTab" options={{ title: 'Profile' }}>
            {() => (
              <ProfileScreen
                profile={profile}
                joinedRoomsCount={rooms.filter((r) => r.isJoined).length}
                questionsCount={questions.length}
                onUpdateProfile={handleUpdateProfile}
                onUnlockBadge={handleUnlockBadge}
                onResetAll={handleResetAll}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>

      <BreakGameModal
        visible={breakGameOpen && breakOverlayMode === null}
        breakSecondsLeft={breakEndAtMs !== null ? breakSecondsLeft : null}
        onClose={handleCloseBreakGame}
      />

      <BreakAlarmOverlay
        mode={breakOverlayMode}
        countdown={breakCueCountdown}
        onStartNextFocus={handleStartNextFocusAfterBreak}
        onDismiss={handleDismissBreakAlarm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
});
