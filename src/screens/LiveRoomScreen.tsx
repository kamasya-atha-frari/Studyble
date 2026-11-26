import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AmbientAudioEngine } from '../audio/ambientAudioEngine';
import { AmbientMixerBar, getAmbientSummary } from '../components/AmbientMixerBar';
import { BreakGameModal } from '../components/BreakGameModal';
import { EmptyStateBox } from '../components/EmptyStateBox';
import { PrivateChatModal } from '../components/PrivateChatModal';
import { SectionCard } from '../components/SectionCard';
import { StudyParticipantCard } from '../components/StudyParticipantCard';
import { StudyReceiptModal } from '../components/StudyReceiptModal';
import {
  STUDY_COMPANION_BOTS,
  VERIFIED_VOTE_THRESHOLD,
} from '../storage/storage';
import { COLORS } from '../theme/tokens';
import {
  AmbientMixerState,
  LiveMessageItem,
  LiveMessageKind,
  StudyMode,
  StudyParticipant,
  StudyProfileState,
  StudyRoom,
} from '../types/studyble';
import {
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
  onSessionComplete: (minutes: number) => void;
  onChangeStudyMode: (mode: StudyMode) => void;
  onCompletePrivateHelp: (peerId: string) => {
    awarded: boolean;
    remainingMs: number;
  };
  onUpdateAmbientMixer: (next: AmbientMixerState) => void;
}

type LiveViewTab = 'grid' | 'live' | 'archive';

const POMODORO_ALARM_IMAGE = require('../../assets/pomodoro-alarm.png');

export function LiveRoomScreen({
  room,
  profile,
  onLeaveRoom,
  onSendLiveMessage,
  onToggleLiveVote,
  onSessionComplete,
  onChangeStudyMode,
  onCompletePrivateHelp,
  onUpdateAmbientMixer,
}: LiveRoomScreenProps) {
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const numColumns = width >= 768 ? 4 : 2;
  const initialFocusMinutes = room?.focusMinutes ?? profile.defaultFocusMinutes;

  const audioEngineRef = useRef<AmbientAudioEngine | null>(null);
  const ambientMixerRef = useRef<AmbientMixerState>(profile.ambientMixer);
  useEffect(() => {
    ambientMixerRef.current = profile.ambientMixer;
  }, [profile.ambientMixer]);

  const [activeView, setActiveView] = useState<LiveViewTab>('grid');
  const [emptyRoomDemo, setEmptyRoomDemo] = useState<boolean>(false);
  const [isSeated, setIsSeated] = useState<boolean>(true);
  const [activeChatPeer, setActiveChatPeer] = useState<StudyParticipant | null>(null);
  const [mixerExpanded, setMixerExpanded] = useState<boolean>(false);
  const [breakModalVisible, setBreakModalVisible] = useState<boolean>(false);
  const [receiptVisible, setReceiptVisible] = useState<boolean>(false);

  const [messageText, setMessageText] = useState<string>('');
  const [messageKind, setMessageKind] = useState<LiveMessageKind>('question');
  const [inputError, setInputError] = useState<string>('');
  const [sessionNotice, setSessionNotice] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(initialFocusMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);

  const mascotRotateAnim = useRef(new Animated.Value(0)).current;
  const mascotJumpAnim = useRef(new Animated.Value(0)).current;

  // Immediately dispose audio and force camera OFF on navigation blur or back-swipe removal
  useEffect(() => {
    const cleanupRoomMedia = () => {
      audioEngineRef.current?.dispose();
      audioEngineRef.current = null;
      onChangeStudyMode('avatar');
    };
    const unsubBlur = navigation.addListener('blur', cleanupRoomMedia);
    const unsubBeforeRemove = navigation.addListener('beforeRemove', cleanupRoomMedia);
    return () => {
      unsubBlur();
      unsubBeforeRemove();
    };
  }, [navigation, onChangeStudyMode]);

  // Keep camera OFF on initial room entry and whenever losing focus or unmounting
  useEffect(() => {
    onChangeStudyMode('avatar');
    return () => {
      onChangeStudyMode('avatar');
    };
  }, [room?.id, onChangeStudyMode]);

  useEffect(() => {
    if (!isFocused) {
      onChangeStudyMode('avatar');
    }
  }, [isFocused, onChangeStudyMode]);

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
    setSecondsLeft(initialFocusMinutes * 60);
    setIsRunning(false);
    setIsAlarmRinging(false);
    setSessionNotice('');
    setEmptyRoomDemo(false);
    setIsSeated(true);
  }, [room?.id, initialFocusMinutes]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || secondsLeft > 0) return;
    setIsRunning(false);
    setIsAlarmRinging(true);
    onSessionComplete(initialFocusMinutes);
    setSessionNotice('Time is up! +5 pts added to your profile.');
  }, [isRunning, secondsLeft, initialFocusMinutes, onSessionComplete]);

  // Animate the alarm clock mascot:
  // - Finished alarm (isAlarmRinging): rapid left-right shake (-18deg..18deg) + hopping bounce
  // - Running (isRunning): smooth left-right rock (-10deg..10deg), translateY = 0
  // - Paused/Idle: reset cleanly to 0deg and translateY = 0
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
          Animated.timing(mascotJumpAnim, {
            toValue: -6,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(mascotJumpAnim, {
            toValue: 0,
            duration: 90,
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

    if (isRunning) {
      mascotJumpAnim.setValue(0);
      mascotRotateAnim.setValue(0);

      const wiggleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(mascotRotateAnim, {
            toValue: 10,
            duration: 280,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(mascotRotateAnim, {
            toValue: -10,
            duration: 560,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(mascotRotateAnim, {
            toValue: 0,
            duration: 280,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      wiggleLoop.start();

      return () => {
        wiggleLoop.stop();
      };
    }

    mascotRotateAnim.setValue(0);
    mascotJumpAnim.setValue(0);
    return undefined;
  }, [isRunning, isAlarmRinging, mascotRotateAnim, mascotJumpAnim]);

  useEffect(() => {
    if (!sessionNotice) return;
    const timer = setTimeout(() => setSessionNotice(''), 3200);
    return () => clearTimeout(timer);
  }, [sessionNotice]);

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

  const { displayedParticipants, topContributorIds, showingCompanionBots } = useMemo(() => {
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

  const sortedLiveMessages = useMemo<LiveMessageItem[]>(() => {
    if (!room) return [];
    return [...room.messages].sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      if (a.kind !== b.kind) return a.kind === 'question' ? -1 : 1;
      return 0;
    });
  }, [room]);

  const verifiedMessages = useMemo<LiveMessageItem[]>(() => {
    if (!room) return [];
    return room.messages
      .filter((msg) => msg.verified || msg.votes >= VERIFIED_VOTE_THRESHOLD)
      .sort((a, b) => b.votes - a.votes);
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

  const handleLeave = () => {
    audioEngineRef.current?.dispose();
    audioEngineRef.current = null;
    onChangeStudyMode('avatar');
    onLeaveRoom(room.id);
  };

  const handleSend = () => {
    const clean = messageText.trim();
    if (!clean) {
      setInputError(
        messageKind === 'question'
          ? 'Please enter a question before sending.'
          : 'Please write a chat message before sending.'
      );
      return;
    }

    onSendLiveMessage(room.id, clean, messageKind);
    setMessageText('');
    setInputError('');
  };

  const handleCompleteSession = () => {
    setIsRunning(false);
    setIsAlarmRinging(false);
    setSecondsLeft(room.focusMinutes * 60);
    onSessionComplete(room.focusMinutes);
    setSessionNotice('Session completed! +5 pts and +1 completed session.');
  };

  const handleDismissAlarm = () => {
    setIsAlarmRinging(false);
    setIsRunning(false);
    setSecondsLeft(room.focusMinutes * 60);
  };

  const handleToggleTimer = () => {
    if (isAlarmRinging || secondsLeft === 0) {
      setIsAlarmRinging(false);
      setSecondsLeft(room.focusMinutes * 60);
      setIsRunning(true);
      return;
    }
    setIsRunning((prev) => !prev);
  };

  const mascotRotateDeg = mascotRotateAnim.interpolate({
    inputRange: [-18, 18],
    outputRange: ['-18deg', '18deg'],
  });

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const liveCountDisplay = emptyRoomDemo ? (isSeated ? 1 : 0) : room.activeStudents;
  const ambientSummary = getAmbientSummary(profile.ambientMixer);
  const hasAmbientOn = ambientSummary !== 'Off';

  const renderMessageCard = ({ item }: { item: LiveMessageItem }) => {
    const isVerified = item.verified || item.votes >= VERIFIED_VOTE_THRESHOLD;
    const votesNeeded = Math.max(0, VERIFIED_VOTE_THRESHOLD - item.votes);

    return (
      <SectionCard
        style={isVerified ? [styles.msgCard, styles.verifiedCard] : styles.msgCard}
      >
        <View style={styles.msgHeader}>
          <View style={styles.msgMetaLeft}>
            <Text style={styles.senderText}>{item.sender}</Text>
            <View
              style={[
                styles.kindBadge,
                item.kind === 'question' ? styles.kindQuestion : styles.kindChat,
              ]}
            >
              <Text
                style={[
                  styles.kindBadgeText,
                  item.kind === 'question'
                    ? styles.kindQuestionText
                    : styles.kindChatText,
                ]}
              >
                {item.kind === 'question' ? 'Question' : 'Chat'}
              </Text>
            </View>
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.timeText}>{item.createdAt}</Text>
        </View>

        <Text style={styles.msgBody}>{item.text}</Text>

        <View style={styles.msgFooter}>
          <Text style={styles.verifyHint}>
            {isVerified
              ? 'Saved in Verified Archive'
              : `${votesNeeded} more ${votesNeeded === 1 ? 'vote' : 'votes'} to verify`}
          </Text>
          <Pressable
            style={[styles.voteBtn, item.hasVoted && styles.voteBtnActive]}
            onPress={() => onToggleLiveVote(room.id, item.id)}
          >
            <Text style={[styles.voteText, item.hasVoted && styles.voteTextActive]}>
              ▲ {item.hasVoted ? 'Voted' : 'Upvote'} ({item.votes})
            </Text>
          </Pressable>
        </View>
      </SectionCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable
              style={styles.leaveBtn}
              onPress={handleLeave}
            >
              <Text style={styles.leaveBtnText}>← Leave Live</Text>
            </Pressable>
            <View style={styles.liveBadge}>
              <Text style={styles.liveDot}>● LIVE</Text>
              <Text style={styles.liveCount}>· {liveCountDisplay} studying</Text>
            </View>
          </View>

          {/* Compact Room Header */}
          <SectionCard style={styles.liveHeaderCard}>
            <View style={styles.headerMetaRow}>
              <Text style={styles.categoryText}>{room.category.toUpperCase()}</Text>
              <Text style={styles.sessionStatsText}>
                {progression.rankTitle} Lv.{progression.level} · {profile.points} pts
              </Text>
            </View>
            <Text style={styles.roomTitle} numberOfLines={1}>
              {room.title}
            </Text>

            {sessionNotice ? (
              <View style={styles.noticeBanner}>
                <Text style={styles.noticeBannerText}>✓ {sessionNotice}</Text>
              </View>
            ) : null}
          </SectionCard>

          {/* Co-Working Extras Dock: Ambient Mixer, Take a Break, Study Receipt */}
          <View style={styles.extrasRow}>
            <Pressable
              style={[
                styles.extraBtn,
                (mixerExpanded || hasAmbientOn) && styles.extraBtnActive,
              ]}
              onPress={() => setMixerExpanded((prev) => !prev)}
            >
              <Text
                style={[
                  styles.extraBtnText,
                  (mixerExpanded || hasAmbientOn) && styles.extraBtnTextActive,
                ]}
                numberOfLines={1}
              >
                🎧 {hasAmbientOn ? 'Ambient ON' : 'Ambient'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.extraBtn}
              onPress={() => setBreakModalVisible(true)}
            >
              <Text style={styles.extraBtnText} numberOfLines={1}>
                🧠 Take a Break
              </Text>
            </Pressable>

            <Pressable
              style={styles.extraBtnReceipt}
              onPress={() => setReceiptVisible(true)}
            >
              <Text style={styles.extraBtnReceiptText} numberOfLines={1}>
                🧾 Receipt
              </Text>
            </Pressable>
          </View>

          <AmbientMixerBar
            mixer={profile.ambientMixer}
            expanded={mixerExpanded}
            onToggleExpand={() => setMixerExpanded((prev) => !prev)}
            onChange={onUpdateAmbientMixer}
          />

          {/* 3-Tab Segmented Switcher */}
          <View style={styles.segmentedBar}>
            <Pressable
              style={[
                styles.segmentTab,
                activeView === 'grid' && styles.segmentTabActive,
              ]}
              onPress={() => setActiveView('grid')}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeView === 'grid' && styles.segmentTabTextActive,
                ]}
                numberOfLines={1}
              >
                Study Grid
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentTab,
                activeView === 'live' && styles.segmentTabActive,
              ]}
              onPress={() => setActiveView('live')}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeView === 'live' && styles.segmentTabTextActive,
                ]}
                numberOfLines={1}
              >
                Chat & Q&A ({room.messages.length})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentTab,
                activeView === 'archive' && styles.segmentTabArchiveActive,
              ]}
              onPress={() => setActiveView('archive')}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeView === 'archive' && styles.segmentTabTextActive,
                ]}
                numberOfLines={1}
              >
                Archive ({verifiedMessages.length})
              </Text>
            </Pressable>
          </View>

          {/* View 0: Co-Working Participant Grid + Quiet/Empty Room Companion Mode */}
          {activeView === 'grid' ? (
            <View style={styles.flex}>
              <View style={styles.gridToolbar}>
                <Pressable
                  style={[
                    styles.toolbarPill,
                    emptyRoomDemo && styles.toolbarPillActive,
                  ]}
                  onPress={() => setEmptyRoomDemo((prev) => !prev)}
                >
                  <Text
                    style={[
                      styles.toolbarPillText,
                      emptyRoomDemo && styles.toolbarPillTextActive,
                    ]}
                  >
                    {emptyRoomDemo
                      ? '🌙 Quiet Room Demo: ON'
                      : '🌙 Quiet / Empty Room Demo'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.seatBtn,
                    isSeated && styles.seatBtnActive,
                  ]}
                  onPress={() => setIsSeated((prev) => !prev)}
                >
                  <Text
                    style={[
                      styles.seatBtnText,
                      isSeated && styles.seatBtnTextActive,
                    ]}
                  >
                    {isSeated ? 'Seated ✓' : '+ Sit in Room'}
                  </Text>
                </Pressable>
              </View>

              {showingCompanionBots ? (
                <View style={styles.botBanner}>
                  <Text style={styles.botBannerTitle}>
                    Quiet Room Mode · 5 Study Companion Bots Active
                  </Text>
                  <Text style={styles.botBannerSub}>
                    No other peers are active right now—these 5 friendly bots keep the table cozy while you focus.
                  </Text>
                </View>
              ) : (
                <Text style={styles.listCaption}>
                  Weekly top contributors appear first · Tap “Ask 1-on-1” on peers with private chat enabled
                </Text>
              )}

              <FlatList
                key={`study-grid-${numColumns}`}
                data={displayedParticipants}
                numColumns={numColumns}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridListContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const cooldownMs = getPeerCooldownRemainingMs(
                    profile.privateChatCooldowns,
                    item.id
                  );
                  return (
                    <View style={styles.gridCell}>
                      <StudyParticipantCard
                        participant={item}
                        isScreenFocused={isFocused}
                        isTopContributor={topContributorIds.has(item.id)}
                        isOnCooldown={cooldownMs > 0}
                        onAskPrivateChat={(peer) => setActiveChatPeer(peer)}
                        onSelectStudyMode={
                          item.isCurrentUser ? onChangeStudyMode : undefined
                        }
                      />
                    </View>
                  );
                }}
              />
            </View>
          ) : activeView === 'live' ? (
            /* View 1: Public Chat & Questions */
            <>
              <Text style={styles.listCaption}>
                Sorted by top votes · Posts with {VERIFIED_VOTE_THRESHOLD}+ votes move into Verified Archive
              </Text>
              <FlatList
                data={sortedLiveMessages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <EmptyStateBox
                    title="No live messages yet"
                    subtitle="Post a study question or check-in message below to start collaborating with your room."
                  />
                }
                renderItem={renderMessageCard}
              />

              {/* Message Composer */}
              <SectionCard style={styles.inputCard}>
                <View style={styles.modeRow}>
                  <Pressable
                    style={[
                      styles.modeChip,
                      messageKind === 'question' && styles.modeChipActive,
                    ]}
                    onPress={() => {
                      setMessageKind('question');
                      if (inputError) setInputError('');
                    }}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        messageKind === 'question' && styles.modeTextActive,
                      ]}
                    >
                      Ask Question
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modeChip,
                      messageKind === 'chat' && styles.modeChipActive,
                    ]}
                    onPress={() => {
                      setMessageKind('chat');
                      if (inputError) setInputError('');
                    }}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        messageKind === 'chat' && styles.modeTextActive,
                      ]}
                    >
                      Public Chat
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.sendRow}>
                  <TextInput
                    style={[styles.input, inputError ? styles.inputErrorBorder : null]}
                    placeholder={
                      messageKind === 'question'
                        ? 'Ask a study question for peers to upvote...'
                        : 'Share a quick update in public chat...'
                    }
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
            </>
          ) : (
            /* View 2: Verified Archive */
            <>
              <Text style={styles.listCaption}>
                Helpful questions & posts with {VERIFIED_VOTE_THRESHOLD}+ upvotes are preserved here
              </Text>
              <FlatList
                data={verifiedMessages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <EmptyStateBox
                    title="No verified posts yet"
                    subtitle={`When a question or helpful post reaches ${VERIFIED_VOTE_THRESHOLD} or more votes in Public Chat, it is automatically archived here so key Q&A never gets lost.`}
                    actionLabel="Go to Public Chat & Questions"
                    onAction={() => setActiveView('live')}
                  />
                }
                renderItem={renderMessageCard}
              />
            </>
          )}

          {/* Floating Focus Timer Pill ("Timer Terbang") with Animated Alarm Mascot */}
          <View
            style={[
              styles.floatingTimerPill,
              isAlarmRinging && styles.floatingTimerPillAlarm,
              activeView === 'live' && styles.floatingTimerPillAboveComposer,
            ]}
          >
            <Animated.View
              style={[
                styles.floatingMascotBadge,
                {
                  transform: [
                    { translateY: mascotJumpAnim },
                    { rotate: mascotRotateDeg },
                  ],
                },
              ]}
            >
              <Image
                source={POMODORO_ALARM_IMAGE}
                style={styles.floatingMascotImage}
                resizeMode="contain"
              />
            </Animated.View>

            <Text
              style={[
                styles.floatingTimerReadout,
                isAlarmRinging && styles.floatingTimerReadoutAlarm,
              ]}
            >
              {formattedTimer}
            </Text>

            {isAlarmRinging ? (
              <>
                <Pressable
                  style={styles.floatingStopAlarmBtn}
                  onPress={handleDismissAlarm}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Stop alarm and reset timer"
                >
                  <Text style={styles.floatingStopAlarmText}>Stop</Text>
                </Pressable>
                <Pressable
                  style={styles.floatingPlayBtn}
                  onPress={handleToggleTimer}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Start next session timer"
                >
                  <Text style={styles.floatingPlayText}>▶</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[
                    styles.floatingPlayBtn,
                    isRunning && styles.floatingPlayBtnActive,
                  ]}
                  onPress={handleToggleTimer}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isRunning ? 'Pause session timer' : 'Start session timer'
                  }
                >
                  <Text style={styles.floatingPlayText}>
                    {isRunning ? '⏸' : '▶'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.floatingCompleteBtn}
                  onPress={handleCompleteSession}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Complete session and earn 5 points"
                >
                  <Text style={styles.floatingCompleteText}>✓ +5</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

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
        onClose={() => setActiveChatPeer(null)}
        onCompleteVerifiedSession={onCompletePrivateHelp}
      />

      <BreakGameModal
        visible={breakModalVisible}
        onClose={() => setBreakModalVisible(false)}
      />

      <StudyReceiptModal
        visible={receiptVisible}
        profile={profile}
        roomTitle={room.title}
        onClose={() => setReceiptVisible(false)}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.coral,
  },
  liveCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
  liveHeaderCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
    marginBottom: 8,
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  headerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.coral,
  },
  sessionStatsText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.cream,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.surface,
  },
  floatingTimerPill: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.2)',
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 7,
    paddingVertical: 5,
    overflow: 'visible',
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  floatingTimerPillAlarm: {
    borderColor: COLORS.coral,
    borderWidth: 1.5,
  },
  floatingTimerPillAboveComposer: {
    bottom: 124,
  },
  floatingMascotBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  floatingMascotImage: {
    width: 28,
    height: 28,
  },
  floatingTimerReadout: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.cream,
    fontVariant: ['tabular-nums'],
  },
  floatingTimerReadoutAlarm: {
    color: COLORS.coral,
  },
  floatingStopAlarmBtn: {
    backgroundColor: COLORS.coralSoft,
    borderWidth: 1,
    borderColor: COLORS.coral,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  floatingStopAlarmText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.coral,
  },
  floatingPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.coral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingPlayBtnActive: {
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  floatingPlayText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.surface,
  },
  floatingCompleteBtn: {
    backgroundColor: COLORS.sage,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  floatingCompleteText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.surface,
  },
  noticeBanner: {
    marginTop: 4,
    backgroundColor: 'rgba(42, 111, 104, 0.28)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noticeBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cream,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  extraBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  extraBtnActive: {
    backgroundColor: COLORS.sageSoft,
    borderColor: COLORS.sage,
  },
  extraBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  extraBtnTextActive: {
    color: COLORS.sage,
  },
  extraBtnReceipt: {
    backgroundColor: COLORS.coralSoft,
    borderWidth: 1,
    borderColor: COLORS.coral,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 11,
    alignItems: 'center',
  },
  extraBtnReceiptText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.coral,
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 8,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
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
  gridToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toolbarPill: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toolbarPillActive: {
    backgroundColor: COLORS.sageSoft,
    borderColor: COLORS.sage,
  },
  toolbarPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  toolbarPillTextActive: {
    color: COLORS.sage,
  },
  seatBtn: {
    backgroundColor: COLORS.coral,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  seatBtnActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.sage,
  },
  seatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.surface,
  },
  seatBtnTextActive: {
    color: COLORS.sage,
  },
  botBanner: {
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 2,
  },
  botBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.sage,
  },
  botBannerSub: {
    fontSize: 11,
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
  gridListContent: {
    paddingBottom: 76,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  gridCell: {
    flex: 1,
  },
  listCaption: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  listContent: {
    gap: 9,
    paddingBottom: 76,
  },
  msgCard: {
    gap: 8,
    padding: 13,
  },
  verifiedCard: {
    borderColor: COLORS.sage,
    backgroundColor: '#FAFDFC',
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
  voteText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  voteTextActive: {
    color: COLORS.surface,
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
});
