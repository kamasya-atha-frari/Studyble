# Studyble

**Studyble** is a React Native (Expo) mobile co-working and peer-study application designed with a warm light aesthetic (`#F6F2EA` cream, `#FFFDF9` soft surface, `#1E293B` deep slate, `#2A6F68` sage, and `#E06D53` coral). Students can join category-based live study rooms, sit in a responsive co-working grid, collaborate via upvoted questions and verified archives, request 1-on-1 peer help, unlock specialist badges, take quick memory breaks, tune ambient channels, and share a Study Receipt.

## Tech Stack

- **Framework**: React Native + Expo SDK 58 + TypeScript (`strict: true`)
- **Navigation**: `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
- **Local Persistence**: `@react-native-async-storage/async-storage`

## Key Features

- **Study Rooms & Category Filtering (`RoomsScreen`)**:
  - Filter active live study tables by `All`, `General`, `Major`, `Course`, and `Interest`.
  - Tap **Join Live** / **Enter Live →** to join and open `LiveRoomScreen`.
- **Live Study Room (`LiveRoomScreen`)**:
  - **Responsive Co-Working Grid (`StudyParticipantCard`)**: Adapts cleanly between 4 columns on wider layouts and 2 columns on compact mobile screens, displaying study mode (`avatar` / `desk` / `face`), student name, level badge, specialist badge (`Pro at Statistics`, `Pro at Math`), 1-line study goal, and **Ask 1-on-1** for peers with private chat enabled. Weekly top contributors are prioritized near the top slots.
  - **Quiet / Empty Room Companion Mode**: Toggle **Quiet / Empty Room Demo** to simulate 0 active peers and summon 5 friendly study companion bots, with an option to sit in the room alongside them.
  - **Session Focus Timer**: Start/Pause countdown plus **Complete (+5)** session button that records `completedSessions`, `completedFocusMinutes`, and `+5` points.
  - **Public Chat & Questions + Verified Archive**: Send questions or chat messages with empty-input validation, upvote posts, sort top-voted questions first, and preserve posts reaching `3+` votes in **Verified Archive**.
- **Co-Working Extras (`StudyReceiptModal`, `BreakGameModal`, `AmbientMixerBar`)**:
  - **Study Receipt Modal**: Thermal-paper style summary card showing student name, major/jurusan, completed focus minutes, current study goal, role & level, total points, and earned `"Pro At"` badges, with a **Share Receipt** button using the React Native `Share` API.
  - **Take a Break Mini-Game**: 6-pair (12-card) study-themed memory match modal triggered from **Take a Break** without resetting your active room or running timer.
  - **Ambient Sound Mixer**: Clean 4-channel control bar (`Rain`, `Keyboard`, `Paper`, `Cafe`) with ON/OFF toggles, draggable volume sliders (`0–100%`), quick presets, automatic `AsyncStorage` persistence, live Web Audio API procedural looping playback out of the box, procedural WAV fallback + pluggable `expo-audio`/`expo-av` native adapter, full unmount cleanup, and an `assets/sounds/README.md` setup guide for custom MP3 loops.
- **Level Progression, “Pro At” Quiz & Private Chat Anti-Farming (`ProfileScreen`, `ProQuizModal`, `PrivateChatModal`)**:
  - **Progression Formula**: Every `10` points = `+1` Level (`0–9 pts: Pelajar`, `10–100 pts: Helper`, `110+ pts: Pro Helper`).
  - **“Pro At” Certification Mini-Quiz**: Score `>= 4/5` in Statistics or Math to unlock specialist badges displayed on your profile, participant card, and Study Receipt.
  - **1-on-1 Private Chat & Anti-Farming**: Toggle Private Chat availability (`ON`/`OFF`) in Profile; completing a verified 1-on-1 help session grants `+3` points with a **24-hour anti-farming cooldown per peer** persisted in `AsyncStorage`.
- **Peer Q&A (`QnAScreen`, `QuestionDetailScreen`) & Local Persistence (`storage.ts`)**:
  - All rooms, participants, messages, votes, badges, cooldowns, ambient preferences, and profile stats persist locally via `AsyncStorage` with safe fallback normalizers and a **Reset Demo Data** action.

## Project Structure

```text
Studyble/
├── App.tsx                                # Root navigation & state orchestration
├── assets/
│   └── sounds/
│       └── README.md                      # Setup guide for rain.mp3, keyboard.mp3, paper.mp3, cafe.mp3
├── src/
│   ├── audio/
│   │   ├── ambientSources.ts              # Local MP3 asset registry (safe null defaults)
│   │   ├── proceduralWav.ts               # Pure-TS looping PCM WAV fallback URI generator
│   │   └── ambientAudioEngine.ts          # Cross-platform Web Audio + native Expo audio engine
│   ├── types/studyble.ts                  # Core TypeScript domain models
│   ├── utils/progression.ts               # Level/rank formula, sorting & 24h cooldown helpers
│   ├── storage/storage.ts                 # AsyncStorage persistence, seed data & companion bots
│   ├── theme/tokens.ts                    # Warm light co-working color palette tokens
│   ├── components/
│   │   ├── EmptyStateBox.tsx              # Reusable empty state card
│   │   ├── SectionCard.tsx                # Soft-surface card container
│   │   ├── StudyParticipantCard.tsx       # Participant card (avatar/desk/face, badges, Ask 1-on-1)
│   │   ├── PrivateChatModal.tsx           # 1-on-1 help modal with 24h anti-farming cooldown
│   │   ├── ProQuizModal.tsx               # 5-question "Pro At" specialist certification quiz
│   │   ├── StudyReceiptModal.tsx          # Shareable receipt summary card (React Native Share API)
│   │   ├── BreakGameModal.tsx             # 6-pair (12-card) study memory match break mini-game
│   │   └── AmbientMixerBar.tsx            # 4-channel stateful ambient mixer (Rain, Keyboard, Paper, Cafe)
│   └── screens/
│       ├── RoomsScreen.tsx                # Category-filtered live study rooms directory
│       ├── LiveRoomScreen.tsx             # Study Grid, Focus Timer, Extras Dock, Chat & Archive
│       ├── QnAScreen.tsx                  # Peer Q&A feed & composer
│       ├── QuestionDetailScreen.tsx       # Question detail & peer replies
│       └── ProfileScreen.tsx              # Progression, badges, receipt, ambient mix & settings
└── README.md
```

## Setup & Run with Expo

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Type-check**:
   ```bash
   npx tsc --noEmit
   ```
3. **Start the Expo development server**:
   ```bash
   npx expo start
   ```
4. Scan the QR code with **Expo Go** or press `i` (iOS), `a` (Android), or `w` (Web).
