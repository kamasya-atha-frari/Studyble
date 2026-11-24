import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { registerNativeAudioAdapter } from './src/audio/ambientAudioEngine';
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
  loadStudybleData,
  resetStudybleData,
  saveProfile,
  saveQuestions,
  saveRooms,
} from './src/storage/storage';
import { COLORS } from './src/theme/tokens';
import {
  AmbientMixerState,
  LiveMessageKind,
  QuestionItem,
  StudyMode,
  StudyProfileState,
  StudyRoom,
} from './src/types/studyble';
import {
  PRIVATE_CHAT_COOLDOWN_MS,
  PRIVATE_HELP_REWARD_POINTS,
  getPeerCooldownRemainingMs,
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

  const profileRef = useRef<StudyProfileState>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await loadStudybleData();
      if (!active) return;
      setRooms(data.rooms);
      setQuestions(data.questions);
      setProfile(data.profile);
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
    (roomId: string, text: string, kind: LiveMessageKind) => {
      setRooms((prev) => {
        const initialVotes = kind === 'question' ? 1 : 0;
        const updated = prev.map((room) => {
          if (room.id !== roomId) return room;
          return {
            ...room,
            messages: [
              {
                id: `m-${Date.now()}`,
                sender: profileRef.current.studentName,
                text,
                kind,
                votes: initialVotes,
                hasVoted: kind === 'question',
                verified: initialVotes >= VERIFIED_VOTE_THRESHOLD,
                createdAt: 'Just now',
              },
              ...room.messages,
            ],
          };
        });
        void saveRooms(updated);
        return updated;
      });
    },
    []
  );

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
        points: prev.points + 5,
      };
      void saveProfile(updatedProfile);
      return updatedProfile;
    });
  }, []);

  const handleUpdateAmbientMixer = useCallback((ambientMixer: AmbientMixerState) => {
    setProfile((prev) => {
      const updated: StudyProfileState = { ...prev, ambientMixer };
      void saveProfile(updated);
      return updated;
    });
  }, []);

  const handleChangeStudyMode = useCallback((studyMode: StudyMode) => {
    setProfile((prev) => {
      const updated: StudyProfileState = { ...prev, studyMode };
      void saveProfile(updated);
      return updated;
    });
  }, []);

  const handleCompletePrivateHelp = useCallback((peerId: string) => {
    const now = Date.now();
    const current = profileRef.current;
    const remainingMs = getPeerCooldownRemainingMs(
      current.privateChatCooldowns,
      peerId,
      now
    );

    if (remainingMs > 0) {
      return { awarded: false, remainingMs };
    }

    const updatedProfile: StudyProfileState = {
      ...current,
      points: current.points + PRIVATE_HELP_REWARD_POINTS,
      privateChatCooldowns: {
        ...current.privateChatCooldowns,
        [peerId]: now,
      },
    };
    profileRef.current = updatedProfile;
    setProfile(updatedProfile);
    void saveProfile(updatedProfile);

    return { awarded: true, remainingMs: PRIVATE_CHAT_COOLDOWN_MS };
  }, []);

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
    setProfile((prev) => {
      const updated = { ...prev, ...next };
      void saveProfile(updated);
      return updated;
    });
  }, []);

  const handleResetAll = useCallback(async () => {
    await resetStudybleData();
    setRooms(INITIAL_ROOMS);
    setQuestions(INITIAL_QUESTIONS);
    setProfile(INITIAL_PROFILE);
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

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.sage,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
          },
          tabBarLabelStyle: {
            fontWeight: '700',
            fontSize: 12,
          },
        }}
      >
        <Tab.Screen name="RoomsTab" options={{ title: 'Study Rooms' }}>
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
                    onSessionComplete={handleSessionComplete}
                    onChangeStudyMode={handleChangeStudyMode}
                    onCompletePrivateHelp={handleCompletePrivateHelp}
                    onUpdateAmbientMixer={handleUpdateAmbientMixer}
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
                    onAddAnswer={handleAddAnswer}
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
  );
}

const styles = StyleSheet.create({
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
