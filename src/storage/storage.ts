import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuestionItem, StudyProfileState, StudyRoom } from '../types/studyble';

const KEYS = {
  ROOMS: '@studyble_rooms_v2',
  QUESTIONS: '@studyble_questions_v2',
  PROFILE: '@studyble_profile_v2',
};

export const INITIAL_ROOMS: StudyRoom[] = [
  {
    id: 'room-1',
    title: 'Algorithm & Data Structures Focus',
    category: 'Course',
    activeStudents: 14,
    focusMinutes: 25,
    isJoined: false,
    messages: [
      {
        id: 'm-1',
        sender: 'Nadia',
        text: 'Apakah kompleksitas waktu binary search selalu O(log n) di worst case?',
        isQuestion: true,
        votes: 5,
        hasVoted: false,
        createdAt: '2m ago',
      },
      {
        id: 'm-2',
        sender: 'Raka',
        text: 'Sesi 25 menit pertama dimulai, semangat semuanya!',
        isQuestion: false,
        votes: 2,
        hasVoted: false,
        createdAt: '1m ago',
      },
    ],
  },
  {
    id: 'room-2',
    title: 'Quiet Exam Prep & Pomodoro',
    category: 'General',
    activeStudents: 22,
    focusMinutes: 50,
    isJoined: false,
    messages: [
      {
        id: 'm-3',
        sender: 'Tari',
        text: 'Ada tips ringkas bedain definisi dan teorema saat hafalan?',
        isQuestion: true,
        votes: 4,
        hasVoted: false,
        createdAt: '4m ago',
      },
    ],
  },
  {
    id: 'room-3',
    title: 'Mobile & Systems Sprint Room',
    category: 'Major',
    activeStudents: 9,
    focusMinutes: 25,
    isJoined: false,
    messages: [
      {
        id: 'm-4',
        sender: 'Bima',
        text: 'Kenapa state di React Native sebaiknya immutable saat di-update?',
        isQuestion: true,
        votes: 3,
        hasVoted: false,
        createdAt: '3m ago',
      },
    ],
  },
];

export const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-1',
    title: 'Kapan paling tepat pakai useEffect vs useMemo di React Native?',
    detail: 'Sering bingung membedakan efek samping dengan hasil kalkulasi turunan dari state.',
    topic: 'Mobile Dev',
    votes: 6,
    hasVoted: false,
    answers: [
      {
        id: 'a-1',
        author: 'Raka',
        body: 'Pakai useMemo untuk menyimpan hasil perhitungan turunan yang berat; pakai useEffect untuk sinkronisasi efek samping seperti timer atau memuat data.',
        createdAt: '10m ago',
      },
    ],
  },
  {
    id: 'q-2',
    title: 'Cara menjaga fokus sesi belajar 25 menit tanpa terdistraksi?',
    detail: 'Biasanya baru 10 menit sudah membuka notifikasi atau pindah aplikasi.',
    topic: 'Study Habit',
    votes: 4,
    hasVoted: false,
    answers: [],
  },
];

export const INITIAL_PROFILE: StudyProfileState = {
  studentName: 'Student Member',
  points: 12,
  completedSessions: 3,
  defaultFocusMinutes: 25,
};

export async function loadStudybleData(): Promise<{
  rooms: StudyRoom[];
  questions: QuestionItem[];
  profile: StudyProfileState;
}> {
  try {
    const [rawRooms, rawQuestions, rawProfile] = await Promise.all([
      AsyncStorage.getItem(KEYS.ROOMS),
      AsyncStorage.getItem(KEYS.QUESTIONS),
      AsyncStorage.getItem(KEYS.PROFILE),
    ]);

    return {
      rooms: rawRooms ? (JSON.parse(rawRooms) as StudyRoom[]) : INITIAL_ROOMS,
      questions: rawQuestions ? (JSON.parse(rawQuestions) as QuestionItem[]) : INITIAL_QUESTIONS,
      profile: rawProfile ? (JSON.parse(rawProfile) as StudyProfileState) : INITIAL_PROFILE,
    };
  } catch {
    return {
      rooms: INITIAL_ROOMS,
      questions: INITIAL_QUESTIONS,
      profile: INITIAL_PROFILE,
    };
  }
}

export async function saveRooms(rooms: StudyRoom[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
}

export async function saveQuestions(questions: QuestionItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
}

export async function saveProfile(profile: StudyProfileState): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function resetStudybleData(): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEYS.ROOMS, JSON.stringify(INITIAL_ROOMS)),
    AsyncStorage.setItem(KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTIONS)),
    AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(INITIAL_PROFILE)),
  ]);
}
