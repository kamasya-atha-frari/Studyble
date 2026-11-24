export type RoomCategory = 'General' | 'Major' | 'Course' | 'Interest';

export interface LiveMessageItem {
  id: string;
  sender: string;
  text: string;
  isQuestion: boolean;
  votes: number;
  hasVoted: boolean;
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
  points: number;
  completedSessions: number;
  defaultFocusMinutes: number;
}
