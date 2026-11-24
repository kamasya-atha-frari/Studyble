export type RoomCategory = 'General' | 'Major' | 'Course' | 'Interest';

export type LiveMessageKind = 'question' | 'chat';

export type StudyMode = 'avatar' | 'desk' | 'face';

export type RankTitle = 'Pelajar' | 'Helper' | 'Pro Helper';

export type AmbientChannelKey = 'rain' | 'keyboard' | 'paper' | 'cafe';

export interface AmbientChannelState {
  active: boolean;
  level: number;
}

export type AmbientMixerState = Record<AmbientChannelKey, AmbientChannelState>;

export interface StudyParticipant {
  id: string;
  name: string;
  studyMode: StudyMode;
  level: number;
  points: number;
  weeklyHelpfulCount: number;
  specialistBadge?: string;
  currentGoal: string;
  privateChatEnabled: boolean;
  privateChatMotif?: string;
  avatarEmoji: string;
  isBot?: boolean;
  isCurrentUser?: boolean;
}

export interface LiveMessageItem {
  id: string;
  sender: string;
  text: string;
  kind: LiveMessageKind;
  votes: number;
  hasVoted: boolean;
  verified: boolean;
  createdAt: string;
}

export interface StudyRoom {
  id: string;
  title: string;
  category: RoomCategory;
  activeStudents: number;
  focusMinutes: number;
  isJoined: boolean;
  messages: LiveMessageItem[];
  participants: StudyParticipant[];
}

export interface AnswerItem {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface QuestionItem {
  id: string;
  title: string;
  detail: string;
  topic: string;
  votes: number;
  hasVoted: boolean;
  answers: AnswerItem[];
}

export interface StudyProfileState {
  studentName: string;
  jurusan: string;
  goal: string;
  points: number;
  completedSessions: number;
  completedFocusMinutes: number;
  defaultFocusMinutes: number;
  studyMode: StudyMode;
  privateChatEnabled: boolean;
  privateChatMotif: string;
  specialistBadges: string[];
  privateChatCooldowns: Record<string, number>;
  ambientMixer: AmbientMixerState;
}
