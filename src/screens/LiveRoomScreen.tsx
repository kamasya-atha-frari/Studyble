import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AmbientAudioEngine } from '../audio/ambientAudioEngine';
import { AmbientMixerBar, getAmbientSummary } from '../components/AmbientMixerBar';
import {
  ContainerBounds,
  DraggablePomodoroClock,
} from '../components/DraggablePomodoroClock';
import { EmptyStateBox } from '../components/EmptyStateBox';
import { PomodoroDurationModal } from '../components/PomodoroDurationModal';
import { PrivateChatModal } from '../components/PrivateChatModal';
import { SectionCard } from '../components/SectionCard';
import { StudyParticipantCard } from '../components/StudyParticipantCard';
import {
  STUDY_COMPANION_BOTS,
  VERIFIED_VOTE_THRESHOLD,
} from '../storage/storage';
import { COLORS } from '../theme/tokens';
import {
  AmbientMixerState,
  LiveMessageItem,
  LiveMessageKind,
  LiveVoteChoice,
  StudyMode,
  StudyParticipant,
  StudyProfileState,
  StudyRoom,
} from '../types/studyble';
import {
  VerificationResult,
  getPeerCooldownRemainingMs,
  getProgressionInfo,
  sortParticipantsByWeeklyContribution,
} from '../utils/progression';

interface LiveRoomScreenProps {
  room: StudyRoom | undefined;
  profile: StudyProfileState;
  onLeaveRoom: (roomId: string) => void;
  onSendLiveMessage: (roomId: string, text: string, kind: LiveMessageKind) => void;
  onToggleLiveVote: (roomId: string, messageId: string) => void;
  onSubmitLiveAnswer: (roomId: string, questionId: string, answerText: string) => void;
  onVoteLiveAnswer: (roomId: string, answerId: string, choice: LiveVoteChoice) => void;
  onDismissLiveAnswer: (roomId: string) => void;
  onChangeStudyMode: (mode: StudyMode) => void;
  onUpdateGoal: (nextGoal: string) => void;
  onCompletePrivateHelp: (peerId: string, answerId: string) => VerificationResult;
  onUpdateAmbientMixer: (next: AmbientMixerState) => void;
  focusMinutes: number;
  secondsLeft: number;
  breakSecondsLeft: number | null;
  isRunning: boolean;
  isAlarmFinished: boolean;
  isBreakOverlayActive: boolean;
  onSetFocusMinutes: (minutes: number) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onOpenBreakGame: () => void;
}

type LiveViewTab = 'grid' | 'live';
type CameraMode = 'face' | 'desk';

const GRID_COLUMNS = 4;
const PARTICIPANTS_PER_PAGE = 16;

export function LiveRoomScreen({
  room,
  profile,
  onLeaveRoom,
  onSendLiveMessage,
  onToggleLiveVote,
  onSubmitLiveAnswer,
  onVoteLiveAnswer,
  onDismissLiveAnswer,
  onChangeStudyMode,
  onUpdateGoal,
  onCompletePrivateHelp,
  onUpdateAmbientMixer,
  focusMinutes,
  secondsLeft,
  breakSecondsLeft,
  isRunning,
  isAlarmFinished,
  isBreakOverlayActive,
  onSetFocusMinutes,
  onToggleTimer,
  onResetTimer,
  onOpenBreakGame,
}: LiveRoomScreenProps) {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const audioEngineRef = useRef<AmbientAudioEngine | null>(null);
  const pagerRef = useRef<FlatList<StudyParticipant[]> | null>(null);
  const ambientMixerRef = useRef<AmbientMixerState>(profile.ambientMixer);
  useEffect(() => {
    ambientMixerRef.current = profile.ambientMixer;
  }, [profile.ambientMixer]);

  const [activeView, setActiveView] = useState<LiveViewTab>('grid');
  const [emptyRoomDemo, setEmptyRoomDemo] = useState<boolean>(false);
  const [isSeated, setIsSeated] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [activeChatPeer, setActiveChatPeer] = useState<StudyParticipant | null>(
    null
  );
  const [mixerExpanded, setMixerExpanded] = useState<boolean>(false);
  const [clockSettingsOpen, setClockSettingsOpen] = useState<boolean>(false);
  const [screenShareNotice, setScreenShareNotice] = useState<string>('');
  const screenNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Camera confirmation gate (OFF -> ON requires confirmation; Face <-> Desk seamless when ON)
  const [cameraConfirmed, setCameraConfirmed] = useState<boolean>(false);
  const [pendingCameraMode, setPendingCameraMode] = useState<CameraMode | null>(
    null
  );

  const [messageText, setMessageText] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');

  // Room-scoped live question answering & 30s answer voting countdown
  const [isAnsweringLiveQ, setIsAnsweringLiveQ] = useState<boolean>(false);
  const [liveAnswerDraft, setLiveAnswerDraft] = useState<string>('');
  const [liveAnswerError, setLiveAnswerError] = useState<string>('');
  const [voteSecondsLeft, setVoteSecondsLeft] = useState<number>(0);
  const [stageBounds, setStageBounds] = useState<ContainerBounds>({
    width: Math.max(240, width - 16),
    height: Math.max(260, height - 180),
  });

  const handleMainStageLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w <= 0 || h <= 0) return;
    setStageBounds((prev) =>
      prev.width === w && prev.height === h ? prev : { width: w, height: h }
    );
  };

  // Close local sub-modals if a full-screen break/alarm overlay takes over
  useEffect(() => {
    if (isBreakOverlayActive) {
      setActiveChatPeer(null);
      setPendingCameraMode(null);
      setClockSettingsOpen(false);
    }
  }, [isBreakOverlayActive]);

  // Immediately dispose audio and force camera OFF on navigation blur or back-swipe removal
  useEffect(() => {
    const cleanupRoomMedia = () => {
      audioEngineRef.current?.dispose();
      audioEngineRef.current = null;
      setCameraConfirmed(false);
      setPendingCameraMode(null);
      onChangeStudyMode('avatar');
    };
    const unsubBlur = navigation.addListener('blur', cleanupRoomMedia);
    const unsubBeforeRemove = navigation.addListener(
      'beforeRemove',
      cleanupRoomMedia
    );
    return () => {
      unsubBlur();
      unsubBeforeRemove();
    };
  }, [navigation, onChangeStudyMode]);

  // Keep camera OFF on initial room entry and whenever losing focus or unmounting
  useEffect(() => {
    setCameraConfirmed(false);
    setPendingCameraMode(null);
    onChangeStudyMode('avatar');
    return () => {
      setCameraConfirmed(false);
      setPendingCameraMode(null);
      onChangeStudyMode('avatar');
    };
  }, [room?.id, onChangeStudyMode]);

  useEffect(() => {
    if (!isFocused) {
      setCameraConfirmed(false);
      setPendingCameraMode(null);
      setScreenShareNotice('');
      onChangeStudyMode('avatar');
    }
  }, [isFocused, onChangeStudyMode]);

  useEffect(() => {
    return () => {
      if (screenNoticeTimerRef.current !== null) {
        clearTimeout(screenNoticeTimerRef.current);
        screenNoticeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (profile.studyMode === 'avatar' || profile.studyMode === 'screen') {
      setCameraConfirmed(false);
      setPendingCameraMode(null);
    }
  }, [profile.studyMode]);

  // Only run ambient audio while inside a live room and focused; dispose immediately on blur/unmount
  useEffect(() => {
    if (!room?.id || !isFocused) {
      audioEngineRef.current?.dispose();
      audioEngineRef.current = null;
      return;
    }

    const engine = new AmbientAudioEngine();
    audioEngineRef.current = engine;
    engine.syncMixer(ambientMixerRef.current);

    return () => {
      engine.dispose();
      if (audioEngineRef.current === engine) {
        audioEngineRef.current = null;
      }
    };
  }, [isFocused, room?.id]);

  // Sync live mixer volume/toggle updates while focused inside the room
  useEffect(() => {
    if (!room?.id || !isFocused || !audioEngineRef.current) return;
    audioEngineRef.current.syncMixer(profile.ambientMixer);
  }, [profile.ambientMixer, isFocused, room?.id]);

  useEffect(() => {
    setEmptyRoomDemo(false);
    setIsSeated(true);
    setCurrentPage(0);
    setActiveView('grid');
    setMixerExpanded(false);
    setClockSettingsOpen(false);
    setScreenShareNotice('');
    setIsAnsweringLiveQ(false);
    setLiveAnswerDraft('');
    setLiveAnswerError('');
  }, [room?.id]);

  // Reset answer composer whenever the active live question is cleared or changes
  const activeLiveQuestionId = room?.activeLiveQuestion?.id ?? null;
  useEffect(() => {
    if (!activeLiveQuestionId) {
      setIsAnsweringLiveQ(false);
      setLiveAnswerDraft('');
      setLiveAnswerError('');
    }
  }, [activeLiveQuestionId]);

  // Tick local 30-second countdown display for this room's active live answer
  const activeAnswerVoteEnd =
    room?.activeLiveAnswer?.status === 'voting'
      ? room.activeLiveAnswer.voteEndsAtMs
      : null;

  useEffect(() => {
    if (activeAnswerVoteEnd === null) {
      setVoteSecondsLeft(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(
        0,
        Math.ceil((activeAnswerVoteEnd - Date.now()) / 1000)
      );
      setVoteSecondsLeft(remaining);
    };

    updateRemaining();
    const intervalId = setInterval(updateRemaining, 250);
    return () => clearInterval(intervalId);
  }, [activeAnswerVoteEnd]);

  const isOnBreak = breakSecondsLeft !== null && breakSecondsLeft > 0;
  const isAlarmRinging = isAlarmFinished || secondsLeft === 0;
  const isCameraOn =
    cameraConfirmed &&
    (profile.studyMode === 'face' || profile.studyMode === 'desk');

  const progression = useMemo(
    () => getProgressionInfo(profile.points),
    [profile.points]
  );

  const currentUserParticipant = useMemo<StudyParticipant>(
    () => ({
      id: 'current-user',
      name: profile.studentName,
      studyMode: profile.studyMode,
      level: progression.level,
      points: profile.points,
      weeklyHelpfulCount: 0,
      specialistBadge: profile.specialistBadges[0],
      currentGoal: profile.goal,
      privateChatEnabled: profile.privateChatEnabled,
      privateChatMotif: profile.privateChatMotif,
      avatarEmoji: '🧑‍💻',
      isCurrentUser: true,
    }),
    [profile, progression.level]
  );

  const { displayedParticipants, topContributorIds, showingCompanionBots } =
    useMemo(() => {
      const rawPeers = emptyRoomDemo ? [] : room?.participants ?? [];
      const noPeersActive = rawPeers.length === 0;

      if (noPeersActive) {
        const botsWithOptionalUser = isSeated
          ? [currentUserParticipant, ...STUDY_COMPANION_BOTS]
          : STUDY_COMPANION_BOTS;
        return {
          displayedParticipants: botsWithOptionalUser,
          topContributorIds: new Set<string>(),
          showingCompanionBots: true,
        };
      }

      const sortedPeers = sortParticipantsByWeeklyContribution(rawPeers);
      const topIds = new Set(
        sortedPeers
          .filter((peer) => peer.weeklyHelpfulCount > 0)
          .slice(0, 2)
          .map((peer) => peer.id)
      );

      // Keep top weekly contributor at slot #1, seat user right near the top when seated
      const list = isSeated
        ? [sortedPeers[0], currentUserParticipant, ...sortedPeers.slice(1)]
        : sortedPeers;

      return {
        displayedParticipants: list,
        topContributorIds: topIds,
        showingCompanionBots: false,
      };
    }, [room?.participants, emptyRoomDemo, isSeated, currentUserParticipant]);

  // Split participants into pages of 16 (4x4 per slide)
  const participantPages = useMemo<StudyParticipant[][]>(() => {
    if (displayedParticipants.length === 0) return [[]];
    const pages: StudyParticipant[][] = [];
    for (
      let i = 0;
      i < displayedParticipants.length;
      i += PARTICIPANTS_PER_PAGE
    ) {
      pages.push(displayedParticipants.slice(i, i + PARTICIPANTS_PER_PAGE));
    }
    return pages;
  }, [displayedParticipants]);

  // Clamp currentPage when participant list shrinks (e.g., toggling Quiet Room Demo)
  useEffect(() => {
    if (currentPage >= participantPages.length) {
      setCurrentPage(Math.max(0, participantPages.length - 1));
    }
  }, [currentPage, participantPages.length]);

  // Keep all public live questions ordered newest-first
  const newestLiveMessages = useMemo<LiveMessageItem[]>(() => {
    if (!room) return [];
    return [...room.messages]
      .filter((msg) => msg.kind === 'question')
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  }, [room]);

  if (!room) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <EmptyStateBox
            title="Live room unavailable"
            subtitle="This study room could not be found. Return to Study Rooms to pick another active table."
          />
        </View>
      </SafeAreaView>
    );
  }

  const pageWidth = Math.min(Math.max(300, width - 16), 680);

  const handleLeave = () => {
    audioEngineRef.current?.dispose();
    audioEngineRef.current = null;
    setCameraConfirmed(false);
    setPendingCameraMode(null);
    onChangeStudyMode('avatar');
    onLeaveRoom(room.id);
  };

  const handleToggleCameraTool = (targetMode: CameraMode) => {
    setMixerExpanded(false);

    // Tapping the currently active camera tool turns it OFF back to avatar
    if (isCameraOn && profile.studyMode === targetMode) {
      setCameraConfirmed(false);
      setPendingCameraMode(null);
      onChangeStudyMode('avatar');
      return;
    }

    // If a camera is already ON, switch seamlessly between Camera (face) <-> Desk without re-prompting
    if (isCameraOn) {
      setPendingCameraMode(null);
      onChangeStudyMode(targetMode);
      return;
    }

    // Turning camera ON from OFF ('avatar' or 'screen') always shows confirmation gate first
    setPendingCameraMode(targetMode);
  };

  const showTemporaryScreenNotice = (message: string) => {
    if (screenNoticeTimerRef.current !== null) {
      clearTimeout(screenNoticeTimerRef.current);
      screenNoticeTimerRef.current = null;
    }
    setScreenShareNotice(message);
    screenNoticeTimerRef.current = setTimeout(() => {
      screenNoticeTimerRef.current = null;
      setScreenShareNotice('');
    }, 2600);
  };

  const handleToggleScreenShare = () => {
    setMixerExpanded(false);
    setPendingCameraMode(null);
    setCameraConfirmed(false);
    if (profile.studyMode === 'screen') {
      onChangeStudyMode('avatar');
      showTemporaryScreenNotice('Screen sharing stopped.');
      return;
    }
    onChangeStudyMode('screen');
    showTemporaryScreenNotice('Screen sharing started · Live in this room');
  };

  const handleConfirmCameraOn = () => {
    if (!pendingCameraMode) return;
    const targetMode = pendingCameraMode;
    setPendingCameraMode(null);
    setCameraConfirmed(true);
    onChangeStudyMode(targetMode);
  };

  const handleCancelCameraPrompt = () => {
    setPendingCameraMode(null);
  };

  const handleGoToPage = (nextIndex: number) => {
    const clamped = Math.max(
      0,
      Math.min(participantPages.length - 1, nextIndex)
    );
    setCurrentPage(clamped);
    pagerRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  const handlePagerScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / pageWidth);
    if (nextIndex >= 0 && nextIndex < participantPages.length) {
      setCurrentPage(nextIndex);
    }
  };

  const handleSend = () => {
    const clean = messageText.trim();
    if (!clean) {
      setInputError('Please enter a question before sending.');
      return;
    }

    onSendLiveMessage(room.id, clean, 'question');
    setMessageText('');
    setInputError('');
    setActiveView('grid');
  };

  const handleSubmitAnswerBubble = () => {
    const activeQ = room.activeLiveQuestion;
    if (!activeQ) return;
    const clean = liveAnswerDraft.trim();
    if (!clean) {
      setLiveAnswerError('Please write an answer before submitting.');
      return;
    }
    onSubmitLiveAnswer(room.id, activeQ.id, clean);
    setIsAnsweringLiveQ(false);
    setLiveAnswerDraft('');
    setLiveAnswerError('');
  };

  const displaySeconds =
    isOnBreak && breakSecondsLeft !== null ? breakSecondsLeft : secondsLeft;
  const ambientSummary = getAmbientSummary(profile.ambientMixer);
  const hasAmbientOn = ambientSummary !== 'Off';
  const isChatOpen = activeView !== 'grid';
  const isFaceActive = isCameraOn && profile.studyMode === 'face';
  const isDeskActive = isCameraOn && profile.studyMode === 'desk';
  const isScreenSharing = profile.studyMode === 'screen';

  const renderGridPage = (pageParticipants: StudyParticipant[]) => {
    const rows: StudyParticipant[][] = [];
    for (let i = 0; i < pageParticipants.length; i += GRID_COLUMNS) {
      rows.push(pageParticipants.slice(i, i + GRID_COLUMNS));
    }

    return (
      <ScrollView
        style={{ width: pageWidth }}
        contentContainerStyle={styles.gridPageContent}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((rowItems, rowIndex) => {
          const emptySlots = Math.max(0, GRID_COLUMNS - rowItems.length);
          return (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {rowItems.map((item) => {
                const cooldownMs = getPeerCooldownRemainingMs(
                  profile.privateChatCooldowns,
                  item.id
                );
                return (
                  <View key={item.id} style={styles.gridCell}>
                    <StudyParticipantCard
                      participant={item}
                      roomTitle={room.title}
                      compact
                      isScreenFocused={isFocused}
                      isTopContributor={topContributorIds.has(item.id)}
                      isOnCooldown={cooldownMs > 0}
                      isCameraConfirmed={
                        item.isCurrentUser ? cameraConfirmed : undefined
                      }
                      onAskPrivateChat={(peer) => setActiveChatPeer(peer)}
                      onUpdateGoal={
                        item.isCurrentUser ? onUpdateGoal : undefined
                      }
                    />
                  </View>
                );
              })}
              {Array.from({ length: emptySlots }).map((_, idx) => (
                <View key={`spacer-${rowIndex}-${idx}`} style={styles.gridCell} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderMessageCard = ({ item }: { item: LiveMessageItem }) => {
    const isDiscarded = item.status === 'discarded';
    const isAccepted =
      !isDiscarded &&
      (item.status === 'accepted' ||
        item.verified ||
        item.votes >= VERIFIED_VOTE_THRESHOLD);
    const isVoteLocked = isAccepted && item.hasVoted;

    return (
      <SectionCard
        style={[
          styles.msgCard,
          isAccepted && styles.verifiedCard,
          isDiscarded && styles.discardedCard,
        ]}
      >
        <View style={styles.msgHeader}>
          <View style={styles.msgMetaLeft}>
            <Text
              style={[
                styles.senderText,
                isDiscarded && styles.discardedMutedText,
              ]}
            >
              {item.sender}
            </Text>
            {isAccepted ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Accepted</Text>
              </View>
            ) : isDiscarded ? (
              <View style={styles.discardedBadge}>
                <Text style={styles.discardedBadgeText}>Downvoted</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.timeText}>{item.createdAt}</Text>
        </View>

        <Text
          style={[styles.msgBody, isDiscarded && styles.discardedMutedText]}
        >
          {item.text}
        </Text>

        {item.answerText ? (
          <View
            style={[
              styles.answerBoxInCard,
              isDiscarded && styles.answerBoxDiscarded,
            ]}
          >
            <Text
              style={[
                styles.answerAuthorText,
                isDiscarded && styles.discardedMutedText,
              ]}
            >
              Answer · {item.answererName ?? 'Peer'}
            </Text>
            <Text
              style={[
                styles.answerBodyText,
                isDiscarded && styles.discardedMutedText,
              ]}
            >
              {item.answerText}
            </Text>
          </View>
        ) : null}

        <View style={styles.msgFooter}>
          <Text
            style={[
              styles.verifyHint,
              isDiscarded && styles.discardedMutedText,
            ]}
          >
            {item.resolutionNote ??
              (isDiscarded
                ? 'Downvoted · Discarded (+0 pts)'
                : isAccepted
                  ? 'Accepted · Archived in Peer Q&A'
                  : 'Open live question')}
          </Text>
          {!isDiscarded ? (
            <Pressable
              style={[
                styles.voteBtn,
                item.hasVoted && styles.voteBtnActive,
                isVoteLocked && styles.voteBtnLocked,
              ]}
              onPress={() => onToggleLiveVote(room.id, item.id)}
              disabled={isVoteLocked}
            >
              <Text
                style={[
                  styles.voteText,
                  item.hasVoted && styles.voteTextActive,
                  isVoteLocked && styles.voteTextLocked,
                ]}
              >
                {isVoteLocked
                  ? `✓ Accepted (${item.votes})`
                  : `▲ ${item.hasVoted ? 'Upvoted' : 'Upvote'} (${item.votes})`}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.discardedTally}>
              ▲ {item.upVotes ?? 0} · ▼ {item.downVotes ?? 0}
            </Text>
          )}
        </View>
      </SectionCard>
    );
  };

  const hasFloatingLiveBubble = Boolean(
    room.activeLiveQuestion || room.activeLiveAnswer
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Minimal Top Header: Leave, Room Title, Rank & Level (no points, no participant count) */}
          <View style={styles.minimalTopBar}>
            <Pressable style={styles.leaveBtn} onPress={handleLeave}>
              <Text style={styles.leaveBtnText}>← Leave</Text>
            </Pressable>

            <View style={styles.topTitleBlock}>
              <Text style={styles.roomTitle} numberOfLines={1}>
                {room.title}
              </Text>
              <Text style={styles.roomSubMeta} numberOfLines={1}>
                ● LIVE · {room.category}
              </Text>
            </View>

            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText} numberOfLines={1}>
                {progression.rankTitle} Lv.{progression.level}
              </Text>
            </View>
          </View>

          {/* Main Content Stage: Compact 4x4 Participant Grid OR Chat & Q&A */}
          <View style={styles.mainStage} onLayout={handleMainStageLayout}>
            <View
              style={[
                styles.flex,
                hasFloatingLiveBubble && styles.blurredStageContent,
              ]}
            >
              {isScreenSharing ? (
                <View style={styles.screenShareBanner}>
                  <Text style={styles.screenShareBannerText} numberOfLines={1}>
                    ● LIVE SCREEN SHARE · Sharing your screen in {room.title}
                  </Text>
                  <Pressable
                    style={styles.screenShareStopBtn}
                    onPress={handleToggleScreenShare}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Stop sharing screen"
                  >
                    <Text style={styles.screenShareStopBtnText}>Stop</Text>
                  </Pressable>
                </View>
              ) : screenShareNotice ? (
                <View style={styles.screenShareStoppedNotice}>
                  <Text style={styles.screenShareStoppedText} numberOfLines={1}>
                    {screenShareNotice}
                  </Text>
                </View>
              ) : null}

              {activeView === 'grid' ? (
                <View style={styles.gridStageCenter}>
                  {showingCompanionBots ? (
                    <View style={[styles.botBanner, { width: pageWidth }]}>
                      <Text style={styles.botBannerTitle}>
                        Quiet Room Mode · Companion bots at the table
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.gridFrame, { width: pageWidth }]}>
                    {participantPages.length === 1 ? (
                      renderGridPage(participantPages[0])
                    ) : (
                      <>
                        <FlatList
                          ref={pagerRef}
                          style={styles.pagerList}
                          data={participantPages}
                          extraData={`${profile.studyMode}-${cameraConfirmed}-${isFocused}-${room.title}`}
                          horizontal
                          pagingEnabled
                          initialNumToRender={1}
                          maxToRenderPerBatch={2}
                          windowSize={3}
                          showsHorizontalScrollIndicator={false}
                          keyExtractor={(_, idx) => `page-${idx}`}
                          onMomentumScrollEnd={handlePagerScrollEnd}
                          getItemLayout={(_, index) => ({
                            length: pageWidth,
                            offset: pageWidth * index,
                            index,
                          })}
                          renderItem={({ item }) => renderGridPage(item)}
                        />
                        <View style={styles.paginationRow}>
                          <Pressable
                            style={[
                              styles.pageArrowBtn,
                              currentPage === 0 && styles.pageArrowBtnDisabled,
                            ]}
                            onPress={() => handleGoToPage(currentPage - 1)}
                            disabled={currentPage === 0}
                            accessibilityRole="button"
                            accessibilityLabel="Previous slide"
                          >
                            <Text style={styles.pageArrowText}>‹</Text>
                          </Pressable>

                          <View style={styles.slideLabelWrap}>
                            <Text style={styles.slideLabelText}>
                              Slide {currentPage + 1} / {participantPages.length}
                            </Text>
                            <View style={styles.dotsRow}>
                              {participantPages.map((_, idx) => (
                                <Pressable
                                  key={`dot-${idx}`}
                                  style={[
                                    styles.pageDot,
                                    idx === currentPage && styles.pageDotActive,
                                  ]}
                                  onPress={() => handleGoToPage(idx)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Go to Slide ${idx + 1}`}
                                />
                              ))}
                            </View>
                          </View>

                          <Pressable
                            style={[
                              styles.pageArrowBtn,
                              currentPage === participantPages.length - 1 &&
                              styles.pageArrowBtnDisabled,
                            ]}
                            onPress={() => handleGoToPage(currentPage + 1)}
                            disabled={currentPage === participantPages.length - 1}
                            accessibilityRole="button"
                            accessibilityLabel="Next slide"
                          >
                            <Text style={styles.pageArrowText}>›</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.flex}>
                  <FlatList
                    data={newestLiveMessages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <EmptyStateBox
                        title="No questions yet"
                        subtitle="Post a study question below to share it with everyone in this live room."
                      />
                    }
                    renderItem={renderMessageCard}
                  />

                  {/* Direct Question Input Box Only (no Ask / Public Chat toggle) */}
                  <SectionCard style={styles.inputCard}>
                    <View style={styles.sendRow}>
                      <TextInput
                        style={[
                          styles.input,
                          inputError ? styles.inputErrorBorder : null,
                        ]}
                        placeholder="Ask a public question..."
                        placeholderTextColor={COLORS.textMuted}
                        value={messageText}
                        onChangeText={(text) => {
                          setMessageText(text);
                          if (inputError) setInputError('');
                        }}
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                      />
                      <Pressable style={styles.sendBtn} onPress={handleSend}>
                        <Text style={styles.sendBtnText}>Send</Text>
                      </Pressable>
                    </View>

                    {inputError ? (
                      <Text style={styles.errorText}>{inputError}</Text>
                    ) : null}
                  </SectionCard>
                </View>
              )}
            </View>

            {/* Self-Contained Floating Pomodoro Alarm Clock (1x Tap: Start/Pause, 2x Tap: Settings) */}
            <DraggablePomodoroClock
              size={78}
              zIndex={15}
              initialCorner="bottom-right"
              containerBounds={stageBounds}
              isRunning={isRunning}
              isAlarmRinging={isAlarmRinging}
              onSingleTap={isOnBreak ? onOpenBreakGame : onToggleTimer}
              onDoubleTap={() => {
                if (isOnBreak) {
                  onOpenBreakGame();
                  return;
                }
                setMixerExpanded(false);
                setClockSettingsOpen(true);
              }}
              accessibilityLabel={
                isOnBreak
                  ? 'Break timer active. Tap to open break mini-game.'
                  : isRunning
                    ? 'Pomodoro alarm clock running. Single tap to pause, double tap for timer controls, or drag to move.'
                    : 'Pomodoro alarm clock paused. Single tap to start, double tap for timer controls, or drag to move.'
              }
            />

            {/* Frosted Blur Backdrop + Clean Floating Rounded Cards (no cloud decorations) */}
            {hasFloatingLiveBubble ? (
              <View
                style={[StyleSheet.absoluteFill, styles.floatingOverlayLayer]}
                pointerEvents="auto"
              >
                <View style={styles.floatingCardStack}>
                  {/* Floating Question Card (room-scoped until answered) */}
                  {room.activeLiveQuestion ? (
                    <View style={styles.floatingCard}>
                      <View style={styles.liveBubbleTopRow}>
                        <Text
                          style={styles.liveQuestionEyebrow}
                          numberOfLines={1}
                        >
                          LIVE QUESTION · {room.activeLiveQuestion.askerName}
                        </Text>
                        {!isAnsweringLiveQ ? (
                          <Pressable
                            style={styles.answerClaimBtn}
                            onPress={() => {
                              setIsAnsweringLiveQ(true);
                              setLiveAnswerError('');
                            }}
                          >
                            <Text style={styles.answerClaimBtnText}>
                              Answer
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            style={styles.answerCancelBtn}
                            onPress={() => {
                              setIsAnsweringLiveQ(false);
                              setLiveAnswerDraft('');
                              setLiveAnswerError('');
                            }}
                          >
                            <Text style={styles.answerCancelBtnText}>
                              Cancel
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      <Text style={styles.liveQuestionText}>
                        {room.activeLiveQuestion.text}
                      </Text>

                      {isAnsweringLiveQ ? (
                        <View style={styles.liveAnswerComposer}>
                          <View style={styles.liveAnswerInputRow}>
                            <TextInput
                              style={styles.liveAnswerInput}
                              value={liveAnswerDraft}
                              onChangeText={(text) => {
                                setLiveAnswerDraft(text);
                                if (liveAnswerError) setLiveAnswerError('');
                              }}
                              placeholder="Write your answer for the group..."
                              placeholderTextColor={COLORS.textMuted}
                              autoFocus
                              returnKeyType="send"
                              onSubmitEditing={handleSubmitAnswerBubble}
                            />
                            <Pressable
                              style={styles.liveAnswerSubmitBtn}
                              onPress={handleSubmitAnswerBubble}
                            >
                              <Text style={styles.liveAnswerSubmitText}>
                                Submit
                              </Text>
                            </Pressable>
                          </View>
                          {liveAnswerError ? (
                            <Text style={styles.errorText}>
                              {liveAnswerError}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={styles.floatingHintText}>
                          Tap Answer to help your study group with this question.
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {/* Floating Answer Card + 30-Second Community Vote (unified card style) */}
                  {room.activeLiveAnswer ? (
                    <View
                      style={[
                        styles.floatingCard,
                        room.activeLiveAnswer.status === 'accepted' &&
                        styles.floatingCardAccepted,
                        room.activeLiveAnswer.status === 'discarded' &&
                        styles.floatingCardDiscarded,
                      ]}
                    >
                      <View style={styles.liveBubbleTopRow}>
                        <Text
                          style={[
                            styles.liveAnswerEyebrow,
                            room.activeLiveAnswer.status === 'discarded' &&
                            styles.discardedMutedText,
                          ]}
                          numberOfLines={1}
                        >
                          LIVE ANSWER · {room.activeLiveAnswer.answererName}
                        </Text>

                        {room.activeLiveAnswer.status === 'voting' ? (
                          <View style={styles.voteTimerPill}>
                            <Text style={styles.voteTimerText}>
                              ⏱ {voteSecondsLeft}s
                            </Text>
                          </View>
                        ) : (
                          <Pressable
                            style={styles.dismissBubbleBtn}
                            onPress={() => onDismissLiveAnswer(room.id)}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Close answer card"
                          >
                            <Text style={styles.dismissBubbleText}>Close</Text>
                          </Pressable>
                        )}
                      </View>

                      <Text
                        style={styles.liveAnswerQuestionRef}
                        numberOfLines={2}
                      >
                        Question: {room.activeLiveAnswer.questionText}
                      </Text>

                      <Text
                        style={[
                          styles.liveAnswerText,
                          room.activeLiveAnswer.status === 'discarded' &&
                          styles.discardedMutedText,
                        ]}
                      >
                        {room.activeLiveAnswer.text}
                      </Text>

                      {room.activeLiveAnswer.status === 'voting' ? (
                        <>
                          <Text style={styles.floatingHintText}>
                            Vote within {voteSecondsLeft}s — more upvotes accepts this answer (+1 pt).
                          </Text>
                          <View style={styles.voteActionRow}>
                            <Pressable
                              style={[
                                styles.voteChoiceBtn,
                                room.activeLiveAnswer.userVote === 'up' &&
                                styles.voteChoiceUpActive,
                              ]}
                              onPress={() =>
                                onVoteLiveAnswer(
                                  room.id,
                                  room.activeLiveAnswer!.id,
                                  'up'
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.voteChoiceText,
                                  room.activeLiveAnswer.userVote === 'up' &&
                                  styles.voteChoiceTextActive,
                                ]}
                              >
                                ▲ Upvote ({room.activeLiveAnswer.upVotes})
                              </Text>
                            </Pressable>

                            <Pressable
                              style={[
                                styles.voteChoiceBtn,
                                room.activeLiveAnswer.userVote === 'down' &&
                                styles.voteChoiceDownActive,
                              ]}
                              onPress={() =>
                                onVoteLiveAnswer(
                                  room.id,
                                  room.activeLiveAnswer!.id,
                                  'down'
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.voteChoiceText,
                                  room.activeLiveAnswer.userVote === 'down' &&
                                  styles.voteChoiceTextActive,
                                ]}
                              >
                                ▼ Downvote ({room.activeLiveAnswer.downVotes})
                              </Text>
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <View
                          style={[
                            styles.resolutionBanner,
                            room.activeLiveAnswer.status === 'discarded' &&
                            styles.resolutionBannerDiscarded,
                          ]}
                        >
                          <Text
                            style={[
                              styles.resolutionText,
                              room.activeLiveAnswer.status === 'discarded' &&
                              styles.resolutionTextDiscarded,
                            ]}
                          >
                            {room.activeLiveAnswer.resolutionNote ??
                              (room.activeLiveAnswer.status === 'accepted'
                                ? 'Accepted · Ready to use (+1 pt)'
                                : 'Downvoted · Discarded (+0 pts)')}
                          </Text>
                          <Text style={styles.resolutionTally}>
                            ▲ {room.activeLiveAnswer.upVotes} · ▼{' '}
                            {room.activeLiveAnswer.downVotes}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          {/* Expandable Ambient Sound Mixer right above Bottom Dock */}
          {mixerExpanded ? (
            <View style={styles.mixerPopoverWrap}>
              <AmbientMixerBar
                mixer={profile.ambientMixer}
                expanded={mixerExpanded}
                onToggleExpand={() => setMixerExpanded((prev) => !prev)}
                onChange={onUpdateAmbientMixer}
              />
            </View>
          ) : null}

          {/* Compact Centered Bottom Tools Bar: Camera, Desk, Share Screen, Ambient, Quiet, Chat */}
          <View style={styles.bottomDock}>
            {/* 1. Camera (Front Face) */}
            <Pressable
              style={[styles.dockItem, isFaceActive && styles.dockItemActive]}
              onPress={() => handleToggleCameraTool('face')}
              accessibilityRole="button"
              accessibilityLabel={
                isFaceActive ? 'Turn off front camera' : 'Turn on front camera'
              }
            >
              <Text style={styles.dockIcon}>📷</Text>
              <Text
                style={[
                  styles.dockLabel,
                  isFaceActive && styles.dockLabelActive,
                ]}
                numberOfLines={1}
              >
                Camera
              </Text>
            </Pressable>

            {/* 2. Desk Camera */}
            <Pressable
              style={[styles.dockItem, isDeskActive && styles.dockItemActive]}
              onPress={() => handleToggleCameraTool('desk')}
              accessibilityRole="button"
              accessibilityLabel={
                isDeskActive ? 'Turn off desk camera' : 'Turn on desk camera'
              }
            >
              <Text style={styles.dockIcon}>💡</Text>
              <Text
                style={[
                  styles.dockLabel,
                  isDeskActive && styles.dockLabelActive,
                ]}
                numberOfLines={1}
              >
                Desk
              </Text>
            </Pressable>

            {/* 3. Share Screen */}
            <Pressable
              style={[
                styles.dockItem,
                isScreenSharing && styles.dockItemScreenActive,
              ]}
              onPress={handleToggleScreenShare}
              accessibilityRole="button"
              accessibilityState={{ selected: isScreenSharing }}
              accessibilityLabel={
                isScreenSharing ? 'Stop sharing screen' : 'Share screen'
              }
            >
              <Text style={styles.dockIcon}>
                {isScreenSharing ? '🔴' : '🖥️'}
              </Text>
              <Text
                style={[
                  styles.dockLabel,
                  isScreenSharing && styles.dockLabelActive,
                ]}
                numberOfLines={1}
              >
                {isScreenSharing ? 'Stop Share' : 'Screen'}
              </Text>
            </Pressable>

            {/* 4. Ambient Sound Mixer */}
            <Pressable
              style={[
                styles.dockItem,
                (mixerExpanded || hasAmbientOn) && styles.dockItemActive,
              ]}
              onPress={() => setMixerExpanded((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Toggle ambient sound mixer"
            >
              <Text style={styles.dockIcon}>🎧</Text>
              <Text
                style={[
                  styles.dockLabel,
                  (mixerExpanded || hasAmbientOn) && styles.dockLabelActive,
                ]}
                numberOfLines={1}
              >
                {hasAmbientOn ? 'Sound' : 'Ambient'}
              </Text>
            </Pressable>

            {/* 5. Quiet / Companion Bots */}
            <Pressable
              style={[styles.dockItem, emptyRoomDemo && styles.dockItemActive]}
              onPress={() => setEmptyRoomDemo((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Toggle Quiet or Empty Room Demo"
            >
              <Text style={styles.dockIcon}>🌙</Text>
              <Text
                style={[
                  styles.dockLabel,
                  emptyRoomDemo && styles.dockLabelActive,
                ]}
                numberOfLines={1}
              >
                Quiet
              </Text>
            </Pressable>

            {/* 6. Live Questions Chat */}
            <Pressable
              style={[styles.dockItem, isChatOpen && styles.dockItemActive]}
              onPress={() => {
                setMixerExpanded(false);
                setActiveView((prev) => (prev === 'grid' ? 'live' : 'grid'));
              }}
              accessibilityRole="button"
              accessibilityLabel={
                isChatOpen
                  ? 'Close live question input'
                  : 'Open live question input'
              }
            >
              <Text style={styles.dockIcon}>💬</Text>
              <Text
                style={[
                  styles.dockLabel,
                  isChatOpen && styles.dockLabelActive,
                ]}
                numberOfLines={1}
              >
                Chat
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Universal Camera Turn-On Confirmation Gate Modal (OFF -> ON) */}
      <Modal
        visible={pendingCameraMode !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelCameraPrompt}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>CAMERA HEADS-UP</Text>
            <Text style={styles.modalTitle}>Ready to turn on your camera?</Text>
            <Text style={styles.modalBody}>
              {pendingCameraMode === 'desk'
                ? 'Turning on Desk mode activates your camera (starting with the rear lens) in the live study room. Take a moment to get ready or adjust your space before continuing.'
                : 'Turning on Face mode activates your front-facing camera in the live study room. Take a moment to get ready—for example, put on your hijab or adjust your desk—before continuing.'}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={handleCancelCameraPrompt}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCameraOn}
              >
                <Text style={styles.modalConfirmText}>Turn On Camera</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PomodoroDurationModal
        visible={clockSettingsOpen}
        focusMinutes={focusMinutes}
        secondsLeft={displaySeconds}
        isRunning={isRunning}
        isAlarmFinished={isAlarmFinished}
        onSetFocusMinutes={onSetFocusMinutes}
        onToggleTimer={onToggleTimer}
        onResetTimer={onResetTimer}
        onClose={() => setClockSettingsOpen(false)}
      />

      <PrivateChatModal
        visible={activeChatPeer !== null}
        peer={activeChatPeer}
        studentName={profile.studentName}
        cooldownRemainingMs={
          activeChatPeer
            ? getPeerCooldownRemainingMs(
              profile.privateChatCooldowns,
              activeChatPeer.id
            )
            : 0
        }
        verifiedItemIds={profile.verifiedItemIds}
        onClose={() => setActiveChatPeer(null)}
        onCompleteVerifiedSession={onCompletePrivateHelp}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  minimalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  leaveBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.16)',
  },
  leaveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cream,
  },
  topTitleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  roomTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.surface,
  },
  roomSubMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.coral,
  },
  rankBadge: {
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: 112,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.cream,
  },
  mainStage: {
    flex: 1,
    position: 'relative',
  },
  blurredStageContent: {
    opacity: 0.25,
  },
  floatingOverlayLayer: {
    backgroundColor: 'rgba(244, 239, 228, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 20,
    elevation: 20,
    borderRadius: 14,
  },
  floatingCardStack: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  floatingCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  floatingCardAccepted: {
    backgroundColor: '#F6FCFA',
    borderColor: COLORS.sage,
  },
  floatingCardDiscarded: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  floatingHintText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  liveBubbleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  liveQuestionEyebrow: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: COLORS.coral,
  },
  liveQuestionText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navy,
    lineHeight: 21,
  },
  answerClaimBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  answerClaimBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.surface,
  },
  answerCancelBtn: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
  },
  answerCancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  liveAnswerComposer: {
    gap: 5,
    marginTop: 2,
  },
  liveAnswerInputRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  liveAnswerInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.navy,
  },
  liveAnswerSubmitBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  liveAnswerSubmitText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.surface,
  },
  liveAnswerEyebrow: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: COLORS.sage,
  },
  voteTimerPill: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  voteTimerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.cream,
    fontVariant: ['tabular-nums'],
  },
  dismissBubbleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dismissBubbleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navy,
  },
  liveAnswerQuestionRef: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  liveAnswerText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navy,
    lineHeight: 21,
  },
  voteActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  voteChoiceBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8.5,
    borderRadius: 10,
    alignItems: 'center',
  },
  voteChoiceUpActive: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  voteChoiceDownActive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  voteChoiceText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  voteChoiceTextActive: {
    color: COLORS.surface,
  },
  resolutionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.sageSoft,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 2,
  },
  resolutionBannerDiscarded: {
    backgroundColor: '#D1D5DB',
  },
  resolutionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.sage,
  },
  resolutionTextDiscarded: {
    color: '#4B5563',
  },
  resolutionTally: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
  },
  gridStageCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridFrame: {
    flexShrink: 1,
    maxHeight: '100%',
  },
  pagerList: {
    flexGrow: 0,
  },
  botBanner: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  botBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sage,
    textAlign: 'center',
  },
  gridPageContent: {
    gap: 6,
    paddingVertical: 2,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  gridCell: {
    flex: 1,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
  },
  slideLabelWrap: {
    alignItems: 'center',
    gap: 4,
  },
  slideLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navy,
  },
  pageArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageArrowBtnDisabled: {
    opacity: 0.35,
  },
  pageArrowText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  pageDotActive: {
    width: 18,
    backgroundColor: COLORS.navy,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  segmentedBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 7,
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: COLORS.navy,
  },
  segmentTabArchiveActive: {
    backgroundColor: COLORS.sage,
  },
  segmentTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  segmentTabTextActive: {
    color: COLORS.surface,
  },
  backToGridBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },
  backToGridText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navy,
  },
  listContent: {
    gap: 9,
    paddingBottom: 10,
  },
  msgCard: {
    gap: 8,
    padding: 13,
  },
  verifiedCard: {
    borderColor: COLORS.sage,
    backgroundColor: '#FAFDFC',
  },
  discardedCard: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  discardedMutedText: {
    color: '#6B7280',
  },
  discardedBadge: {
    backgroundColor: '#D1D5DB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discardedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  answerBoxInCard: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  answerBoxDiscarded: {
    backgroundColor: '#D1D5DB',
    borderColor: '#9CA3AF',
  },
  answerAuthorText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.sage,
  },
  answerBodyText: {
    fontSize: 13,
    color: COLORS.navy,
    lineHeight: 18,
  },
  discardedTally: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  msgMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  senderText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  kindBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  kindQuestion: {
    backgroundColor: COLORS.coralSoft,
  },
  kindChat: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  kindQuestionText: {
    color: COLORS.coral,
  },
  kindChatText: {
    color: COLORS.textMuted,
  },
  verifiedBadge: {
    backgroundColor: COLORS.sageSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.sage,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  msgBody: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  msgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  verifyHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  voteBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voteBtnActive: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  voteBtnLocked: {
    backgroundColor: COLORS.surfaceSoft,
    borderColor: COLORS.border,
  },
  voteText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  voteTextActive: {
    color: COLORS.surface,
  },
  voteTextLocked: {
    color: COLORS.textMuted,
  },
  inputCard: {
    padding: 10,
    gap: 8,
    marginTop: 6,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modeTextActive: {
    color: COLORS.surface,
  },
  sendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputErrorBorder: {
    borderColor: COLORS.danger,
  },
  sendBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
  },
  sendBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  mixerPopoverWrap: {
    marginBottom: -2,
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    gap: 4,
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    minWidth: 48,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: COLORS.navySoft,
    gap: 2,
  },
  dockItemActive: {
    backgroundColor: COLORS.sage,
  },
  dockItemScreenActive: {
    backgroundColor: COLORS.coral,
    borderWidth: 1,
    borderColor: COLORS.cream,
  },
  screenShareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: COLORS.coral,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  screenShareBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.cream,
  },
  screenShareStopBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  screenShareStopBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.surface,
  },
  screenShareStoppedNotice: {
    alignSelf: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 6,
  },
  screenShareStoppedText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cream,
  },
  dockIcon: {
    fontSize: 13.5,
  },
  dockLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  dockLabelActive: {
    color: COLORS.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 10,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.coral,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },
  modalBody: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
