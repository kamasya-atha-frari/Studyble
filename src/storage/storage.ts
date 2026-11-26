import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActiveLiveAnswer,
  ActiveLiveQuestion,
  AmbientChannelKey,
  AmbientMixerState,
  LiveAnswerStatus,
  LiveMessageItem,
  LiveMessageKind,
  LiveVoteChoice,
  QuestionItem,
  RoomCategory,
  StudyMode,
  StudyParticipant,
  StudyProfileState,
  StudyRoom,
} from '../types/studyble';

export const VERIFIED_VOTE_THRESHOLD = 3;

const KEYS = {
  ROOMS: '@studyble_rooms_v5',
  QUESTIONS: '@studyble_questions_v5',
  PROFILE: '@studyble_profile_v5',
  BREAK_END_AT: '@studyble_break_end_at_ms_v1',
} as const;

const VALID_CATEGORIES: ReadonlyArray<RoomCategory> = [
  'General',
  'Major',
  'Course',
  'Interest',
];

const VALID_STUDY_MODES: ReadonlyArray<StudyMode> = [
  'avatar',
  'desk',
  'face',
  'screen',
];

const AMBIENT_KEYS: ReadonlyArray<AmbientChannelKey> = [
  'rain',
  'keyboard',
  'paper',
  'cafe',
];

export const INITIAL_AMBIENT_MIXER: AmbientMixerState = {
  rain: { active: false, level: 50 },
  keyboard: { active: false, level: 40 },
  paper: { active: false, level: 30 },
  cafe: { active: false, level: 45 },
};

export const STUDY_COMPANION_BOTS: StudyParticipant[] = [
  {
    id: 'bot-kopi',
    name: 'Kopi Bot',
    studyMode: 'desk',
    level: 5,
    points: 50,
    weeklyHelpfulCount: 0,
    specialistBadge: 'Quiet Companion',
    currentGoal: 'Sipping warm coffee & reviewing neat notes beside you',
    privateChatEnabled: false,
    avatarEmoji: '☕',
    isBot: true,
  },
  {
    id: 'bot-mochi',
    name: 'Mochi Notes',
    studyMode: 'avatar',
    level: 4,
    points: 40,
    weeklyHelpfulCount: 0,
    specialistBadge: 'Study Buddy',
    currentGoal: 'Outlining key formulas at a calm, steady pace',
    privateChatEnabled: false,
    avatarEmoji: '🍡',
    isBot: true,
  },
  {
    id: 'bot-neko',
    name: 'Neko Desk',
    studyMode: 'desk',
    level: 6,
    points: 60,
    weeklyHelpfulCount: 0,
    specialistBadge: 'Focus Keeper',
    currentGoal: 'Keeping the desk lamp glowing for your 25-min block',
    privateChatEnabled: false,
    avatarEmoji: '🐱',
    isBot: true,
  },
  {
    id: 'bot-bubu',
    name: 'Bubu Pages',
    studyMode: 'avatar',
    level: 3,
    points: 30,
    weeklyHelpfulCount: 0,
    specialistBadge: 'Reading Pal',
    currentGoal: 'Flipping through chapter highlights without distractions',
    privateChatEnabled: false,
    avatarEmoji: '📖',
    isBot: true,
  },
  {
    id: 'bot-owl',
    name: 'Lofi Owl',
    studyMode: 'face',
    level: 7,
    points: 70,
    weeklyHelpfulCount: 0,
    specialistBadge: 'Calm Host',
    currentGoal: 'Holding a cozy quiet room whenever peers are offline',
    privateChatEnabled: false,
    avatarEmoji: '🦉',
    isBot: true,
  },
];

const LARGE_ROOM_PEER_COUNT = 99; // 99 peers + current user = 100 participants (7 slides of 16)

const SEED_FIRST_NAMES = [
  'Alya', 'Bima', 'Citra', 'Dimas', 'Eka', 'Farhan', 'Gita', 'Hana',
  'Iqbal', 'Jihan', 'Kamil', 'Laras', 'Maulana', 'Nayla', 'Omar', 'Putri',
  'Qori', 'Rafi', 'Siti', 'Tariq', 'Umar', 'Vina', 'Wildan', 'Yasmine',
  'Zahra', 'Arif', 'Bella', 'Chandra', 'Dewi', 'Edo', 'Fika', 'Galih',
];

const SEED_LAST_NAMES = [
  'Pratiwi', 'Santoso', 'Wijaya', 'Hidayat', 'Kusuma', 'Saputra', 'Lestari',
  'Nugroho', 'Ramadhani', 'Maulida', 'Fauzan', 'Permata', 'Hakim', 'Azzahra',
  'Setiawan', 'Anggraini', 'Purnama', 'Syahputra',
];

const SEED_STUDY_GOALS = [
  'Binary trees', 'DP practice', 'SQL joins', 'Calc limits', 'Stats notes',
  'Graph BFS/DFS', 'OS threads', 'Sorting quiz', 'Linear alg', 'UI wireframe',
  'ER diagram', 'Big-O proofs', 'Micro econ', 'Essay draft', 'Flashcards',
  'Regex drills', 'Git workflow', 'API design', 'Bayes theorem', 'Case study',
];

const SEED_EMOJIS = [
  '🦊', '🐻', '🐰', '🦉', '🦋', '🐼', '🐱', '🐨',
  '🐣', '🦁', '🐸', '🐙', '🦄', '🐝', '🐢', '🐳',
];

const SEED_MODES: ReadonlyArray<StudyMode> = ['avatar', 'desk', 'face'];
const SEED_BADGES: ReadonlyArray<string | undefined> = [
  undefined,
  undefined,
  'Pro at Math',
  undefined,
  'Pro at Statistics',
  undefined,
];

function buildLargeRoomPeers(
  basePeers: StudyParticipant[],
  targetCount: number
): StudyParticipant[] {
  const result = [...basePeers];
  for (let i = basePeers.length; i < targetCount; i += 1) {
    const first = SEED_FIRST_NAMES[i % SEED_FIRST_NAMES.length];
    const last =
      SEED_LAST_NAMES[(Math.floor(i / 2) + i * 3) % SEED_LAST_NAMES.length];
    const level = (i % 13) + 1;
    const points = level * 10 + ((i * 3) % 9);
    const privateChatEnabled = i % 3 === 0;
    const badge = SEED_BADGES[i % SEED_BADGES.length];
    const goal = SEED_STUDY_GOALS[i % SEED_STUDY_GOALS.length];
    result.push({
      id: `peer-r1-${i + 1}`,
      name: `${first} ${last}`,
      studyMode: SEED_MODES[i % SEED_MODES.length],
      level,
      points,
      weeklyHelpfulCount: i % 5 === 0 ? (i % 6) + 1 : 0,
      specialistBadge: badge,
      currentGoal: goal,
      privateChatEnabled,
      privateChatMotif: privateChatEnabled
        ? `Open to discuss ${goal}`
        : undefined,
      avatarEmoji: SEED_EMOJIS[i % SEED_EMOJIS.length],
    });
  }
  return result;
}

const ROOM_1_BASE_PEERS: StudyParticipant[] = [
  {
    id: 'peer-nadia',
    name: 'Nadia Putri',
    studyMode: 'desk',
    level: 11,
    points: 118,
    weeklyHelpfulCount: 15,
    specialistBadge: 'Pro at Statistics',
    currentGoal: 'Binary tree proofs',
    privateChatEnabled: true,
    privateChatMotif: 'Happy to walk through recursion or Statistics questions',
    avatarEmoji: '🦊',
  },
  {
    id: 'peer-raka',
    name: 'Raka Pratama',
    studyMode: 'face',
    level: 8,
    points: 84,
    weeklyHelpfulCount: 11,
    specialistBadge: 'Pro at Math',
    currentGoal: 'DP & recurrences',
    privateChatEnabled: true,
    privateChatMotif: 'Open for Math & Big-O complexity help',
    avatarEmoji: '🐻',
  },
  {
    id: 'peer-dina',
    name: 'Dina Kartika',
    studyMode: 'avatar',
    level: 5,
    points: 52,
    weeklyHelpfulCount: 7,
    currentGoal: 'Hash Map vs BST',
    privateChatEnabled: true,
    privateChatMotif: 'Let us compare data structure notes together',
    avatarEmoji: '🐰',
  },
  {
    id: 'peer-bagas',
    name: 'Bagas Mahendra',
    studyMode: 'desk',
    level: 3,
    points: 34,
    weeklyHelpfulCount: 4,
    currentGoal: 'Dijkstra trace',
    privateChatEnabled: false,
    avatarEmoji: '🦉',
  },
  {
    id: 'peer-clara',
    name: 'Clara Wijaya',
    studyMode: 'avatar',
    level: 6,
    points: 63,
    weeklyHelpfulCount: 9,
    specialistBadge: 'Pro at Math',
    currentGoal: 'Graph cheat-sheet',
    privateChatEnabled: true,
    privateChatMotif: 'Can help with discrete math & graph proofs',
    avatarEmoji: '🦋',
  },
  {
    id: 'peer-ilham',
    name: 'Ilham Ramadhan',
    studyMode: 'face',
    level: 1,
    points: 14,
    weeklyHelpfulCount: 2,
    currentGoal: 'Linked list drills',
    privateChatEnabled: false,
    avatarEmoji: '🐼',
  },
];

export const INITIAL_ROOMS: StudyRoom[] = [
  {
    id: 'room-1',
    title: 'Algorithm & Data Structures Focus',
    category: 'Course',
    activeStudents: LARGE_ROOM_PEER_COUNT,
    focusMinutes: 25,
    isJoined: false,
    participants: buildLargeRoomPeers(ROOM_1_BASE_PEERS, LARGE_ROOM_PEER_COUNT),
    messages: [
      {
        id: 'm-1',
        sender: 'Nadia Putri',
        text: 'Is binary search worst-case time complexity always O(log n)?',
        kind: 'question',
        votes: 5,
        hasVoted: false,
        verified: true,
        status: 'accepted',
        answererName: 'Raka Pratama',
        answerText: 'Yes — each step halves the sorted search range, so worst-case complexity is always O(log n).',
        upVotes: 5,
        downVotes: 0,
        resolutionNote: 'Accepted · Ready to use (+1 pt)',
        createdAt: '6m ago',
        createdAtMs: 1700000001000,
      },
      {
        id: 'm-2',
        sender: 'Dina Kartika',
        text: 'When is a Hash Map better than a Balanced BST for fast lookups?',
        kind: 'question',
        votes: 2,
        hasVoted: false,
        verified: false,
        createdAt: '3m ago',
        createdAtMs: 1700000002000,
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
    participants: [
      {
        id: 'peer-tari',
        name: 'Tari Wulandari',
        studyMode: 'desk',
        level: 12,
        points: 124,
        weeklyHelpfulCount: 14,
        specialistBadge: 'Pro at Statistics',
        currentGoal: 'Summarizing hypothesis testing & p-value interpretations',
        privateChatEnabled: true,
        privateChatMotif: 'Ready to help with Statistics & exam prep notes',
        avatarEmoji: '🐱',
      },
      {
        id: 'peer-fajar',
        name: 'Fajar Nugroho',
        studyMode: 'avatar',
        level: 4,
        points: 46,
        weeklyHelpfulCount: 6,
        currentGoal: '50-minute uninterrupted reading block for Chapter 3',
        privateChatEnabled: true,
        privateChatMotif: 'Open for quick study accountability check-ins',
        avatarEmoji: '🐨',
      },
      {
        id: 'peer-salsa',
        name: 'Salsa Azzahra',
        studyMode: 'face',
        level: 7,
        points: 75,
        weeklyHelpfulCount: 10,
        specialistBadge: 'Pro at Math',
        currentGoal: 'Working through calculus integration practice set',
        privateChatEnabled: true,
        privateChatMotif: 'Ask me about derivatives & integrals',
        avatarEmoji: '🐣',
      },
      {
        id: 'peer-kevin',
        name: 'Kevin Santoso',
        studyMode: 'desk',
        level: 2,
        points: 22,
        weeklyHelpfulCount: 3,
        currentGoal: 'Reviewing flashcards for microeconomics midterm',
        privateChatEnabled: false,
        avatarEmoji: '🦁',
      },
    ],
    messages: [
      {
        id: 'm-4',
        sender: 'Tari Wulandari',
        text: 'Ada tips ringkas bedain definisi dan teorema saat persiapan ujian?',
        kind: 'question',
        votes: 4,
        hasVoted: false,
        verified: true,
        createdAt: '5m ago',
      },
      {
        id: 'm-5',
        sender: 'Fajar Nugroho',
        text: 'Ikut blok fokus 50 menit sambil merangkum bab 3.',
        kind: 'chat',
        votes: 1,
        hasVoted: false,
        verified: false,
        createdAt: '2m ago',
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
    participants: [
      {
        id: 'peer-bima',
        name: 'Bima Aditya',
        studyMode: 'face',
        level: 9,
        points: 92,
        weeklyHelpfulCount: 12,
        specialistBadge: 'Pro at Statistics',
        currentGoal: 'Designing clean AsyncStorage state persistence in Expo',
        privateChatEnabled: true,
        privateChatMotif: 'Happy to help debug React Native & TypeScript',
        avatarEmoji: '🦝',
      },
      {
        id: 'peer-alya',
        name: 'Alya Kirana',
        studyMode: 'desk',
        level: 5,
        points: 54,
        weeklyHelpfulCount: 8,
        specialistBadge: 'Pro at Math',
        currentGoal: 'Finalizing ERD normalization and API contract docs',
        privateChatEnabled: true,
        privateChatMotif: 'Open for database modeling & Math review',
        avatarEmoji: '🦢',
      },
      {
        id: 'peer-reza',
        name: 'Reza Kurnia',
        studyMode: 'avatar',
        level: 2,
        points: 21,
        weeklyHelpfulCount: 3,
        currentGoal: 'Building responsive card grids for mobile sprint',
        privateChatEnabled: false,
        avatarEmoji: '🐸',
      },
    ],
    messages: [
      {
        id: 'm-6',
        sender: 'Bima Aditya',
        text: 'Why should React Native state updates stay immutable?',
        kind: 'question',
        votes: 2,
        hasVoted: false,
        verified: false,
        createdAt: '3m ago',
      },
    ],
  },
  {
    id: 'room-interest-art',
    title: 'Art',
    category: 'Interest',
    coverImageUrl:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=700&q=80',
    activeStudents: 8,
    focusMinutes: 25,
    isJoined: false,
    participants: [
      {
        id: 'peer-art-1',
        name: 'Alya Pratiwi',
        studyMode: 'desk',
        level: 4,
        points: 42,
        weeklyHelpfulCount: 5,
        currentGoal: 'Sketching anatomy studies',
        privateChatEnabled: true,
        privateChatMotif: 'Open for digital art & color palette chats',
        avatarEmoji: '🎨',
      },
      {
        id: 'peer-art-2',
        name: 'Vina Lestari',
        studyMode: 'avatar',
        level: 3,
        points: 31,
        weeklyHelpfulCount: 2,
        currentGoal: 'Watercolor shading practice',
        privateChatEnabled: false,
        avatarEmoji: '🦋',
      },
    ],
    messages: [],
  },
  {
    id: 'room-interest-food',
    title: 'Food & Drink',
    category: 'Interest',
    coverImageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80',
    activeStudents: 6,
    focusMinutes: 25,
    isJoined: false,
    participants: [
      {
        id: 'peer-food-1',
        name: 'Hana Maulida',
        studyMode: 'avatar',
        level: 5,
        points: 55,
        weeklyHelpfulCount: 6,
        currentGoal: 'Brewing notes & nutrition reading',
        privateChatEnabled: true,
        privateChatMotif: 'Love swapping coffee & meal-prep ideas',
        avatarEmoji: '☕',
      },
    ],
    messages: [],
  },
  {
    id: 'room-interest-sports',
    title: 'Sports & Gym',
    category: 'Interest',
    coverImageUrl:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=700&q=80',
    activeStudents: 9,
    focusMinutes: 25,
    isJoined: false,
    participants: [
      {
        id: 'peer-sports-1',
        name: 'Dimas Santoso',
        studyMode: 'face',
        level: 6,
        points: 64,
        weeklyHelpfulCount: 7,
        currentGoal: 'Sports science & training log',
        privateChatEnabled: true,
        privateChatMotif: 'Happy to share workout routine tips',
        avatarEmoji: '🏃',
      },
    ],
    messages: [],
  },
  {
    id: 'room-interest-social',
    title: 'Social Impact',
    category: 'Interest',
    coverImageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80',
    activeStudents: 7,
    focusMinutes: 25,
    isJoined: false,
    participants: [
      {
        id: 'peer-social-1',
        name: 'Nayla Azzahra',
        studyMode: 'avatar',
        level: 7,
        points: 72,
        weeklyHelpfulCount: 9,
        currentGoal: 'Community project proposal',
        privateChatEnabled: true,
        privateChatMotif: 'Open for campus volunteer & social impact ideas',
        avatarEmoji: '🌱',
      },
    ],
    messages: [],
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
        author: 'Raka Pratama',
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
  jurusan: 'Manajemen Sistem Informasi',
  goal: 'Selesaikan 2 sesi fokus & rangkum catatan kuliah hari ini',
  points: 12,
  completedSessions: 3,
  completedFocusMinutes: 75,
  defaultFocusMinutes: 25,
  studyMode: 'avatar',
  privateChatEnabled: false,
  privateChatMotif: 'Siap bantu soal Statistik & Matematika dasar',
  specialistBadges: [],
  privateChatCooldowns: {},
  dailyVerifiedDate: '',
  dailyVerifiedCount: 0,
  verifiedItemIds: [],
  ambientMixer: INITIAL_AMBIENT_MIXER,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeMessage(raw: unknown, fallbackIndex: number): LiveMessageItem | null {
  if (!isRecord(raw)) return null;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;

  const votes =
    typeof raw.votes === 'number' && Number.isFinite(raw.votes)
      ? Math.max(0, Math.floor(raw.votes))
      : 0;

  let kind: LiveMessageKind = 'chat';
  if (raw.kind === 'question' || raw.kind === 'chat') {
    kind = raw.kind;
  } else if (typeof raw.isQuestion === 'boolean') {
    kind = raw.isQuestion ? 'question' : 'chat';
  }

  const status =
    raw.status === 'accepted' || raw.status === 'discarded'
      ? raw.status
      : undefined;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `m-restored-${fallbackIndex}`,
    sender: typeof raw.sender === 'string' && raw.sender.trim() ? raw.sender.trim() : 'Student',
    text,
    kind,
    votes,
    hasVoted: Boolean(raw.hasVoted),
    verified: status === 'accepted' || votes >= VERIFIED_VOTE_THRESHOLD,
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : 'Recently',
    createdAtMs:
      typeof raw.createdAtMs === 'number' && Number.isFinite(raw.createdAtMs)
        ? raw.createdAtMs
        : undefined,
    status,
    answerText:
      typeof raw.answerText === 'string' && raw.answerText.trim()
        ? raw.answerText.trim()
        : undefined,
    answererName:
      typeof raw.answererName === 'string' && raw.answererName.trim()
        ? raw.answererName.trim()
        : undefined,
    upVotes:
      typeof raw.upVotes === 'number' && Number.isFinite(raw.upVotes)
        ? Math.max(0, Math.floor(raw.upVotes))
        : undefined,
    downVotes:
      typeof raw.downVotes === 'number' && Number.isFinite(raw.downVotes)
        ? Math.max(0, Math.floor(raw.downVotes))
        : undefined,
    resolutionNote:
      typeof raw.resolutionNote === 'string' && raw.resolutionNote.trim()
        ? raw.resolutionNote.trim()
        : undefined,
  };
}

function normalizeParticipant(
  raw: unknown,
  fallbackIndex: number
): StudyParticipant | null {
  if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name.trim()) return null;

  const studyMode: StudyMode = VALID_STUDY_MODES.includes(raw.studyMode as StudyMode)
    ? (raw.studyMode as StudyMode)
    : 'avatar';

  const points =
    typeof raw.points === 'number' && Number.isFinite(raw.points)
      ? Math.max(0, Math.floor(raw.points))
      : 0;

  const level =
    typeof raw.level === 'number' && Number.isFinite(raw.level)
      ? Math.max(0, Math.floor(raw.level))
      : Math.floor(points / 10);

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `peer-${fallbackIndex}`,
    name: raw.name.trim(),
    studyMode,
    level,
    points,
    weeklyHelpfulCount:
      typeof raw.weeklyHelpfulCount === 'number' && Number.isFinite(raw.weeklyHelpfulCount)
        ? Math.max(0, Math.floor(raw.weeklyHelpfulCount))
        : 0,
    specialistBadge:
      typeof raw.specialistBadge === 'string' && raw.specialistBadge.trim()
        ? raw.specialistBadge.trim()
        : undefined,
    currentGoal:
      typeof raw.currentGoal === 'string' && raw.currentGoal.trim()
        ? raw.currentGoal.trim()
        : 'Focusing quietly on today’s study target',
    privateChatEnabled: Boolean(raw.privateChatEnabled),
    privateChatMotif:
      typeof raw.privateChatMotif === 'string' && raw.privateChatMotif.trim()
        ? raw.privateChatMotif.trim()
        : undefined,
    avatarEmoji:
      typeof raw.avatarEmoji === 'string' && raw.avatarEmoji.trim()
        ? raw.avatarEmoji.trim()
        : '📚',
    isBot: Boolean(raw.isBot),
    isCurrentUser: Boolean(raw.isCurrentUser),
  };
}

function normalizeRooms(raw: unknown): StudyRoom[] {
  if (!Array.isArray(raw)) return INITIAL_ROOMS;

  const parsed: StudyRoom[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') {
      continue;
    }

    const category: RoomCategory = VALID_CATEGORIES.includes(item.category as RoomCategory)
      ? (item.category as RoomCategory)
      : 'General';

    const rawMessages = Array.isArray(item.messages) ? item.messages : [];
    const messages = rawMessages
      .map((msg, idx) => normalizeMessage(msg, idx))
      .filter((msg): msg is LiveMessageItem => msg !== null);

    const seedMatch = INITIAL_ROOMS.find((seed) => seed.id === item.id);
    const rawParticipants = Array.isArray(item.participants) ? item.participants : null;
    const normalizedParticipants = rawParticipants
      ? rawParticipants
          .map((p, idx) => normalizeParticipant(p, idx))
          .filter((p): p is StudyParticipant => p !== null)
      : seedMatch?.participants ?? [];
    // Upgrade room-1 automatically when older cached storage had fewer than the 100-participant seed
    const participants =
      seedMatch &&
      seedMatch.id === 'room-1' &&
      normalizedParticipants.length < seedMatch.participants.length
        ? seedMatch.participants
        : normalizedParticipants;

    const rawActiveQ = isRecord(item.activeLiveQuestion)
      ? item.activeLiveQuestion
      : null;
    const activeLiveQuestion: ActiveLiveQuestion | null =
      rawActiveQ &&
      typeof rawActiveQ.id === 'string' &&
      typeof rawActiveQ.text === 'string' &&
      rawActiveQ.text.trim().length > 0
        ? {
            id: rawActiveQ.id,
            roomId: item.id,
            askerName:
              typeof rawActiveQ.askerName === 'string' &&
              rawActiveQ.askerName.trim()
                ? rawActiveQ.askerName.trim()
                : 'Student',
            text: rawActiveQ.text.trim(),
            createdAt:
              typeof rawActiveQ.createdAt === 'string' && rawActiveQ.createdAt
                ? rawActiveQ.createdAt
                : 'Just now',
          }
        : null;

    const rawActiveA = isRecord(item.activeLiveAnswer)
      ? item.activeLiveAnswer
      : null;
    const validStatuses: ReadonlyArray<LiveAnswerStatus> = [
      'voting',
      'accepted',
      'discarded',
    ];
    const activeLiveAnswer: ActiveLiveAnswer | null =
      rawActiveA &&
      typeof rawActiveA.id === 'string' &&
      typeof rawActiveA.text === 'string' &&
      rawActiveA.text.trim().length > 0
        ? {
            id: rawActiveA.id,
            roomId: item.id,
            questionId:
              typeof rawActiveA.questionId === 'string'
                ? rawActiveA.questionId
                : '',
            questionText:
              typeof rawActiveA.questionText === 'string'
                ? rawActiveA.questionText
                : '',
            askerName:
              typeof rawActiveA.askerName === 'string'
                ? rawActiveA.askerName
                : 'Student',
            answererName:
              typeof rawActiveA.answererName === 'string'
                ? rawActiveA.answererName
                : 'Student',
            answererIsSelf: Boolean(rawActiveA.answererIsSelf),
            text: rawActiveA.text.trim(),
            upVotes:
              typeof rawActiveA.upVotes === 'number' &&
              Number.isFinite(rawActiveA.upVotes)
                ? Math.max(0, Math.floor(rawActiveA.upVotes))
                : 0,
            downVotes:
              typeof rawActiveA.downVotes === 'number' &&
              Number.isFinite(rawActiveA.downVotes)
                ? Math.max(0, Math.floor(rawActiveA.downVotes))
                : 0,
            userVote:
              rawActiveA.userVote === 'up' || rawActiveA.userVote === 'down'
                ? (rawActiveA.userVote as LiveVoteChoice)
                : null,
            voteEndsAtMs:
              typeof rawActiveA.voteEndsAtMs === 'number' &&
              Number.isFinite(rawActiveA.voteEndsAtMs)
                ? rawActiveA.voteEndsAtMs
                : 0,
            status: validStatuses.includes(
              rawActiveA.status as LiveAnswerStatus
            )
              ? (rawActiveA.status as LiveAnswerStatus)
              : 'voting',
            pointAwarded: Boolean(rawActiveA.pointAwarded),
            resolutionNote:
              typeof rawActiveA.resolutionNote === 'string'
                ? rawActiveA.resolutionNote
                : undefined,
          }
        : null;

    parsed.push({
      id: item.id,
      title: item.title,
      category,
      coverImageUrl:
        typeof item.coverImageUrl === 'string' && item.coverImageUrl.trim()
          ? item.coverImageUrl.trim()
          : seedMatch?.coverImageUrl,
      activeStudents:
        typeof item.activeStudents === 'number' && Number.isFinite(item.activeStudents)
          ? Math.max(0, Math.floor(item.activeStudents))
          : 0,
      focusMinutes:
        typeof item.focusMinutes === 'number' && item.focusMinutes > 0
          ? Math.floor(item.focusMinutes)
          : 25,
      isJoined: Boolean(item.isJoined),
      messages,
      participants,
      activeLiveQuestion,
      activeLiveAnswer,
    });
  }

  if (parsed.length === 0) return INITIAL_ROOMS;

  // Ensure existing cached storage receives the seed Interest rooms if none exist yet
  const hasInterestRoom = parsed.some((room) => room.category === 'Interest');
  if (!hasInterestRoom) {
    const seedInterests = INITIAL_ROOMS.filter(
      (room) => room.category === 'Interest'
    );
    return [...parsed, ...seedInterests];
  }

  return parsed;
}

function normalizeCooldowns(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const result: Record<string, number> = {};
  for (const [peerId, timestamp] of Object.entries(raw)) {
    if (typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp > 0) {
      result[peerId] = timestamp;
    }
  }
  return result;
}

function normalizeAmbientMixer(raw: unknown): AmbientMixerState {
  if (!isRecord(raw)) return INITIAL_AMBIENT_MIXER;

  const normalized: AmbientMixerState = {
    rain: { ...INITIAL_AMBIENT_MIXER.rain },
    keyboard: { ...INITIAL_AMBIENT_MIXER.keyboard },
    paper: { ...INITIAL_AMBIENT_MIXER.paper },
    cafe: { ...INITIAL_AMBIENT_MIXER.cafe },
  };

  for (const key of AMBIENT_KEYS) {
    const channel = raw[key];
    if (isRecord(channel)) {
      const level =
        typeof channel.level === 'number' && Number.isFinite(channel.level)
          ? Math.min(100, Math.max(0, Math.round(channel.level)))
          : normalized[key].level;
      normalized[key] = {
        active: Boolean(channel.active),
        level,
      };
    }
  }

  return normalized;
}

function normalizeProfile(raw: unknown): StudyProfileState {
  if (!isRecord(raw)) return INITIAL_PROFILE;

  const studyMode: StudyMode = VALID_STUDY_MODES.includes(raw.studyMode as StudyMode)
    ? (raw.studyMode as StudyMode)
    : INITIAL_PROFILE.studyMode;

  const specialistBadges = Array.isArray(raw.specialistBadges)
    ? Array.from(
        new Set(
          raw.specialistBadges
            .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
            .map((b) => b.trim())
        )
      )
    : INITIAL_PROFILE.specialistBadges;

  const completedSessions =
    typeof raw.completedSessions === 'number' && Number.isFinite(raw.completedSessions)
      ? Math.max(0, Math.floor(raw.completedSessions))
      : INITIAL_PROFILE.completedSessions;

  const completedFocusMinutes =
    typeof raw.completedFocusMinutes === 'number' &&
    Number.isFinite(raw.completedFocusMinutes)
      ? Math.max(0, Math.floor(raw.completedFocusMinutes))
      : completedSessions * 25;

  return {
    studentName:
      typeof raw.studentName === 'string' && raw.studentName.trim()
        ? raw.studentName.trim()
        : INITIAL_PROFILE.studentName,
    jurusan:
      typeof raw.jurusan === 'string' && raw.jurusan.trim()
        ? raw.jurusan.trim()
        : INITIAL_PROFILE.jurusan,
    goal:
      typeof raw.goal === 'string' && raw.goal.trim()
        ? raw.goal.trim()
        : INITIAL_PROFILE.goal,
    points:
      typeof raw.points === 'number' && Number.isFinite(raw.points)
        ? Math.max(0, Math.floor(raw.points))
        : INITIAL_PROFILE.points,
    completedSessions,
    completedFocusMinutes,
    defaultFocusMinutes:
      typeof raw.defaultFocusMinutes === 'number' && raw.defaultFocusMinutes > 0
        ? Math.floor(raw.defaultFocusMinutes)
        : INITIAL_PROFILE.defaultFocusMinutes,
    studyMode,
    privateChatEnabled: Boolean(raw.privateChatEnabled),
    privateChatMotif:
      typeof raw.privateChatMotif === 'string' && raw.privateChatMotif.trim()
        ? raw.privateChatMotif.trim()
        : INITIAL_PROFILE.privateChatMotif,
    specialistBadges,
    privateChatCooldowns: normalizeCooldowns(raw.privateChatCooldowns),
    dailyVerifiedDate:
      typeof raw.dailyVerifiedDate === 'string' ? raw.dailyVerifiedDate : '',
    dailyVerifiedCount:
      typeof raw.dailyVerifiedCount === 'number' &&
      Number.isFinite(raw.dailyVerifiedCount)
        ? Math.max(0, Math.floor(raw.dailyVerifiedCount))
        : 0,
    verifiedItemIds: Array.isArray(raw.verifiedItemIds)
      ? Array.from(
          new Set(
            raw.verifiedItemIds.filter(
              (id): id is string => typeof id === 'string' && id.trim().length > 0
            )
          )
        )
      : [],
    ambientMixer: normalizeAmbientMixer(raw.ambientMixer),
  };
}

function normalizeQuestions(raw: unknown): QuestionItem[] {
  if (!Array.isArray(raw)) return INITIAL_QUESTIONS;
  return raw.filter(
    (q): q is QuestionItem =>
      isRecord(q) &&
      typeof q.id === 'string' &&
      typeof q.title === 'string' &&
      Array.isArray(q.answers)
  );
}

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
      rooms: rawRooms ? normalizeRooms(JSON.parse(rawRooms)) : INITIAL_ROOMS,
      questions: rawQuestions ? normalizeQuestions(JSON.parse(rawQuestions)) : INITIAL_QUESTIONS,
      profile: rawProfile ? normalizeProfile(JSON.parse(rawProfile)) : INITIAL_PROFILE,
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
  try {
    await AsyncStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
  } catch {
    // Keep UI responsive if device storage write fails
  }
}

export async function saveQuestions(questions: QuestionItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
  } catch {
    // Keep UI responsive if device storage write fails
  }
}

export async function saveProfile(profile: StudyProfileState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch {
    // Keep UI responsive if device storage write fails
  }
}

export async function loadBreakEndAtMs(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BREAK_END_AT);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveBreakEndAtMs(endAtMs: number | null): Promise<void> {
  try {
    if (endAtMs === null) {
      await AsyncStorage.removeItem(KEYS.BREAK_END_AT);
    } else {
      await AsyncStorage.setItem(KEYS.BREAK_END_AT, String(endAtMs));
    }
  } catch {
    // Keep UI responsive if device storage write fails
  }
}

export async function resetStudybleData(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(KEYS.ROOMS, JSON.stringify(INITIAL_ROOMS)),
      AsyncStorage.setItem(KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTIONS)),
      AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(INITIAL_PROFILE)),
      AsyncStorage.removeItem(KEYS.BREAK_END_AT),
    ]);
  } catch {
    // Ignore storage reset error and let in-memory state reset cleanly
  }
}
