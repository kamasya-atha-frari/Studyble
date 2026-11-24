import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { QnAScreen } from './src/screens/QnAScreen';
import { QuestionDetailScreen } from './src/screens/QuestionDetailScreen';
import { RoomsScreen } from './src/screens/RoomsScreen';
import {
  INITIAL_PROFILE,
  INITIAL_QUESTIONS,
  INITIAL_ROOMS,
  loadStudybleData,
  resetStudybleData,
  saveProfile,
  saveQuestions,
  saveRooms,
} from './src/storage/storage';
import { COLORS } from './src/theme/tokens';
import { QuestionItem, StudyProfileState, StudyRoom } from './src/types/studyble';

type RootTabParamList = {
  RoomsTab: undefined;
  QnATab: undefined;
  ProfileTab: undefined;
};

type QnAStackParamList = {
  QnAList: undefined;
  QuestionDetail: { questionId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const QnAStack = createNativeStackNavigator<QnAStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rooms, setRooms] = useState<StudyRoom[]>(INITIAL_ROOMS);
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_QUESTIONS);
  const [profile, setProfile] = useState<StudyProfileState>(INITIAL_PROFILE);

  useEffect(() => {
    (async () => {
      const data = await loadStudybleData();
      setRooms(data.rooms);
      setQuestions(data.questions);
      setProfile(data.profile);
      setIsLoading(false);
    })();
  }, []);

  const handleToggleJoinRoom = (roomId: string) => {
    const updated = rooms.map((room) => {
      if (room.id !== roomId) return room;
      const nextJoined = !room.isJoined;
      return {
        ...room,
        isJoined: nextJoined,
        activeStudents: Math.max(0, room.activeStudents + (nextJoined ? 1 : -1)),
      };
    });
    setRooms(updated);
    saveRooms(updated);
  };

  const handleSessionComplete = (_minutes: number) => {
    const updatedProfile: StudyProfileState = {
      ...profile,
      completedSessions: profile.completedSessions + 1,
      points: profile.points + 5,
    };
    setProfile(updatedProfile);
    saveProfile(updatedProfile);
  };

  const handleAddQuestion = (title: string, detail: string, topic: string) => {
    const newQuestion: QuestionItem = {
      id: `q-${Date.now()}`,
      title,
      detail,
      topic,
      votes: 1,
      hasVoted: true,
      answers: [],
    };
    const updated = [newQuestion, ...questions];
    setQuestions(updated);
    saveQuestions(updated);

    const updatedProfile = { ...profile, points: profile.points + 1 };
    setProfile(updatedProfile);
    saveProfile(updatedProfile);
  };

  const handleToggleVote = (questionId: string) => {
    const updated = questions.map((q) => {
      if (q.id !== questionId) return q;
      const nextVoted = !q.hasVoted;
      return {
        ...q,
        hasVoted: nextVoted,
        votes: Math.max(0, q.votes + (nextVoted ? 1 : -1)),
      };
    });
    setQuestions(updated);
    saveQuestions(updated);
  };

  const handleAddAnswer = (questionId: string, body: string) => {
    const updated = questions.map((q) => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        answers: [
          ...q.answers,
          {
            id: `a-${Date.now()}`,
            author: profile.studentName,
            body,
            createdAt: 'Just now',
          },
        ],
      };
    });
    setQuestions(updated);
    saveQuestions(updated);

    const updatedProfile = { ...profile, points: profile.points + 3 };
    setProfile(updatedProfile);
    saveProfile(updatedProfile);
  };

  const handleUpdateProfile = (next: Partial<StudyProfileState>) => {
    const updated = { ...profile, ...next };
    setProfile(updated);
    saveProfile(updated);
  };

  const handleResetAll = async () => {
    await resetStudybleData();
    setRooms(INITIAL_ROOMS);
    setQuestions(INITIAL_QUESTIONS);
    setProfile(INITIAL_PROFILE);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.coral} />
        <Text style={styles.loadingText}>Loading Studyble...</Text>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.coral,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.navy,
            borderTopColor: COLORS.navy,
          },
          tabBarLabelStyle: {
            fontWeight: '700',
            fontSize: 12,
          },
        }}
      >
        <Tab.Screen name="RoomsTab" options={{ title: 'Study Rooms' }}>
          {() => (
            <RoomsScreen
              rooms={rooms}
              profile={profile}
              onToggleJoinRoom={handleToggleJoinRoom}
              onSessionComplete={handleSessionComplete}
            />
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
